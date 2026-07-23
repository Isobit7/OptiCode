# System Architecture
## Code Optimizer & Explainer — React + FastAPI + Supabase + Custom LLM Interface

**Version:** 0.1
**Date:** July 22, 2026

---

## 1. High-Level Architecture

```
┌─────────────────┐      HTTPS/REST       ┌──────────────────┐
│                  │ ───────────────────► │                  │
│  React Frontend  │                       │  FastAPI Backend │
│   (on Vercel)    │ ◄─────────────────── │ (on Render/Fly.io)│
│                  │      JSON responses   │                  │
└─────────────────┘                       └────────┬─────────┘
                                                     │
                        ┌────────────────────────────┼────────────────────────────┐
                        │                             │                            │
                        ▼                             ▼                            ▼
              ┌──────────────────┐         ┌──────────────────┐        ┌──────────────────┐
              │     Supabase      │         │  Custom LLM       │        │  Deterministic    │
              │  (Postgres DB +   │         │  Interface        │        │  Tools            │
              │  optional Auth)   │         │ (Explainer,        │        │ (Prettifier,      │
              │                   │         │  Humanizer,        │        │  Shortener,       │
              │  - user accounts  │         │  Alternatives)     │        │  SEO checker)      │
              │  - saved history  │         │                    │        │                    │
              └──────────────────┘         └──────────────────┘        └──────────────────┘
```

## 2. Component Breakdown

### 2.1 React Frontend (Vercel)
**Responsibilities:**
- Code input panel (paste/upload code)
- Feature selection (Explain / Humanize / Prettify / Shorten / SEO-optimize / Alternatives — one or multiple)
- Results display: explanation text, transformed code, diff view, alternatives list
- Optional login UI (calls Supabase Auth)
- Copy/download output

**Talks to:** FastAPI backend only (never talks to Supabase or the LLM interface directly, for security — API keys/service logic stay server-side)

*Exception:* Supabase Auth can be called directly from the frontend using Supabase's client SDK for login/signup — this is standard practice and keeps auth simple. Everything else (data reads/writes, LLM calls) goes through FastAPI.

### 2.2 FastAPI Backend (Render/Fly.io)
**Responsibilities:**
- Single entry point for all code-processing requests
- Routes requests to the right module based on selected feature(s)
- Calls the **Custom LLM Interface** for Explainer, Humanizer, Alternatives
- Calls **Deterministic Tools** (formatters/minifiers/static analyzers) for Prettifier, Shortener, SEO checks
- Reads/writes history to Supabase (if user is logged in and opts to save)
- Enforces input limits (~5,000 lines), basic abuse/rate limiting

**Suggested route structure:**
```
POST /api/explain          → Custom LLM Interface
POST /api/humanize         → Custom LLM Interface
POST /api/alternatives     → Custom LLM Interface
POST /api/prettify         → Deterministic Tools
POST /api/shorten          → Deterministic Tools
POST /api/seo-optimize     → Deterministic Tools
POST /api/process          → orchestrator: runs multiple features in one call
GET  /api/history          → Supabase (requires auth)
POST /api/history          → Supabase (save a result, requires auth)
```

### 2.3 Custom LLM Interface
**Responsibilities:**
- Wraps whichever open-source model/inference provider you choose (hosted API to start, self-hosted later)
- Handles prompt construction per feature (explain vs. humanize vs. alternatives each need different prompts)
- Handles language detection (or receives it from the backend)
- Returns structured output (e.g., JSON: `{ explanation, confidence, detected_language }`)

**Design tip:** build this as its own internal Python module/service (e.g., `llm_interface/`) with one function per feature, so you can swap the underlying model/provider later without touching the rest of the backend.

### 2.4 Deterministic Tools
**Responsibilities:**
- Prettifier: run language-standard formatters (e.g., Prettier for JS, Black for Python) as subprocesses or libraries
- Shortener: AST-based minification per language
- SEO checker: static analysis of HTML for meta tags, semantic structure, alt attributes

**Why separate from the LLM interface:** these don't need AI, so keeping them separate saves compute cost and latency — one of the reasons to keep this modular from day one.

### 2.5 Supabase
**Responsibilities:**
- **Auth:** optional login (email or OAuth), matches your "optional login to save history" requirement
- **Postgres DB:** stores saved history (input code, output, feature used, timestamp) linked to user ID when logged in
- Anonymous users simply skip the save step — no DB write required for core usage

**Suggested minimal schema:**
```
users              (managed by Supabase Auth)
history
  - id
  - user_id (nullable — null if anonymous, though anonymous won't persist)
  - input_code
  - feature_used
  - output
  - created_at
```

## 3. Request Flow Example (Explainer feature)

1. User pastes code in React, clicks "Explain"
2. React sends `POST /api/explain` to FastAPI with the code
3. FastAPI validates input size, detects/receives language
4. FastAPI calls the Custom LLM Interface's `explain()` function
5. LLM Interface builds the prompt, calls the underlying model, parses the response
6. FastAPI returns structured JSON to React
7. React renders the explanation
8. If logged in and user clicks "Save," React calls `POST /api/history` → FastAPI writes to Supabase

## 4. Why This Structure Scales Later

- **LLM Interface is isolated** → swapping hosted API for self-hosted GPU inference later means changing one module, not the whole backend
- **Deterministic tools separated from LLM calls** → keeps compute cost down as you scale, since not every feature needs a model call
- **FastAPI as the only gateway** → frontend never needs to change even if backend internals change
- **Supabase Postgres is real Postgres** → can migrate to self-managed/AWS RDS later without changing your data model

## 5. Security Notes
- Keep all API keys/secrets (Supabase service key, LLM provider key) server-side in FastAPI environment variables — never in React/frontend code
- Use Supabase's Row Level Security (RLS) so users can only read/write their own history rows
- Rate-limit `/api/*` routes to prevent abuse of your (paid, even if cheap) LLM inference calls
