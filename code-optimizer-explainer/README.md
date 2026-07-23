# Code Optimizer & Explainer — Starter Scaffold

Matches the stack decided in the System Architecture doc:
**React (frontend) + FastAPI (backend) + Supabase (database) + custom LLM interface + Vercel (frontend deploy)**

## Structure

```
code-optimizer-explainer/
├── frontend/               React app (deploy to Vercel)
│   ├── src/
│   │   ├── api/             backend.js (FastAPI calls), supabaseClient.js (auth only)
│   │   ├── App.jsx          main UI: code input, feature buttons, results
│   │   └── main.jsx
│   └── .env.example
│
└── backend/                 FastAPI app (deploy to Render/Fly.io — NOT Vercel, see notes)
    ├── app/
    │   ├── routes/           one file per feature (explain, humanize, prettify, etc.)
    │   ├── llm_interface/    the ONLY place that calls your LLM — swap providers here
    │   ├── deterministic_tools/  prettify/shorten/seo — no LLM needed
    │   ├── db/                Supabase client wrapper
    │   ├── models.py          request/response schemas
    │   └── main.py            app entrypoint, route registration
    └── .env.example
```

## What's Already Wired Up
- Full route structure for all 6 features
- Request validation (5,000 line input limit)
- Modular LLM interface (isolated so swapping providers later is a one-file change)
- Supabase history save/read (requires login, matches "optional login" requirement)
- Frontend calls backend only — never Supabase data directly (keeps secrets server-side)

## What You Still Need To Do
1. **Pick and wire up an LLM provider** in `backend/app/llm_interface/client.py` (see `_call_model()` — currently raises `NotImplementedError`)
2. **Wire up formatters/minifiers** in `backend/app/deterministic_tools/tools.py` (e.g., Prettier/Black subprocess calls, BeautifulSoup for SEO)
3. **Create your Supabase project**, run the `history` table schema (see System Architecture doc), and fill in `.env` files
4. **Install dependencies:**
   - Backend: `cd backend && pip install -r requirements.txt`
   - Frontend: `cd frontend && npm install`
5. **Run locally:**
   - Backend: `uvicorn app.main:app --reload` (from `backend/`)
   - Frontend: `npm run dev` (from `frontend/`)
6. **Deploy:** frontend → Vercel, backend → Render/Fly.io (see architecture doc for why not Vercel for FastAPI)

## Reference Docs
- `PRD_Code_Optimizer_Explainer.md` — product requirements
- `Tech_Stack_Options.md` — why this stack was chosen
- `System_Architecture.md` — how the pieces talk to each other
