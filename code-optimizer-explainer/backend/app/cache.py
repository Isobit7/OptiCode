import hashlib, json, logging, time
from collections import OrderedDict
from typing import Any, Optional

logger = logging.getLogger("code_optimizer.cache")
_TTL = 3600
_MAX = 500


class _LRUCache:
    def __init__(self):
        self._store = OrderedDict()
        self.hits = 0
        self.misses = 0

    def _key(self, action, code, language, options):
        raw = json.dumps({"a": action, "c": code, "l": language or "", "o": options or {}}, sort_keys=True)
        return hashlib.sha256(raw.encode()).hexdigest()

    def get(self, action, code, language, options):
        k = self._key(action, code, language, options)
        if k not in self._store:
            self.misses += 1
            return None
        ts, val = self._store[k]
        if time.time() - ts > _TTL:
            del self._store[k]
            self.misses += 1
            return None
        self._store.move_to_end(k)
        self.hits += 1
        return val

    def set(self, action, code, language, options, value):
        k = self._key(action, code, language, options)
        self._store[k] = (time.time(), value)
        self._store.move_to_end(k)
        if len(self._store) > _MAX:
            self._store.popitem(last=False)

    def stats(self):
        total = self.hits + self.misses
        return {
            "size": len(self._store),
            "max_size": _MAX,
            "hits": self.hits,
            "misses": self.misses,
            "hit_rate": round(self.hits / max(1, total) * 100, 1),
        }

    def clear(self):
        self._store.clear()
        self.hits = 0
        self.misses = 0


cache = _LRUCache()
