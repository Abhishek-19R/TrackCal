from unittest.mock import patch
import pytest
from httpx import ASGITransport, AsyncClient

from app.main import app


@pytest.mark.asyncio
async def test_root_endpoint():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        response = await client.get("/")
        assert response.status_code == 200
        data = response.json()
        assert "NutriTrack API" in data["message"]
        assert data["health"] == "/api/v1/health"


@pytest.mark.asyncio
async def test_health_endpoint_connected():
    with patch("app.api.v1.endpoints.health.check_db_connectivity") as mock_check:
        mock_check.return_value = (True, 2.45, None)

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/health")
            assert response.status_code == 200
            data = response.json()
            assert data["status"] == "healthy"
            assert data["database"]["status"] == "connected"
            assert data["database"]["latency_ms"] == 2.45
            assert data["app"] == "NutriTrack API"


@pytest.mark.asyncio
async def test_health_endpoint_disconnected():
    with patch("app.api.v1.endpoints.health.check_db_connectivity") as mock_check:
        mock_check.return_value = (False, None, "ServerSelectionTimeoutError: connection refused")

        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            response = await client.get("/api/v1/health")
            # Must return 503 Service Unavailable when DB is down
            assert response.status_code == 503
            data = response.json()
            assert data["status"] == "degraded"
            assert data["database"]["status"] == "disconnected"
            assert data["database"]["latency_ms"] is None
            assert "connection refused" in data["database"]["message"]


@pytest.mark.asyncio
async def test_app_lifespan():
    """Verify lifespan startup and shutdown runs cleanly."""
    from app.main import lifespan
    async with lifespan(app):
        # App is initialized inside context
        pass


@pytest.mark.asyncio
async def test_ensure_indexes():
    """Verify ensure_indexes calls create_indexes on all 5 collections."""
    from unittest.mock import AsyncMock, MagicMock
    from app.core.database import ensure_indexes

    mock_db = MagicMock()
    mock_db.users.create_indexes = AsyncMock()
    mock_db.user_settings.create_indexes = AsyncMock()
    mock_db.foods.create_indexes = AsyncMock()
    mock_db.meal_logs.create_indexes = AsyncMock()
    mock_db.weight_logs.create_indexes = AsyncMock()

    await ensure_indexes(mock_db)

    assert mock_db.users.create_indexes.called
    assert mock_db.user_settings.create_indexes.called
    assert mock_db.foods.create_indexes.called
    assert mock_db.meal_logs.create_indexes.called
    assert mock_db.weight_logs.create_indexes.called


@pytest.mark.asyncio
async def test_database_lifecycle_and_uninitialized():
    """Verify PyMongo Async database initialization and error handling."""
    from pymongo import AsyncMongoClient
    from app.core.database import (
        close_mongo_connection,
        connect_to_mongo,
        db_manager,
        get_database,
        check_db_connectivity,
    )

    # Clean prior state
    await close_mongo_connection()

    # Uninitialized get_database must raise RuntimeError
    with pytest.raises(RuntimeError):
        get_database()

    # Uninitialized check_db_connectivity must report False
    connected, latency, msg = await check_db_connectivity()
    assert connected is False
    assert "not initialized" in msg

    # Initialize connection
    await connect_to_mongo()
    assert isinstance(db_manager.client, AsyncMongoClient)
    assert db_manager.db is not None
    assert get_database() is not None

    # Clean close
    await close_mongo_connection()
    assert db_manager.client is None
    assert db_manager.db is None
