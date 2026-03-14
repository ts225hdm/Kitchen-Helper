import csv
import math
import re
from pathlib import Path

from sqlalchemy.orm import Session

from app.models.food_data import CanonicalFood, FoodData

DATA_DIR = Path(__file__).resolve().parent.parent / "food_data"

# Pattern to strip trailing " Nan" artifacts from names (case-sensitive to avoid
# stripping legitimate words like "naan")
_NAN_SUFFIX = re.compile(r"\s+Nan$")
_NAN_WORD = re.compile(r"\bNan\b")


def _clean_float(value: str) -> float | None:
    if not value or value.strip() == "":
        return None
    try:
        v = float(value)
        return None if math.isnan(v) else v
    except (ValueError, TypeError):
        return None


def _clean_int(value: str) -> int | None:
    v = _clean_float(value)
    return int(v) if v is not None else None


def _clean_str(value: str) -> str | None:
    if not value or value.strip() == "":
        return None
    s = value.strip()
    # "nan" as the entire value is a NaN artifact
    if s.lower() == "nan":
        return None
    return s


def _clean_name(value: str) -> str:
    """Remove NaN artifacts from display names like 'Zwieback Nan' -> 'Zwieback'."""
    name = _NAN_SUFFIX.sub("", value.strip())
    # Also handle mid-string NaN like "Sauce Nan Foo" -> "Sauce Foo"
    name = _NAN_WORD.sub("", name).strip()
    # Collapse any double spaces left behind
    name = re.sub(r"\s{2,}", " ", name)
    return name


def load_food_data(db: Session) -> int:
    """Load food data from CSV files into the database.
    Populates canonical_foods and food_data tables.
    Skips if data already exists. Returns the number of food rows inserted.
    """
    existing = db.query(FoodData.api_food_id).limit(1).first()
    if existing:
        return 0

    # 1. Build taxonomy lookup: canonical_food_id -> taxonomy_category
    taxonomy_map: dict[str, str] = {}
    with open(DATA_DIR / "taxonomy.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            cat = _clean_str(row.get("taxonomy_category", ""))
            if cat:
                taxonomy_map[row["canonical_food_id"]] = cat

    # 2. Build variant lookup: food_id -> {canonical_food_id, variant_*}
    variant_map: dict[str, dict] = {}
    with open(DATA_DIR / "variants.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            variant_map[row["food_id"]] = row

    # 3. Insert canonical foods
    canonical_rows = []
    with open(DATA_DIR / "canonical_foods.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            canonical_rows.append(CanonicalFood(
                canonical_food_id=row["canonical_food_id"],
                canonical_name=_clean_name(row["canonical_name"]),
                slug=row["slug"],
                taxonomy_category=taxonomy_map.get(row["canonical_food_id"]),
            ))
    db.add_all(canonical_rows)
    db.flush()

    # 4. Insert food data entries
    food_rows = []
    with open(DATA_DIR / "foods.csv", newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fid = row["api_food_id"]
            variant = variant_map.get(fid, {})

            food_rows.append(FoodData(
                api_food_id=fid,
                canonical_food_id=variant.get("canonical_food_id") or None,
                slug=row.get("slug", ""),
                display_name=_clean_name(row.get("display_name", "")),
                canonical_name=_clean_str(row.get("canonical_name_en", "")) or "",
                description=_clean_str(row.get("description_en")),
                category=_clean_str(row.get("category")),
                is_fast_food=row.get("is_fast_food", "").strip() == "True",
                calories_kcal=_clean_float(row.get("calories_kcal", "")),
                protein_g=_clean_float(row.get("protein_g", "")),
                carbs_g=_clean_float(row.get("carbs_g", "")),
                sugars_g=_clean_float(row.get("sugars_g", "")),
                fiber_g=_clean_float(row.get("fiber_g", "")),
                fat_g=_clean_float(row.get("fat_g", "")),
                saturated_fat_g=_clean_float(row.get("saturated_fat_g", "")),
                monounsaturated_fat_g=_clean_float(row.get("monounsaturated_fat_g", "")),
                polyunsaturated_fat_g=_clean_float(row.get("polyunsaturated_fat_g", "")),
                water_g=_clean_float(row.get("water_g", "")),
                sodium_mg=_clean_float(row.get("sodium_mg", "")),
                cholesterol_mg=_clean_float(row.get("cholesterol_mg", "")),
                quality_score=_clean_int(row.get("quality_score", "")),
                variant_flavor=_clean_str(variant.get("variant_flavor", "")),
                variant_prep=_clean_str(variant.get("variant_prep", "")),
                variant_protein=_clean_str(variant.get("variant_protein", "")),
            ))

    db.add_all(food_rows)
    db.commit()

    return len(food_rows)
