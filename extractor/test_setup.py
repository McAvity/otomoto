#!/usr/bin/env python3
"""
Quick test to verify the setup works correctly.
"""
import json
from pathlib import Path
from models import CamperFeatures, ExtractionResult

def test_models():
    """Test that Pydantic models work correctly"""
    print("Testing Pydantic models...")
    
    # Test CamperFeatures with minimal data
    features = CamperFeatures(
        accessories=["łóżko piętrowe", "panele słoneczne", "Webasto", "kran", "okno dachowe"],
        bed_orientation="lengthwise",
        roof_height="high",
        has_solar_panels=True,
        front_back_connection="connected",
        kitchen_location="inside",
        has_water_tap_inside=True,
        has_roof_window=True,
        has_door_window=False,
        stealth_level="low",
        has_webasto=True,
        has_air_conditioning=False,
        van_height="high",
        shower_location="inside"
    )
    
    print(f"✓ CamperFeatures model created successfully")
    print(f"  - Accessories found: {len(features.accessories)} items")
    print(f"  - Bed orientation: {features.bed_orientation}")
    print(f"  - Solar panels: {features.has_solar_panels}")
    print(f"  - Webasto: {features.has_webasto}")
    
    # Test ExtractionResult
    result = ExtractionResult(
        car_id="ID6TEST",
        url="https://www.otomoto.pl/dostawcze/oferta/test-ID6TEST.html",
        features=features,
        source_description="Test description",
        extraction_timestamp="2025-07-19T12:00:00",
        model_used="gpt-4o-mini"
    )
    
    print(f"✓ ExtractionResult model created successfully")
    print(f"  - Car ID: {result.car_id}")
    print(f"  - URL: {result.url}")
    print(f"  - Model used: {result.model_used}")
    
    # Test JSON serialization
    json_data = result.model_dump()
    json_str = json.dumps(json_data, ensure_ascii=False, indent=2)
    print(f"✓ JSON serialization works")
    print(f"  - JSON length: {len(json_str)} characters")

def test_file_paths():
    """Test that file paths are accessible"""
    print("\nTesting file paths...")
    
    input_dir = Path("../backend/extracted_data")
    output_dir = Path("../backend/parsed_data")
    
    print(f"Input directory: {input_dir.absolute()}")
    print(f"Input exists: {input_dir.exists()}")
    
    print(f"Output directory: {output_dir.absolute()}")
    print(f"Output exists: {output_dir.exists()}")
    
    if input_dir.exists():
        json_files = list(input_dir.glob("car_data_*_latest.json"))
        print(f"Found {len(json_files)} JSON files to process")
        if json_files:
            print(f"Sample file: {json_files[0].name}")

def main():
    print("🚀 Testing camper-extractor setup...\n")
    
    try:
        test_models()
        test_file_paths()
        print("\n✅ All tests passed! Setup is working correctly.")
        print("\nNext steps:")
        print("1. Copy .env.example to .env")
        print("2. Add your OpenAI API key to .env")
        print("3. Run: python extract_features.py")
        
    except Exception as e:
        print(f"\n❌ Test failed: {e}")
        raise

if __name__ == "__main__":
    main()