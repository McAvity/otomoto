"""
Pydantic models for camper/van feature extraction.
"""
from typing import List, Literal, Optional
from pydantic import BaseModel, Field


class CamperFeatures(BaseModel):
    """
    Structured model for camper/van features extracted from Polish car listings.
    
    Based on criteria from kamper-kryteria.md with priority levels:
    - Very Important: bed, roof height, solar, connection, kitchen, water, windows
    - Moderately Important: stealth, webasto, AC, height, shower
    - Additional: other accessories
    """
    
    # First: Extract all accessories to ground the analysis
    accessories: List[str] = Field(
        default_factory=list,
        description="Lista WSZYSTKICH wyposażeń, akcesoriów i cech wymienionych w opisie. To pole powinno być wypełnione PIERWSZE jako podstawa do analizy pozostałych pól."
    )
    
    # Very Important Features (wazne) - based on accessories found above
    bed_orientation: Literal["lengthwise", "widthwise", "unknown"] = Field(
        description="Orientacja łóżka: wzdłuż czy w szerz kampera. Sprawdź najpierw w liście akcesoriów powyżej."
    )
    bed_length: Optional[str] = Field(
        default=None,
        description="Wielkość łóżka w metrach lub centymetrach, jeśli podana w opisie lub liście akcesoriów."
    )
    roof_height: Literal["high", "low", "unknown"] = Field(
        description="Wysokość dachu: wysoki (można stać) czy niski. Sprawdź w akcesoriach informacje o wysokości."
    )
    has_solar_panels: bool = Field(
        description="Czy są zainstalowane panele słoneczne. Sprawdź w liście akcesoriów słowa kluczowe: panel, solarny, fotowoltaiczny."
    )
    front_back_connection: Literal["connected", "separate", "unknown"] = Field(
        description="Czy kabina kierowcy jest połączona z częścią mieszkalną. Sprawdź w akcesoriach informacje o przejściu, połączeniu."
    )
    kitchen_location: Literal["inside", "outside", "none", "unknown"] = Field(
        description="Lokalizacja kuchni na podstawie akcesoriów: kuchenka, kuchnia, zlewozmywak, itp."
    )
    has_water_tap_inside: bool = Field(
        description="Czy jest kran z wodą wewnątrz. Sprawdź w akcesoriach: kran, zlewozmywak, woda."
    )
    has_roof_window: bool = Field(
        description="Czy jest okno dachowe. Sprawdź w akcesoriach: okno dachowe, świetlik."
    )
    has_door_window: bool = Field(
        description="Czy są okna w drzwiach. Sprawdź w akcesoriach informacje o oknach."
    )
    
    # Moderately Important Features (srednio wazne) - based on accessories
    stealth_level: Literal["high", "low", "unknown"] = Field(
        description="Poziom stealth na podstawie akcesoriów: high=nie stealth, low=częściowo ukryty, unknown=pełny stealth."
    )
    has_webasto: bool = Field(
        description="Czy jest ogrzewanie Webasto. Sprawdź w akcesoriach: Webasto, ogrzewanie."
    )
    has_air_conditioning: bool = Field(
        description="Czy jest klimatyzacja. Sprawdź w akcesoriach: klima, klimatyzacja, AC."
    )
    van_height: Literal["low", "medium", "high", "unknown"] = Field(
        description="Wysokość kampera na podstawie akcesoriów: niski (<190cm), średni, wysoki."
    )
    shower_location: Literal["inside", "outside", "none", "unknown"] = Field(
        description="Lokalizacja prysznica na podstawie akcesoriów: prysznic, natrysk."
    )
    
    # Metadata
    confidence_score: float = Field(
        default=1.0,
        description="Ocena pewności ekstraktu od 0.0 do 1.0 na podstawie jasności opisu."
    )


class ExtractionResult(BaseModel):
    """Complete extraction result with metadata."""
    
    car_id: str = Field(description="ID samochodu wyodrębnione z nazwy pliku")
    url: str = Field(description="URL strony z ogłoszeniem")
    features: CamperFeatures = Field(description="Wyodrębnione cechy kampera")
    source_description: str = Field(description="Oryginalny opis z którego wyodrębniono dane")
    extraction_timestamp: str = Field(description="Znacznik czasu ekstraktu")
    model_used: str = Field(description="Model OpenAI użyty do ekstraktu")