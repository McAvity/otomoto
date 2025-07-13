# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a Violentmonkey userscript project that demonstrates browser-backend communication. The userscript injects a floating window into otomoto.pl pages that displays real-time messages from a FastAPI backend.

## Architecture

**Two-Component System:**
- **Backend (`backend/`)**: FastAPI server with CORS-enabled endpoints that serve JSON messages with timestamps
- **Frontend (`frontend/simple.user.js`)**: Violentmonkey userscript that creates floating UI and fetches data via cross-origin requests

**Key Integration Points:**
- CORS configuration allows `https://www.otomoto.pl` to access `http://127.0.0.1:8000`
- Userscript runs only on URLs matching `https://www.otomoto.pl/dostawcze/*`
- Backend serves timestamped messages at `/message` endpoint
- No localStorage usage - all data comes from live API calls

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

# Backend unit tests only
cd backend && uv run pytest tests/ -v

# Single test file
uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_otomoto_page_loads -v -s
```

### Userscript Development
The userscript (`frontend/simple.user.js`) requires manual installation in Violentmonkey:
1. Point Violentmonkey to local file: `file:///Users/marcin/workspace/otomoto/frontend/simple.user.js`
2. Changes to the file auto-reload when the page refreshes
3. Test on any `https://www.otomoto.pl/dostawcze/*` URL

## Project Structure

- `backend/main.py` - FastAPI app with `/`, `/message`, `/favicon.ico` endpoints
- `frontend/simple.user.js` - Complete userscript with UI creation, API calls, error handling
- `tests/test_selenium_auto.py` - Automated browser testing that injects userscript and verifies functionality
- `tests/test_manual_verification.py` - Backend validation, CORS testing, file integrity checks
- Separate `pyproject.toml` files for backend vs integration test dependencies

## Testing Strategy

**Three-Layer Testing:**
1. **Backend Unit Tests** - FastAPI endpoint testing with pytest + httpx
2. **Manual Verification** - CORS headers, backend accessibility, userscript file validation  
3. **Selenium Automation** - Full end-to-end testing that opens Firefox, navigates to otomoto.pl, injects userscript, and validates floating window creation

The Selenium tests (`test_selenium_auto.py`) are particularly important as they prove the complete integration works by programmatically injecting the userscript into a real browser session.

## Development Workflow

1. Start backend: `cd backend && uv run uvicorn main:app --reload`
2. Modify userscript: Edit `frontend/simple.user.js`
3. Test changes: Refresh browser page (Violentmonkey auto-reloads)
4. Verify integration: Run `uv run pytest tests/test_selenium_auto.py -v`

The backend runs on fixed port 8000 and the userscript is hardcoded to this endpoint, so both must be running simultaneously for integration testing.