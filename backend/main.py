import datetime
import json
import re
from pathlib import Path
from typing import Dict, Any, List
from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import Response, HTMLResponse
from fastapi.responses import RedirectResponse

from fastapi.templating import Jinja2Templates
from pydantic import BaseModel

app = FastAPI(title="Otomoto Script Backend", version="1.0.0")

# Data storage directories
STORAGE_DIR = Path("extracted_data")
HTML_DIR = Path("html_snapshots")
STORAGE_DIR.mkdir(exist_ok=True)
HTML_DIR.mkdir(exist_ok=True)

# Jinja2 templates
templates = Jinja2Templates(directory="templates")

# In-memory index for fast car data lookup: car_id -> filename
CAR_INDEX: Dict[str, str] = {}

# Pydantic models
class ExtractedData(BaseModel):
    url: str
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

                if car_id:
                    # For new format, we can directly use the file since it's already "latest"
                    # For old format, keep only the latest file for each car_id
                    if car_id not in CAR_INDEX:
                        CAR_INDEX[car_id] = (json_file.name)
                        
            except (json.JSONDecodeError, KeyError) as e:
                print(f"Skipping corrupted file {json_file}: {e}")
                continue
        
        print(f"Index rebuilt with {len(CAR_INDEX)} car entries")
        
    except Exception as e:
        print(f"Failed to rebuild index: {e}")
        CAR_INDEX.clear()

def update_index(car_id: str, filename: str):
    """Update the index with new car data"""
    global CAR_INDEX
    if car_id:
        CAR_INDEX[car_id] = filename

def load_all_cars() -> List[Dict[str, Any]]:
    """Load all car data from JSON files"""
    cars = []
    
    try:
        # Get all car data files
        json_files = list(STORAGE_DIR.glob("car_data_*_latest.json"))
        
        for json_file in json_files:
            try:
                with open(json_file, 'r', encoding='utf-8') as f:
                    file_data = json.load(f)
                
                car_data = file_data.get('data', {})
                
                # Extract car ID from filename
                car_id_match = re.search(r'car_data_(ID[A-Za-z0-9]+)_latest\.json', json_file.name)
                car_id = car_id_match.group(1) if car_id_match else ""
                
                # Add metadata
                car_data['car_id'] = car_id
                car_data['url'] = file_data.get('url', '')
                
                # Ensure numeric rating
                user_grade = car_data.get('user_grade', 0)
                if isinstance(user_grade, str):
                    try:
                        user_grade = int(user_grade)
                    except (ValueError, TypeError):
                        user_grade = 0
                car_data['user_grade'] = user_grade
                
                # Add disabled field with default false for existing records
                car_data['disabled'] = car_data.get('disabled', False)
                
                cars.append(car_data)
                
            except (json.JSONDecodeError, Exception) as e:
                print(f"Error loading car data from {json_file}: {e}")
                continue
    
    except Exception as e:
        print(f"Error loading car data: {e}")
    
    return cars

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
    return RedirectResponse("/cars")

@app.get("/message")
def get_message():
    return {"message": f"Hello from the backend! {datetime.datetime.now()}"}

@app.get("/cars", response_class=HTMLResponse)
def get_cars_table(request: Request):
    """Display all cars in a neat HTML table sorted by rating"""
    try:
        # Load all car data
        cars = load_all_cars()
        
        # Sort by rating (highest first)
        cars.sort(key=lambda x: (x.get('user_grade', 0)), reverse=True)
        
        # Calculate statistics
        rated_cars = [car for car in cars if car.get('user_grade', 0) > 0]
        rated_cars_count = len(rated_cars)
        average_rating = sum(car.get('user_grade', 0) for car in rated_cars) / rated_cars_count if rated_cars_count > 0 else 0
        
        return templates.TemplateResponse("cars_table.html", {
            "request": request,
            "cars": cars,
            "rated_cars_count": rated_cars_count,
            "average_rating": average_rating,
        })
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load cars table: {str(e)}")

@app.get("/api/known-cars")
def get_known_cars():
    """Get list of known car IDs with metadata for userscript listing page highlighting"""
    try:
        # Load all car data
        cars = load_all_cars()
        
        # Extract only the needed fields for listing page
        known_cars = []
        for car in cars:
            car_id = car.get('car_id', '')
            if car_id:
                user_notes = car.get('user_notes', '').strip().replace('\n', '<br/>')
                known_cars.append({
                    'car_id': car_id,
                    'user_grade': car.get('user_grade', 0),
                    'has_notes': bool(user_notes),
                    'user_notes': user_notes,
                    'car_name': car.get('car_name', ''),
                    'price': car.get('price', ''),
                    'disabled': car.get('disabled', False)
                })
        
        return {"known_cars": known_cars}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to load known cars: {str(e)}")

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
                
        # Check if car_name is empty in the incoming data
        incoming_car_name = data.data.get('car_name', '').strip()
        
        if not incoming_car_name:
            # Load existing data if file exists
            final_data = {}
            if filepath.exists():
                try:
                    with open(filepath, 'r', encoding='utf-8') as f:
                        final_data = json.load(f).get('data', {})
                except (json.JSONDecodeError, KeyError):
                    pass  # If file is corrupted, start fresh
            final_data['disabled'] = True
        else:
            # If car_name has content, use new data and set disabled to false
            final_data = data.data.copy()
            final_data['disabled'] = False
        
        # Create the final payload
        final_payload = {
            "url": data.url,
            "data": final_data
        }
        
        # Save the extracted data
        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(final_payload, f, ensure_ascii=False, indent=2)
        
        # Update index with new data
        update_index(car_id, filename)
        
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