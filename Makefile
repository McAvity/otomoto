run:
	cd backend && uv run uvicorn main:app  --reload

# Test targets
test-setup:
	uv sync --extra test

test-api:
	uv run pytest tests/test_manual_verification.py::TestManualVerification::test_listing_page_backend_api -v

test-manual:
	uv run pytest tests/test_manual_verification.py -v

test-listing:
	uv run pytest tests/test_listing_page.py -v

test-selenium:
	uv run pytest tests/test_selenium_auto.py -v

test-all:
	uv run pytest tests/ -v

test-quick:
	uv run pytest tests/test_listing_page.py::TestListingPage::test_api_known_cars_endpoint tests/test_listing_page.py::TestListingPage::test_car_id_extraction -v

test-validation:
	uv run pytest tests/test_selenium_auto.py::TestSeleniumAuto::test_userscript_file_validation tests/test_manual_verification.py::TestManualVerification::test_userscript_file_integrity -v

# Development helpers
dev-setup: test-setup
	@echo "Development environment ready"

dev-test: test-setup test-quick
	@echo "Quick tests passed"

# CI/Integration tests
ci-test: test-setup test-manual test-listing
	@echo "CI tests completed"

# Help target
help:
	@echo "Available targets:"
	@echo "  run          - Start the backend server"
	@echo "  test-setup   - Install test dependencies"
	@echo "  test-api     - Test the new API endpoint only"
	@echo "  test-manual  - Run manual verification tests"
	@echo "  test-listing - Run listing page tests"
	@echo "  test-selenium- Run selenium browser tests (requires Firefox)"
	@echo "  test-all     - Run all tests"
	@echo "  test-quick   - Run quick API and regex tests"
	@echo "  test-validation - Test userscript file validation only"
	@echo "  dev-setup    - Setup development environment"
	@echo "  dev-test     - Run quick development tests"
	@echo "  ci-test      - Run CI-suitable tests (no browser)"
	@echo "  help         - Show this help"

.PHONY: run test-setup test-api test-manual test-listing test-selenium test-all test-quick test-validation dev-setup dev-test ci-test help
