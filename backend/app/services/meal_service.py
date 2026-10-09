from datetime import datetime
import re
import uuid
from typing import Optional
from bson import ObjectId

from app.core.auth import CurrentUser
from app.core.exceptions import (
    FoodNotFoundError,
    InvalidDateError,
    InvalidIdError,
    MealItemNotFoundError,
    NutritionCalculationError,
)
from app.models.common import utc_now
from app.models.meal_log import MealItem, MealLog, SelectedServing
from app.repositories.food_repository import FoodRepository
from app.repositories.meal_repository import MealRepository
from app.schemas.meal_log import (
    DailyMealsSummaryResponse,
    MealItemUpdate,
    MealLogCreate,
    MealLogResponse,
)
from app.services.nutrition_calculator import (
    aggregate_nutrients,
    calculate_nutrients,
    recalculate_from_snapshot,
)


class MealService:
    """
    Business logic layer for Meal Logging domain.
    Enforces user isolation, data validation, snapshot retention, and deterministic nutrition totals.
    """

    def __init__(self, meal_repo: MealRepository, food_repo: FoodRepository):
        self.meal_repo = meal_repo
        self.food_repo = food_repo

    def _validate_date(self, date_str: str) -> str:
        if not re.match(r"^\d{4}-\d{2}-\d{2}$", date_str):
            raise InvalidDateError(f"Date '{date_str}' is not in valid YYYY-MM-DD format")
        try:
            datetime.strptime(date_str, "%Y-%m-%d")
        except ValueError:
            raise InvalidDateError(f"Date '{date_str}' is not a valid calendar date")
        return date_str

    def _parse_object_id(self, id_str: str, entity_name: str = "ID") -> ObjectId:
        if not ObjectId.is_valid(id_str):
            raise InvalidIdError(f"Invalid {entity_name} format: '{id_str}'")
        return ObjectId(id_str)

    async def get_day_meals(
        self, date: str, current_user: CurrentUser
    ) -> DailyMealsSummaryResponse:
        """
        Retrieve all meals logged by the current user on a given date,
        along with aggregated daily nutrition totals.
        """
        valid_date = self._validate_date(date)
        meals = await self.meal_repo.get_meals_by_user_and_date(current_user.id, valid_date)

        meal_responses = [MealLogResponse.from_meal_log(m) for m in meals]
        daily_totals = aggregate_nutrients([m.total_nutrients for m in meal_responses])

        return DailyMealsSummaryResponse(
            date=valid_date,
            user_id=str(current_user.id),
            meals=meal_responses,
            daily_totals=daily_totals,
        )

    async def log_meal(
        self, meal_in: MealLogCreate, current_user: CurrentUser
    ) -> MealLogResponse:
        """
        Log one or more food items into a user's meal category for a given date.
        If a meal log already exists for that (user, date, meal_type), appends new items.
        """
        valid_date = self._validate_date(meal_in.date)

        # 1. Fetch or initialize MealLog
        existing_meal = await self.meal_repo.get_by_user_date_and_type(
            user_id=current_user.id,
            date=valid_date,
            meal_type=meal_in.meal_type,
        )

        if existing_meal is not None:
            meal = existing_meal
            if meal_in.notes:
                meal.notes = meal_in.notes
        else:
            meal = MealLog(
                user_id=current_user.id,
                date=valid_date,
                meal_type=meal_in.meal_type,
                items=[],
                notes=meal_in.notes,
            )

        # 2. Process each item in payload
        items_to_add = meal_in.items or []
        for item_in in items_to_add:
            food_oid = self._parse_object_id(item_in.food_id, "Food ID")
            food = await self.food_repo.get_by_id(food_oid)

            if food is None:
                raise FoodNotFoundError(f"Food with ID '{item_in.food_id}' not found")

            # Ownership isolation check: cannot log other users' custom foods
            if not food.is_system and food.provenance.source_type != "cached":
                if food.created_by != current_user.id:
                    raise FoodNotFoundError(f"Food with ID '{item_in.food_id}' not found")

            # Resolve serving specification
            serving_desc = "100g"
            serving_weight_g = 100.0

            if item_in.serving_selected is not None:
                serving_desc = item_in.serving_selected.description
                serving_weight_g = item_in.serving_selected.weight_g
            elif item_in.serving_id is not None:
                matched_serving = next(
                    (s for s in food.serving_sizes if s.serving_id == item_in.serving_id),
                    None,
                )
                if matched_serving is None:
                    raise NutritionCalculationError(
                        f"Serving ID '{item_in.serving_id}' not found for food '{food.name}'"
                    )
                serving_desc = matched_serving.description
                serving_weight_g = matched_serving.weight_g
            else:
                # Pick default serving from food
                default_serving = next(
                    (s for s in food.serving_sizes if s.is_default),
                    food.serving_sizes[0] if food.serving_sizes else None,
                )
                if default_serving is not None:
                    serving_desc = default_serving.description
                    serving_weight_g = default_serving.weight_g

            # Calculate deterministic nutrition snapshot
            computed = calculate_nutrients(
                nutrients_per_100g=food.nutrients_per_100g,
                serving_weight_g=serving_weight_g,
                number_of_servings=item_in.number_of_servings,
            )
            total_weight_g = round(serving_weight_g * item_in.number_of_servings, 1)

            meal_item = MealItem(
                log_item_id=f"item_{uuid.uuid4().hex[:12]}",
                food_id=food.id,
                food_name=food.name,
                serving_selected=SelectedServing(
                    description=serving_desc,
                    weight_g=serving_weight_g,
                ),
                number_of_servings=item_in.number_of_servings,
                total_weight_g=total_weight_g,
                computed_nutrients=computed,
                logged_at=utc_now(),
            )
            meal.items.append(meal_item)

        # 3. Persist
        if meal.id is not None and existing_meal is not None:
            saved_meal = await self.meal_repo.update(meal)
        else:
            saved_meal = await self.meal_repo.create(meal)

        return MealLogResponse.from_meal_log(saved_meal)

    async def update_meal_item(
        self,
        log_item_id: str,
        item_in: MealItemUpdate,
        current_user: CurrentUser,
    ) -> MealLogResponse:
        """
        Update quantity or serving of an existing logged food item.
        Recalculates item nutrition and meal totals.
        """
        meal = await self.meal_repo.find_meal_by_item_id(log_item_id, current_user.id)
        if meal is None:
            raise MealItemNotFoundError(f"Logged item '{log_item_id}' not found")

        item_idx = next(
            (idx for idx, it in enumerate(meal.items) if it.log_item_id == log_item_id),
            None,
        )
        if item_idx is None:
            raise MealItemNotFoundError(f"Logged item '{log_item_id}' not found")

        target_item = meal.items[item_idx]

        # Determine new quantity
        new_servings = (
            item_in.number_of_servings
            if item_in.number_of_servings is not None
            else target_item.number_of_servings
        )

        # Determine new serving definition
        new_desc = target_item.serving_selected.description
        new_weight_g = target_item.serving_selected.weight_g

        food = await self.food_repo.get_by_id(target_item.food_id)

        if item_in.serving_selected is not None:
            new_desc = item_in.serving_selected.description
            new_weight_g = item_in.serving_selected.weight_g
        elif item_in.serving_id is not None:
            if food is not None:
                matched_serving = next(
                    (s for s in food.serving_sizes if s.serving_id == item_in.serving_id),
                    None,
                )
                if matched_serving is None:
                    raise NutritionCalculationError(
                        f"Serving ID '{item_in.serving_id}' not found on food"
                    )
                new_desc = matched_serving.description
                new_weight_g = matched_serving.weight_g
            else:
                raise NutritionCalculationError(
                    f"Cannot switch serving ID '{item_in.serving_id}' because original food was removed"
                )

        # Recalculate nutrients
        if food is not None:
            new_computed = calculate_nutrients(
                nutrients_per_100g=food.nutrients_per_100g,
                serving_weight_g=new_weight_g,
                number_of_servings=new_servings,
            )
        else:
            # Fallback to historical snapshot ratio
            new_computed = recalculate_from_snapshot(
                item=target_item,
                new_serving_weight_g=new_weight_g,
                new_number_of_servings=new_servings,
            )

        new_total_weight = round(new_weight_g * new_servings, 1)

        # Update item in-place
        target_item.serving_selected = SelectedServing(
            description=new_desc,
            weight_g=new_weight_g,
        )
        target_item.number_of_servings = new_servings
        target_item.total_weight_g = new_total_weight
        target_item.computed_nutrients = new_computed

        meal.items[item_idx] = target_item
        saved_meal = await self.meal_repo.update(meal)
        return MealLogResponse.from_meal_log(saved_meal)

    async def delete_meal_item(
        self,
        log_item_id: str,
        current_user: CurrentUser,
    ) -> None:
        """
        Delete a specific logged food item from the user's meal log.
        If no items remain in the meal log, deletes the empty meal log document.
        """
        meal = await self.meal_repo.find_meal_by_item_id(log_item_id, current_user.id)
        if meal is None:
            raise MealItemNotFoundError(f"Logged item '{log_item_id}' not found")

        original_count = len(meal.items)
        meal.items = [it for it in meal.items if it.log_item_id != log_item_id]

        if len(meal.items) == original_count:
            raise MealItemNotFoundError(f"Logged item '{log_item_id}' not found")

        if len(meal.items) == 0:
            await self.meal_repo.delete(meal.id, current_user.id)
        else:
            await self.meal_repo.update(meal)
