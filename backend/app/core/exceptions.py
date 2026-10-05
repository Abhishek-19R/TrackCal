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
