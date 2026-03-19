"""
DefectIQ — Board Detector (Stage 1)
=====================================
Loads a trained YOLOv8-seg model and extracts the plywood board
from a full image using polygon segmentation.

Two outputs are provided:
  1. Tight rectangular crop  — bounding box crop of the board region
  2. Masked crop             — background zeroed out, only board pixels visible

The ensemble classifier (Stage 2) receives the tight rectangular crop
since it was trained on similar rectangular crops from YOLO bounding boxes.

Usage:
    from board_detector import BoardDetector
    detector = BoardDetector()
    crop, mask_crop, info = detector.extract_board(img_bgr)
    if crop is not None:
        result = ensemble.predict(crop)
"""

import cv2
import numpy as np
from pathlib import Path

# Default path — put best.pt in same folder as app.py
BOARD_MODEL_PATH = "board_detector_best.pt"

# Minimum confidence to accept a board detection
BOARD_CONF_THRESHOLD = 0.01

EXPAND_RATIO = 0.02


class BoardDetector:
    """
    Stage 1: Detects and crops the plywood board from a full camera image.

    If no board is detected (confidence too low or model not loaded),
    falls back to returning the full image so the system still works.
    """

    def __init__(self, model_path: str = BOARD_MODEL_PATH):
        self.model = None
        self.model_path = model_path
        self._load_model()

    def _load_model(self):
        if not Path(self.model_path).exists():
            print(
                f"[BoardDetector] WARNING: model not found at {self.model_path}")
            print(f"[BoardDetector] Falling back to full-image mode (no board crop).")
            print(
                f"[BoardDetector] Run train_board_detector.py first, then copy best.pt here.")
            return

        try:
            from ultralytics import YOLO
            self.model = YOLO(self.model_path)
            print(
                f"[BoardDetector] ✓ Board segmentation model loaded → {self.model_path}")
        except ImportError:
            print(
                "[BoardDetector] ultralytics not installed. Run: pip install ultralytics")
            print("[BoardDetector] Falling back to full-image mode.")
        except Exception as e:
            print(f"[BoardDetector] Failed to load model: {e}")

    @property
    def is_ready(self) -> bool:
        return self.model is not None

    def extract_board(self, img_bgr: np.ndarray) -> tuple:
        """
        Detect the plywood board in the image and return a crop.

        Args:
            img_bgr: Full image as BGR numpy array (from cv2.imread)

        Returns:
            (tight_crop, masked_crop, info)

            tight_crop  : Rectangular crop of board region (BGR numpy array)
                          — this is what gets passed to the ensemble
                          — None if detection failed (caller should use full image)

            masked_crop : Same crop but with background masked to gray
                          — useful for visualisation

            info        : dict with detection metadata:
                          {
                            'detected': bool,
                            'confidence': float,
                            'bbox': [x1, y1, x2, y2],  # pixel coords
                            'polygon': [[x,y], ...],    # board outline points
                            'fallback': bool,           # True if using full image
                          }
        """
        h, w = img_bgr.shape[:2]

        # ── Fallback: no model loaded ──────────────
        if not self.is_ready:
            return img_bgr, img_bgr, {
                'detected':   False,
                'confidence': 0.0,
                'bbox':       [0, 0, w, h],
                'polygon':    [],
                'fallback':   True,
                'message':    'Board detector not loaded — using full image',
            }

        # ── Run YOLOv8-seg inference ───────────────
        results = self.model(
            img_bgr,
            conf=BOARD_CONF_THRESHOLD,
            verbose=False,
        )

        result = results[0]

        # No detection
        if result.masks is None or len(result.masks) == 0:
            print("[BoardDetector] No board detected — using full image as fallback")
            print(f"[BoardDetector] Tip: image may not match training distribution")
            return img_bgr, img_bgr, {
                'detected':   False,
                'confidence': 0.0,
                'bbox':       [0, 0, w, h],
                'polygon':    [],
                'fallback':   True,
                'message':    'No board detected in image — using full image',
            }

        # Pick highest confidence detection
        confidences = result.boxes.conf.cpu().numpy()
        best_idx = int(np.argmax(confidences))
        confidence = float(confidences[best_idx])
        print(
            f"[BoardDetector] All detections: {[round(float(c), 3) for c in confidences]}")
        print(f"[BoardDetector] Using best: {confidence:.3f}")

        # ── Get bounding box ───────────────────────
        box = result.boxes.xyxy[best_idx].cpu().numpy()
        x1, y1, x2, y2 = int(box[0]), int(box[1]), int(box[2]), int(box[3])

        # Expand bbox slightly
        pad_x = int((x2 - x1) * EXPAND_RATIO)
        pad_y = int((y2 - y1) * EXPAND_RATIO)
        x1 = max(0, x1 - pad_x)
        y1 = max(0, y1 - pad_y)
        x2 = min(w, x2 + pad_x)
        y2 = min(h, y2 + pad_y)

        # ── Get polygon mask ───────────────────────
        # (H, W) float 0-1
        mask_data = result.masks.data[best_idx].cpu().numpy()
        # resize to original size
        mask_full = cv2.resize(mask_data, (w, h))
        mask_bin = (mask_full > 0.5).astype(np.uint8) * 255  # binary mask

        # Get polygon contour points for info
        contours, _ = cv2.findContours(
            mask_bin, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        polygon = []
        if contours:
            largest = max(contours, key=cv2.contourArea)
            # Simplify polygon to ~20 points
            epsilon = 0.02 * cv2.arcLength(largest, True)
            approx = cv2.approxPolyDP(largest, epsilon, True)
            polygon = approx.reshape(-1, 2).tolist()

        # ── Tight rectangular crop ─────────────────
        tight_crop = img_bgr[y1:y2, x1:x2].copy()

        # ── Masked crop (board only, background gray) ──
        mask_crop_region = mask_bin[y1:y2, x1:x2]
        masked_crop = img_bgr[y1:y2, x1:x2].copy()
        gray_bg = np.full_like(masked_crop, 128)  # gray background
        mask_3ch = cv2.cvtColor(mask_crop_region, cv2.COLOR_GRAY2BGR)
        masked_crop = np.where(mask_3ch > 0, masked_crop, gray_bg)

        info = {
            'detected':   True,
            'confidence': round(confidence, 3),
            'bbox':       [x1, y1, x2, y2],
            'polygon':    polygon,
            'fallback':   False,
            'message':    f'Board detected with {confidence*100:.1f}% confidence',
        }

        print(f"[BoardDetector] Board detected — conf: {confidence:.2f}, "
              f"bbox: [{x1},{y1},{x2},{y2}], crop size: {tight_crop.shape[:2]}")

        return tight_crop, masked_crop, info

    def visualise_detection(self, img_bgr: np.ndarray, info: dict) -> np.ndarray:
        """
        Draw the board outline polygon and bbox on the original image.
        Useful for debugging and showing in the frontend.
        """
        vis = img_bgr.copy()

        if not info.get('detected'):
            cv2.putText(vis, "No board detected", (20, 40),
                        cv2.FONT_HERSHEY_SIMPLEX, 1.0, (0, 0, 255), 2)
            return vis

        # Draw polygon outline
        if info['polygon']:
            pts = np.array(info['polygon'], dtype=np.int32)
            cv2.polylines(vis, [pts], isClosed=True,
                          color=(0, 255, 100), thickness=3)

        # Draw bounding box
        x1, y1, x2, y2 = info['bbox']
        cv2.rectangle(vis, (x1, y1), (x2, y2), (0, 200, 255), 2)

        # Label
        label = f"Board {info['confidence']*100:.0f}%"
        (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.7, 2)
        cv2.rectangle(vis, (x1, y1 - th - 8),
                      (x1 + tw + 6, y1), (0, 200, 255), -1)
        cv2.putText(vis, label, (x1 + 3, y1 - 5),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 0, 0), 2)

        return vis
