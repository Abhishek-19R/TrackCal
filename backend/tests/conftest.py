import os
import pytest
from httpx import ASGITransport, AsyncClient

# Set test environment flags before importing app
os.environ["ENVIRONMENT"] = "test"
os.environ["DEBUG"] = "false"
os.environ["MONGODB_DB_NAME"] = "nutritrack_test"
os.environ["MONGODB_SERVER_SELECTION_TIMEOUT_MS"] = "500"

from app.api.deps import get_db
from app.main import app
from tests.mock_db import AsyncMockDatabase


@pytest.fixture
def anyio_backend():
    return "asyncio"


@pytest.fixture
async def async_client():
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


@pytest.fixture
def mock_db() -> AsyncMockDatabase:
    """Provides a fresh, isolated in-memory mock MongoDB database."""
    return AsyncMockDatabase("nutritrack_test")


@pytest.fixture
async def client_with_db(mock_db: AsyncMockDatabase):
    """Provides an AsyncClient where get_db returns the isolated in-memory mock_db."""
    app.dependency_overrides[get_db] = lambda: mock_db
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client
    app.dependency_overrides.pop(get_db, None)
