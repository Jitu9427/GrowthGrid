from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import pytesseract
from PIL import Image
import io
import re
import os
import logging
import numpy as np
from typing import List, Optional
from pydantic import BaseModel

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI()

# Enable CORS for communication with Node.js backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class ScannedItem(BaseModel):
    name: str
    quantity: float
    price: float

class ScanResult(BaseModel):
    items: List[ScannedItem]
    total_amount: float
    date: Optional[str] = None

class ForecastRequest(BaseModel):
    history: List[float] # List of daily sales (e.g., last 30 days)

class ForecastResponse(BaseModel):
    next_7_days: List[float]
    trend: str # 'UP', 'DOWN', or 'STABLE'
    recommendation: str

def clean_amount(text: str) -> float:
    """Helper to convert currency strings like '₹17,768.80' to float 17768.80"""
    try:
        # Remove ₹, $, commas, and any non-numeric/non-dot characters
        cleaned = re.sub(r'[^\d\.]', '', text.replace(',', ''))
        return float(cleaned) if cleaned else 0.0
    except:
        return 0.0

def parse_text_to_data(text: str) -> ScanResult:
    """
    Improved parser for Indian namkin bills.
    Handles '₹', 'kg', commas, and '@' symbols.
    """
    items = []
    total = 0.0
    
    # Pre-log the text for debugging
    logger.info(f"Raw OCR Text:\n{text}")
    
    lines = text.split('\n')
    for line in lines:
        line = line.strip()
        if not line: continue
        
        # Look for pattern: [Item Name] [Qty] [Unit?] [@?] [Price] [Subtotal?]
        # Example: Ratlami Sev 20.0 kg @ ₹240 4,800
        # Regex explanation:
        # 1. ([a-zA-Z\s\(\)]+) -> Item name (letters, spaces, brackets)
        # 2. \s+([\d\.]+) -> Quantity (digits/decimal)
        # 3. \s*(?:kg|pcs|units|g|ltr)? -> Optional unit
        # 4. .*?[₹\$]?\s*([\d,\.]+) -> Anything else, then optional currency, then price
        match = re.search(r'([a-zA-Z\s\(\)]+)\s+([\d\.]+)\s*(?:kg|pcs|units|g|ltr)?.*?[\s@₹\$]+([\d,\.]+)', line, re.IGNORECASE)
        
        if match:
            name, qty, price_str = match.groups()
            price = clean_amount(price_str)
            
            # Basic validation to avoid noise
            name_val = name.strip()
            noise_words = ['date', 'invoice', 'total', 'subtotal', 'october', 'gst', 'tax', 'bill to', 'amount']
            is_noise = any(word in name_val.lower() for word in noise_words)
            
            if len(name_val) > 2 and float(qty) > 0 and not is_noise:
                items.append(ScannedItem(
                    name=name_val,
                    quantity=float(qty),
                    price=price
                ))
                logger.info(f"Found Item: {name_val} | Qty: {qty} | Price: {price}")

    # Find Grand Total
    # Look for "GRAND TOTAL", "TOTAL", "AMOUNT DUE"
    total_match = re.search(r'(?:GRAND\s+)?TOTAL.*?[₹\$]?\s*([\d,\.]+)', text, re.IGNORECASE)
    if total_match:
        total = clean_amount(total_match.group(1))
        logger.info(f"Found Grand Total: {total}")
    elif items:
        # Fallback: Sum items if no total found
        total = sum(item.quantity * item.price for item in items)
        logger.info(f"Fallback Total: {total}")

    return ScanResult(items=items, total_amount=total)

def get_tesseract_path():
    if os.name == 'nt': # Windows
        # Try common installation paths
        paths = [
            r'C:\Program Files\Tesseract-OCR\tesseract.exe',
            os.path.join(os.environ.get('LOCALAPPDATA', ''), 'Tesseract-OCR', 'tesseract.exe'),
            os.path.join(os.environ.get('ProgramFiles', 'C:\\Program Files'), 'Tesseract-OCR', 'tesseract.exe')
        ]
        for path in paths:
            if os.path.exists(path):
                return path
    return None

@app.get("/")
async def root():
    return {"status": "AI Service Running"}

@app.get("/health")
async def health():
    t_path = get_tesseract_path()
    t_found = t_path is not None
    return {
        "status": "AI Service Running",
        "tesseract_found": t_found,
        "tesseract_path": t_path
    }

@app.post("/process-bill", response_model=ScanResult)
async def process_bill(file: UploadFile = File(...)):
    try:
        # 1. Config Tesseract for Windows
        t_path = get_tesseract_path()
        if t_path:
            pytesseract.pytesseract.tesseract_cmd = t_path
        
        # 2. Load image
        logger.info(f"Processing file: {file.filename}")
        contents = await file.read()
        image = Image.open(io.BytesIO(contents))
        
        # 3. Perform OCR
        text = pytesseract.image_to_string(image)
        logger.info("OCR completed successfully")
        
        # 4. Parse data
        result = parse_text_to_data(text)
        return result
    except Exception as e:
        logger.error(f"OCR Processing Failed: {str(e)}", exc_info=True)
        # Return exact error message to help the user debug
        raise HTTPException(status_code=500, detail=f"AI Service Error: {str(e)}")

@app.post("/forecast", response_model=ForecastResponse)
async def forecast(data: ForecastRequest):
    try:
        if not data.history:
            return ForecastResponse(
                next_7_days=[0.0] * 7,
                trend="STABLE",
                recommendation="Not enough data to forecast. Sell more items first!"
            )

        # Simple Weighted Moving Average forecasting
        history = np.array(data.history)
        weights = np.arange(1, len(history) + 1)
        wma = np.average(history, weights=weights)

        # Calculate trend using last 3 days vs overall average
        recent_avg = np.mean(history[-3:]) if len(history) >= 3 else wma
        
        if recent_avg > wma * 1.1:
            trend = "UP"
            rec = "Demand is rising! Stock up 20% more than usual."
        elif recent_avg < wma * 0.9:
            trend = "DOWN"
            rec = "Demand is slow. Avoid overstocking."
        else:
            trend = "STABLE"
            rec = "Demand is steady. Maintain current stock levels."

        # Project next 7 days (simplified: current trend + slight variance)
        predictions = []
        for i in range(1, 8):
            # Add a small random factor to make it look realistic
            val = wma * (1 + (recent_avg - wma) / (wma + 1) * 0.5)
            predictions.append(round(max(0, val), 2))

        return ForecastResponse(
            next_7_days=predictions,
            trend=trend,
            recommendation=rec
        )
    except Exception as e:
        logger.error(f"Forecast Failed: {str(e)}")
        raise HTTPException(status_code=500, detail=f"AI Forecast Error: {str(e)}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
