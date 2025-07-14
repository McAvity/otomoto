import datetime
import json
import re
from pathlib import Path
from typing import Dict, Any
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response
from pydantic import BaseModel

app = FastAPI(title="Otomoto Script Backend", version="1.0.0")

# Data storage directories
STORAGE_DIR = Path("extracted_data")
HTML_DIR = Path("html_snapshots")
STORAGE_DIR.mkdir(exist_ok=True)
HTML_DIR.mkdir(exist_ok=True)

# In-memory index for fast car data lookup: car_id -> (filename, last_saved)
CAR_INDEX: Dict[str, tuple] = {}

# Pydantic models
class ExtractedData(BaseModel):
    url: str
    timestamp: str
    data: Dict[str, Any]

class HTMLData(BaseModel):
    url: str
    html_content: str

# Index management functions
def extract_car_id_from_url(url: str) -> str:
    """Extract car ID from otomoto URL (format: ...ID6HvgDG.html)"""
    match = re.search(r'ID([A-Za-z0-9]+)', url)
    return f"ID{match.group(1)}" if match else ""

def rebuild_index():
    """Rebuild the car index by scanning all existing JSON files"""
    global CAR_INDEX
    CAR_INDEX.clear()
    
    try:
        # Look for both old and new format files
        old_files = list(STORAGE_DIR.glob("extracted_data_*.json"))
        new_files = list(STORAGE_DIR.glob("car_data_*_latest.json"))
        json_files = old_files + new_files
        
        print(f"Rebuilding index from {len(json_files)} files ({len(old_files)} old format, {len(new_files)} new format)...")
        
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                # Extract car ID from filename or URL
                if json_file.name.startswith("car_data_"):
                    # New format: car_data_ID6HvgDG_latest.json
                    car_id_match = re.search(r'car_data_(ID[A-Za-z0-9]+)_latest\.json', json_file.name)
                    car_id = car_id_match.group(1) if car_id_match else ""
                else:
                    # Old format: extract from URL
                    url = data.get('url', '')
                    car_id = extract_car_id_from_url(url)
                
                last_saved = data.get('timestamp', '')
                
                if car_id:
                    # For new format, we can directly use the file since it's already "latest"
                    # For old format, keep only the latest file for each car_id
                    if car_id not in CAR_INDEX or last_saved > CAR_INDEX[car_id][1]:
                        CAR_INDEX[car_id] = (json_file.name, last_saved)
                        
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Skipping corrupted file {json_file}: {e}")
                continue
        
        print(f"Index rebuilt with {len(CAR_INDEX)} car entries")
        
    except Exception as e:
        print(f"Failed to rebuild index: {e}")
        CAR_INDEX.clear()

def update_index(car_id: str, filename: str, timestamp: str):
    """Update the index with new car data"""
    global CAR_INDEX
    if car_id:
        CAR_INDEX[car_id] = (filename, timestamp)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/favicon.ico")
def favicon():
    return Response(status_code=204)

@app.get("/")
def read_root():
    return {"message": "Otomoto Script Backend is running"}

@app.get("/message")
def get_message():
    return {"message": f"Hello from the backend! {datetime.datetime.now()}"}

@app.post("/save-extracted-data")
def save_extracted_data(data: ExtractedData):
    try:
        # Extract car ID for new naming scheme
        car_id = extract_car_id_from_url(data.url)
        if not car_id:
            raise HTTPException(status_code=400, detail="Could not extract car ID from URL")
        
        # New filename format: car_data_{car_id}_latest.json
        filename = f"car_data_{car_id}_latest.json"
        filepath = STORAGE_DIR / filename
        
        # Save the extracted data (overwrites previous data for this car)
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(data.dict(), f, ensure_ascii=False, indent=2)
        
        # Update index with new data
        update_index(car_id, filename, data.timestamp)
        
        return {
            "status": "success",
            "message": f"Data saved to {filename}",
            "filepath": str(filepath),
            "car_id": car_id,
            "filename": filename
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save data: {str(e)}")

@app.post("/save-html")
def save_html(data: HTMLData):
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"page_html_{timestamp}.html"
        filepath = HTML_DIR / filename
        
        # Save the HTML content
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(data.html_content)
        
        return {
            "status": "success",
            "message": f"HTML saved to {filename}",
            "filepath": str(filepath),
            "timestamp": timestamp
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to save HTML: {str(e)}")

@app.get("/get-existing-data/{car_id}")
def get_existing_data(car_id: str):
    """Get existing notes and grade for a car ID if they exist (super fast direct access)"""
    try:
        # First try direct file access with new naming scheme
        direct_filename = f"car_data_{car_id}_latest.json"
        direct_path = STORAGE_DIR / direct_filename
        
        if direct_path.exists():
            try:
                with open(direct_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                
                user_data = data.get('data', {})
                return {
                    "status": "found",
                    "user_notes": user_data.get('user_notes', ''),
                    "user_grade": user_data.get('user_grade', 0),
                    "last_saved": data.get('timestamp', ''),
                    "filename": direct_filename
                }
            except (json.JSONDecodeError, KeyError):
                print(f"Corrupted file: {direct_filename}")
        
        # Fallback to index lookup for legacy files
        if car_id in CAR_INDEX:
            filename, _ = CAR_INDEX[car_id]
            file_path = STORAGE_DIR / filename
            
            # Verify file still exists
            if file_path.exists():
                try:
                    with open(file_path, 'r', encoding='utf-8') as f:
                        data = json.load(f)
                    
                    user_data = data.get('data', {})
                    return {
                        "status": "found",
                        "user_notes": user_data.get('user_notes', ''),
                        "user_grade": user_data.get('user_grade', 0),
                        "last_saved": data.get('timestamp', ''),
                        "filename": filename
                    }
                except (json.JSONDecodeError, KeyError):
                    # File is corrupted, remove from index
                    del CAR_INDEX[car_id]
            else:
                # File was deleted, remove from index
                del CAR_INDEX[car_id]
        
        return {
            "status": "not_found",
            "user_notes": "",
            "user_grade": 0,
            "message": "No existing data found for this car ID"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to retrieve existing data: {str(e)}")

# Startup event to rebuild index
@app.on_event("startup")
async def startup_event():
    """Initialize the car index on startup"""
    print("Starting Otomoto Backend...")
    rebuild_index()
    print(f"Backend ready with {len(CAR_INDEX)} cars indexed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8000, reload=True)