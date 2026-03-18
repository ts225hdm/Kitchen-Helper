import uuid
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.food_item import FoodItem
from app.models.nutrition import Nutrition
from app.schemas.food_item import FoodItemCreate, FoodItemUpdate, FoodItemOut

router = APIRouter(prefix="/food-items", tags=["food-items"])


def _sync_nutrition(db: Session, food_item_id: uuid.UUID, data: FoodItemCreate | FoodItemUpdate):
    """Create or update the Nutrition record from inline nutrition fields."""
    cal = getattr(data, 'calories_kcal', None)
    if cal is None:
        return
    nutrition = db.query(Nutrition).filter(Nutrition.food_item_id == food_item_id).first()
    values = {
        "serving_size_g": 100,
        "calories": data.calories_kcal or 0,
        "protein_g": data.protein_g or 0,
        "fat_total_g": data.fat_g or 0,
        "carbohydrates_total_g": data.carbs_g or 0,
    }
    if nutrition:
        for k, v in values.items():
            setattr(nutrition, k, v)
    else:
        nutrition = Nutrition(food_item_id=food_item_id, **values)
        db.add(nutrition)


@router.get("/", response_model=List[FoodItemOut])
def list_food_items(db: Session = Depends(get_db)):
    return db.query(FoodItem).order_by(FoodItem.created_at.desc()).all()


@router.get("/{item_id}", response_model=FoodItemOut)
def get_food_item(item_id: uuid.UUID, db: Session = Depends(get_db)):
    item = db.get(FoodItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return item


@router.post("/", response_model=FoodItemOut, status_code=status.HTTP_201_CREATED)
def create_food_item(data: FoodItemCreate, db: Session = Depends(get_db)):
    existing = (
        db.query(FoodItem)
        .filter(
            func.lower(FoodItem.name) == data.name.lower(),
            FoodItem.unit == data.unit,
        )
        .first()
    )
    if existing:
        existing.quantity += data.quantity
        if data.expiry_date and (not existing.expiry_date or data.expiry_date > existing.expiry_date):
            existing.expiry_date = data.expiry_date
        _sync_nutrition(db, existing.id, data)
        db.commit()
        db.refresh(existing)
        return existing

    item_data = data.model_dump(exclude={"calories_kcal", "protein_g", "carbs_g", "fat_g"})
    item = FoodItem(**item_data)
    db.add(item)
    db.flush()
    _sync_nutrition(db, item.id, data)
    db.commit()
    db.refresh(item)
    return item


@router.patch("/{item_id}", response_model=FoodItemOut)
def update_food_item(item_id: uuid.UUID, data: FoodItemUpdate, db: Session = Depends(get_db)):
    item = db.get(FoodItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    update_data = data.model_dump(exclude_unset=True, exclude={"calories_kcal", "protein_g", "carbs_g", "fat_g"})
    for field, value in update_data.items():
        setattr(item, field, value)
    _sync_nutrition(db, item.id, data)
    db.commit()
    db.refresh(item)
    return item


@router.delete("/{item_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_food_item(item_id: uuid.UUID, db: Session = Depends(get_db)):
    item = db.get(FoodItem, item_id)
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    db.delete(item)
    db.commit()
