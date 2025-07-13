import os
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "Otomoto Camper Scraper"
    debug: bool = True
    host: str = "127.0.0.1"
    port: int = 8000
    
    # CORS settings
    allowed_origins: list = ["*"]  # Allow all origins for development
    allowed_methods: list = ["GET", "POST", "PUT", "DELETE"]
    allowed_headers: list = ["*"]
    
    model_config = {"env_file": ".env"}


settings = Settings()