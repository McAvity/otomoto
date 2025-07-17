# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Violentmonkey userscript project that automatically extracts structured data from otomoto.pl car listings and stores it via a FastAPI backend. The userscript operates in dual mode:
- **Listing pages**: Highlights known cars with ratings, reorders by priority (unseen first, then by rating)
- **Offer pages**: Floating window with data extraction, notes/ratings, and persistence across page reloads

## Architecture

**Two-Component Dual-Mode System:**
- **Backend (`backend/`)**: FastAPI server with optimized car data storage using car ID-based file naming and in-memory indexing
- **Frontend (`frontend/simple.user.js`)**: Advanced userscript with dual mode operation:
  - **Listing Mode**: Visual car highlighting, rating display, smart reordering
  - **Offer Mode**: Full data extraction (19+ fields), phone/VIN revelation, user notes/ratings

**Key Integration Points:**
- CORS configuration allows `https://www.otomoto.pl` to access `http://127.0.0.1:8000`
- Userscript runs on URLs matching `https://www.otomoto.pl/dostawcze/*` (all pages)
  - **Listing pages** (`/dostawcze/*`): Car highlighting and reordering
  - **Offer pages** (`/dostawcze/oferta/*`): Data extraction with floating window
- Backend stores car data as `car_data_{car_id}_latest.json` with O(1) lookup performance
- Car ID extraction from URLs using regex pattern: `ID([A-Za-z0-9]+)`
- New API endpoint `/api/known-cars` provides car metadata for listing page highlighting
- Automatic button clicking for phone number and VIN revelation
- User notes and star ratings persist across page reloads using car ID matching

## Common Commands

### Quick Start
```bash
# Start development environment
make run                    # Start backend server with auto-reload

# Development workflow
make dev-setup             # Install all dependencies
make dev-test              # Run quick tests during development
```

### Backend Development
```bash
# Start backend server with auto-reload
cd backend
uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload

# Install backend dependencies
cd backend
uv sync --extra test
```

### Testing (Make Targets)
```bash
# Quick tests for development
make test-quick            # Fast API and regex tests (< 5 seconds)
make test-validation       # Userscript file validation only

# Comprehensive testing
make test-api              # New API endpoints only
make test-listing          # All listing page functionality tests
make test-manual           # Manual verification and backend tests
make test-selenium         # Browser automation tests (requires Firefox)

# CI/Production testing
make ci-test               # CI-friendly tests (no browser)
make test-all              # Full test suite (includes browser automation)

# Setup
make test-setup            # Install test dependencies
make help                  # Show all available targets
```

### Testing (Direct pytest)
```bash
# Run all tests (backend + integration)
uv run pytest tests/ -v

# Manual verification tests (backend, CORS, file validation)
uv run pytest tests/test_manual_verification.py -v

# Listing page tests (API, car highlighting, reordering)
uv run pytest tests/test_listing_page.py -v

# Automated end-to-end Selenium tests (opens real Firefox)
uv run pytest tests/test_selenium_auto.py -v

# Single test file
uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_otomoto_page_loads -v -s

# Test data extraction on specific car listing
uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_data_extraction_citroen_jumper -v -s

# Test notes/rating persistence
uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_note_grade_persistence -v -s

# Test listing page integration
uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_listing_page_integration -v -s
```

### Userscript Development
The userscript (`frontend/simple.user.js`) requires manual installation in Violentmonkey:
1. Point Violentmonkey to local file: `file:///Users/marcin/workspace/otomoto/frontend/simple.user.js`
2. Changes to the file auto-reload when the page refreshes
3. Test on different page types:
   - **Listing pages**: `https://www.otomoto.pl/dostawcze/kamper/od-2000` (car highlighting and reordering)
   - **Offer pages**: `https://www.otomoto.pl/dostawcze/oferta/*` (data extraction with floating window)

## Project Structure

### Backend
- `backend/main.py` - FastAPI app with data storage endpoints:
  - `/save-extracted-data`, `/save-html`, `/get-existing-data/{car_id}` (existing)
  - `/api/known-cars` (new) - Returns car metadata for listing page highlighting
- `backend/extracted_data/` - JSON files with car data using naming: `car_data_{car_id}_latest.json`
- `backend/html_snapshots/` - HTML page snapshots (ignored by git)
- `backend/templates/cars_table.html` - HTML table view of all cars with ratings

### Frontend
- `frontend/simple.user.js` - Advanced dual-mode userscript:
  - **Listing mode**: Car highlighting, rating display, smart reordering
  - **Offer mode**: Auto-extraction (19+ fields), notes/ratings, phone/VIN revelation

### Testing
- `tests/test_listing_page.py` - Comprehensive listing page functionality tests
- `tests/test_selenium_auto.py` - End-to-end browser testing including listing page integration
- `tests/test_manual_verification.py` - Backend validation, CORS testing, file integrity checks
- `Makefile` - Test automation with quick/comprehensive/CI targets

### Configuration
- `pyproject.toml` - Root project dependencies for integration tests
- `backend/pyproject.toml` - Backend-specific dependencies
- `CLAUDE.md` - Project documentation and development guidance

## Testing Strategy

**Four-Layer Testing:**
1. **Unit Tests** - API endpoints, car ID extraction regex, data structure validation
2. **Integration Tests** - Backend-frontend communication, CORS headers, dual-mode detection
3. **Listing Page Tests** - Car highlighting, rating display, reordering logic, known car API
4. **End-to-End Browser Tests** - Full pipeline testing with real Firefox automation

**Test Categories:**
- **Quick Tests** (`make test-quick`): API and regex validation (< 5 seconds)
- **Listing Tests** (`make test-listing`): Complete listing page functionality
- **Manual Tests** (`make test-manual`): Backend validation and file integrity
- **Selenium Tests** (`make test-selenium`): Browser automation with real websites
- **CI Tests** (`make ci-test`): Automated testing without browser requirements

The Selenium tests (`test_selenium_auto.py`) prove the complete dual-mode system works by:
- **Offer Page Testing**: Injecting userscript, testing auto-extraction on specific car listings, validating phone/VIN extraction, verifying notes/ratings persistence
- **Listing Page Testing**: Verifying no floating window appears, checking car highlighting and reordering, validating API calls
- **Dual Mode Testing**: Confirming different behavior on listing vs offer pages

## Development Workflow

### Quick Development Cycle
1. **Setup**: `make dev-setup` (install dependencies)
2. **Start backend**: `make run` (auto-reload enabled)
3. **Modify userscript**: Edit `frontend/simple.user.js`
4. **Test changes**: Refresh browser page (Violentmonkey auto-reloads)
5. **Quick validation**: `make dev-test` (fast tests)
6. **Full verification**: `make test-listing` or `make test-selenium`

### Testing Workflow
- **During development**: Use `make test-quick` for rapid feedback
- **Before committing**: Run `make ci-test` for comprehensive validation
- **Full verification**: Use `make test-all` including browser automation
- **Debugging**: Check browser console for detailed logging from userscript

### Page Type Testing
- **Listing pages** (`/dostawcze/*`): Test car highlighting, rating display, reordering
- **Offer pages** (`/dostawcze/oferta/*`): Test data extraction, notes, ratings, persistence

The backend runs on fixed port 8000 and the userscript is hardcoded to this endpoint, so both must be running simultaneously for integration testing.

## Data Extraction Architecture

### Dual-Mode Operation

**Listing Page Mode** (`/dostawcze/*` excluding `/oferta/`):
- **No floating window** - preserves original page layout
- **Car highlighting**: Yellow background for known cars with ratings
- **Smart reordering**: Unseen cars first, then known cars by rating (descending)
- **Rating display**: Star ratings (⭐⭐⭐⭐☆ 4/5) appear next to prices
- **Visual indicators**: Green borders (high ratings), red borders (low ratings), notes icon (📝)
- **API integration**: Fetches known car data from `/api/known-cars` endpoint

**Offer Page Mode** (`/dostawcze/oferta/*`):
- **Floating window**: Data extraction interface with notes/ratings
- **19+ field extraction**: Car details, contact info, user data
- **Auto-extraction**: Runs automatically on page load
- **Button automation**: Phone number and VIN revelation
- **Persistence**: Notes and ratings survive page reloads

### Data Extraction System
- **Car details**: name, brand, model, year, price, location, mileage, fuel, transmission
- **Contact info**: phone (via button clicking), VIN (via link clicking) 
- **User data**: notes (text area), grade (1-5 star rating), timestamps
- **Persistence**: Car ID extracted from URL, data stored as `car_data_ID6HvgDG_latest.json`

### Performance Optimizations
- **In-memory car index** (CAR_INDEX) for O(1) data lookups
- **Direct file access** pattern: `car_data_{car_id}_latest.json`
- **Background tab support** with visibility change detection
- **HTML snapshots** stored separately in `html_snapshots/` (git ignored)
- **Efficient DOM manipulation** using jQuery and document fragments

### Button Automation
- **Phone revelation**: Searches for "Wyświetl numer" buttons, clicks, waits, extracts phone regex
- **VIN extraction**: Finds "Wyświetl VIN" links, clicks, extracts 17-character VIN or masked patterns
- **Cookie popup dismissal** for unblocked automation
- **Smart reordering**: Uses JavaScript sort with custom comparison function