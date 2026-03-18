"""
AI recipe recommendation endpoint — uses GPT-4o-mini to suggest recipes
based on what's in the user's kitchen.
"""

import json
import logging

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.middleware.auth import require_premium
from app.models.food_item import FoodItem

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/ai", tags=["ai"])


class RecommendationsRequest(BaseModel):
    item_ids: list[str] | None = None


class RecipeSuggestion(BaseModel):
    name: str
    description: str
    servings: int
    prep_time_min: int
    cook_time_min: int
    ingredients: list[dict]
    steps: list[dict]


class RecommendationsResponse(BaseModel):
    recipes: list[RecipeSuggestion]


SYSTEM_PROMPTS = {
    "en": """You are a creative home chef. Given a list of available ingredients, suggest 3 recipes.
Prioritize ingredients that are expiring soon (marked with *).
Each recipe should be practical and use ONLY the listed ingredients plus basic pantry staples (salt, pepper, oil, butter, garlic, onion, flour, sugar, vinegar).

STRICT RULES:
- Every recipe MUST only use ingredients from the provided list (plus pantry staples above).
- Do NOT invent, add, or assume any other ingredients (e.g. do NOT add pasta, rice, bread, noodles, etc. unless they are explicitly in the list).
- The recipe name and description must accurately reflect what is actually being cooked — do NOT name a dish after an ingredient that is not available.
- Use each ingredient exactly as named. Do NOT substitute or confuse ingredients.

Return ONLY valid JSON:
{"recipes": [
  {
    "name": "Recipe Name",
    "description": "Brief description",
    "servings": 4,
    "prep_time_min": 15,
    "cook_time_min": 30,
    "ingredients": [{"name": "...", "quantity": 1, "unit": "pieces"}],
    "steps": [{"step_number": 1, "instruction": "..."}]
  }
]}""",
    "de": """Du bist ein kreativer Hobbykoch. Schlage anhand der verfügbaren Zutaten 3 Rezepte vor.
Bevorzuge Zutaten, die bald ablaufen (mit * markiert).
Jedes Rezept sollte praktisch sein und NUR die aufgelisteten Zutaten plus Grundvorräte verwenden (Salz, Pfeffer, Öl, Butter, Knoblauch, Zwiebel, Mehl, Zucker, Essig).

STRENGE REGELN:
- Jedes Rezept darf NUR Zutaten aus der Liste verwenden (plus die Grundvorräte oben).
- Erfinde, ergänze oder setze KEINE weiteren Zutaten voraus (z.B. KEINE Nudeln, Reis, Brot, etc. hinzufügen, es sei denn sie stehen explizit in der Liste).
- Der Rezeptname und die Beschreibung müssen genau widerspiegeln, was tatsächlich gekocht wird — benenne KEIN Gericht nach einer Zutat, die nicht verfügbar ist.
- Verwende jede Zutat genau wie angegeben. Verwechsle KEINE Zutaten.

Gib NUR gültiges JSON zurück:
{"recipes": [
  {
    "name": "Rezeptname",
    "description": "Kurze Beschreibung",
    "servings": 4,
    "prep_time_min": 15,
    "cook_time_min": 30,
    "ingredients": [{"name": "...", "quantity": 1, "unit": "pieces"}],
    "steps": [{"step_number": 1, "instruction": "..."}]
  }
]}""",
}


@router.post("/recommendations", response_model=RecommendationsResponse)
def get_recommendations(body: RecommendationsRequest, lang: str = "en", db: Session = Depends(get_db), _user: str = Depends(require_premium)):
    """Get AI recipe recommendations based on selected kitchen contents."""
    if not settings.openai_api_key:
        raise HTTPException(status_code=503, detail="OpenAI API key not configured")

    if body.item_ids:
        items = db.query(FoodItem).filter(FoodItem.id.in_(body.item_ids)).all()
    else:
        items = db.query(FoodItem).all()
    if not items:
        raise HTTPException(status_code=400, detail="No items in kitchen")

    from datetime import date, timedelta
    soon = date.today() + timedelta(days=3)

    ingredients_list = []
    for item in items:
        expiring = item.expiry_date and item.expiry_date <= soon if item.expiry_date else False
        line = f"{'*' if expiring else ''}{item.name} ({item.quantity} {item.unit})"
        ingredients_list.append(line)

    prompt = SYSTEM_PROMPTS.get(lang, SYSTEM_PROMPTS["en"])
    user_msg = f"Available ingredients:\n" + "\n".join(ingredients_list)

    try:
        import httpx

        with httpx.Client(timeout=60.0) as client:
            resp = client.post(
                "https://api.openai.com/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {settings.openai_api_key}",
                    "Content-Type": "application/json",
                },
                json={
                    "model": "gpt-4o-mini",
                    "messages": [
                        {"role": "system", "content": prompt},
                        {"role": "user", "content": user_msg},
                    ],
                    "max_tokens": 3000,
                    "temperature": 0.8,
                },
            )
            resp.raise_for_status()
            data = resp.json()

        content = data["choices"][0]["message"]["content"]
        if content.startswith("```"):
            content = content.split("\n", 1)[1] if "\n" in content else content[3:]
            if content.endswith("```"):
                content = content[:-3]

        parsed = json.loads(content.strip())
        return RecommendationsResponse(**parsed)

    except httpx.HTTPStatusError as e:
        logger.error(f"OpenAI API error: {e.response.status_code}")
        raise HTTPException(status_code=502, detail="Failed to get recommendations")
    except Exception as e:
        logger.error(f"AI recommendations failed: {e}")
        raise HTTPException(status_code=502, detail="Failed to get recommendations")
