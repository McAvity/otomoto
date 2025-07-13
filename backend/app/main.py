from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.api.campers import router as campers_router

# Create FastAPI app
app = FastAPI(
    title=settings.app_name,
    description="Backend API for scraping and managing otomoto camper data",
    version="1.0.0",
    debug=settings.debug
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=True,
    allow_methods=settings.allowed_methods,
    allow_headers=settings.allowed_headers,
)

# Include routers
app.include_router(campers_router)


@app.get("/")
async def root():
    return {
        "message": "Otomoto Camper Scraper API",
        "version": "1.0.0",
        "endpoints": {
            "campers": "/api/campers",
            "html_pages": "/api/html-pages",
            "docs": "/docs"
        }
    }


@app.get("/health")
async def health_check():
    return {"status": "healthy"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "app.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug
    )