from fastapi import APIRouter, Response, status
from app.core.config import get_settings
from app.core.database import check_db_connectivity
from app.schemas.health import DatabaseHealth, HealthResponse

router = APIRouter()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System and Database Health Check",
    description="Verifies the operational status of the FastAPI application and active MongoDB connectivity.",
)
async def get_health(response: Response) -> HealthResponse:
    settings = get_settings()
    is_connected, latency_ms, error_msg = await check_db_connectivity()

    if is_connected:
        db_health = DatabaseHealth(
            status="connected",
            latency_ms=latency_ms,
            message="MongoDB ping successful",
        )
        overall_status = "healthy"
    else:
        db_health = DatabaseHealth(
            status="disconnected",
            latency_ms=None,
            message=error_msg or "Unable to reach MongoDB",
        )
        overall_status = "degraded"
        response.status_code = status.HTTP_503_SERVICE_UNAVAILABLE

    return HealthResponse(
        status=overall_status,
        app=settings.PROJECT_NAME,
        environment=settings.ENVIRONMENT,
        version=settings.VERSION,
        database=db_health,
    )
