# Otomoto Camper Scraper

A FastAPI backend with Tampermonkey frontend for scraping and analyzing camper data from otomoto.pl.

## Features

- **FastAPI Backend**: RESTful API with JSON file storage
- **HTML Page Storage**: Save complete page HTML for future analysis
- **Tampermonkey Frontend**: Browser extension for real-time scraping
- **Data Management**: Store camper data, user ratings, and notes
- **Cross-browser Support**: Works on Chrome, Firefox, Safari

## Project Structure

```
otomoto/
├── backend/                    # FastAPI backend
│   ├── app/
│   │   ├── models/            # Pydantic data models
│   │   ├── api/               # API endpoints
│   │   ├── storage.py         # JSON file operations
│   │   ├── config.py          # Configuration
│   │   └── main.py            # FastAPI app
│   └── pyproject.toml         # uv configuration
├── frontend/                  # Tampermonkey userscript
│   ├── otomoto-scraper.js     # Main userscript
│   └── README.md              # Installation guide
├── examples/                  # Sample HTML pages
│   ├── listing.html           # Search results page
│   └── details.html           # Vehicle detail page
└── README.md                  # This file
```

## Quick Start

### 1. Backend Setup

```bash
cd backend
uv run python -m app.main
```

The API will be available at http://127.0.0.1:8000

### 2. Frontend Setup

1. Install Tampermonkey browser extension
2. Copy the script from `frontend/otomoto-scraper.js`
3. Create a new userscript in Tampermonkey
4. Save and enable the script

### 3. Usage

1. Navigate to otomoto.pl camper pages
2. Use the scraper panel to:
   - Send HTML pages to backend for analysis
   - Extract and save camper data
   - View saved data count

## API Endpoints

### Campers
- `POST /api/campers` - Create/update camper data
- `GET /api/campers` - Get all campers
- `GET /api/campers/{id}` - Get specific camper
- `PUT /api/campers/{id}/notes` - Update notes
- `PUT /api/campers/{id}/rating` - Update rating (1-10)

### HTML Pages
- `POST /api/html-pages` - Save HTML page for analysis
- `GET /api/html-pages` - Get saved HTML pages
- `GET /api/html-pages/{id}` - Get specific HTML page

### Other
- `GET /` - API information
- `GET /health` - Health check
- `GET /docs` - Interactive API documentation

## Data Storage

- **Campers**: `backend/data/campers.json`
- **HTML Pages**: `backend/data/html_pages.json`

## Features Implemented

✅ FastAPI backend with JSON storage  
✅ HTML page storage for analysis  
✅ Basic Tampermonkey script  
✅ Page type detection (listing/detail)  
✅ Data extraction framework  
✅ CORS enabled for browser requests  
✅ User ratings and notes system  

## Next Steps

- Enhance data extraction using actual HTML structure
- Add rating and notes UI to detail pages
- Implement listing page overlays
- Add data export functionality
- Improve error handling and retry logic

## Development

The backend uses:
- **FastAPI** for the web framework
- **Pydantic** for data validation
- **uv** for Python package management
- **JSON files** for simple data storage

The frontend uses:
- **Tampermonkey** for browser scripting
- **Vanilla JavaScript** for DOM manipulation
- **GM_xmlhttpRequest** for API calls