from typing import Optional
from pydantic import BaseModel


class CanonicalFoodOut(BaseModel):
    canonical_food_id: str
    canonical_name: str
    slug: str
    taxonomy_category: Optional[str] = None

    model_config = {"from_attributes": True}


class FoodDataOut(BaseModel):
    api_food_id: str
    canonical_food_id: Optional[str] = None
    display_name: str
    canonical_name: str
    description: Optional[str] = None
    category: Optional[str] = None
    is_fast_food: bool = False

    calories_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    sugars_g: Optional[float] = None
    fiber_g: Optional[float] = None
    fat_g: Optional[float] = None
    saturated_fat_g: Optional[float] = None
    monounsaturated_fat_g: Optional[float] = None
    polyunsaturated_fat_g: Optional[float] = None
    water_g: Optional[float] = None
    sodium_mg: Optional[float] = None
    cholesterol_mg: Optional[float] = None
    quality_score: Optional[int] = None

    variant_flavor: Optional[str] = None
    variant_prep: Optional[str] = None
    variant_protein: Optional[str] = None

    # Canonical food name (from join) for better display
    canonical_food_name: Optional[str] = None
    taxonomy_category: Optional[str] = None

    model_config = {"from_attributes": True}


class FoodDataSearch(BaseModel):
    query: str
    category: Optional[str] = None
    limit: int = 20
