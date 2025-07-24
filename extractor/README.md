# Camper Feature Extractor

Python app that extracts structured features from Polish camper/van listings using OpenAI and Instructor.

## Setup

1. Install dependencies:
```bash
cd extractor
pip install -e .
```

2. Set up environment variables:
```bash
cp .env.example .env
# Edit .env and add your OpenAI API key
```

3. Run extraction:
```bash
cd extractor
python extract_features.py
```

## Features Extracted

Based on `kamper-kryteria.md` with priority levels:

### Very Important (wazne)
- Bed orientation (lengthwise/widthwise)
- Bed length
- Roof height (high/low)
- Solar panels
- Front-back connection
- Kitchen location
- Water tap inside
- Roof window
- Door windows

### Moderately Important (srednio wazne)
- Stealth level (0-2)
- Webasto heating
- Air conditioning
- Van height category
- Shower location

### Additional
- Other accessories list

## Output

Results are saved to `backend/parsed_data/` with filename pattern:
`features_ID6XXX_latest.json`

Each file contains:
- Extracted features
- Source description
- Metadata (timestamp, model used, etc.)

## Anti-Hallucination

The extraction prompt explicitly instructs the model to:
- Only extract information actually present in descriptions
- Use default values ("unknown", false) when information is missing
- Be precise and avoid assumptions