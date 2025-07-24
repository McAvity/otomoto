#!/usr/bin/env python3
"""
CSV Export Script

Reads all parsed JSON files from backend/parsed_data/ and exports them
to a single CSV file for easy analysis and filtering.
"""
import csv
import json
import logging
from pathlib import Path
from typing import Dict, List, Any

# Configure logging
logging.basicConfig(
    level="INFO",
    format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)

# Configuration
INPUT_DIR = Path("../backend/parsed_data")
OUTPUT_FILE = Path("../backend/camper_features.csv")

# Define CSV columns (URL first, then grade, then features, excluding accessories)
CSV_COLUMNS = [
    "url",
    "user_grade",
    "bed_orientation", 
    "bed_length",
    "roof_height",
    "has_solar_panels",
    "front_back_connection",
    "kitchen_location", 
    "has_water_tap_inside",
    "has_roof_window",
    "has_door_window",
    "stealth_level",
    "has_webasto",
    "has_air_conditioning", 
    "van_height",
    "shower_location",
    "confidence_score"
]


def should_empty_value(value: Any) -> bool:
    """Check if a value should be represented as empty in CSV"""
    if value is None:
        return True
    if value is False:
        return True
    if isinstance(value, str) and value.lower() in ["unknown", "none"]:
        return True
    return False


def transform_value(value: Any) -> str:
    """Transform a value for CSV output"""
    if should_empty_value(value):
        return ""
    if value is True:
        return "true"
    return str(value)


def load_json_file(file_path: Path) -> Dict:
    """Load and parse a JSON file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.error(f"Error loading {file_path}: {e}")
        raise


def load_original_data(car_id: str) -> Dict:
    """Load original car data to get user_grade"""
    original_file = Path("../backend/extracted_data") / f"car_data_{car_id}_latest.json"
    try:
        with open(original_file, 'r', encoding='utf-8') as f:
            return json.load(f)
    except Exception as e:
        logger.warning(f"Could not load original data for {car_id}: {e}")
        return {}


def extract_csv_row(json_data: Dict) -> Dict[str, str]:
    """Extract a CSV row from JSON data"""
    row = {}
    
    # Get URL from top level
    row["url"] = json_data.get("url", "")
    
    # Get car_id to load original data for user_grade
    car_id = json_data.get("car_id", "")
    if car_id:
        original_data = load_original_data(car_id)
        user_grade = original_data.get("data", {}).get("user_grade")
        row["user_grade"] = transform_value(user_grade)
    else:
        row["user_grade"] = ""
    
    # Get features from nested features object
    features = json_data.get("features", {})
    
    # Extract each column (excluding url and user_grade which we already handled)
    for column in CSV_COLUMNS[2:]:  # Skip 'url' and 'user_grade'
        value = features.get(column)
        row[column] = transform_value(value)
    
    return row


def export_to_csv():
    """Export all JSON files to CSV"""
    logger.info("Starting CSV export process")
    logger.info(f"Input directory: {INPUT_DIR.absolute()}")
    logger.info(f"Output file: {OUTPUT_FILE.absolute()}")
    
    # Check input directory exists
    if not INPUT_DIR.exists():
        logger.error(f"Input directory {INPUT_DIR} does not exist")
        return
    
    # Find all JSON files
    json_files = list(INPUT_DIR.glob("features_*_latest.json"))
    logger.info(f"Found {len(json_files)} JSON files to process")
    
    if not json_files:
        logger.warning("No JSON files found to export")
        return
    
    # Prepare CSV data
    csv_rows = []
    processed = 0
    errors = 0
    
    for json_file in json_files:
        try:
            logger.debug(f"Processing {json_file.name}")
            
            # Load JSON data
            json_data = load_json_file(json_file)
            
            # Extract CSV row
            csv_row = extract_csv_row(json_data)
            csv_rows.append(csv_row)
            
            processed += 1
            
        except Exception as e:
            logger.error(f"Failed to process {json_file.name}: {e}")
            errors += 1
            continue
    
    if not csv_rows:
        logger.error("No valid data to export")
        return
    
    # Write CSV file
    try:
        logger.info(f"Writing CSV file with {len(csv_rows)} rows")
        
        with open(OUTPUT_FILE, 'w', newline='', encoding='utf-8') as csvfile:
            writer = csv.DictWriter(csvfile, fieldnames=CSV_COLUMNS)
            
            # Write header
            writer.writeheader()
            
            # Write data rows
            writer.writerows(csv_rows)
        
        logger.info(f"✅ CSV export successful!")
        logger.info(f"📄 File: {OUTPUT_FILE}")
        logger.info(f"📊 Rows: {len(csv_rows)} (plus header)")
        logger.info(f"📋 Columns: {len(CSV_COLUMNS)}")
        logger.info(f"✅ Processed: {processed} files")
        
        if errors > 0:
            logger.warning(f"⚠️  Errors: {errors} files failed to process")
        
        # Show sample of data
        if csv_rows:
            logger.info("📋 Sample data:")
            sample_row = csv_rows[0]
            for key, value in list(sample_row.items())[:5]:  # Show first 5 columns
                display_value = value if value else "(empty)"
                logger.info(f"  {key}: {display_value}")
            if len(sample_row) > 5:
                logger.info(f"  ... and {len(sample_row) - 5} more columns")
        
    except Exception as e:
        logger.error(f"Failed to write CSV file: {e}")
        raise


def main():
    """Main function"""
    logger.info("🚀 Starting camper features CSV export")
    
    try:
        export_to_csv()
    except Exception as e:
        logger.error(f"❌ CSV export failed: {e}")
        raise


if __name__ == "__main__":
    main()