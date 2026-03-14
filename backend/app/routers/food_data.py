from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func, or_

from app.database import get_db
from app.models.food_data import FoodData, CanonicalFood
from app.schemas.food_data import FoodDataOut

router = APIRouter(prefix="/food-data", tags=["food-data"])


def _enrich(food: FoodData) -> dict:
    """Add canonical_food_name and taxonomy_category from the joined canonical food."""
    d = {c.key: getattr(food, c.key) for c in food.__table__.columns}
    if food.canonical_food:
        d["canonical_food_name"] = food.canonical_food.canonical_name
        d["taxonomy_category"] = food.canonical_food.taxonomy_category
    return d


@router.get("/search", response_model=List[FoodDataOut])
def search_food_data(
    q: str = Query(..., min_length=1, description="Search term"),
    category: Optional[str] = Query(None, description="Filter by category"),
    limit: int = Query(20, ge=1, le=100),
    db: Session = Depends(get_db),
):
    """Search food database by name. Searches both canonical names and display names."""
    term = q.lower()
    query = (
        db.query(FoodData)
        .outerjoin(CanonicalFood)
        .filter(or_(
            func.lower(FoodData.display_name).contains(term),
            func.lower(FoodData.canonical_name).contains(term),
            func.lower(CanonicalFood.canonical_name).contains(term),
        ))
    )
    if category:
        query = query.filter(
            or_(FoodData.category == category, CanonicalFood.taxonomy_category == category)
        )
    results = query.order_by(FoodData.quality_score.desc()).limit(limit).all()
    return [_enrich(r) for r in results]


@router.get("/categories", response_model=List[str])
def list_categories(db: Session = Depends(get_db)):
    """List all available food categories (from taxonomy)."""
    # Prefer taxonomy categories from canonical foods
    rows = (
        db.query(CanonicalFood.taxonomy_category)
        .filter(CanonicalFood.taxonomy_category.isnot(None))
        .distinct()
        .order_by(CanonicalFood.taxonomy_category)
        .all()
    )
    if rows:
        return [r[0] for r in rows]
    # Fallback to food_data categories
    rows = (
        db.query(FoodData.category)
        .filter(FoodData.category.isnot(None))
        .distinct()
        .order_by(FoodData.category)
        .all()
    )
    return [r[0] for r in rows]


@router.get("/{food_id}", response_model=FoodDataOut)
def get_food_data(food_id: str, db: Session = Depends(get_db)):
    """Get a single food item by its API food ID."""
    item = db.query(FoodData).outerjoin(CanonicalFood).filter(FoodData.api_food_id == food_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food data not found")
    return _enrich(item)
