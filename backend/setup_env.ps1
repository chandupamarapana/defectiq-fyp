# setup_env.ps1
# Run from: fyp_final_prototype\backend
# Usage:    .\setup_env.ps1

Write-Host "`n[1/5] Removing old venv..." -ForegroundColor Yellow
if (Test-Path ".venv") {
    Remove-Item -Recurse -Force .venv
    Write-Host "      Old venv deleted." -ForegroundColor Gray
} else {
    Write-Host "      No existing venv found, skipping." -ForegroundColor Gray
}

Write-Host "`n[2/5] Creating new venv with Python 3.11..." -ForegroundColor Yellow
py -3.11 -m venv .venv
if (-not $?) { Write-Host "ERROR: Python 3.11 not found. Install it first." -ForegroundColor Red; exit 1 }

Write-Host "`n[3/5] Activating venv..." -ForegroundColor Yellow
.venv\Scripts\Activate.ps1

Write-Host "`n[4/5] Installing requirements..." -ForegroundColor Yellow
pip install -r requirements.txt
if (-not $?) { Write-Host "ERROR: pip install failed." -ForegroundColor Red; exit 1 }

Write-Host "`n[5/5] Verifying install..." -ForegroundColor Yellow
python -c "import torch, flask, cv2, ultralytics; print('  torch:', torch.__version__); print('  flask: OK'); print('  cv2: OK'); print('  ultralytics: OK')"

Write-Host "`nDone! Run with: python app.py`n" -ForegroundColor Green