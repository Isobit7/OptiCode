# RULES.md
## Coding Rules & Conventions for AI Assistants

> This file defines HOW to write code in this project. `MEMORY.md` defines WHAT the project is and its current state. Read both before writing any code. These rules apply to every file you touch, every session.

---

## 1. General Principles

- Prefer simple, readable code over clever code — this is a beginner-maintained project.
- Every new function/module should be small enough to explain in one sentence.
- Don't introduce a new library/dependency without checking it's not already covered by something in `requirements.txt` / `package.json`.
- If a rule here conflicts with a request the user makes, follow the user's request but flag the conflict first.

## 1a. Formatting & Linting

- Auto-format ALL code with **Black** (Python) and **Prettier** (JS/React) before every commit — no exceptions, no manual style debates.
- The `scripts/pre-commit` hook should run these formatters automatically; if the hook isn't installed yet, run formatters manually before committing.

## 1b. Testing

- Do NOT write tests automatically alongside new features.
- Only write tests when the user explicitly asks for them.

## 1c. Error Handling

- Always wrap operations that can fail (API calls, file I/O, external requests, LLM calls) in try/catch (or Python's try/except).
- Error messages shown to the end user must be friendly and plain-language — never expose raw stack traces or technical error text to the UI.
- Log the technical detail server-side (backend) for debugging; show the friendly version to the user.

## 1d. Dependencies

- Small, common, well-known libraries (already-established packages doing one obvious job) can be added without asking.
- Ask the user first before adding anything "heavy" or major — a new framework, a new database, a new LLM/AI library, anything with licensing implications, or anything that changes the tech stack.

## 1e. Comments

- Keep comments minimal. Only comment on genuinely tricky, non-obvious logic (e.g., a workaround, a non-standard algorithm, a security-sensitive check).
- Don't comment on self-explanatory code (e.g., no `# increment counter` above `count += 1`).

## 1f. Communicating Results to the User

- The user is a beginner. Before delivering a finished task, **ask how they want the explanation formatted** — e.g., a detailed summary vs. short bullet points — if it's not already clear from the conversation.
- Once a preference is stated in a session, keep using it for the rest of that session without re-asking every time.

## 1g. Confirming Before Large Changes

- Always confirm with the user before making large/structural changes — refactors touching many files, architecture changes, renaming core modules, or anything that would be hard to undo.
- Small, contained changes (a single function, a single bug fix, a single new route) don't need pre-confirmation — just do them and summarize after, per the user's chosen explanation style.

## 2. Backend (FastAPI / Python)

- One route file per feature in `backend/app/routes/` — never combine unrelated features in one route file.
- All request/response schemas go in `backend/app/models.py` using Pydantic — never return raw dicts from routes.
- The `llm_interface/` module is the ONLY place allowed to call the LLM provider. No route or other module calls the model directly.
- `deterministic_tools/` functions must never call the LLM — if a "deterministic" feature starts needing AI, that's a design decision to flag to the user, not to silently implement.
- All secrets (API keys, Supabase service key) come from environment variables via `os.getenv()` — never hardcoded, never committed.
- Every route must validate input against `MAX_LINES` before processing.
- Use type hints on all function signatures.
- Follow PEP8; format with `black` before committing.

## 3. Frontend (React)

- Keep API calls centralized in `src/api/` — components never call `fetch()` directly.
- `src/api/supabaseClient.js` is used ONLY for auth — never for data reads/writes (those go through the FastAPI backend).
- No `localStorage`/`sessionStorage` for anything sensitive (tokens, keys) — use in-memory state or Supabase's own session handling.
- Components should be functional components with hooks — no class components.
- Keep components small and feature-scoped (one component per feature panel, not one giant `App.jsx` as the project grows — refactor `App.jsx` into `components/` once it exceeds ~150 lines).

## 4. Database (Supabase)

- Every table that stores user data must have Row Level Security enabled before going to production.
- Never expose the Supabase **service key** to the frontend — anon key only, and only for auth.
- Schema changes should be reflected back into `System_Architecture.md`, not just made ad hoc in the Supabase dashboard.

## 5. Security

- No API keys, tokens, or secrets ever committed to the repo — always via `.env` (already gitignored) and `.env.example` as the template.
- Rate-limit any endpoint that calls the LLM to control cost and abuse.
- Sanitize/validate all user-submitted code before passing it to any subprocess (e.g., formatters) to avoid command injection.

## 6. Git & Commit Hygiene

- Commit messages should describe the "why," not just the "what" (e.g., `Add rate limiting to /api/explain to control LLM cost` not `update explain.py`).
- If a commit changes architecture, tech stack, or a product decision, update `MEMORY.md`'s Changelog in the same commit (enforced by `scripts/pre-commit`).
- Don't commit commented-out code — delete it; git history preserves it if needed later.

## 7. When Adding a New Feature

1. Check `MEMORY.md` Section 7 (Open Decisions) — if the feature touches an unresolved decision, ask the user first.
2. Add the route in `backend/app/routes/`, schema in `models.py`, and wire it into `main.py`.
3. Decide: does it need the LLM (`llm_interface/`) or is it deterministic (`deterministic_tools/`)? Don't default to LLM if a rule-based approach works — cheaper and faster.
4. Add the corresponding frontend call in `src/api/backend.js` and a UI entry point.
5. Update `MEMORY.md` (Section 2 features table, and Changelog).

## 8. What NOT To Do

- Don't switch the tech stack (React/FastAPI/Supabase/Vercel) without explicit user approval — it's a locked decision (see `MEMORY.md` Section 3).
- Don't deploy FastAPI to Vercel — it doesn't suit a persistent Python server (see `System_Architecture.md`).
- Don't add paid/monetization logic — this project is free and open-source by decision.
- Don't silently make product decisions (pricing, license, auth method) — these are listed as Open Decisions in `MEMORY.md` and need the user's input.
