# OptiCode Core Application Module

This directory contains the primary source code for the **OptiCode** platform, including the **React Frontend Workspace** and the **FastAPI Backend Core**.

---

## 📁 Module Directory Layout

```text
code-optimizer-explainer/
├── frontend/                # Vite + React 19 + TanStack Router Web Client
├── backend/                 # FastAPI REST API + LLM Multi-Provider Pipeline
├── scripts/                 # Terminal CLI Utility (opticode_cli.py)
└── .github/                 # GitHub Action Workflows (opticode-review.yml)
```

---

## ⚡ Quick Navigation

- **Main Documentation:** Please refer to the [Root README.md](../README.md) for full project architecture, features, badges, API reference, and live setup guides.
- **Frontend App:** See [frontend/README.md](./frontend/README.md) or start with `cd frontend && npm run dev`.
- **FastAPI Backend:** See [backend/README.md](./backend/README.md) or start with `cd backend && uvicorn app.main:app --reload`.
- **Project Memory & Logs:** See [MEMORY.md](./MEMORY.md) for recent changes, architectural decisions, and feature implementations.

---

## 🧪 Testing Backend Services

Run pytest inside `backend/`:

```bash
cd backend
pytest -v
```

Output:
```text
========================= 40 passed in 1.42s =========================
```
