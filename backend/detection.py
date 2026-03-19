# backend/detection.py
from flask import request, jsonify
import cv2
import numpy as np
import base64
import os
from werkzeug.utils import secure_filename
from config import (UPLOAD_FOLDER, ALLOWED_EXTENSIONS,
                    SURFACE_DEFECTS, DEFECT_REASONS)
from ensemble_inference import DefectIQEnsemble
from board_detector import BoardDetector
import database as db

# Load models once at import time
ensemble = DefectIQEnsemble(use_tta=True)
board_detector = BoardDetector()
CLASSES = ensemble.classes

# Defect colours for annotation (BGR)
DEFECT_COLORS = {
    'bubbling':           (0,   200, 255),  # orange
    'delamination':       (0,   80,  255),  # red
    'imprint_on_surface': (255, 180, 0),    # blue
    'missing_edges':      (0,   255, 180),  # green
    'missing_top_face':   (180, 0,   255),  # purple
    'warping':            (255, 80,  0),    # cyan
}


def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS


def image_to_b64(img_bgr):
    _, buf = cv2.imencode('.jpg', img_bgr, [cv2.IMWRITE_JPEG_QUALITY, 90])
    return base64.b64encode(buf).decode('utf-8')


def annotate_image(img_bgr, defects, confidences):
    """
    Draw defect information on the board image.
    - Draws a coloured overlay band per detected defect
    - Shows defect name + confidence prominently
    - Highlights approximate defect region using colour tint
    """
    img = img_bgr.copy()
    h, w = img.shape[:2]

    if not defects:
        # PASS — green overlay at bottom
        overlay = img.copy()
        cv2.rectangle(overlay, (0, h - 50), (w, h), (0, 60, 0), -1)
        cv2.addWeighted(overlay, 0.75, img, 0.25, 0, img)
        cv2.putText(img, "PASS — No defects detected",
                    (20, h - 15),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.9,
                    (80, 255, 80), 2, cv2.LINE_AA)
        return img

    # Draw subtle colour tint regions for each defect
    # Divide image into horizontal bands per defect (approximate location hint)
    band_h = h // max(len(defects), 1)
    for i, defect in enumerate(defects):
        color = DEFECT_COLORS.get(defect, (0, 165, 255))
        conf = confidences.get(defect, 0)
        # Tint a band based on defect index
        y1 = max(0, i * band_h)
        y2 = min(h - 60, y1 + band_h)
        tint = img[y1:y2, 0:w].copy()
        tint_overlay = np.full_like(tint, color, dtype=np.uint8)
        img[y1:y2, 0:w] = cv2.addWeighted(tint, 0.85, tint_overlay, 0.15, 0)

        # Draw a solid colour border on the left edge to indicate defect
        cv2.rectangle(img, (0, y1), (6, y2), color, -1)

        # Draw defect label inside the band
        label = f"{defect.replace('_', ' ').title()}"
        conf_text = f"{conf*100:.0f}%"
        font = cv2.FONT_HERSHEY_SIMPLEX

        # Label background
        (tw, th), _ = cv2.getTextSize(label, font, 0.65, 2)
        cv2.rectangle(img, (14, y1 + 8), (14 + tw + 8, y1 + 8 + th + 8),
                      (20, 20, 20), -1)
        cv2.putText(img, label, (18, y1 + 8 + th + 2),
                    font, 0.65, color, 2, cv2.LINE_AA)

        # Confidence badge on right side
        (cw, ch), _ = cv2.getTextSize(conf_text, font, 0.75, 2)
        cx = w - cw - 20
        cv2.rectangle(img, (cx - 6, y1 + 8), (w - 10, y1 + 8 + ch + 8),
                      color, -1)
        cv2.putText(img, conf_text, (cx, y1 + 8 + ch + 2),
                    font, 0.75, (0, 0, 0), 2, cv2.LINE_AA)

    # Bottom bar with verdict
    bar_y = h - 50
    overlay = img.copy()
    cv2.rectangle(overlay, (0, bar_y), (w, h), (60, 0, 0), -1)
    cv2.addWeighted(overlay, 0.80, img, 0.20, 0, img)
    defect_names = ", ".join([d.replace('_', ' ').title() for d in defects])
    cv2.putText(img, f"DETECTED: {defect_names}",
                (12, h - 15),
                cv2.FONT_HERSHEY_SIMPLEX, 0.60,
                (80, 180, 255), 2, cv2.LINE_AA)

    return img


def compute_verdict(defects, confidences):
    """
    Simplified verdict: PASS or REVIEW only.
    REVIEW: any defect detected above threshold
    PASS: no defects detected
    """
    if not defects:
        return 'PASS'
    return 'REVIEW'


def dual_view_fusion(result_top, result_side):
    """
    Weighted fusion of top and side view results.
    Uses max-fusion to avoid diluting scores — takes the higher
    confidence between the two views per defect rather than averaging.
    """
    fused = {}
    for cls in CLASSES:
        t = result_top['confidences'][cls]
        s = result_side['confidences'][cls]
        if cls in SURFACE_DEFECTS:
            # Surface defects: weight top view more
            fused[cls] = round(
                max(0.65 * t + 0.35 * s, 0.50 * t + 0.50 * s), 4)
        else:
            # Structural defects: weight side view more
            fused[cls] = round(
                max(0.35 * t + 0.65 * s, 0.50 * t + 0.50 * s), 4)

    threshold = ensemble.threshold
    defects = [cls for cls, conf in fused.items() if conf >= threshold]
    verdict = compute_verdict(defects, fused)

    return {
        'defects':       defects,
        'confidences':   fused,
        'verdict':       verdict,
        'co_occurrence': ensemble._co_occurrence(defects),
    }


def detect(user_id=None):
    try:
        has_top = 'top_view' in request.files and request.files['top_view'].filename != ''
        has_side = 'side_view' in request.files and request.files['side_view'].filename != ''

        if not has_top and not has_side:
            return jsonify({'error': 'Upload at least one image'}), 400

        results_top = results_side = None
        annotated_top = annotated_side = None

        if has_top:
            f = request.files['top_view']
            if not allowed_file(f.filename):
                return jsonify({'error': 'Invalid file type for top view'}), 400
            path = os.path.join(UPLOAD_FOLDER, 'top_' +
                                secure_filename(f.filename))
            f.save(path)
            img_full = cv2.imread(path)
            img, _, _ = board_detector.extract_board(img_full)
            results_top = ensemble.predict(img)
            # Use result from this view for annotation
            annotated_top = annotate_image(
                img, results_top['defects'], results_top['confidences'])

        if has_side:
            f = request.files['side_view']
            if not allowed_file(f.filename):
                return jsonify({'error': 'Invalid file type for side view'}), 400
            path = os.path.join(UPLOAD_FOLDER, 'side_' +
                                secure_filename(f.filename))
            f.save(path)
            img_full = cv2.imread(path)
            img, _, _ = board_detector.extract_board(img_full)
            results_side = ensemble.predict(img)
            annotated_side = annotate_image(
                img, results_side['defects'], results_side['confidences'])

        # Fuse views or use single view result
        if results_top and results_side:
            final = dual_view_fusion(results_top, results_side)
        elif results_top:
            final = results_top
            final['verdict'] = compute_verdict(
                final['defects'], final['confidences'])
        else:
            final = results_side
            final['verdict'] = compute_verdict(
                final['defects'], final['confidences'])

        # Re-annotate with fused results if both views present
        if results_top and results_side:
            if annotated_top is not None:
                annotated_top = annotate_image(
                    board_detector.extract_board(cv2.imread(
                        os.path.join(UPLOAD_FOLDER, 'top_' + secure_filename(
                            request.files['top_view'].filename))))[0],
                    final['defects'], final['confidences'])
            if annotated_side is not None:
                annotated_side = annotate_image(
                    board_detector.extract_board(cv2.imread(
                        os.path.join(UPLOAD_FOLDER, 'side_' + secure_filename(
                            request.files['side_view'].filename))))[0],
                    final['defects'], final['confidences'])

        defect_info = {
            d: DEFECT_REASONS.get(d, {
                'summary': 'Defect detected.',
                'recommendations': ['Manual inspection recommended.']
            }) for d in final['defects']
        }

        # Log to Supabase
        db.log_inspection(
            user_id=user_id,
            verdict=final['verdict'],
            defects=final['defects'],
            confidences=final['confidences'],
            co_occurrence=final['co_occurrence'],
            top_filename=request.files['top_view'].filename if has_top else None,
            side_filename=request.files['side_view'].filename if has_side else None,
        )

        print(
            f"[detect] verdict={final['verdict']} defects={final['defects']}")

        return jsonify({
            'success':       True,
            'verdict':       final['verdict'],
            'defects':       final['defects'],
            'confidences':   final['confidences'],
            'co_occurrence': final['co_occurrence'],
            'defect_info':   defect_info,
            'annotated_images': {
                'top_view':  image_to_b64(annotated_top) if annotated_top is not None else None,
                'side_view': image_to_b64(annotated_side) if annotated_side is not None else None,
            },
        }), 200

    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500
