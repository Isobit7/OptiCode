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

| 2026-07-24 | Redesigned header title into a ChatGPT-style `OptiCode ▾` model selector dropdown listing Explainer Models (Standard, Beginner, Pro Architect) and Humanizer Modes (De-AI, Idiomatic, Simplified) as rich option rows with checkmarks (`✓`) in PreferencesDropdown.tsx & OptimizerApp.tsx |
| 2026-07-24 | Added glassmorphic `PreferencesDropdown` button next to `OptiCode` header title allowing dynamic selection of Explainer Depth (Beginner, Intermediate, Advanced) and Humanizer Style (De-AI Natural, Idiomatic Clean, Simplified) passed directly to backend requests in PreferencesDropdown.tsx, backend.ts, & OptimizerApp.tsx |
| 2026-07-24 | Positioned `History` and `Saved` navigation bar buttons directly in the sidebar footer right above the `Settings` bar button in SidebarHistory.tsx |
| 2026-07-24 | Separated History and Saved into distinct, stacked full-width navigation bar buttons (`[ 🕒 History (7) ]` and `[ ⭐ Saved (0) ]`) in SidebarHistory.tsx |
| 2026-07-24 | Cleaned collapsed sidebar rail: removed history items from collapsed state (`if (collapsed) return null`) so rail contains only expand, new session, and settings controls in SidebarHistory.tsx |
| 2026-07-24 | Restored original vibrant orange and pink background gradient (`style={{ background: "var(--app-gradient)" }}`) while retaining all surface depth, warm shadows, 2-tier font hierarchy, pill micro-interactions, and floating scroll pill button in OptimizerApp.tsx |
| 2026-07-24 | Completed 7-point design system overhaul: radial mesh gradient + SVG grain texture overlay, warm palette shadows (`shadow-warm-md`), 2-tier font hierarchy, locked radius scale (8px/16px/24px), warm outline action pills with hover lift, and refined glass scroll button across OptimizerApp, SidebarHistory, ActionPills, CodeInputBar, & ResultsPanel |
| 2026-07-24 | Integrated professional AI MarkdownRenderer: parses bullet points with accent dots, numbered steps, section headers (`###`), inline code badges, and code blocks in ResultsPanel.tsx & client.py |
| 2026-07-24 | Redesigned output cards to theme-aware ambient glassmorphism (`bg-white/80 dark:bg-[#121620]/95 backdrop-blur-2xl`) matching the exact background palette vibe in ResultsPanel.tsx |
| 2026-07-24 | Expanded text blocks to display 100% full content: removed `max-w-2xl`, `max-h-48`, `max-h-[500px]`, and `max-w-[110px]` height/width restrictions in ResultsPanel.tsx & SidebarHistory.tsx |
| 2026-07-24 | Positioned vertical scrollbar on the far right edge of the full-width workspace container (instead of centered in the middle of max-w-4xl) in OptimizerApp.tsx |
| 2026-07-24 | Enabled visible sleek up-down scrollbar (`6px rgba(249, 115, 22, 0.45)` thumb) and added floating scroll-to-bottom button (`<ArrowDown />`) in OptimizerApp.tsx & styles.css |
| 2026-07-24 | Enabled multi-turn chat conversation stream: every submission appends a new message turn, automatically clears input box (`setCode("")`) for next input, and scrolls down smoothly in OptimizerApp.tsx & ResultsPanel.tsx |
| 2026-07-24 | Eliminated ugly native browser scrollbars globally: added custom thin 4px scrollbar styling and `.no-scrollbar` utilities across workspace containers in styles.css & OptimizerApp.tsx |
| 2026-07-24 | Matched bottom sticky bar background directly to page color palette gradient (`bg-gradient-to-t from-[var(--app-gradient)]`) removing all borders for seamless floating card aesthetic in OptimizerApp.tsx |
| 2026-07-24 | Fixed black background box around bottom sticky input bar by switching container to theme-aware glassmorphism (`bg-white/40 dark:bg-[#0d1017]/95`) in OptimizerApp.tsx |
| 2026-07-24 | Redesigned history items to thin, single-line slides with truncated code previews, relative time tags, and slide hover micro-interactions in SidebarHistory.tsx |
| 2026-07-24 | Updated header title **OptiCode** to solid pure white text (`text-white font-black drop-shadow-md`) across all themes in OptimizerApp.tsx |
| 2026-07-24 | Updated header title **OptiCode** to crisp bold white text (`text-zinc-900 dark:text-white font-extrabold`) in OptimizerApp.tsx |
| 2026-07-24 | Styled header title **OptiCode** with sunset orange-amber gradient (`from-orange-500 via-amber-500 to-rose-500 bg-clip-text text-transparent`) matching the design color palette in OptimizerApp.tsx |
| 2026-07-24 | Placed bold **OptiCode** branding title on the left side of top main workspace header bar in OptimizerApp.tsx |
| 2026-07-24 | Removed "OptiCode" text from sidebar top header in SidebarHistory.tsx, displaying only the clean logo icon |
| 2026-07-24 | Created dedicated Settings bar button in sidebar footer with expandable drawer housing Theme mode selector (Light/Dark), session stats, and export/clear controls |
| 2026-07-24 | Redesigned ResultsPanel.tsx to match Claude AI conversation thread UI: right-aligned user input chat bubble, left-aligned markdown/code AI stream block with thought summary badge and copy buttons |
| 2026-07-24 | Separated History and Starred into two dedicated sidebar tabs with individual item counter badges, dynamic search placeholders, and tailored empty states in SidebarHistory.tsx |
| 2026-07-24 | Removed Templates tab and template rendering section from SidebarHistory.tsx, leaving clean History & Starred navigation tabs |
| 2026-07-24 | Reduced sidebar width from w-72 sm:w-80 down to slim w-56 sm:w-64 with compact padding and font styling in SidebarHistory.tsx |
| 2026-07-24 | Updated SidebarHistory header: removed OptiCode and Dashboard (0) text, placed interactive Settings button directly next to the logo |
| 2026-07-24 | Added Refined & Snappy micro-interactions (pop-in popover animations, tactile button feedback 150ms cubic-bezier, shimmer loading waves) and prefers-reduced-motion accessibility support in styles.css & CodeInputBar.tsx |
| 2026-07-24 | Implemented BeeBot two-panel workspace layout pattern: attached action chips inside CodeInputBar border, dynamic submit button labels (e.g. EXPLAIN, PRETTIFY), and grouped history sessions (Today, Last 7 Days, Older) in SidebarHistory.tsx |
| 2026-07-24 | Added Notion/Slack-style Slash Commands popover menu (/explain, /humanize, /prettify, /shorten, /seo, /alternatives) with keyboard selection (Arrow keys + Enter/Tab) in CodeInputBar.tsx |
| 2026-07-24 | Implemented ChatGPT-style layout transition in OptimizerApp.tsx: anchored CodeInputBar + ActionPills to sticky bottom dock when response is active, rendering ResultsPanel in top viewport |
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
