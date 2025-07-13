from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query
from datetime import datetime

from app.models.camper import (
    CamperCreate, CamperInDB, CamperUpdate, 
    NotesUpdate, RatingUpdate, HTMLPageData
)
from app.storage import JSONStorage

router = APIRouter(prefix="/api", tags=["campers"])
storage = JSONStorage()


@router.post("/campers", response_model=CamperInDB)
async def create_camper(camper: CamperCreate):
    """Create or update a camper listing"""
    # Check if camper already exists
    existing = storage.get_camper(camper.id)
    
    if existing:
        # Update existing camper with new data
        camper_data = existing.model_dump()
        for key, value in camper.model_dump(exclude_unset=True).items():
            if value is not None:
                camper_data[key] = value
        camper_data["date_modified"] = datetime.utcnow()
        updated_camper = CamperInDB(**camper_data)
    else:
        # Create new camper
        updated_camper = CamperInDB(**camper.model_dump())
    
    return storage.save_camper(updated_camper)


@router.get("/campers", response_model=List[CamperInDB])
async def get_campers():
    """Get all campers"""
    return storage.get_all_campers()


@router.get("/campers/{camper_id}", response_model=CamperInDB)
async def get_camper(camper_id: str):
    """Get specific camper by ID"""
    camper = storage.get_camper(camper_id)
    if not camper:
        raise HTTPException(status_code=404, detail="Camper not found")
    return camper


@router.put("/campers/{camper_id}/notes", response_model=CamperInDB)
async def update_camper_notes(camper_id: str, notes_update: NotesUpdate):
    """Update camper notes"""
    camper = storage.update_camper_notes(camper_id, notes_update.notes)
    if not camper:
        raise HTTPException(status_code=404, detail="Camper not found")
    return camper


@router.put("/campers/{camper_id}/rating", response_model=CamperInDB)
async def update_camper_rating(camper_id: str, rating_update: RatingUpdate):
    """Update camper rating"""
    camper = storage.update_camper_rating(camper_id, rating_update.rating)
    if not camper:
        raise HTTPException(status_code=404, detail="Camper not found")
    return camper


@router.delete("/campers/{camper_id}")
async def delete_camper(camper_id: str):
    """Delete a camper"""
    success = storage.delete_camper(camper_id)
    if not success:
        raise HTTPException(status_code=404, detail="Camper not found")
    return {"message": "Camper deleted successfully"}


@router.post("/html-pages")
async def save_html_page(page_data: HTMLPageData):
    """Save HTML page for future analysis"""
    page_id = storage.save_html_page(page_data)
    return {"page_id": page_id, "message": "HTML page saved successfully"}


@router.get("/html-pages")
async def get_html_pages(
    page_type: Optional[str] = Query(None, description="Filter by page type (listing/detail)"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of pages to return")
):
    """Get saved HTML pages for analysis"""
    pages = storage.get_html_pages(page_type=page_type, limit=limit)
    return {"pages": pages, "count": len(pages)}


@router.get("/html-pages/{page_id}")
async def get_html_page(page_id: str):
    """Get specific HTML page by ID"""
    page = storage.get_html_page(page_id)
    if not page:
        raise HTTPException(status_code=404, detail="HTML page not found")
    return page