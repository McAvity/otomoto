# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Violentmonkey userscript project that automatically extracts structured data from otomoto.pl car listings and stores it via a FastAPI backend. The userscript injects a floating window that performs data extraction, allows user notes/ratings, and persists data across page reloads.

## Architecture

**Two-Component Data Extraction System:**
- **Backend (`backend/`)**: FastAPI server with optimized car data storage using car ID-based file naming and in-memory indexing
- **Frontend (`frontend/simple.user.js`)**: Advanced userscript that auto-extracts 19+ data fields, handles phone/VIN revelation, and manages user persistence

**Key Integration Points:**
- CORS configuration allows `https://www.otomoto.pl` to access `http://127.0.0.1:8000`
- Userscript runs on URLs matching `https://www.otomoto.pl/dostawcze/oferta/*` (specific car listing pages)
- Backend stores car data as `car_data_{car_id}_latest.json` with O(1) lookup performance
- Car ID extraction from URLs using regex pattern: `ID([A-Za-z0-9]+)`
- Automatic button clicking for phone number and VIN revelation
- User notes and star ratings persist across page reloads using car ID matching

## Common Commands

### Backend Development
```bash
# Start backend server with auto-reload
cd backend
uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Run backend tests
cd backend
uv run pytest tests/ -v

# Install backend dependencies
cd backend
uv sync --extra test
```

### Testing
```bash
# Run all tests (backend + integration)
uv run pytest tests/ -v

# Manual verification tests (backend, CORS, file validation)
uv run pytest tests/test_manual_verification.py -v

# Automated end-to-end Selenium tests (opens real Firefox)
uv run pytest tests/test_selenium_auto.py -v

# Single test file
uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_otomoto_page_loads -v -s

# Test data extraction on specific car listing
uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_data_extraction_citroen_jumper -v -s

# Test notes/rating persistence
uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_note_grade_persistence -v -s
```

### Userscript Development
The userscript (`frontend/simple.user.js`) requires manual installation in Violentmonkey:
1. Point Violentmonkey to local file: `file:///Users/marcin/workspace/otomoto/frontend/simple.user.js`
2. Changes to the file auto-reload when the page refreshes
3. Test on any `https://www.otomoto.pl/dostawcze/oferta/*` URL (specific car listings)

## Project Structure

- `backend/main.py` - FastAPI app with data storage endpoints (`/save-extracted-data`, `/save-html`, `/get-existing-data/{car_id}`)
- `backend/extracted_data/` - JSON files with car data using naming: `car_data_{car_id}_latest.json`
- `backend/html_snapshots/` - HTML page snapshots (ignored by git)
- `frontend/simple.user.js` - Advanced userscript with auto-extraction, notes/ratings, phone/VIN revelation
- `tests/test_selenium_auto.py` - Comprehensive end-to-end testing including data extraction and persistence
- `tests/test_manual_verification.py` - Backend validation, CORS testing, file integrity checks
- Separate `pyproject.toml` files for backend vs integration test dependencies

## Testing Strategy

**Three-Layer Testing:**
1. **Manual Verification** - Backend endpoints, CORS headers, userscript file validation  
2. **Selenium Automation** - Full end-to-end testing that opens Firefox, navigates to otomoto.pl, injects userscript, and validates data extraction
3. **Data Extraction Testing** - Validates 19+ field extraction, phone/VIN revelation, notes/ratings persistence

The Selenium tests (`test_selenium_auto.py`) are particularly important as they prove the complete data extraction pipeline works by:
- Injecting userscript into real browser sessions
- Testing auto-extraction on specific car listings (e.g., Citroen Jumper with known phone: 602378764)
- Validating phone number extraction via button clicking
- Testing VIN extraction and masked VIN handling
- Verifying notes and ratings persist across page reloads

## Development Workflow

1. Start backend: `cd backend && uv run uvicorn main:app --reload`
2. Modify userscript: Edit `frontend/simple.user.js`
3. Test changes: Refresh browser page (Violentmonkey auto-reloads)
4. Verify integration: Run `uv run pytest tests/test_selenium_auto.py -v`

The backend runs on fixed port 8000 and the userscript is hardcoded to this endpoint, so both must be running simultaneously for integration testing.

## Data Extraction Architecture

**19+ Field Extraction System:**
- Car details: name, brand, model, year, price, location, mileage, fuel, transmission
- Contact info: phone (via button clicking), VIN (via link clicking) 
- User data: notes (text area), grade (1-5 star rating), timestamps
- Persistence: Car ID extracted from URL, data stored as `car_data_ID6HvgDG_latest.json`

**Performance Optimizations:**
- In-memory car index (CAR_INDEX) for O(1) data lookups
- Direct file access pattern: `car_data_{car_id}_latest.json`
- Background tab support with visibility change detection
- HTML snapshots stored separately in `html_snapshots/` (git ignored)

**Button Automation:**
- Phone revelation: Searches for "Wyświetl numer" buttons, clicks, waits, extracts phone regex
- VIN extraction: Finds "Wyświetl VIN" links, clicks, extracts 17-character VIN or masked patterns
- Cookie popup dismissal for unblocked automation