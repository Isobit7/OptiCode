# Frontend Dashboard & Tool UI Specifications
**Project:** Code Optimizer & Explainer  
**Target:** Frontend Development Team  
**Date:** July 24, 2026  

---

## 1. Overview & Goal

The backend API is fully completed and tested. To ensure **all backend features and intelligence capabilities** are visible and interactive for users, this document lists every required button, dropdown selector, component, payload contract, and response display widget for the frontend dashboard.

---

## 2. Dashboard Layout Overview

```
+-----------------------------------------------------------------------------------------+
| [Logo / App Title]         [Language Dropdown] [Auth: Login / Register / User Profile]  |
+-----------------------------------------------------------------------------------------+
|  CODE INPUT EDITOR                                                                      |
|  +-----------------------------------------------------------------------------------+  |
|  | Paste code snippet here...                                                        |  |
|  +-----------------------------------------------------------------------------------+  |
|                                                                                         |
|  FEATURE CONTROLS & ACTION BUTTONS                                                      |
|  [ Depth: Beginner v ] -> ( Explain Code )                                              |
|  [ Mode: De-AI v ]    -> ( Humanize Code )                                              |
|  ( Generate Alternatives ) | ( Prettify ) | ( Shorten ) | ( SEO Optimize )              |
+-----------------------------------------------------------------------------------------+
|  RESULTS & DASHBOARD OUTPUT AREA                                                        |
|  +-----------------------------------------------------------------------------------+  |
|  | [Result Tabs / Dynamic Cards based on active feature]                             |  |
|  +-----------------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------------+
```

---

## 3. Required Action Buttons, Controls & API Contracts

### 3.1 Code Explainer (`/api/explain`)
- **Required UI Controls:**
  - **Button:** `[Explain Code]`
  - **Dropdown Selector:** `Explanation Depth`
    - `Beginner` *(Default)* – Plain language step-by-step with simple analogies.
    - `Intermediate` – Technical breakdown of data flow, structures & performance.
    - `Advanced` – Deep architectural analysis, Big-O complexity ($O(n)$ bounds), edge cases.
- **API Request Payload:**
  ```json
  {
    "code": "<string>",
    "language": "<string|optional>",
    "depth": "beginner" | "intermediate" | "advanced"
  }
  ```
- **API Response Output:**
  ```json
  {
    "explanation": "Markdown text explanation...",
    "detected_language": "python",
    "depth_level": "advanced"
  }
  ```
- **UI Display Component:**
  - Render explanation using a Markdown parser (e.g. `react-markdown`).
  - Badges: `Detected Language: Python` | `Depth: Advanced`.

---

### 3.2 Code Humanizer (`/api/humanize`)
- **Required UI Controls:**
  - **Button:** `[Humanize Code]`
  - **Dropdown Selector:** `Humanization Mode`
    - `De-AI` *(Default)* – Rewrites AI-sounding code to feel natural with clear comments.
    - `Simplify` – Restructures for maximum readability & breaks down complex expressions.
    - `Idiomatic` – Uses modern, standard language-specific idioms.
- **API Request Payload:**
  ```json
  {
    "code": "<string>",
    "language": "<string|optional>",
    "mode": "de-ai" | "simplify" | "idiomatic"
  }
  ```
- **API Response Output:**
  ```json
  {
    "humanized_code": "// Humanized code snippet...",
    "detected_language": "javascript",
    "mode_used": "de-ai"
  }
  ```
- **UI Display Component:**
  - Syntax-highlighted code block with line numbers.
  - Action buttons: `[Copy Code]` | `[Replace Input Code]`.

---

### 3.3 Code Alternatives (`/api/alternatives`)
- **Required UI Controls:**
  - **Button:** `[Generate Alternatives]`
- **API Request Payload:**
  ```json
  {
    "code": "<string>",
    "language": "<string|optional>"
  }
  ```
- **API Response Output:**
  ```json
  {
    "detected_language": "python",
    "alternatives": [
      {
        "name": "Vectorized NumPy Approach",
        "code": "import numpy as np...",
        "tradeoff": "Higher memory usage, but 10x faster execution.",
        "pros": ["Faster execution", "Concise vector math"],
        "cons": ["Requires external numpy dependency"],
        "time_complexity": "O(N)",
        "space_complexity": "O(N)"
      }
    ]
  }
  ```
- **UI Display Component:**
  - **Tabbed view or side-by-side Cards** for each alternative approach.
  - Each card displays:
    - **Title:** `name`
    - **Complexity Badges:** `Time: O(N)` | `Space: O(1)`
    - **Tradeoff Summary Banner**
    - **Pros Tags** (Green) & **Cons Tags** (Red)
    - **Code snippet** with `[Copy]` button.

---

### 3.4 SEO Optimizer & Auditor (`/api/seo-optimize`)
- **Required UI Controls:**
  - **Button:** `[SEO Optimize (HTML)]`
- **API Request Payload:**
  ```json
  {
    "code": "<HTML Markup String>"
  }
  ```
- **API Response Output:**
  ```json
  {
    "score": 88,
    "optimized_code": "<!DOCTYPE html>...",
    "suggestions": [
      "Added missing <meta name=\"description\"> tag."
    ],
    "checklist": [
      {
        "category": "Lang",
        "status": "pass",
        "message": "<html> element contains lang=\"en\"."
      },
      {
        "category": "Headings",
        "status": "warning",
        "message": "Missing <h1> primary heading."
      }
    ]
  }
  ```
- **UI Display Component:**
  - **SEO Health Score Gauge:** Circular 0–100 Score Indicator (Green: >=80, Yellow: 50-79, Red: <50).
  - **SEO Checklist Table/List:** Filterable by status (`Passed ✓`, `Warning ⚠`, `Error ✖`).
  - **Optimized HTML Preview & Code Box** with `[Download .html]` & `[Copy]`.

---

### 3.5 Prettify / Formatter (`/api/prettify`)
- **Required UI Controls:**
  - **Button:** `[Prettify / Format]`
- **API Request Payload:** `{ "code": "<string>", "language": "<string>" }`
- **API Response:** `{ "formatted_code": "<string>" }`

---

### 3.6 Code Shortener / Minifier (`/api/shorten`)
- **Required UI Controls:**
  - **Button:** `[Shorten / Minify]`
- **API Request Payload:** `{ "code": "<string>", "language": "<string>" }`
- **API Response:** `{ "shortened_code": "<string>" }`

---

## 4. Summary Table of Frontend Controls for Your Friend

| Feature | Primary Action Button | Input Control / Selectors | Unique Output Displays |
|---|---|---|---|
| **Explainer** | `[Explain Code]` | Dropdown: `Beginner`, `Intermediate`, `Advanced` | Markdown explanation, Depth badge |
| **Humanizer** | `[Humanize Code]` | Dropdown: `De-AI`, `Simplify`, `Idiomatic` | Syntax-highlighted code, Mode badge |
| **Alternatives** | `[Generate Alternatives]` | *(None - Uses code & language)* | Tabbed cards, Pros/Cons tags, $O(N)$ Time & Space complexity badges |
| **SEO Optimizer** | `[SEO Optimize]` | *(HTML Code)* | **0-100 Score Gauge**, Interactive Checklist table, Optimized HTML |
| **Prettify** | `[Prettify]` | *(None)* | Formatted Code + Side-by-side diff toggle |
| **Shorten** | `[Shorten]` | *(None)* | Minified Code + Line count reduction % |
| **History** | `[History Drawer]` | Auth Token | Recent activity drawer with quick re-load |

---

## 5. Helpful Tips for Frontend Integration

1. **Default Headers:** All API requests should include `Content-Type: application/json`.
2. **Error Handling:** When HTTP `400` or `500` is returned, display the `detail` message from `{ "detail": "..." }` in a user-friendly alert banner.
3. **Loading States:** Show a spinner / skeleton card on the active feature output during API calls.
