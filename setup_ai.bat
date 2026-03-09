@echo off
echo Setting up Python environment for AI Service...

cd apps/ai-service
python -m venv venv
call venv\Scripts\activate
pip install -r requirements.txt

echo.
echo AI Service Setup Complete!
echo NOTE: Please ensure Tesseract OCR is installed on your Windows machine:
echo Download from: https://github.com/UB-Mannheim/tesseract/wiki
echo.
pause
