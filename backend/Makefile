run:
	uv run uvicorn main:app  --reload & pid=$$!
	open "http://127.0.0.1:8000"
	wait $$pid

stop:
	pkill -f "uvicorn"