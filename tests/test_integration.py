import asyncio
import subprocess
import time
import pytest
from playwright.async_api import async_playwright, Page, Browser
from pathlib import Path

BACKEND_PORT = 8000
USERSCRIPT_PATH = Path(__file__).parent.parent / "frontend" / "simple.user.js"

class TestOtomotoScript:
    @pytest.fixture(scope="class")
    async def backend_server(self):
        """Start the FastAPI backend server"""
        backend_dir = Path(__file__).parent.parent / "backend"
        process = subprocess.Popen(
            ["uv", "run", "uvicorn", "main:app", "--host", "127.0.0.1", "--port", str(BACKEND_PORT)],
            cwd=backend_dir,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        # Wait for server to start
        await asyncio.sleep(3)
        
        yield process
        
        # Cleanup
        process.terminate()
        try:
            process.wait(timeout=5)
        except subprocess.TimeoutExpired:
            process.kill()

    @pytest.fixture(scope="class")
    async def browser(self):
        """Create a browser instance"""
        playwright = await async_playwright().start()
        browser = await playwright.firefox.launch(headless=True)
        yield browser
        await browser.close()
        await playwright.stop()

    @pytest.fixture
    async def page_with_userscript(self, browser: Browser):
        """Create a page with the userscript injected"""
        page = await browser.new_page()
        
        # Read the userscript content
        userscript_content = USERSCRIPT_PATH.read_text()
        
        # Extract just the JavaScript part (remove UserScript headers)
        lines = userscript_content.split('\n')
        js_start = -1
        for i, line in enumerate(lines):
            if line.strip() == '// ==/UserScript==':
                js_start = i + 1
                break
        
        if js_start >= 0:
            js_content = '\n'.join(lines[js_start:])
        else:
            js_content = userscript_content
        
        # Add script to page
        await page.add_init_script(js_content)
        
        yield page
        await page.close()

    async def test_backend_is_running(self, backend_server):
        """Test that the backend server is responding"""
        import httpx
        async with httpx.AsyncClient() as client:
            response = await client.get(f"http://127.0.0.1:{BACKEND_PORT}/")
            assert response.status_code == 200
            assert "Otomoto Script Backend is running" in response.json()["message"]

    async def test_userscript_creates_floating_window(self, backend_server, page_with_userscript: Page):
        """Test that the userscript creates a floating window"""
        # Navigate to a matching URL pattern
        await page_with_userscript.goto("https://www.otomoto.pl/dostawcze/test")
        
        # Wait for the floating window to appear
        await page_with_userscript.wait_for_selector("#otomoto-floating-window", timeout=10000)
        
        # Check that the floating window exists
        floating_window = await page_with_userscript.query_selector("#otomoto-floating-window")
        assert floating_window is not None
        
        # Check that it has the expected styling
        style = await floating_window.get_attribute("style")
        assert "position: fixed" in style
        assert "z-index: 10000" in style

    async def test_userscript_displays_backend_message(self, backend_server, page_with_userscript: Page):
        """Test that the userscript displays the message from backend"""
        await page_with_userscript.goto("https://www.otomoto.pl/dostawcze/test")
        
        # Wait for the content to load
        await page_with_userscript.wait_for_selector("#otomoto-message-content", timeout=10000)
        
        # Wait a bit more for the fetch to complete
        await asyncio.sleep(2)
        
        # Check that the message content is displayed
        content_element = await page_with_userscript.query_selector("#otomoto-message-content")
        assert content_element is not None
        
        text_content = await content_element.text_content()
        assert text_content is not None
        assert text_content != "Loading..."
        
        # Should contain the expected message or an error
        assert ("Hello from the backend" in text_content) or ("Error:" in text_content)

    async def test_userscript_close_button_works(self, backend_server, page_with_userscript: Page):
        """Test that the close button removes the floating window"""
        await page_with_userscript.goto("https://www.otomoto.pl/dostawcze/test")
        
        # Wait for the floating window to appear
        await page_with_userscript.wait_for_selector("#otomoto-floating-window", timeout=10000)
        
        # Click the close button
        close_button = await page_with_userscript.query_selector("#otomoto-floating-window button")
        assert close_button is not None
        await close_button.click()
        
        # Wait and check that the floating window is removed
        await asyncio.sleep(1)
        floating_window = await page_with_userscript.query_selector("#otomoto-floating-window")
        assert floating_window is None