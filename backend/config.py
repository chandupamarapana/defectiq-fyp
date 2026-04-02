import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get(
    'SECRET_KEY',   'defectiq-secret-key-2026-chandupa-marapana-iit')
DATABASE_URL = os.environ.get('DATABASE_URL', '')

UPLOAD_FOLDER = 'uploads'
MAX_CONTENT_LENGTH = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
THRESHOLD = 0.50
CLEAN_BOARD_GATE = 0.30

SURFACE_DEFECTS = {'bubbling', 'imprint_on_surface', 'missing_face'}
STRUCTURAL_DEFECTS = {'warping', 'delamination'}

DEFECT_REASONS = {
    "bubbling": {
        "summary": "Raised bubbles on the surface caused by trapped moisture or gases during pressing.",
        "recommendations": [
            "Control moisture content of veneers before pressing",
            "Check pressing temperature and pressure settings",
            "Inspect adhesive application for uneven spread"
        ]
    },
    "delamination": {
        "summary": "Layer separation due to weak adhesive bonding between veneer plies.",
        "recommendations": [
            "Verify glue spread rate and coverage uniformity",
            "Check press temperature and pressure cycles",
            "Inspect veneer moisture content before bonding"
        ]
    },
    "warping": {
        "summary": "Board bending caused by uneven moisture distribution or stress imbalance.",
        "recommendations": [
            "Improve drying and conditioning process",
            "Store sheets flat with uniform stacking pressure",
            "Balance veneer grain direction across plies"
        ]
    },
    "imprint_on_surface": {
        "summary": "Visible surface imprint or sunken top-face pattern caused by misaligned or uneven internal veneers beneath the face layer.",
        "recommendations": [
            "Check veneer alignment during lay-up",
            "Ensure inner veneer layers are placed evenly before pressing",
            "Inspect core assembly process for misplacement or overlap of internal veneers"
        ]
    },
    "missing_face": {
        "summary": "Edge or top face material missing due to cutting errors, transport damage, or veneer detachment.",
        "recommendations": [
            "Calibrate cutting equipment alignment",
            "Improve packing and transport procedures",
            "Check veneer placement and bond cycle settings"
        ]
    },
}
