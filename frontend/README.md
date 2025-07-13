# Otomoto Scraper - Tampermonkey Frontend

## Installation

1. Install Tampermonkey extension in your browser:
   - Chrome: [Chrome Web Store](https://chrome.google.com/webstore/detail/tampermonkey/dhdgffkkebhmkfjojejmpbldmpobfkfo)
   - Firefox: [Firefox Add-ons](https://addons.mozilla.org/en-US/firefox/addon/tampermonkey/)
   - Safari: [App Store](https://apps.apple.com/us/app/tampermonkey/id1482490089)

2. Open Tampermonkey Dashboard

3. Click "Create a new script"

4. Replace the default content with the contents of `otomoto-scraper.js`

5. Save the script (Ctrl+S or Cmd+S)

## Usage

1. Start the backend server:
   ```bash
   cd backend
   uv run python -m app.main
   ```

2. Navigate to any otomoto.pl camper page:
   - Listing pages: https://www.otomoto.pl/dostawcze/kamper/...
   - Detail pages: https://www.otomoto.pl/dostawcze/...

3. The scraper panel will appear in the top-right corner

4. Use the buttons to:
   - **Send HTML to Backend**: Saves the current page HTML for analysis
   - **Extract & Save Data**: Extracts basic data and saves to backend
   - **View Saved Data**: Shows count of saved campers

## Features

- **Auto-detection** of listing and detail pages
- **HTML page storage** for future analysis
- **Basic data extraction** (ID, title, price)
- **Draggable UI panel** 
- **Real-time status updates**
- **Cross-browser compatibility**

## Configuration

Edit the CONFIG object in the script to customize:

```javascript
const CONFIG = {
    API_BASE_URL: 'http://127.0.0.1:8000/api',  // Backend URL
    AUTO_SCRAPE: true,                          // Auto-send HTML
    DEBUG: true                                 // Enable debug logging
};
```

## Troubleshooting

- **CORS errors**: Make sure the backend is running and CORS is enabled
- **No data extracted**: Check browser console for debug messages
- **Script not loading**: Verify the script is enabled in Tampermonkey dashboard