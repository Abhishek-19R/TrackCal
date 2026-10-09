class AppException(Exception):
    """Base application exception."""
    def __init__(self, message: str):
        self.message = message
        super().__init__(message)


class FoodNotFoundError(AppException):
    """Raised when a food item does not exist or is inaccessible."""
    pass


class FoodForbiddenError(AppException):
    """Raised when an operation on a food item is forbidden due to ownership rules."""
    pass


class InvalidIdError(AppException):
    """Raised when an identifier string is not a valid MongoDB ObjectId."""
    pass


class MealNotFoundError(AppException):
    """Raised when a meal log cannot be found or is not accessible."""
    pass


class MealItemNotFoundError(AppException):
    """Raised when a meal item within a meal log cannot be found or is not accessible."""
    pass


class WeightNotFoundError(AppException):
    """Raised when a weight log entry cannot be found or is not accessible."""
    pass


class WeightForbiddenError(AppException):
    """Raised when an operation on a weight record is forbidden due to ownership rules."""
    pass


class InvalidDateError(AppException):
    """Raised when a date string does not follow the expected YYYY-MM-DD ISO format."""
    pass


class NutritionCalculationError(AppException):
    """Raised when nutrient calculation inputs are non-finite, negative, or invalid."""
    pass
