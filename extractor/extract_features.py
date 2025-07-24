#!/usr/bin/env python3
"""
Camper/Van Feature Extraction Script

Reads JSON files from backend/extracted_data/ and extracts structured features
using OpenAI and Instructor, saving results to backend/parsed_data/.
"""
import json
import logging
import os
import re
from datetime import datetime
from pathlib import Path
from typing import Dict, List

import instructor
from openai import OpenAI
from dotenv import load_dotenv

from models import CamperFeatures, ExtractionResult

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(
    level=os.getenv("LOG_LEVEL", "INFO"),
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OPENAI_MODEL = os.getenv("OPENAI_MODEL", "gpt-4o-mini")
INPUT_DIR = Path("../backend/extracted_data")
OUTPUT_DIR = Path("../backend/parsed_data")

# Initialize OpenAI client with Instructor
client = instructor.from_openai(OpenAI(api_key=OPENAI_API_KEY))

EXTRACTION_PROMPT = """
Jesteś ekspertem od analizy opisów kamperów i vanów. Przeanalizuj poniższy polski opis kampera używając DWUETAPOWEGO PODEJŚCIA:

ETAP 1: ZNAJDŹ WSZYSTKIE AKCESORIA
Najpierw wyodrębnij WSZYSTKIE wyposażenia, akcesoria i cechy wymienione w opisie do pola "accessories". To będzie podstawa do analizy kolejnych pól.

ETAP 2: ANALIZUJ KONKRETNE CECHY
Na podstawie znalezionych akcesoriów wypełnij pozostałe pola. Sprawdzaj każde pole względem listy akcesoriów z etapu 1.

KRYTYCZNE ZASADY:
1. NIE DODAWAJ informacji, których nie ma w opisie
2. Jeśli jakaś cecha nie jest wymieniona, użyj wartości domyślnych (false, "unknown", "none")
3. Bądź bardzo precyzyjny - wyodrębniaj tylko to, co jest bezpośrednio napisane
4. Dla wartości boolean: True TYLKO jeśli cecha jest wyraźnie wspomniana lub wynika z listy akcesoriów
5. Dla kategorii: wybieraj "unknown" jeśli nie ma jasnych informacji
6. ZAWSZE odwołuj się do listy akcesoriów z etapu 1 przy wypełnianiu kolejnych pól

OPIS KAMPERA:
{description}

Wyodrębnij cechy kampera bazując WYŁĄCZNIE na powyższym opisie, używając dwuetapowego podejścia.
"""


def extract_car_id(filename: str) -> str:
    """Extract car ID from filename pattern car_data_ID6XXX_latest.json"""
    match = re.search(r'car_data_(ID[A-Za-z0-9]+)_latest\.json', filename)
    if match:
        return match.group(1)
    return filename.replace('.json', '')


def load_car_data(file_path: Path) -> Dict:
    """Load car data from JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading {file_path}: {e}")
        raise


def extract_features_from_description(description: str, car_id: str, url: str) -> ExtractionResult:
    """Extract camper features from description using OpenAI + Instructor"""
    try:
        # Extract features using structured output
        features = client.chat.completions.create(
            model=OPENAI_MODEL,
            response_model=CamperFeatures,
            messages=[
                {
                    "role": "user", 
                    "content": EXTRACTION_PROMPT.format(description=description)
                }
            ],
            temperature=0.1,  # Low temperature for consistent results
        )
        
        # Create complete extraction result
        result = ExtractionResult(
            car_id=car_id,
            url=url,
            features=features,
            source_description=description,
            extraction_timestamp=datetime.now().isoformat(),
            model_used=OPENAI_MODEL
        )
        
        return result
        
    except Exception as e:
        logger.error(f"Error extracting features for {car_id}: {e}")
        raise


def save_extraction_result(result: ExtractionResult, output_file: Path):
    """Save extraction result to JSON file"""
    try:
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(result.model_dump(), f, ensure_ascii=False, indent=2)
        logger.info(f"Saved extraction result to {output_file}")
    except Exception as e:
        logger.error(f"Error saving to {output_file}: {e}")
        raise


def test_openai_connection():
    """Test OpenAI API connection and configuration"""
    if not OPENAI_API_KEY:
        logger.error("❌ OPENAI_API_KEY not found in environment variables")
        logger.error("Please copy .env.example to .env and add your OpenAI API key")
        raise SystemExit("Missing OPENAI_API_KEY environment variable")
    
    try:
        # Test API connection with a simple request
        logger.info("Testing OpenAI API connection...")
        _ = client.chat.completions.create(
            model=OPENAI_MODEL,
            response_model=CamperFeatures,
            messages=[{"role": "user", "content": "Test connection"}],
            max_tokens=1000,
            temperature=0.1
        )
        logger.info("✅ OpenAI API connection successful")
        
    except Exception as e:
        logger.error(f"❌ OpenAI API connection failed: {e}")
        logger.error("Please check your API key and internet connection")
        raise SystemExit(f"OpenAI API connection error: {e}")


def process_all_files():
    """Process all JSON files in the input directory"""
    # Test OpenAI connection first
    test_openai_connection()
    
    # Ensure input directory exists
    if not INPUT_DIR.exists():
        logger.error(f"Input directory {INPUT_DIR} does not exist")
        return
    
    # Create output directory if it doesn't exist
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    logger.info(f"Created output directory: {OUTPUT_DIR}")
    
    # Find all JSON files
    json_files = list(INPUT_DIR.glob("car_data_*_latest.json"))
    logger.info(f"Found {len(json_files)} JSON files to process")
    
    processed = 0
    errors = 0
    
    for json_file in json_files:
        try:
            logger.info(f"Processing {json_file.name}")
            
            # Extract car ID and prepare output filename
            car_id = extract_car_id(json_file.name)
            output_file = OUTPUT_DIR / f"features_{car_id}_latest.json"
            
            # Skip if already processed
            if output_file.exists():
                logger.info(f"Skipping {car_id} - already processed")
                continue
            
            # Load car data
            car_data = load_car_data(json_file)
            
            # Extract description and URL
            description = car_data.get('data', {}).get('description', '')
            url = car_data.get('url', '')
            
            if not description:
                logger.warning(f"No description found for {car_id}")
                continue
            
            # Extract features
            result = extract_features_from_description(description, car_id, url)
            
            # Save result
            save_extraction_result(result, output_file)
            
            processed += 1
            logger.info(f"Successfully processed {car_id} ({processed}/{len(json_files)})")
            
        except Exception as e:
            logger.error(f"Failed to process {json_file.name}: {e}")
            
            # Check if it's an OpenAI API error and stop processing
            if "openai" in str(e).lower() or "api" in str(e).lower():
                logger.error("❌ OpenAI API error detected. Stopping processing.")
                logger.error("Please check your API key, quota, and internet connection")
                raise SystemExit(f"OpenAI API error: {e}")
            
            errors += 1
            continue
    
    logger.info(f"Processing complete: {processed} successful, {errors} errors")


def main():
    """Main function"""
    logger.info("Starting camper feature extraction")
    logger.info(f"Input directory: {INPUT_DIR.absolute()}")
    logger.info(f"Output directory: {OUTPUT_DIR.absolute()}")
    logger.info(f"Using OpenAI model: {OPENAI_MODEL}")
    
    process_all_files()


if __name__ == "__main__":
    main()