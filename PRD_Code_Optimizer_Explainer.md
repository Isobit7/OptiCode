# Product Requirements Document (PRD)
## Code Optimizer & Explainer Platform

**Version:** 0.1 (Draft)
**Date:** July 22, 2026
**Status:** Draft for review

---

## 1. Overview

A free, open-source web application that lets users paste any code (language-agnostic) and receive AI-powered analysis, transformation, and improvement — including humanization, prettification, explanation, shortening, SEO optimization, and alternative implementations.

## 2. Problem Statement

Developers, students, and non-coders often work with code they didn't write, don't fully understand, or that isn't optimized for its purpose (readability, performance, discoverability, or presentation). Existing tools solve pieces of this (formatters, linters, AI explainers) but not as one unified, free, open-source workflow.

## 3. Target Users

- Students learning to code who need plain-language explanations
- Professional developers who want quick refactors, alternatives, or cleanup
- Non-coders/business users who need code explained or made presentable

## 4. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Make code understandable to any user | % of users rating explanations "clear" |
| Reduce code review/cleanup time | Avg. time from paste → usable output |
| Drive adoption as open-source project | GitHub stars, contributors, forks |
| Support any language pasted | # distinct languages successfully processed |

## 5. Scope

### 5.1 In Scope (v1)
- Web app: paste-code-in, results-out interface
- Own/self-hosted inference backend (not third-party LLM API dependency)
- Core features listed below (Section 6)
- Free and open-source (license TBD — e.g., MIT/Apache 2.0)

### 5.2 Out of Scope (v1)
- Browser/IDE extensions
- Public API access for third-party developers
- Paid tiers / monetization
- Real-time collaborative editing

*(Both may become v2 candidates — see Section 10.)*

## 6. Features

### 6.1 Explainer
- Accepts any language, auto-detects it
- Produces a plain-language, line-by-line or block-level explanation
- Adjustable explanation depth (beginner vs. advanced)

### 6.2 Humanizer
Two combined behaviors:
- **De-AI-ify:** rewrites AI-generated code so it reads like natural, idiomatic human-written code (variable naming, structure, comment style)
- **Simplify:** adds explanatory comments and restructures for readability without changing behavior

### 6.3 Prettifier
- Auto-formats code per language-standard style conventions (indentation, spacing, brace style)
- Configurable style presets (e.g., PEP8, Prettier defaults, Google style)

### 6.4 Input/Output Handling ("out... and output included")
- Clear separation of: original input, transformed output, and diff view
- Copy/download output
- Side-by-side or toggle view of before/after

### 6.5 Code Shortener
- Minifies/condenses code while preserving functionality
- Optional: shows both a "shortened" and a "readable" version

### 6.6 SEO-Friendly Code Optimizer
- For web code (HTML/CSS/JS): optimizes meta tags, semantic HTML, alt attributes, heading structure
- Suggests/adds proper naming conventions and inline documentation to improve discoverability of the code/project itself (e.g., on GitHub search)
- Outputs an SEO checklist/report alongside the modified code

### 6.7 Code Alternatives
- Generates 1–3 alternative implementations of the same logic
- Each alternative labeled with tradeoffs (e.g., "more performant," "more readable," "fewer dependencies")

## 7. User Flow

1. User lands on web app
2. Pastes code into input panel
3. Selects one or more features to apply (Explain / Humanize / Prettify / Shorten / SEO-optimize / Alternatives)
4. Clicks "Run"
5. Own backend processes request, returns results
6. Results shown in output panel(s) — explanation text, transformed code, diff, alternatives
7. User copies/downloads results

## 8. Technical Considerations

- **Frontend:** Web app (framework TBD — e.g., React)
- **Backend/Inference — recommended hybrid approach:**
  - **Deterministic/rule-based tools** (no LLM needed) for: Prettifier (language-standard formatters, e.g. Prettier/Black/gofmt-style), Shortener (AST-based minifiers), SEO checks (static analysis of HTML meta tags/semantic structure)
  - **LLM-powered** only for tasks that need language understanding: Explainer, Humanizer, Code Alternatives
  - For the LLM: self-hosting an open-source code-focused model (e.g., Code Llama / Qwen-Coder / DeepSeek-Coder class) keeps the project fully open-source, but requires GPU hosting (main cost driver)
  - **Suggested path:** start with a low-cost, pay-per-token hosted-inference provider for the open-source model (avoids upfront GPU infra cost); migrate to self-hosted once usage volume justifies fixed infrastructure cost
- **Language detection:** needed since input is language-agnostic
- **Processing pipeline:** modular — one service/module per feature so features can run independently or combined
- **Input limits:** generous cap per request (~5,000 lines) to control compute cost while supporting real-world files
- **Accounts:** optional login (v1) to save history; core usage remains anonymous/stateless
- **Hosting/Infra costs:** since project is free, need an ongoing plan for compute costs (see backend recommendation above)

## 9. Open Questions

- Final choice of open-source LLM and inference provider (hosted vs. self-hosted) — and budget for it
- Open-source license choice (e.g., MIT/Apache 2.0)
- Auth provider for optional login/history (e.g., OAuth via GitHub/Google)
- Any moderation/abuse handling needed (e.g., malicious code submissions, abuse of generous input limits)
- Data retention policy for saved history (how long, opt-out/delete)

## 10. Future Considerations (v2+)
- Public API for third-party developers
- Browser/IDE extensions
- Optional paid/hosted tier for heavier usage (if project needs sustainability funding)

## 11. Risks
- Self-hosted model quality/latency vs. commercial APIs
- Compute costs for a free service at scale
- Language-agnostic parsing/detection accuracy across obscure languages
