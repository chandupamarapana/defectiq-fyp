import os
from dotenv import load_dotenv

load_dotenv()

SECRET_KEY = os.environ.get(
    'SECRET_KEY',   'defectiq-secret-key-2026-chandupa-marapana-iit')
DATABASE_URL = os.environ.get('DATABASE_URL', '')

UPLOAD_FOLDER = 'uploads'
MAX_CONTENT_LENGTH = 16 * 1024 * 1024
ALLOWED_EXTENSIONS = {'png', 'jpg', 'jpeg'}
THRESHOLD = 0.48

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
        "summary": "Surface marks from press plates, handling equipment or contamination.",
        "recommendations": [
            "Clean and inspect press plates regularly",
            "Improve sheet handling and loading procedures",
            "Check for foreign material on press surfaces"
        ]
    },
    "missing_edges": {
        "summary": "Edge material missing due to cutting errors or transport damage.",
        "recommendations": [
            "Calibrate cutting equipment alignment",
            "Improve packing and transport procedures",
            "Inspect raw veneer quality before processing"
        ]
    },
    "missing_top_face": {
        "summary": "Top veneer layer missing or severely damaged, exposing inner plies.",
        "recommendations": [
            "Check veneer placement in press loading",
            "Review adhesive bond cycle settings",
            "Inspect veneer quality and thickness consistency"
        ]
    }
}
