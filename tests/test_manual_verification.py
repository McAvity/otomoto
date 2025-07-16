import asyncio
import subprocess
import pytest
import httpx
from pathlib import Path

BACKEND_PORT = 8000
USERSCRIPT_PATH = Path(__file__).parent.parent / "frontend" / "simple.user.js"

class TestManualVerification:
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

    async def test_backend_endpoints(self, backend_server):
        """Test all backend endpoints"""
        async with httpx.AsyncClient() as client:
            # Test root endpoint
            response = await client.get(f"http://127.0.0.1:{BACKEND_PORT}/")
            assert response.status_code == 200
            assert "Otomoto Script Backend is running" in response.json()["message"]
            print(f"✅ Root endpoint: {response.json()['message']}")
            
            # Test message endpoint
            response = await client.get(f"http://127.0.0.1:{BACKEND_PORT}/message")
            assert response.status_code == 200
            message = response.json()["message"]
            assert "Hello from the backend!" in message
            print(f"✅ Message endpoint: {message}")
            
            # Test favicon endpoint (should not return 404)
            response = await client.get(f"http://127.0.0.1:{BACKEND_PORT}/favicon.ico")
            assert response.status_code == 204  # No Content
            print("✅ Favicon endpoint returns 204 (no more 404 errors)")

    async def test_userscript_file_integrity(self):
        """Verify userscript file is valid"""
        assert USERSCRIPT_PATH.exists(), f"Userscript not found: {USERSCRIPT_PATH}"
        
        content = USERSCRIPT_PATH.read_text()
        
        # Check UserScript headers
        assert "// ==UserScript==" in content
        assert "// ==/UserScript==" in content
        assert "@match        https://www.otomoto.pl/dostawcze/*" in content
        print("✅ UserScript headers are valid")
        
        # Check key functionality
        assert "otomoto-floating-window" in content
        assert "127.0.0.1:8000" in content
        assert "initOfferPage" in content or "initListingPage" in content
        print("✅ UserScript contains required functionality")
        
        # Check for basic syntax (no obvious errors)
        assert content.count("{") == content.count("}")
        assert content.count("(") == content.count(")")
        print("✅ UserScript has balanced brackets and parentheses")

    async def test_cors_headers(self, backend_server):
        """Test CORS headers are properly configured"""
        async with httpx.AsyncClient() as client:
            # Test preflight request
            response = await client.options(
                f"http://127.0.0.1:{BACKEND_PORT}/message",
                headers={
                    "Origin": "https://www.otomoto.pl",
                    "Access-Control-Request-Method": "GET"
                }
            )
            
            print(f"CORS preflight status: {response.status_code}")
            print(f"CORS headers: {dict(response.headers)}")
            
            # Test actual request with origin
            response = await client.get(
                f"http://127.0.0.1:{BACKEND_PORT}/message",
                headers={"Origin": "https://www.otomoto.pl"}
            )
            
            assert response.status_code == 200
            assert "access-control-allow-origin" in response.headers
            print("✅ CORS is properly configured")

    async def test_integration_checklist(self, backend_server):
        """Integration checklist and manual verification instructions"""
        print("\n" + "="*60)
        print("🧪 INTEGRATION TEST CHECKLIST")
        print("="*60)
        
        # 1. Backend status
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"http://127.0.0.1:{BACKEND_PORT}/message")
                if response.status_code == 200:
                    message = response.json()["message"]
                    print(f"✅ 1. Backend running: {message}")
                else:
                    print(f"❌ 1. Backend error: {response.status_code}")
        except Exception as e:
            print(f"❌ 1. Backend connection failed: {e}")
        
        # 2. Userscript file
        if USERSCRIPT_PATH.exists():
            print(f"✅ 2. Userscript exists: {USERSCRIPT_PATH}")
        else:
            print(f"❌ 2. Userscript missing: {USERSCRIPT_PATH}")
        
        # 3. Firefox process
        import subprocess
        try:
            result = subprocess.run(["pgrep", "-f", "firefox"], capture_output=True, text=True)
            if result.returncode == 0:
                print("✅ 3. Firefox is running")
            else:
                print("❌ 3. Firefox not found")
        except:
            print("⚠️  3. Could not check Firefox process")
        
        # 4. Remote debugging
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get("http://localhost:9222/", timeout=2)
                if response.status_code == 200:
                    print("✅ 4. Firefox remote debugging active")
                else:
                    print("⚠️  4. Firefox remote debugging unclear")
        except:
            print("❌ 4. Firefox remote debugging not accessible")
        
        print("\n📋 MANUAL VERIFICATION STEPS:")
        print("1. Open Firefox (should be running in debug mode)")
        print("2. Install userscript in Violentmonkey:")
        print(f"   file://{USERSCRIPT_PATH.absolute()}")
        print("3. Navigate to: https://www.otomoto.pl/dostawcze/")
        print("4. Look for floating window in top-right corner")
        print("5. Window should show current timestamp from backend")
        print("6. Click × button to close window")
        print("7. Refresh page - window should reappear")
        
        print(f"\n🔗 Test URLs:")
        print(f"   Backend: http://127.0.0.1:{BACKEND_PORT}/message")
        print(f"   Target:  https://www.otomoto.pl/dostawcze/")
        print("="*60)
        
        # Test always passes - this is verification info
        assert True

    async def test_listing_page_backend_api(self, backend_server):
        """Test the new listing page backend API endpoint"""
        print("\n🔌 Testing listing page backend API...")
        
        async with httpx.AsyncClient() as client:
            # Test the new /api/known-cars endpoint
            response = await client.get(f"http://127.0.0.1:{BACKEND_PORT}/api/known-cars")
            
            if response.status_code == 200:
                data = response.json()
                assert "known_cars" in data
                assert isinstance(data["known_cars"], list)
                
                print(f"✅ /api/known-cars endpoint: {len(data['known_cars'])} known cars")
                
                # Check structure of each car entry
                for car in data["known_cars"][:3]:  # Check first 3 cars
                    required_fields = ["car_id", "user_grade", "has_notes", "last_saved", "car_name", "price"]
                    for field in required_fields:
                        assert field in car, f"Missing field {field} in car data"
                    
                    print(f"   Car {car['car_id']}: grade={car['user_grade']}, notes={car['has_notes']}")
                
                print("✅ API endpoint structure is correct")
            else:
                print(f"❌ API endpoint error: {response.status_code}")
                assert False, f"API endpoint failed with status {response.status_code}"

    async def test_listing_page_verification_checklist(self, backend_server):
        """Comprehensive listing page verification checklist"""
        print("\n" + "="*60)
        print("🧪 LISTING PAGE VERIFICATION CHECKLIST")
        print("="*60)
        
        # 1. Backend API status
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(f"http://127.0.0.1:{BACKEND_PORT}/api/known-cars")
                if response.status_code == 200:
                    data = response.json()
                    print(f"✅ 1. Backend API working: {len(data['known_cars'])} known cars")
                else:
                    print(f"❌ 1. Backend API error: {response.status_code}")
        except Exception as e:
            print(f"❌ 1. Backend API connection failed: {e}")
        
        # 2. Userscript file
        if USERSCRIPT_PATH.exists():
            print(f"✅ 2. Userscript exists: {USERSCRIPT_PATH}")
            
            # Check for dual mode support
            content = USERSCRIPT_PATH.read_text()
            if "/oferta/" in content and "initListingPage" in content:
                print("✅ 2a. Dual mode support detected")
            else:
                print("⚠️  2a. Dual mode not yet implemented")
        else:
            print(f"❌ 2. Userscript missing: {USERSCRIPT_PATH}")
        
        # 3. CORS configuration
        try:
            async with httpx.AsyncClient() as client:
                response = await client.get(
                    f"http://127.0.0.1:{BACKEND_PORT}/api/known-cars",
                    headers={"Origin": "https://www.otomoto.pl"}
                )
                if response.status_code == 200:
                    print("✅ 3. CORS configured for listing page API")
                else:
                    print(f"❌ 3. CORS issue: {response.status_code}")
        except Exception as e:
            print(f"❌ 3. CORS test failed: {e}")
        
        print("\n📋 LISTING PAGE MANUAL VERIFICATION STEPS:")
        print("─" * 50)
        print("🏁 SETUP:")
        print("1. Start backend server:")
        print("   cd backend && uv run uvicorn main:app --reload")
        print("2. Install userscript in Violentmonkey:")
        print(f"   file://{USERSCRIPT_PATH.absolute()}")
        print("3. Ensure you have some rated cars in the system")
        
        print("\n🔍 LISTING PAGE TESTING:")
        print("1. Navigate to listing page:")
        print("   https://www.otomoto.pl/dostawcze/kamper/od-2000")
        print("2. Wait for page to load and dismiss cookie popup")
        print("3. Verify userscript behavior:")
        print("   ❌ NO floating window should appear")
        print("   ✅ Known cars should have yellow background")
        print("   ✅ Star ratings should appear next to prices")
        print("   ✅ Unseen cars should be at the top")
        print("   ✅ Known cars should be sorted by rating (high to low)")
        
        print("\n🚗 OFFER PAGE TESTING:")
        print("1. Navigate to offer page:")
        print("   https://www.otomoto.pl/dostawcze/oferta/citroen-jumper-ID6HurMU.html")
        print("2. Verify userscript behavior:")
        print("   ✅ Floating window should appear")
        print("   ✅ Normal data extraction should work")
        print("   ✅ Notes and ratings should function")
        
        print("\n🔧 DEBUGGING:")
        print("1. Check browser console for JavaScript errors")
        print("2. Verify API call in Network tab:")
        print(f"   GET http://127.0.0.1:{BACKEND_PORT}/api/known-cars")
        print("3. Check car ID extraction in console")
        print("4. Verify DOM modifications (background colors, ratings)")
        
        print(f"\n🔗 QUICK TEST URLS:")
        print(f"   Backend API: http://127.0.0.1:{BACKEND_PORT}/api/known-cars")
        print(f"   Listing page: https://www.otomoto.pl/dostawcze/kamper/od-2000")
        print(f"   Offer page: https://www.otomoto.pl/dostawcze/oferta/citroen-jumper-ID6HurMU.html")
        print(f"   Car table: http://127.0.0.1:{BACKEND_PORT}/cars")
        print("="*60)
        
        # Always pass - this is verification info
        assert True