# MEMORY.md
## Persistent Project Memory — Single Source of Truth

> 💡 **GUIDELINE FOR AI ASSISTANTS**:
> Update this file at **logical milestones or when convenient** (e.g. major feature completions, architecture updates, deployment changes). Keep this document clean, well-structured, proper, and concise.

---

## 1. Project Overview

**OptiCode** (Code Optimizer & Explainer) is a modern, high-performance, open-source web application designed to help developers, students, and engineers understand, humanize, optimize, translate, and format code seamlessly.

- **Live Frontend**: [https://opticode-lab.vercel.app](https://opticode-lab.vercel.app)
- **Live Backend**: [https://opticode-zc3b.onrender.com](https://opticode-zc3b.onrender.com) (Fallback: `https://opticode-backend.vercel.app`)

---

## 2. Core Features

| Feature | Description |
|---|---|
| **Explainer** | Plain-language code explanations with adjustable depth (`beginner`, `intermediate`, `advanced`) |
| **Humanizer** | Code refactoring modes: `de-ai` (remove AI clichés), `simplify` (clean structure), `idiomatic` (standard idioms) |
| **Prettifier** | Deterministic code formatting (Black for Python, JSBeautifier for Web) |
| **Shortener** | Minifies code while strictly preserving logic (AST-based for Python, regex for Web/C) |
| **SEO Optimizer** | Static HTML analysis returning a 0–100 SEO health score, actionable checklist, and optimized code |
| **Code Alternatives** | Generates alternative implementations with tradeoff analysis, pros/cons, and Big-O ($O(N)$) bounds |
| **Security Audit** | Static analysis & LLM audit detecting secrets, OWASP vulnerabilities, and unsafe patterns |
| **Logic Flowchart** | Generates interactive Mermaid.js visual logic diagrams for complex code blocks |
| **Code Translator** | Translates logic between 15+ programming languages |
| **PR Review Summary** | Auto-generates GitHub Pull Request summaries, risk assessments, and reviewer notes |

---

## 3. Tech Stack & Infrastructure

- **Frontend**: React 19, Vite, TanStack Router, Tailwind CSS (Vite production build on **Vercel**).
- **Backend**: FastAPI (Python 3.12), Async Uvicorn (Deployed on **Render** with CORS & security headers).
- **Database & Auth**: Supabase (PostgreSQL, SHA-256 local hash fallback, persistent chat history).
- **LLM Engine**: Multi-model fallback client (`google/gemma-4-31b-it:free`, `meta-llama/llama-3.3-70b-instruct:free`, `deepseek/deepseek-r1:free`).
- **SEO & Verification**: Google Search Console verification (`google8286d920d6fcd994.html`), `sitemap.xml`, `robots.txt`.

---

## 4. Key Architectural Decisions

1. **Backend Proxy Pattern**: Frontend never calls Supabase data tables directly — all queries route through FastAPI for security and rate limiting.
2. **Resilient Network Client (`safeAuthFetch`)**: Automatic fallback to production backend if local Uvicorn instance is offline.
3. **Zero Disturbance Dark Theme**: Instant inline theme script in `index.html` preventing light-mode flash on load.
4. **Deterministic & LLM Dual Pipelines**: Formatting (Prettify/Shorten) uses deterministic tools (Black, JSBeautifier); AI features use LLM interface with fallback chains.

---

## 5. Repository Structure

```
s:/PROJECT/OptiCode/
├── GOOGLE_SEARCH_CONSOLE_SETUP_GUIDE.md   Complete GSC step-by-step PDF-ready guide
├── MEMORY.md                               Single source of truth project memory
├── google8286d920d6fcd994.html             Google Search Console verification file
└── code-optimizer-explainer/
    ├── frontend/                           Vite React SPA (Vercel deployment)
    │   ├── public/                         Favicon assets, sitemap.xml, robots.txt, GSC verification
    │   └── src/api/                        backend.ts (safeAuthFetch & API client)
    └── backend/                            FastAPI Python App (Render deployment)
        ├── app/
        │   ├── routes/                     auth, explain, humanize, prettify, shorten, security, etc.
        │   ├── llm_interface/              OpenRouter multi-model fallback engine
        │   └── db/                         Supabase database session wrapper
        └── tests/                          Pytest test suite (100% passing)
```

---

## 6. Milestone Changelog

*(Updated when convenient at logical project milestones)*

| Date | Category | Milestone Description |
|---|---|---|
| **2026-07-30** | **UI & Branding** | Removed all action/banner/submit/header icons from Sign In, Create Account forms (`LoginForm`, `RegisterForm`, `SignInModal`, `login` route, `SocialButton`) and Chat section headers (`OptimizerApp`, `PreferencesDropdown`). Pushed clean deployment update. |
| **2026-07-30** | **Branding & UI** | Removed squircle logo icons from Sign in/Create Account pages, sidebars, and headers; generated clean 100% transparent Code-Spark favicon set; configured versioned `-v5.js` asset filenames to purge browser disk cache. |
| **2026-07-30** | **SEO & GSC** | Deployed Google Search Console verification file `google8286d920d6fcd994.html` live to `https://opticode-lab.vercel.app/google8286d920d6fcd994.html` (200 OK verified). Updated `sitemap.xml` & `robots.txt` domain pointers and created PDF setup guide. |
| **2026-07-29** | **Authentication** | Overhauled authentication system with strict credential verification, SHA-256 local fallback hashing, Google OAuth event sync, and embedded `SignInModal`. All 40 backend pytest cases passing. |
| **2026-07-29** | **Resilience** | Implemented `safeAuthFetch` network fallback in frontend to ensure zero connection failures during authentication. |
| **2026-07-29** | **UI & UX** | Fixed DOM event handling, restored form interactivity, configured default dark mode, and added syntax-highlighted output blocks. |
