"""
DefectIQ — Ensemble Inference Module (v4 — 2-model fusion)
===========================================================
EfficientNet-B2 (v6) + AlexNet (v7) weighted late fusion.
LeNet removed — performed poorly on board-cropped dataset.

Best results on defects_cropped dataset:
  Macro F1        : 0.540 (Ens-2)
  Top-2 Image Acc : 92.59%
  Hamming Loss    : 0.168
  Optimal threshold: 0.56
"""

import torch
import torch.nn as nn
import torchvision.transforms as T
from torchvision import models
from PIL import Image
import numpy as np
import cv2

CLASSES = [
    'bubbling',
    'delamination',
    'imprint_on_surface',
    'missing_face',
    'warping',
]
NUM_CLASSES = len(CLASSES)

EFFICIENTNET_PATH = "models/defect_classifier_v6/defect_classifier.pt"
ALEXNET_PATH = "models/defect_classifier_v7_alexnet/defect_classifier.pt"
THRESHOLD = 0.48


WEIGHTS_EFFICIENTNET = torch.tensor([0.55, 0.60, 0.60, 0.50, 0.40])
WEIGHTS_ALEXNET = torch.tensor([0.45, 0.40, 0.40, 0.50, 0.60])

_NORM = T.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225])
TTA_TRANSFORMS = [
    T.Compose([T.Resize((224, 224)), T.ToTensor(), _NORM]),
    T.Compose([T.Resize((224, 224)), T.RandomHorizontalFlip(
        p=1.0), T.ToTensor(), _NORM]),
    T.Compose([T.Resize((224, 224)), T.RandomVerticalFlip(
        p=1.0),   T.ToTensor(), _NORM]),
    T.Compose([T.Resize((224, 224)), T.ColorJitter(
        brightness=0.15), T.ToTensor(), _NORM]),
]
BASE_TRANSFORM = TTA_TRANSFORMS[0]


def build_efficientnet_b2() -> nn.Module:
    model = models.efficientnet_b2(weights=None)
    in_features = model.classifier[1].in_features
    model.classifier = nn.Sequential(
        nn.Dropout(p=0.4),
        nn.Linear(in_features, NUM_CLASSES),
    )
    return model


def build_alexnet() -> nn.Module:
    model = models.alexnet(weights=None)
    in_features = model.classifier[6].in_features
    model.classifier[6] = nn.Linear(in_features, NUM_CLASSES)
    return model


def load_checkpoint(model: nn.Module, path: str, device: torch.device) -> nn.Module:
    checkpoint = torch.load(path, map_location=device)
    if isinstance(checkpoint, dict) and 'model_state_dict' in checkpoint:
        state_dict = checkpoint['model_state_dict']
    else:
        state_dict = checkpoint
    model.load_state_dict(state_dict)
    return model


class DefectIQEnsemble:
    def __init__(
        self,
        efficientnet_path: str = EFFICIENTNET_PATH,
        alexnet_path: str = ALEXNET_PATH,
        threshold: float = THRESHOLD,
        use_tta: bool = True,
        device: str = None,
    ):
        self.threshold = threshold
        self.use_tta = use_tta
        self.classes = CLASSES
        self.device = torch.device(
            device if device else (
                "cuda" if torch.cuda.is_available() else "cpu")
        )

        print(f"\n[DefectIQ Ensemble] Device    : {self.device}")
        print(f"[DefectIQ Ensemble] Threshold : {self.threshold}")
        print(f"[DefectIQ Ensemble] TTA       : {'ON' if use_tta else 'OFF'}")

        self.eff_model = build_efficientnet_b2()
        self.eff_model = load_checkpoint(
            self.eff_model, efficientnet_path, self.device)
        self.eff_model.to(self.device).eval()
        print(f"[DefectIQ Ensemble] ✓ EfficientNet-B2 → {efficientnet_path}")

        self.alex_model = build_alexnet()
        self.alex_model = load_checkpoint(
            self.alex_model, alexnet_path, self.device)
        self.alex_model.to(self.device).eval()
        print(f"[DefectIQ Ensemble] ✓ AlexNet          → {alexnet_path}")
        print(f"[DefectIQ Ensemble] Models    : EfficientNet-B2 + AlexNet")

        self.w_eff = WEIGHTS_EFFICIENTNET.to(self.device)
        self.w_alex = WEIGHTS_ALEXNET.to(self.device)

    @torch.no_grad()
    def _probs_single(self, model, tensor):
        return torch.sigmoid(model(tensor.unsqueeze(0).to(self.device))).squeeze(0)

    @torch.no_grad()
    def _probs_tta(self, model, pil_img):
        return torch.stack([self._probs_single(model, tfm(pil_img))
                            for tfm in TTA_TRANSFORMS]).mean(dim=0)

    def predict(self, image) -> dict:
        if isinstance(image, np.ndarray):
            if image.ndim == 3 and image.shape[2] == 3:
                image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
            pil_img = Image.fromarray(image.astype(np.uint8))
        elif isinstance(image, Image.Image):
            pil_img = image
        else:
            raise TypeError(f"Unsupported image type: {type(image)}")

        if pil_img.mode != 'RGB':
            pil_img = pil_img.convert('RGB')

        if self.use_tta:
            probs_eff = self._probs_tta(self.eff_model,  pil_img)
            probs_alex = self._probs_tta(self.alex_model, pil_img)
        else:
            tensor = BASE_TRANSFORM(pil_img)
            probs_eff = self._probs_single(self.eff_model,  tensor)
            probs_alex = self._probs_single(self.alex_model, tensor)

        probs_fused = self.w_eff * probs_eff + self.w_alex * probs_alex
        probs_np = probs_fused.cpu().numpy()
        defects = [self.classes[i]
                   for i, p in enumerate(probs_np) if p >= self.threshold]
        confidences = {c: float(round(float(p), 4))
                       for c, p in zip(self.classes, probs_np)}

        return {
            'defects':       defects,
            'confidences':   confidences,
            'verdict':       self._verdict(defects, confidences),
            'co_occurrence': self._co_occurrence(defects),
            'raw_probs': {
                'efficientnet': {c: float(round(float(p), 4)) for c, p in zip(self.classes, probs_eff.cpu().numpy())},
                'alexnet':      {c: float(round(float(p), 4)) for c, p in zip(self.classes, probs_alex.cpu().numpy())},
                'fused':        {c: float(round(float(p), 4)) for c, p in zip(self.classes, probs_np)},
            }
        }

    def _co_occurrence(self, defects):
        ds, pairs = set(defects), []
        rules = [
            ({'delamination', 'warping'},         'HIGH',
             'Glue bond failure causes layer separation and board distortion.'),
            ({'bubbling', 'delamination'},         'MEDIUM',
             'Steam trapped between layers causes surface blistering and layer separation.'),
            ({'bubbling', 'missing_top_face'},     'HIGH',
             'Adhesive failure during pressing can cause both bubbling and veneer detachment.'),
            ({'missing_edges', 'delamination'},    'MEDIUM',
             'Edge delamination can progress to material loss at board edges.'),
            ({'missing_top_face', 'delamination'}, 'HIGH',
             'Severe delamination can cause the top veneer to detach entirely.'),
        ]
        for pair_set, severity, note in rules:
            if pair_set.issubset(ds):
                pairs.append(
                    {'pair': list(pair_set), 'causal_note': note, 'severity': severity})
        return pairs

    def _verdict(self, defects, confidences):
        if not defects:
            return 'PASS'
        high_conf = [d for d in defects if confidences[d] >= 0.70]
        if len(defects) >= 2 or high_conf:
            return 'FAIL'
        return 'REVIEW'
