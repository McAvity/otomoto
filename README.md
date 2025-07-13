# Otomoto Violentmonkey Script Project

A simple project demonstrating communication between a Violentmonkey userscript and a FastAPI backend.

## Project Structure

```
/Users/marcin/workspace/otomoto/
├── backend/                    # FastAPI backend
│   ├── main.py                # Main FastAPI application
│   ├── pyproject.toml         # Backend dependencies
│   └── tests/                 # Backend tests
├── frontend/                  # Userscript
│   └── simple.user.js         # Violentmonkey script
├── tests/                     # Integration tests
│   └── test_integration.py    # Playwright tests
└── pyproject.toml             # Root project dependencies
```

## Quick Start

### 1. Start the Backend

```bash
cd backend
uv run uvicorn main:app --host 127.0.0.1 --port 8000 --reload
```

The backend will be available at http://127.0.0.1:8000

### 2. Install the Userscript

1. Install Violentmonkey extension in Firefox
2. Create a new script in Violentmonkey
3. Point it to the local file: `/Users/marcin/workspace/otomoto/frontend/simple.user.js`
4. Save and enable the script

### 3. Test the Integration

1. Navigate to any URL matching `https://www.otomoto.pl/dostawcze/*`
2. You should see a floating window in the top-right corner
3. The window should display the message from the backend

## Development Workflow

1. Make changes to `frontend/simple.user.js`
2. Refresh the page in the browser
3. Violentmonkey will automatically reload the updated script

## Testing

### Backend Tests
```bash
cd backend
uv run pytest tests/ -v
```

### Integration Tests
```bash
uv run pytest tests/test_integration.py -v
```

## API Endpoints

- `GET /` - Health check
- `GET /message` - Returns a static message for the userscript

## Features

- ✅ FastAPI backend with CORS support
- ✅ Violentmonkey userscript with floating UI
- ✅ Cross-origin communication
- ✅ Error handling in userscript
- ✅ Pytest tests for backend
- ✅ Playwright integration tests
- ✅ No localStorage dependency
- ✅ uv dependency management

## Manual Testing

To verify everything works:

1. Start backend: `cd backend && uv run uvicorn main:app --reload`
2. Check backend: Visit http://127.0.0.1:8000/message in browser
3. Install userscript pointing to local file
4. Visit https://www.otomoto.pl/dostawcze/anything
5. Verify floating window appears with backend message