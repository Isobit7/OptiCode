# MEMORY.md
## Persistent Project Memory — Auto-Updated

> ⚠️ **MANDATORY INSTRUCTION FOR ANY AI ASSISTANT WORKING IN THIS REPO** (Claude Code, Cursor, Copilot, etc.):
>
> This file is the single source of truth for project context. You MUST:
> 1. **Read this entire file before doing any work**, every session.
> 2. **After making ANY change** — new feature, architecture decision, tech stack swap, file added/removed, bug fix that changes behavior, decision the user makes — **update this file in the same turn**, before ending your response. Do not wait to be asked.
> 3. Update the specific section that changed (Sections 3-7 below), and add one line to the **Changelog** (Section 9) with the date and what changed.
> 4. If a change conflicts with something already documented here, flag the conflict to the user before proceeding — don't silently overwrite past decisions.
> 5. Never leave this file stale. A future session (or a different AI tool) depends entirely on this file being current — treat it as more important than the code comments.

---

## 1. What This Project Is

A free, open-source web app called **Code Optimizer & Explainer**. Users paste any code (language-agnostic) and get AI-assisted transformations and explanations.

**Target users:** students, professional developers, and non-coders — all of the above.

## 2. Core Features

| Feature | What it does |
|---|---|
| **Explainer** | Plain-language explanation of pasted code, adjustable depth (`beginner`, `intermediate`, `advanced`) |
| **Humanizer** | Rewrites code with configurable modes: `de-ai` (remove AI clichés), `simplify` (readable structure), `idiomatic` (standard idioms) |
| **Prettifier** | Formats code to language-standard style conventions (Black for Python, JSBeautifier for Web) |
| **Shortener** | Minifies/condenses code while preserving behavior (AST-based for Python, regex for Web/C) |
| **SEO-Friendly Optimizer** | Static HTML analysis returning a 0–100 SEO health score, structured checklist, and optimized markup |
| **Code Alternatives** | Generates 2-3 alternative implementations with tradeoff labels, pros/cons lists, and $O(...)$ time/space bounds |

Input/output handling: always show original input, transformed output, and a diff view.

## 3. Tech Stack (update this section if the stack ever changes)

- **Frontend:** React (Vite), deployed on **Vercel**
- **Backend:** FastAPI (Python), deployed on **Render/Fly.io** (not Vercel)
- **Database:** Supabase (Postgres + optional Auth)
- **LLM layer:** Custom-built interface (`backend/app/llm_interface/client.py`) with multi-model fallback (`poolside/laguna-s-2.1:free`, `google/gemma-4-31b-it:free`)
- **Deterministic tools:** Prettify/Shorten/SEO run WITHOUT the LLM (Black, JSBeautifier, BeautifulSoup static analysis)

## 4. Key Product Decisions (update this section as new decisions are made)

- Free and open-source (license not yet chosen)
- Language-agnostic: any language pasted, auto-detected
- Input limit: ~5,000 lines per request
- Login is optional — anonymous use fully works; login only needed to save history
- No fixed launch deadline — quality over speed
- Web-app only for v1 (no browser extension/public API yet — v2 candidates)
- Frontend dashboard buttons & API contracts fully specified in `code-optimizer-explainer/FRONTEND_DASHBOARD_SPECS.md` for frontend teammate integration.

## 5. Architecture Rules (update this section if architecture changes)

- Frontend never calls Supabase directly for data — only FastAPI does. Frontend may call Supabase directly ONLY for Auth, using the public anon key.
- All secrets live server-side in FastAPI, never in frontend code.
- One FastAPI route per feature (`/api/explain`, `/api/humanize`, `/api/prettify`, `/api/shorten`, `/api/seo-optimize`, `/api/alternatives`), plus `/api/auth` and `/api/history`.
- Supabase Row Level Security so users only read/write their own history.
- Rate-limit `/api/*` to control LLM inference cost.

## 6. Project Structure (update this section if structure changes)

```
code-optimizer-explainer/
├── FRONTEND_DASHBOARD_SPECS.md   Full UI buttons & API integration specs for frontend developer
├── frontend/               React app (Vercel)
│   └── src/api/             backend.js (FastAPI calls), supabaseClient.js (auth only)
└── backend/                 FastAPI app (Render/Fly.io)
    ├── app/
    │   ├── routes/           one file per feature
    │   ├── llm_interface/    OpenRouter LLM provider client with multi-model fallback
    │   ├── deterministic_tools/ prettify/shorten/seo — Black, JSBeautifier, BeautifulSoup
    │   ├── db/                Supabase client wrapper
    │   └── models.py          Pydantic request/response schemas
    └── tests/                Pytest suite (test_backend_routes.py)
```

## 7. Open Decisions (move items out of here into Section 4 once resolved)

- Open-source license (MIT/Apache 2.0/etc.)
- Auth provider details for Supabase login (email vs. OAuth)
- Data retention policy for saved history

## 8. Reference Docs In This Repo

- `PRD_Code_Optimizer_Explainer.md` — full product requirements
- `code-optimizer-explainer/PROJECT_SYSTEM_OVERVIEW_AND_REQUEST_FLOW.md` — visual system overview, sequence diagrams, component map, and request lifecycle
- `code-optimizer-explainer/OPTICODE_FULL_SPECIFICATION_MASTER.md` — single master document containing all 3 specs verbatim (Dashboard Specs, Zero Disturbance UX, Product Roadmap)
- `code-optimizer-explainer/ZERO_DISTURBANCE_UX_AND_STANDOUT_FEATURES.md` — technical architecture for zero-error resilience and standout features
- `code-optimizer-explainer/PRODUCT_ROADMAP.md` — strategic roadmap detailing security scanner, PR summary, translator, and flowchart features
- `code-optimizer-explainer/FRONTEND_DASHBOARD_SPECS.md` — UI buttons, controls, and API response contracts for frontend developer
- `Tech_Stack_Options.md` — why this stack was chosen
- `System_Architecture.md` — detailed request flow and component responsibilities
- `README.md` — setup/run instructions

## 9. Changelog
*(Newest entry on top. One line per change — date + what changed + why, if non-obvious.)*

| 2026-07-24 | Integrated full React frontend application from frontendopticode into OptiCode/code-optimizer-explainer/frontend, connecting UI components and SignInModal to backend auth, sessions, and AI APIs |
| 2026-07-24 | Added WhatsApp OTP authentication (`/api/auth/whatsapp/send-otp`, `/api/auth/whatsapp/verify`) storing user profiles (`auth_provider="whatsapp"`), active sessions, and cookies in DB |
| 2026-07-24 | Integrated Email, Google OAuth, and Phone SMS OTP authentication with database storage for user profiles (`user_profiles`), active sessions, and cookie token metadata (`user_sessions`) in backend |
| 2026-07-24 | Created PROJECT_SYSTEM_OVERVIEW_AND_REQUEST_FLOW.md detailing full system architecture, Mermaid sequence diagrams, component maps, and request lifecycles |
| 2026-07-24 | Integrated Triple Provider Architecture (Groq API Primary -> Google Gemini 2.5 Flash Secondary -> OpenRouter Pool Tertiary) in backend/app/llm_interface/client.py |
| 2026-07-24 | Expanded LLM fallback model chain to 6 high-capacity free models (Llama 3.3 70B, DeepSeek R1, Qwen 2.5 Coder, Gemma 2, Mistral 7B, Poolside) to prevent 429 rate limit failures |
| 2026-07-24 | Created OPTICODE_FULL_SPECIFICATION_MASTER.md consolidating Dashboard Specs, Zero Disturbance UX Architecture, and Product Roadmap into one complete document |
| 2026-07-24 | Created MASTER_SYSTEM_AND_PRODUCT_SPECIFICATION.md combining Dashboard Specs, Zero Disturbance UX Architecture, and Product Roadmap into a single master document |
| 2026-07-24 | Added ZERO_DISTURBANCE_UX_AND_STANDOUT_FEATURES.md detailing multi-tier failovers, React Error Boundaries, and standout features |
| 2026-07-24 | Added PRODUCT_ROADMAP.md detailing Security Audit, Code Translator, PR Reviewer, and Logic Flowcharts |
| 2026-07-24 | Added FRONTEND_DASHBOARD_SPECS.md for frontend developer integration |
| 2026-07-24 | Added explanation depth levels, humanize modes, structured alternatives with Big-O bounds, SEO 0-100 scoring, and 9-test backend test suite |
| 2026-07-22 | Initial PRD, tech stack, architecture, and starter scaffold created |

---

**This file has no effect unless kept current.** Its entire value is that it's always accurate — an AI assistant that reads a stale version will make decisions based on wrong context. Update it every time, not "when convenient."
