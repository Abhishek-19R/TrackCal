from typing import Optional
from bson import ObjectId

from app.core.auth import CurrentUser
from app.core.exceptions import FoodForbiddenError, FoodNotFoundError, InvalidIdError
from app.models.food import Food, FoodProvenance
from app.repositories.food_repository import FoodRepository
from app.schemas.food import FoodCreate, FoodResponse, FoodSearchResponse, FoodUpdate


class FoodService:
    """
    Business logic layer for Food domain.
    Enforces ownership rules, access controls, and validation.
    """

    def __init__(self, repository: FoodRepository):
        self.repository = repository

    def _parse_object_id(self, food_id: str) -> ObjectId:
        if not ObjectId.is_valid(food_id):
            raise InvalidIdError(f"Invalid food ID format: '{food_id}'")
        return ObjectId(food_id)

    async def search_foods(
        self,
        query: Optional[str],
        current_user: CurrentUser,
        page: int = 1,
        limit: int = 20,
    ) -> FoodSearchResponse:
        """
        Search foods with current user's visibility scope.
        System foods and cached foods are visible to all users.
        Custom foods are visible ONLY to the user who created them.
        """
        if page < 1:
            page = 1
        if limit < 1:
            limit = 20
        elif limit > 100:
            limit = 100

        foods, total = await self.repository.search(
            query=query,
            current_user_id=current_user.id,
            page=page,
            limit=limit,
        )

        return FoodSearchResponse(
            items=[FoodResponse.from_food(f) for f in foods],
            total=total,
            page=page,
            limit=limit,
        )

    async def get_food_by_id(
        self, food_id: str, current_user: CurrentUser
    ) -> FoodResponse:
        """
        Retrieve a food item by ID, enforcing ownership visibility rules.
        """
        oid = self._parse_object_id(food_id)
        food = await self.repository.get_by_id(oid)

        if food is None:
            raise FoodNotFoundError(f"Food with ID '{food_id}' not found")

        # Check visibility
        if not food.is_system and food.provenance.source_type != "cached":
            if food.created_by != current_user.id:
                # Food belongs to another user - hide its existence
                raise FoodNotFoundError(f"Food with ID '{food_id}' not found")

        return FoodResponse.from_food(food)

    async def create_custom_food(
        self, food_in: FoodCreate, current_user: CurrentUser
    ) -> FoodResponse:
        """
        Create a custom food item strictly owned by the current user.
        Always sets is_system=False, created_by=current_user.id, provenance.source_type='user'.
        """
        source_name = "custom"
        if food_in.provenance and food_in.provenance.source_name:
            source_name = food_in.provenance.source_name

        provenance = FoodProvenance(
            source_type="user",
            source_name=source_name,
            external_id=None,
            attribution=None,
            license=None,
        )

        food = Food(
            name=food_in.name,
            brand=food_in.brand,
            barcode=food_in.barcode,
            is_system=False,
            created_by=current_user.id,
            provenance=provenance,
            serving_sizes=food_in.serving_sizes,
            nutrients_per_100g=food_in.nutrients_per_100g,
            tags=food_in.tags,
        )

        created_food = await self.repository.create(food)
        return FoodResponse.from_food(created_food)

    async def update_custom_food(
        self,
        food_id: str,
        food_in: FoodUpdate,
        current_user: CurrentUser,
    ) -> FoodResponse:
        """
        Update a custom food item.
        Rejects modification of system foods or foods owned by another user.
        """
        oid = self._parse_object_id(food_id)
        food = await self.repository.get_by_id(oid)

        if food is None:
            raise FoodNotFoundError(f"Food with ID '{food_id}' not found")

        if food.is_system:
            raise FoodForbiddenError("System foods cannot be modified by users")

        if food.created_by != current_user.id:
            raise FoodForbiddenError("You do not have permission to modify this food")

        update_dict = food_in.model_dump(exclude_unset=True)

        if not update_dict:
            return FoodResponse.from_food(food)

        # Convert nested pydantic models to dicts if present
        if "serving_sizes" in update_dict and update_dict["serving_sizes"] is not None:
            update_dict["serving_sizes"] = [
                s.model_dump() if hasattr(s, "model_dump") else s
                for s in update_dict["serving_sizes"]
            ]
        if "nutrients_per_100g" in update_dict and update_dict["nutrients_per_100g"] is not None:
            n = update_dict["nutrients_per_100g"]
            update_dict["nutrients_per_100g"] = (
                n.model_dump() if hasattr(n, "model_dump") else n
            )

        updated_food = await self.repository.update(oid, update_dict)
        if updated_food is None:
            raise FoodNotFoundError(f"Food with ID '{food_id}' not found")

        return FoodResponse.from_food(updated_food)

    async def delete_custom_food(
        self, food_id: str, current_user: CurrentUser
    ) -> None:
        """
        Delete a custom food item.
        Rejects deletion of system foods or foods owned by another user.
        """
        oid = self._parse_object_id(food_id)
        food = await self.repository.get_by_id(oid)

        if food is None:
            raise FoodNotFoundError(f"Food with ID '{food_id}' not found")

        if food.is_system:
            raise FoodForbiddenError("System foods cannot be deleted by users")

        if food.created_by != current_user.id:
            raise FoodForbiddenError("You do not have permission to delete this food")

        await self.repository.delete(oid)
