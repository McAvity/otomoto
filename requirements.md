write a simple violentmonkey Script (simple.user.js) that can talk to simple backend fastapi/uvicorn app. let the plugin show a message sent from backend (eg. static message) i na floating window.
use uv toi track dependencies and pytest to write python tests.
use playwright to test that plugin works in the firefox browser.

i can manually install the script poininting to the local file (eg /Users/marcin/workspace/otomoto/frontend/simple.user.js) - and each time you change this file, and refresh the page in the browser, then the updated sript would be reloaded in violentmonkey.
plan how to build the app in small steps, that you can verify before you move further.
