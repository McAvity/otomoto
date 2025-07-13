import json
import os
from datetime import datetime
from typing import List, Optional, Dict, Any
from pathlib import Path
import hashlib

from app.models.camper import CamperInDB, HTMLPageData


class JSONStorage:
    def __init__(self, data_dir: str = "data"):
        self.data_dir = Path(data_dir)
        self.data_dir.mkdir(exist_ok=True)
        self.campers_file = self.data_dir / "campers.json"
        self.html_pages_file = self.data_dir / "html_pages.json"
        
        # Initialize files if they don't exist
        if not self.campers_file.exists():
            self._write_json(self.campers_file, {})
        if not self.html_pages_file.exists():
            self._write_json(self.html_pages_file, [])

    def _read_json(self, file_path: Path) -> Any:
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return json.load(f)
        except (FileNotFoundError, json.JSONDecodeError):
            return {} if file_path == self.campers_file else []

    def _write_json(self, file_path: Path, data: Any) -> None:
        # Atomic write using temporary file
        temp_file = file_path.with_suffix('.tmp')
        with open(temp_file, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2, ensure_ascii=False, default=str)
        temp_file.replace(file_path)

    # Camper operations
    def get_camper(self, camper_id: str) -> Optional[CamperInDB]:
        campers = self._read_json(self.campers_file)
        if camper_id in campers:
            return CamperInDB(**campers[camper_id])
        return None

    def get_all_campers(self) -> List[CamperInDB]:
        campers = self._read_json(self.campers_file)
        return [CamperInDB(**data) for data in campers.values()]

    def save_camper(self, camper: CamperInDB) -> CamperInDB:
        campers = self._read_json(self.campers_file)
        camper.date_modified = datetime.utcnow()
        campers[camper.id] = camper.model_dump()
        self._write_json(self.campers_file, campers)
        return camper

    def update_camper_notes(self, camper_id: str, notes: str) -> Optional[CamperInDB]:
        campers = self._read_json(self.campers_file)
        if camper_id not in campers:
            return None
        
        campers[camper_id]["user_notes"] = notes
        campers[camper_id]["date_modified"] = datetime.utcnow().isoformat()
        self._write_json(self.campers_file, campers)
        return CamperInDB(**campers[camper_id])

    def update_camper_rating(self, camper_id: str, rating: float) -> Optional[CamperInDB]:
        campers = self._read_json(self.campers_file)
        if camper_id not in campers:
            return None
        
        campers[camper_id]["user_rating"] = rating
        campers[camper_id]["date_modified"] = datetime.utcnow().isoformat()
        self._write_json(self.campers_file, campers)
        return CamperInDB(**campers[camper_id])

    def delete_camper(self, camper_id: str) -> bool:
        campers = self._read_json(self.campers_file)
        if camper_id in campers:
            del campers[camper_id]
            self._write_json(self.campers_file, campers)
            return True
        return False

    # HTML page operations
    def save_html_page(self, page_data: HTMLPageData) -> str:
        """Save HTML page data and return unique page ID"""
        html_pages = self._read_json(self.html_pages_file)
        
        # Generate unique ID based on URL and timestamp
        page_id = hashlib.md5(f"{page_data.url}_{page_data.timestamp}".encode()).hexdigest()
        
        page_entry = {
            "id": page_id,
            **page_data.model_dump()
        }
        
        html_pages.append(page_entry)
        self._write_json(self.html_pages_file, html_pages)
        
        return page_id

    def get_html_pages(self, page_type: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
        """Get HTML pages, optionally filtered by page type"""
        html_pages = self._read_json(self.html_pages_file)
        
        if page_type:
            html_pages = [page for page in html_pages if page.get("page_type") == page_type]
        
        # Sort by timestamp (newest first) and limit
        html_pages.sort(key=lambda x: x.get("timestamp", ""), reverse=True)
        return html_pages[:limit]

    def get_html_page(self, page_id: str) -> Optional[Dict[str, Any]]:
        """Get specific HTML page by ID"""
        html_pages = self._read_json(self.html_pages_file)
        for page in html_pages:
            if page.get("id") == page_id:
                return page
        return None