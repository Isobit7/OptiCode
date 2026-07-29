"""
Golden-set fixtures — 12 representative code snippets committed to the repo.

Selection criteria (from the implementation plan):
  - 3-4 languages (Python, JavaScript, Go, TypeScript)
  - Varying complexity: trivial utility → data-structure algorithm → async I/O → auth/security
  - Each snippet is named and tagged so the eval harness can select subsets

Each entry is a dict:
  id          — unique short identifier used in test parametrize IDs
  language    — explicit language tag passed to LLM endpoints
  complexity  — "low" | "medium" | "high"
  tags        — list of topic tags; "security" / "auth" tags trigger PR-review risk check
  code        — the actual code snippet
"""
from typing import Dict, List, Any

GOLDEN_SNIPPETS: List[Dict[str, Any]] = [
    # -----------------------------------------------------------------------
    # Python — low complexity
    # -----------------------------------------------------------------------
    {
        "id": "py_utility_sum",
        "language": "python",
        "complexity": "low",
        "tags": ["utility", "python"],
        "code": (
            "def sum_evens(numbers):\n"
            '    """Return the sum of all even numbers in the list."""\n'
            "    return sum(n for n in numbers if n % 2 == 0)\n"
        ),
    },
    {
        "id": "py_decorator",
        "language": "python",
        "complexity": "low",
        "tags": ["decorator", "python"],
        "code": (
            "import functools\n\n"
            "def retry(max_attempts=3):\n"
            '    """Retry decorator with configurable attempt count."""\n'
            "    def decorator(fn):\n"
            "        @functools.wraps(fn)\n"
            "        def wrapper(*args, **kwargs):\n"
            "            for attempt in range(max_attempts):\n"
            "                try:\n"
            "                    return fn(*args, **kwargs)\n"
            "                except Exception:\n"
            "                    if attempt == max_attempts - 1:\n"
            "                        raise\n"
            "        return wrapper\n"
            "    return decorator\n"
        ),
    },
    # -----------------------------------------------------------------------
    # Python — medium complexity
    # -----------------------------------------------------------------------
    {
        "id": "py_bst",
        "language": "python",
        "complexity": "medium",
        "tags": ["data-structure", "algorithm", "python"],
        "code": (
            "class BSTNode:\n"
            "    def __init__(self, value):\n"
            "        self.value = value\n"
            "        self.left = None\n"
            "        self.right = None\n\n"
            "class BinarySearchTree:\n"
            "    def __init__(self):\n"
            "        self.root = None\n\n"
            "    def insert(self, value):\n"
            "        if not self.root:\n"
            "            self.root = BSTNode(value)\n"
            "        else:\n"
            "            self._insert(self.root, value)\n\n"
            "    def _insert(self, node, value):\n"
            "        if value < node.value:\n"
            "            if node.left is None:\n"
            "                node.left = BSTNode(value)\n"
            "            else:\n"
            "                self._insert(node.left, value)\n"
            "        else:\n"
            "            if node.right is None:\n"
            "                node.right = BSTNode(value)\n"
            "            else:\n"
            "                self._insert(node.right, value)\n\n"
            "    def search(self, value):\n"
            "        return self._search(self.root, value)\n\n"
            "    def _search(self, node, value):\n"
            "        if node is None or node.value == value:\n"
            "            return node\n"
            "        if value < node.value:\n"
            "            return self._search(node.left, value)\n"
            "        return self._search(node.right, value)\n"
        ),
    },
    # -----------------------------------------------------------------------
    # Python — high complexity (auth / security — triggers risk check)
    # -----------------------------------------------------------------------
    {
        "id": "py_auth_jwt",
        "language": "python",
        "complexity": "high",
        "tags": ["auth", "security", "python"],
        "code": (
            "import jwt\n"
            "import os\n"
            "from datetime import datetime, timedelta\n\n"
            "SECRET_KEY = os.getenv('JWT_SECRET_KEY', 'fallback-insecure-key')\n\n"
            "def create_token(user_id: str, role: str = 'user') -> str:\n"
            "    payload = {\n"
            "        'sub': user_id,\n"
            "        'role': role,\n"
            "        'exp': datetime.utcnow() + timedelta(hours=1),\n"
            "        'iat': datetime.utcnow(),\n"
            "    }\n"
            "    return jwt.encode(payload, SECRET_KEY, algorithm='HS256')\n\n"
            "def verify_token(token: str) -> dict:\n"
            "    try:\n"
            "        return jwt.decode(token, SECRET_KEY, algorithms=['HS256'])\n"
            "    except jwt.ExpiredSignatureError:\n"
            "        raise ValueError('Token has expired')\n"
            "    except jwt.InvalidTokenError as e:\n"
            "        raise ValueError(f'Invalid token: {e}')\n"
        ),
    },
    # -----------------------------------------------------------------------
    # JavaScript — low complexity
    # -----------------------------------------------------------------------
    {
        "id": "js_debounce",
        "language": "javascript",
        "complexity": "low",
        "tags": ["utility", "javascript"],
        "code": (
            "/**\n"
            " * Debounce a function call.\n"
            " * @param {Function} fn - Function to debounce\n"
            " * @param {number} delay - Delay in milliseconds\n"
            " */\n"
            "function debounce(fn, delay) {\n"
            "  let timer;\n"
            "  return function (...args) {\n"
            "    clearTimeout(timer);\n"
            "    timer = setTimeout(() => fn.apply(this, args), delay);\n"
            "  };\n"
            "}\n"
            "module.exports = { debounce };\n"
        ),
    },
    {
        "id": "js_fetch_retry",
        "language": "javascript",
        "complexity": "medium",
        "tags": ["async", "networking", "javascript"],
        "code": (
            "async function fetchWithRetry(url, options = {}, retries = 3) {\n"
            "  for (let attempt = 0; attempt < retries; attempt++) {\n"
            "    try {\n"
            "      const response = await fetch(url, options);\n"
            "      if (!response.ok) throw new Error(`HTTP ${response.status}`);\n"
            "      return await response.json();\n"
            "    } catch (err) {\n"
            "      if (attempt === retries - 1) throw err;\n"
            "      await new Promise(r => setTimeout(r, 200 * Math.pow(2, attempt)));\n"
            "    }\n"
            "  }\n"
            "}\n"
            "module.exports = { fetchWithRetry };\n"
        ),
    },
    # -----------------------------------------------------------------------
    # TypeScript — medium complexity
    # -----------------------------------------------------------------------
    {
        "id": "ts_generic_stack",
        "language": "typescript",
        "complexity": "medium",
        "tags": ["data-structure", "generics", "typescript"],
        "code": (
            "class Stack<T> {\n"
            "  private items: T[] = [];\n\n"
            "  push(item: T): void {\n"
            "    this.items.push(item);\n"
            "  }\n\n"
            "  pop(): T | undefined {\n"
            "    return this.items.pop();\n"
            "  }\n\n"
            "  peek(): T | undefined {\n"
            "    return this.items[this.items.length - 1];\n"
            "  }\n\n"
            "  get size(): number {\n"
            "    return this.items.length;\n"
            "  }\n\n"
            "  isEmpty(): boolean {\n"
            "    return this.items.length === 0;\n"
            "  }\n"
            "}\n\n"
            "export default Stack;\n"
        ),
    },
    {
        "id": "ts_api_client",
        "language": "typescript",
        "complexity": "high",
        "tags": ["async", "networking", "typescript"],
        "code": (
            "interface ApiResponse<T> {\n"
            "  data: T;\n"
            "  status: number;\n"
            "  message: string;\n"
            "}\n\n"
            "async function apiRequest<T>(\n"
            "  endpoint: string,\n"
            "  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'GET',\n"
            "  body?: unknown,\n"
            "): Promise<ApiResponse<T>> {\n"
            "  const response = await fetch(`/api/${endpoint}`, {\n"
            "    method,\n"
            "    headers: { 'Content-Type': 'application/json' },\n"
            "    body: body ? JSON.stringify(body) : undefined,\n"
            "  });\n"
            "  if (!response.ok) {\n"
            "    throw new Error(`Request failed: ${response.status}`);\n"
            "  }\n"
            "  return response.json();\n"
            "}\n\n"
            "export { apiRequest };\n"
        ),
    },
    # -----------------------------------------------------------------------
    # Go — medium complexity
    # -----------------------------------------------------------------------
    {
        "id": "go_concurrent_counter",
        "language": "go",
        "complexity": "medium",
        "tags": ["concurrency", "go"],
        "code": (
            "package main\n\n"
            "import (\n"
            '    "fmt"\n'
            '    "sync"\n'
            ")\n\n"
            "type SafeCounter struct {\n"
            "    mu    sync.Mutex\n"
            "    count int\n"
            "}\n\n"
            "func (c *SafeCounter) Increment() {\n"
            "    c.mu.Lock()\n"
            "    defer c.mu.Unlock()\n"
            "    c.count++\n"
            "}\n\n"
            "func (c *SafeCounter) Value() int {\n"
            "    c.mu.Lock()\n"
            "    defer c.mu.Unlock()\n"
            "    return c.count\n"
            "}\n\n"
            "func main() {\n"
            "    counter := &SafeCounter{}\n"
            "    var wg sync.WaitGroup\n"
            "    for i := 0; i < 1000; i++ {\n"
            "        wg.Add(1)\n"
            "        go func() {\n"
            "            defer wg.Done()\n"
            "            counter.Increment()\n"
            "        }()\n"
            "    }\n"
            "    wg.Wait()\n"
            '    fmt.Println("Final count:", counter.Value())\n'
            "}\n"
        ),
    },
    # -----------------------------------------------------------------------
    # Python — high complexity (database / SQL — triggers risk check)
    # -----------------------------------------------------------------------
    {
        "id": "py_sql_query",
        "language": "python",
        "complexity": "high",
        "tags": ["database", "sql", "security", "python"],
        "code": (
            "import sqlite3\n"
            "from typing import List, Dict, Any, Optional\n\n"
            "class UserRepository:\n"
            "    def __init__(self, db_path: str):\n"
            "        self.conn = sqlite3.connect(db_path)\n"
            "        self.conn.row_factory = sqlite3.Row\n\n"
            "    def find_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:\n"
            "        cursor = self.conn.execute(\n"
            "            'SELECT * FROM users WHERE id = ?', (user_id,)\n"
            "        )\n"
            "        row = cursor.fetchone()\n"
            "        return dict(row) if row else None\n\n"
            "    def search_by_email(self, email: str) -> List[Dict[str, Any]]:\n"
            "        cursor = self.conn.execute(\n"
            "            'SELECT id, email, created_at FROM users WHERE email LIKE ?',\n"
            "            (f'%{email}%',)\n"
            "        )\n"
            "        return [dict(row) for row in cursor.fetchall()]\n\n"
            "    def close(self):\n"
            "        self.conn.close()\n"
        ),
    },
    # -----------------------------------------------------------------------
    # JavaScript — high complexity (auth — triggers risk check)
    # -----------------------------------------------------------------------
    {
        "id": "js_auth_middleware",
        "language": "javascript",
        "complexity": "high",
        "tags": ["auth", "security", "javascript"],
        "code": (
            "const jwt = require('jsonwebtoken');\n\n"
            "function authMiddleware(req, res, next) {\n"
            "  const authHeader = req.headers['authorization'];\n"
            "  if (!authHeader || !authHeader.startsWith('Bearer ')) {\n"
            "    return res.status(401).json({ error: 'No token provided' });\n"
            "  }\n"
            "  const token = authHeader.split(' ')[1];\n"
            "  try {\n"
            "    const decoded = jwt.verify(token, process.env.JWT_SECRET);\n"
            "    req.user = decoded;\n"
            "    next();\n"
            "  } catch (err) {\n"
            "    return res.status(403).json({ error: 'Invalid or expired token' });\n"
            "  }\n"
            "}\n\n"
            "module.exports = authMiddleware;\n"
        ),
    },
    # -----------------------------------------------------------------------
    # TypeScript — low complexity (utility)
    # -----------------------------------------------------------------------
    {
        "id": "ts_result_type",
        "language": "typescript",
        "complexity": "low",
        "tags": ["utility", "functional", "typescript"],
        "code": (
            "type Ok<T> = { ok: true; value: T };\n"
            "type Err<E> = { ok: false; error: E };\n"
            "type Result<T, E = Error> = Ok<T> | Err<E>;\n\n"
            "function ok<T>(value: T): Ok<T> {\n"
            "  return { ok: true, value };\n"
            "}\n\n"
            "function err<E>(error: E): Err<E> {\n"
            "  return { ok: false, error };\n"
            "}\n\n"
            "function unwrap<T, E>(result: Result<T, E>): T {\n"
            "  if (!result.ok) throw new Error(`Unwrap called on Err: ${result.error}`);\n"
            "  return result.value;\n"
            "}\n\n"
            "export { Result, ok, err, unwrap };\n"
        ),
    },
]

# Quick lookup by id
SNIPPET_BY_ID: Dict[str, Dict[str, Any]] = {s["id"]: s for s in GOLDEN_SNIPPETS}
