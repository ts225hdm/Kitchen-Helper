import uuid
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.nutrition import Nutrition
from app.schemas.nutrition import NutritionOut

router = APIRouter(prefix="/nutrition", tags=["nutrition"])


@router.get("/{food_item_id}", response_model=NutritionOut)
def get_nutrition(food_item_id: uuid.UUID, db: Session = Depends(get_db)):
    nutrition = db.query(Nutrition).filter(Nutrition.food_item_id == food_item_id).first()
    if not nutrition:
        raise HTTPException(status_code=404, detail="No nutrition data stored for this item")
    return nutrition
