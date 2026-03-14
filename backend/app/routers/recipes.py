import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func
from pydantic import BaseModel

from app.database import get_db
from app.models.recipe import Recipe, RecipeIngredient, RecipeStep
from app.models.food_data import FoodData
from app.schemas.recipe import RecipeCreate, RecipeUpdate, RecipeOut


# Unit conversion factors to grams for nutrition scaling
_TO_GRAMS = {
    "g": 1, "kg": 1000, "oz": 28.3495, "lb": 453.592,
    "ml": 1, "l": 1000, "cup": 240, "tbsp": 15, "tsp": 5,
    "pieces": 100,  # rough estimate for pieces
}


class IngredientNutrition(BaseModel):
    name: str
    matched: bool
    quantity: float
    unit: str
    calories_kcal: Optional[float] = None
    protein_g: Optional[float] = None
    carbs_g: Optional[float] = None
    fat_g: Optional[float] = None


class RecipeNutrition(BaseModel):
    servings: int
    total_calories: float
    total_protein_g: float
    total_carbs_g: float
    total_fat_g: float
    per_serving_calories: float
    per_serving_protein_g: float
    per_serving_carbs_g: float
    per_serving_fat_g: float
    ingredients: List[IngredientNutrition]
    matched_count: int
    total_count: int

router = APIRouter(prefix="/recipes", tags=["recipes"])


def _apply_ingredients_steps(recipe: Recipe, data: RecipeCreate | RecipeUpdate, db: Session):
    if data.ingredients is not None:
        db.query(RecipeIngredient).filter(RecipeIngredient.recipe_id == recipe.id).delete()
        for ing in data.ingredients:
            db.add(RecipeIngredient(recipe_id=recipe.id, **ing.model_dump()))
    if data.steps is not None:
        db.query(RecipeStep).filter(RecipeStep.recipe_id == recipe.id).delete()
        for step in data.steps:
            db.add(RecipeStep(recipe_id=recipe.id, **step.model_dump()))


@router.get("/", response_model=List[RecipeOut])
def list_recipes(db: Session = Depends(get_db)):
    return db.query(Recipe).order_by(Recipe.created_at.desc()).all()


@router.get("/{recipe_id}", response_model=RecipeOut)
def get_recipe(recipe_id: uuid.UUID, db: Session = Depends(get_db)):
    recipe = db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    return recipe


@router.post("/", response_model=RecipeOut, status_code=status.HTTP_201_CREATED)
def create_recipe(data: RecipeCreate, db: Session = Depends(get_db)):
    recipe = Recipe(
        name=data.name,
        description=data.description,
        servings=data.servings,
        prep_time_min=data.prep_time_min,
        cook_time_min=data.cook_time_min,
        is_ai_generated=data.is_ai_generated,
    )
    db.add(recipe)
    db.flush()
    _apply_ingredients_steps(recipe, data, db)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.patch("/{recipe_id}", response_model=RecipeOut)
def update_recipe(recipe_id: uuid.UUID, data: RecipeUpdate, db: Session = Depends(get_db)):
    recipe = db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    for field, value in data.model_dump(exclude_unset=True, exclude={"ingredients", "steps"}).items():
        setattr(recipe, field, value)
    _apply_ingredients_steps(recipe, data, db)
    db.commit()
    db.refresh(recipe)
    return recipe


@router.delete("/{recipe_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_recipe(recipe_id: uuid.UUID, db: Session = Depends(get_db)):
    recipe = db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")
    db.delete(recipe)
    db.commit()


@router.get("/{recipe_id}/nutrition", response_model=RecipeNutrition)
def get_recipe_nutrition(recipe_id: uuid.UUID, db: Session = Depends(get_db)):
    """Calculate nutrition for a recipe by matching ingredients to food_data."""
    recipe = db.get(Recipe, recipe_id)
    if not recipe:
        raise HTTPException(status_code=404, detail="Recipe not found")

    total_cal = total_pro = total_carb = total_fat = 0.0
    ingredient_results: list[IngredientNutrition] = []
    matched = 0

    for ing in recipe.ingredients:
        # Try to find the best match in food_data
        fd = (
            db.query(FoodData)
            .filter(func.lower(FoodData.canonical_name).contains(ing.name.lower()))
            .order_by(FoodData.quality_score.desc())
            .first()
        )
        if not fd or fd.calories_kcal is None:
            ingredient_results.append(IngredientNutrition(
                name=ing.name, matched=False, quantity=ing.quantity, unit=ing.unit,
            ))
            continue

        matched += 1
        # Scale nutrition: food_data is per 100g, convert ingredient quantity to grams
        grams = ing.quantity * _TO_GRAMS.get(ing.unit, 100)
        scale = grams / 100.0
        cal = (fd.calories_kcal or 0) * scale
        pro = (fd.protein_g or 0) * scale
        carb = (fd.carbs_g or 0) * scale
        fat = (fd.fat_g or 0) * scale

        total_cal += cal
        total_pro += pro
        total_carb += carb
        total_fat += fat

        ingredient_results.append(IngredientNutrition(
            name=ing.name, matched=True, quantity=ing.quantity, unit=ing.unit,
            calories_kcal=round(cal, 1), protein_g=round(pro, 1),
            carbs_g=round(carb, 1), fat_g=round(fat, 1),
        ))

    servings = max(recipe.servings, 1)
    return RecipeNutrition(
        servings=servings,
        total_calories=round(total_cal, 1),
        total_protein_g=round(total_pro, 1),
        total_carbs_g=round(total_carb, 1),
        total_fat_g=round(total_fat, 1),
        per_serving_calories=round(total_cal / servings, 1),
        per_serving_protein_g=round(total_pro / servings, 1),
        per_serving_carbs_g=round(total_carb / servings, 1),
        per_serving_fat_g=round(total_fat / servings, 1),
        ingredients=ingredient_results,
        matched_count=matched,
        total_count=len(recipe.ingredients),
    )
