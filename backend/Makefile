run:
	uv run uvicorn main:app  --reload & pid=$$!
	open "http://127.0.0.1:8000"
	wait $$pid

stop:
	pkill -f "uvicorn"

status: ## Show status of running servers (HTTP and HTTPS)
	@echo "📊 Server Status:"
	@echo "HTTP Backend (port 8000):"
	@lsof -ti:8000 >/dev/null 2>&1 && echo "  ✅ Running" || echo "  ❌ Not running"
