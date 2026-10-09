import copy
import re
from typing import Any, Dict, List, Optional
from bson import ObjectId


class DeleteResult:
    def __init__(self, deleted_count: int):
        self.deleted_count = deleted_count


class UpdateResult:
    def __init__(self, matched_count: int, modified_count: int):
        self.matched_count = matched_count
        self.modified_count = modified_count


class AsyncMockCursor:
    def __init__(self, docs: List[Dict[str, Any]]):
        self._docs = [copy.deepcopy(d) for d in docs]
        self._skip = 0
        self._limit = None
        self._sort_key = None
        self._sort_direction = 1

    def sort(self, key: str, direction: int = 1):
        self._sort_key = key
        self._sort_direction = direction
        return self

    def skip(self, n: int):
        self._skip = n
        return self

    def limit(self, n: int):
        self._limit = n
        return self

    def _get_results(self) -> List[Dict[str, Any]]:
        docs = list(self._docs)
        if self._sort_key:
            docs.sort(
                key=lambda d: str(d.get(self._sort_key) or "").lower(),
                reverse=(self._sort_direction == -1),
            )
        if self._skip:
            docs = docs[self._skip:]
        if self._limit is not None:
            docs = docs[:self._limit]
        return docs

    def __aiter__(self):
        self._iter_results = iter(self._get_results())
        return self

    async def __anext__(self):
        try:
            return next(self._iter_results)
        except StopIteration:
            raise StopAsyncIteration


def _extract_values(doc: Any, keys: List[str]) -> List[Any]:
    if not keys:
        return [doc]
    key = keys[0]
    remaining = keys[1:]
    if isinstance(doc, dict):
        if key in doc:
            return _extract_values(doc[key], remaining)
        return []
    elif isinstance(doc, list):
        res = []
        for item in doc:
            res.extend(_extract_values(item, keys))
        return res
    return []


def _check_condition(val: Any, v: Any) -> bool:
    if isinstance(v, dict):
        for op, target in v.items():
            if op == "$regex":
                flags = re.IGNORECASE if "i" in v.get("$options", "") else 0
                if not (val and re.search(target, str(val), flags)):
                    return False
            elif op == "$options":
                continue
            elif op == "$ne":
                if val == target:
                    return False
            elif op == "$in":
                if val not in target:
                    return False
            elif op == "$gte":
                if val is None or val < target:
                    return False
            elif op == "$lte":
                if val is None or val > target:
                    return False
            elif op == "$gt":
                if val is None or val <= target:
                    return False
            elif op == "$lt":
                if val is None or val >= target:
                    return False
            else:
                if val != v:
                    return False
        return True
    else:
        return val == v


def _match_document(doc: Dict[str, Any], query: Dict[str, Any]) -> bool:
    for k, v in query.items():
        if k == "$or":
            if not any(_match_document(doc, cond) for cond in v):
                return False
        elif k == "$and":
            if not all(_match_document(doc, cond) for cond in v):
                return False
        elif k == "$text":
            search_str = v.get("$search", "").lower()
            text_corpus = " ".join([
                str(doc.get("name") or ""),
                str(doc.get("brand") or ""),
                " ".join(doc.get("tags") or []),
            ]).lower()
            if search_str not in text_corpus:
                return False
        else:
            keys = k.split(".")
            vals = _extract_values(doc, keys)
            if not vals:
                if v is None:
                    continue
                return False
            if not any(_check_condition(val, v) for val in vals):
                return False
    return True


class AsyncMockCollection:
    def __init__(self, name: str):
        self.name = name
        self.docs: List[Dict[str, Any]] = []

    async def insert_one(self, doc: Dict[str, Any]):
        copied = copy.deepcopy(doc)
        if "_id" not in copied or copied["_id"] is None:
            copied["_id"] = ObjectId()
        self.docs.append(copied)
        return copied

    async def find_one(self, query: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        for d in self.docs:
            if _match_document(d, query):
                return copy.deepcopy(d)
        return None

    def find(self, query: Dict[str, Any]) -> AsyncMockCursor:
        matched = [d for d in self.docs if _match_document(d, query)]
        return AsyncMockCursor(matched)

    async def count_documents(self, query: Dict[str, Any]) -> int:
        return sum(1 for d in self.docs if _match_document(d, query))

    async def update_one(self, query: Dict[str, Any], update: Dict[str, Any]) -> UpdateResult:
        set_fields = update.get("$set", {})
        for d in self.docs:
            if _match_document(d, query):
                for k, v in set_fields.items():
                    keys = k.split(".")
                    target = d
                    for key in keys[:-1]:
                        target = target.setdefault(key, {})
                    target[keys[-1]] = copy.deepcopy(v)
                return UpdateResult(matched_count=1, modified_count=1)
        return UpdateResult(matched_count=0, modified_count=0)

    async def delete_one(self, query: Dict[str, Any]) -> DeleteResult:
        for idx, d in enumerate(self.docs):
            if _match_document(d, query):
                del self.docs[idx]
                return DeleteResult(deleted_count=1)
        return DeleteResult(deleted_count=0)

    async def create_indexes(self, indexes):
        pass


class AsyncMockDatabase:
    def __init__(self, name: str = "nutritrack_test"):
        self.name = name
        self.foods = AsyncMockCollection("foods")
        self.users = AsyncMockCollection("users")
        self.user_settings = AsyncMockCollection("user_settings")
        self.meal_logs = AsyncMockCollection("meal_logs")
        self.weight_logs = AsyncMockCollection("weight_logs")

    async def command(self, cmd: str):
        if cmd == "ping":
            return {"ok": 1.0}
        return {}
