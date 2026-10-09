import pytest
from bson import ObjectId

from app.models.weight_log import WeightLog
from app.repositories.weight_repository import WeightRepository
from tests.mock_db import AsyncMockDatabase


@pytest.mark.anyio
async def test_weight_repository_upsert_and_get(mock_db: AsyncMockDatabase):
    repo = WeightRepository(mock_db)
    user_id = ObjectId()

    weight = WeightLog(
        user_id=user_id,
        date="2026-10-09",
        weight_kg=78.5,
        note="Fasted morning",
    )

    # Initial insert
    saved, was_created = await repo.upsert(weight)
    assert was_created is True
    assert saved.id is not None

    # Fetch by date
    by_date = await repo.get_by_user_and_date(user_id, "2026-10-09")
    assert by_date is not None
    assert by_date.weight_kg == 78.5

    # Upsert on same date
    updated_weight = WeightLog(
        user_id=user_id,
        date="2026-10-09",
        weight_kg=78.0,
        note="Evening weigh-in",
    )
    saved2, was_created2 = await repo.upsert(updated_weight)
    assert was_created2 is False
    assert saved2.id == saved.id
    assert saved2.weight_kg == 78.0

    # Cross user isolation
    other_user = ObjectId()
    assert await repo.get_by_user_and_date(other_user, "2026-10-09") is None
    assert await repo.get_by_id(saved.id, other_user) is None


@pytest.mark.anyio
async def test_weight_repository_list_and_delete(mock_db: AsyncMockDatabase):
    repo = WeightRepository(mock_db)
    user_id = ObjectId()

    for d, w in [("2026-10-01", 80.0), ("2026-10-05", 79.5), ("2026-10-03", 79.8)]:
        await repo.upsert(WeightLog(user_id=user_id, date=d, weight_kg=w))

    # List all: sorted descending
    all_logs = await repo.list_by_user(user_id)
    assert len(all_logs) == 3
    assert [w.date for w in all_logs] == ["2026-10-05", "2026-10-03", "2026-10-01"]

    # Delete one
    target = all_logs[1]
    deleted = await repo.delete(target.id, user_id)
    assert deleted is True

    remaining = await repo.list_by_user(user_id)
    assert len(remaining) == 2
    assert target.id not in [w.id for w in remaining]
