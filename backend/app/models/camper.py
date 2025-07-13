from datetime import datetime
from typing import Optional, Dict, List, Any
from pydantic import BaseModel, Field


class CamperBase(BaseModel):
    id: str = Field(..., description="Unique listing ID from otomoto")
    url: str = Field(..., description="Full URL to the listing")
    title: str = Field(..., description="Vehicle title/name")
    price: Optional[float] = Field(None, description="Price in PLN")
    currency: str = Field(default="PLN", description="Currency")
    year: Optional[int] = Field(None, description="Vehicle year")
    mileage: Optional[int] = Field(None, description="Mileage in km")
    location: Optional[str] = Field(None, description="Vehicle location")
    images: List[str] = Field(default_factory=list, description="Image URLs")
    specifications: Dict[str, Any] = Field(default_factory=dict, description="Technical specifications")
    description: Optional[str] = Field(None, description="Full description")
    seller_info: Dict[str, Any] = Field(default_factory=dict, description="Seller information")


class CamperCreate(CamperBase):
    pass


class CamperUpdate(BaseModel):
    title: Optional[str] = None
    price: Optional[float] = None
    year: Optional[int] = None
    mileage: Optional[int] = None
    location: Optional[str] = None
    images: Optional[List[str]] = None
    specifications: Optional[Dict[str, Any]] = None
    description: Optional[str] = None
    seller_info: Optional[Dict[str, Any]] = None


class CamperInDB(CamperBase):
    user_rating: Optional[float] = Field(None, ge=1, le=10, description="User rating 1-10")
    user_notes: Optional[str] = Field(None, description="User notes")
    date_scraped: datetime = Field(default_factory=datetime.utcnow)
    date_modified: datetime = Field(default_factory=datetime.utcnow)


class NotesUpdate(BaseModel):
    notes: str = Field(..., description="User notes")


class RatingUpdate(BaseModel):
    rating: float = Field(..., ge=1, le=10, description="User rating 1-10")


class HTMLPageData(BaseModel):
    url: str = Field(..., description="Page URL")
    html: str = Field(..., description="Page HTML content")
    page_type: str = Field(..., description="Type of page (listing/detail)")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    user_agent: Optional[str] = Field(None, description="Browser user agent")