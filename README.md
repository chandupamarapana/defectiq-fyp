# DefectIQ — Plywood Defect Detection System

Real-time computer vision system for post-manufactured plywood defect detection.

**Student:** Chandupa Marapana (w1998720)  
**Degree:** BEng Software Engineering — IIT × University of Westminster  
**Supervisor:** Ms. Sapna Kumarapathirage

---

## System Architecture

- **Frontend:** React (Vite) — port 5173
- **Backend:** Flask (Python 3.11) — port 5000
- **Database:** Supabase (PostgreSQL)
- **ML Models:** EfficientNet-B2 + AlexNet ensemble (2-model weighted fusion)
- **Board Detection:** YOLOv8-seg

## Defect Classes

bubbling · delamination · imprint_on_surface · missing_edges · missing_top_face · warping

## Model Performance

| Model                | Macro F1  | Image Acc  |
| -------------------- | --------- | ---------- |
| EfficientNet-B2      | 0.535     | 91.98%     |
| AlexNet              | 0.501     | 87.04%     |
| **2-model Ensemble** | **0.540** | **92.59%** |

## Setup

### Backend

```bash
cd backend
python -m venv .venv
.venv\Scripts\activate        # Windows
pip install -r requirements.txt
python app.py
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Environment variables

Create `backend/.env`:

```
DATABASE_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres
SECRET_KEY=your-secret-key
```

> **Note:** Model files (.pt) are not included in this repository due to file size.  
> Contact the author for access or retrain using the training scripts in `/training`.

---

## Project Structure

```
defectiq-fyp/
├── backend/
│   ├── app.py           Flask entry point
│   ├── config.py        Configuration
│   ├── database.py      Supabase queries
│   ├── auth.py          JWT authentication
│   ├── detection.py     ML inference + image processing
│   ├── ensemble_inference.py
│   ├── board_detector.py
│   └── requirements.txt
├── frontend/
│   └── src/
│       ├── App.jsx
│       ├── api.js
│       ├── pages/
│       └── components/
└── training/
    ├── train_defect_classifier_v6.py
    ├── train_defect_classifier_alexnet.py
    ├── evaluate_ensemble.py
    └── create_board_crop_dataset.py
```
