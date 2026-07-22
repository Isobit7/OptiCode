# OptiCode
AI-powered code explainer, humanizer, prettifier, and optimizer — free and open-source, works with any language
# Code Optimizer & Explainer

Free, open-source web app that explains, humanizes, prettifies, shortens, and optimizes any code you paste — powered by AI.

---

## Table of Contents
- [About](#about)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Design System](#design-system)
- [Setup & Running Locally](#setup--running-locally)
- [Deployment](#deployment)
- [Documentation](#documentation)
- [Contributing](#contributing)

---

## About

Code Optimizer & Explainer lets anyone — students, professional developers, or non-coders — paste code in **any language** and get AI-assisted transformations and explanations back. It's built to be free forever and fully open-source.

**Target users:** students learning to code, professional developers wanting quick cleanup/refactors, and non-coders who need code explained in plain language.

## Features

| Feature | What it does |
|---|---|
| **Explainer** | Plain-language explanation of pasted code, adjustable depth (beginner → advanced) |
| **Humanizer** | Rewrites AI-generated code to look human-written, and/or simplifies + comments code for readability |
| **Prettifier** | Formats code to language-standard style conventions |
| **Shortener** | Minifies/condenses code while preserving behavior |
| **SEO-Friendly Optimizer** | Optimizes HTML meta tags, semantic structure, naming/docs for discoverability |
| **Code Alternatives** | Generates 2-3 alternative implementations, each labeled with tradeoffs (e.g. more performant, more readable) |

Every result shows the original input, the transformed output, and a diff view side by side.

## Tech Stack

- **Frontend:** [React](https://react.dev) (Vite) → deployed on [Vercel](https://vercel.com)
- **Backend:** [FastAPI](https://fastapi.tiangolo.com) (Python) → deployed on Render/Fly.io
- **Database:** [Supabase](https://supabase.com) (Postgres + optional Auth)
- **LLM layer:** Custom-built interface (`backend/app/llm_interface/`), isolated so the underlying model/provider can be swapped without touching the rest of the app
- **Deterministic tools:** Prettify/Shorten/SEO checks run without calling the LLM (formatters, minifiers, static analysis) — keeps things fast and cheap

See [`Tech_Stack_Options.md`](./Tech_Stack_Options.md) for the full comparison of alternatives considered.

## Project Structure

```
code-optimizer-explainer/
├── frontend/                React app (Vercel)
│   ├── src/
│   │   ├── api/               backend.js (FastAPI calls), supabaseClient.js (auth only)
│   │   ├── App.jsx            main UI: code input, feature buttons, results
│   │   └── main.jsx
│   └── .env.example
│
├── backend/                  FastAPI app (Render/Fly.io)
│   ├── app/
│   │   ├── routes/             one file per feature (explain, humanize, prettify, etc.)
│   │   ├── llm_interface/      the ONLY place that calls the LLM — swap providers here
│   │   ├── deterministic_tools/ prettify/shorten/seo — no LLM needed
│   │   ├── db/                  Supabase client wrapper
│   │   ├── models.py            request/response schemas
│   │   └── main.py              app entrypoint, route registration
│   └── .env.example
│
├── scripts/
│   └── pre-commit             git hook: warns if source changes without MEMORY.md update
│
├── MEMORY.md                  persistent project context, auto-updated by AI assistants
├── RULES.md                   coding conventions/preferences for AI assistants
├── DESIGN.md                  color palette & visual design system
├── PRD_Code_Optimizer_Explainer.md   full product requirements
├── System_Architecture.md     component responsibilities & request flow
├── Tech_Stack_Options.md      stack comparison and reasoning
└── README.md                  this file
```

## Design System

The UI follows a soft, warm gradient aesthetic (blue → pink → orange glow) paired with a dark, minimal, pill-shaped input bar — full color tokens, CSS gradient recipe, and component specs are documented in [`DESIGN.md`](./DESIGN.md).

## Setup & Running Locally

### Prerequisites
- Node.js (for frontend)
- Python 3.10+ (for backend)
- A [Supabase](https://supabase.com) project (free tier works)
- An LLM inference provider/API key (see [`Tech_Stack_Options.md`](./Tech_Stack_Options.md) for options)

### Backend
```bash
cd backend
pip install -r requirements.txt --break-system-packages
cp .env.example .env   # fill in SUPABASE_URL, SUPABASE_SERVICE_KEY, LLM_API_KEY, etc.
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
npm install
cp .env.example .env   # fill in VITE_API_BASE_URL, VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY
npm run dev
```

### Still needs to be wired up
- `backend/app/llm_interface/client.py` — connect to your chosen LLM provider (currently a stub)
- `backend/app/deterministic_tools/tools.py` — connect formatters/minifiers/SEO checker (currently a stub)
- Supabase `history` table — schema is documented in [`System_Architecture.md`](./System_Architecture.md)

## Deployment

- **Frontend → Vercel** (built for React/Vite, zero-config deploy)
- **Backend → Render or Fly.io** — **not Vercel**, since Vercel's serverless model doesn't suit a persistent FastAPI server (see [`System_Architecture.md`](./System_Architecture.md) for why)
- **Database → Supabase** (already managed/hosted)

## Documentation

| File | Purpose |
|---|---|
| [`PRD_Code_Optimizer_Explainer.md`](./PRD_Code_Optimizer_Explainer.md) | Product requirements: goals, scope, features, open questions |
| [`Tech_Stack_Options.md`](./Tech_Stack_Options.md) | Frontend/backend/database/LLM options compared, and why this stack was chosen |
| [`System_Architecture.md`](./System_Architecture.md) | How React, FastAPI, Supabase, and the LLM interface talk to each other |
| [`DESIGN.md`](./DESIGN.md) | Color palette, gradient recipe, and UI component styling reference |
| [`MEMORY.md`](./MEMORY.md) | Living project context — any AI assistant working in this repo reads and updates this every session |
| [`RULES.md`](./RULES.md) | Coding conventions: formatting, testing, error handling, dependency, and communication preferences |

## Contributing

This project is free and open-source (license TBD — see Open Decisions in `MEMORY.md`). If you're using an AI coding assistant (Claude Code, Cursor, etc.) to contribute, have it read `MEMORY.md` and `RULES.md` first — they contain the current project state and coding conventions it should follow.
