from typing import Optional, List
from sqlalchemy import String, Float, Boolean, Integer, Text, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class CanonicalFood(Base):
    """Deduplicated food entries with clean names, used for search/autocomplete."""
    __tablename__ = "canonical_foods"

    canonical_food_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    canonical_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    taxonomy_category: Mapped[Optional[str]] = mapped_column(String(100), index=True)

    variants: Mapped[List["FoodData"]] = relationship("FoodData", back_populates="canonical_food")


class FoodData(Base):
    __tablename__ = "food_data"

    api_food_id: Mapped[str] = mapped_column(String(20), primary_key=True)
    canonical_food_id: Mapped[Optional[str]] = mapped_column(
        String(20), ForeignKey("canonical_foods.canonical_food_id"), index=True
    )
    slug: Mapped[str] = mapped_column(Text, nullable=False)
    display_name: Mapped[str] = mapped_column(Text, nullable=False, index=True)
    canonical_name: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    description: Mapped[Optional[str]] = mapped_column(Text)
    category: Mapped[Optional[str]] = mapped_column(String(100), index=True)
    is_fast_food: Mapped[bool] = mapped_column(Boolean, default=False)

    # Nutrition per 100g
    calories_kcal: Mapped[Optional[float]] = mapped_column(Float)
    protein_g: Mapped[Optional[float]] = mapped_column(Float)
    carbs_g: Mapped[Optional[float]] = mapped_column(Float)
    sugars_g: Mapped[Optional[float]] = mapped_column(Float)
    fiber_g: Mapped[Optional[float]] = mapped_column(Float)
    fat_g: Mapped[Optional[float]] = mapped_column(Float)
    saturated_fat_g: Mapped[Optional[float]] = mapped_column(Float)
    monounsaturated_fat_g: Mapped[Optional[float]] = mapped_column(Float)
    polyunsaturated_fat_g: Mapped[Optional[float]] = mapped_column(Float)
    water_g: Mapped[Optional[float]] = mapped_column(Float)
    sodium_mg: Mapped[Optional[float]] = mapped_column(Float)
    cholesterol_mg: Mapped[Optional[float]] = mapped_column(Float)

    quality_score: Mapped[Optional[int]] = mapped_column(Integer)

    # Variant metadata
    variant_flavor: Mapped[Optional[str]] = mapped_column(String(255))
    variant_prep: Mapped[Optional[str]] = mapped_column(String(255))
    variant_protein: Mapped[Optional[str]] = mapped_column(String(255))

    canonical_food: Mapped[Optional["CanonicalFood"]] = relationship("CanonicalFood", back_populates="variants")
