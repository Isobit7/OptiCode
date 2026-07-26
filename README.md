# 🚀 Code Optimizer & Explainer (OptiCode)

> **Understand, Refine, Audit, and Transform Any Code in Seconds — Powered by AI.**

<div align="center">

![OptiCode Banner](https://raw.githubusercontent.com/Isobit7/OptiCode/main/code-optimizer-explainer/frontend/public/logo.png)

[![License: MIT](https://img.shields.io/badge/License-MIT-orange.svg)](https://opensource.org/licenses/MIT)
[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg?style=flat-square)](http://makeapullrequest.com)
[![React 19](https://img.shields.io/badge/Frontend-React%2019-61DAFB.svg?logo=react&logoColor=white)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com/)
[![Supabase](https://img.shields.io/badge/Database-Supabase-3ECF8E.svg?logo=supabase&logoColor=white)](https://supabase.com/)
[![Tests](https://img.shields.io/badge/Tests-40%2F40%20Passing-success.svg)]()

[Live Workspace](http://localhost:5173/app) • [Key Features](#-key-features) • [Getting Started](#-getting-started) • [API & CLI](#-terminal-cli-tool) • [Contributing](#-contributing)

</div>

---

## 🌟 Overview

**Code Optimizer & Explainer (OptiCode)** is a free, open-source, language-agnostic web application built for students, professional software engineers, and non-coders alike. 

Simply paste any code snippet in **any programming language**, and OptiCode instantly transforms, cleans, explains, or audits it. Whether you need a beginner-friendly **ELI5 code breakdown**, an **AI Code Humanizer**, an automated **Security & Secret Audit**, a **Universal Language Translator**, or an **SEO-friendly HTML/Web refactor**, OptiCode processes your requests under **500ms** using a multi-tier LLM failover pipeline.

---

## ✨ Key Features

- 🧠 **Humanizer & Explainer:** Makes AI-generated code look human-authored with idiomatic conventions. Explains complex logic in plain English with customizable depth (from **Beginner ELI5** to **Advanced Architecture**).
- ✨ **Prettifier:** Automatically cleans, indents, and formats messy code into language-standard style rules.
- 📉 **Shortener:** Minifies and condenses redundant logic while strictly preserving functionality and runtime performance.
- 🔍 **SEO-Friendly Code:** Optimizes HTML, meta tags, OpenGraph attributes, semantic hierarchy, and documentation for search engine discoverability.
- 🔄 **Code Alternatives:** Generates 2-3 alternative implementation patterns (e.g. Iterative vs Recursive, Functional vs OOP) complete with **Big-O Time & Space Complexity analysis**.
- 🌐 **Language-Agnostic:** Works seamlessly with Python, JavaScript, TypeScript, Go, Rust, C++, Java, C#, SQL, HTML/CSS, and 20+ other languages.
- 📝 **Input / Output Side-by-Side View:** Compare original input code against transformed output with interactive line-by-line diff views.
- 🔐 **Optional Login to Save History:** Work instantly as a guest, or log in via Google, Email, or SMS OTP to persist and sync optimization history across devices.

### 🛠️ Advanced Power Tools Suite
- 🛡️ **Security Audit & Secret Scanner (`/api/security-audit`):** Detects vulnerabilities (SQL Injection, XSS, ReDoS) and flags hardcoded API tokens/keys.
- 🌐 **Universal Code Translator (`/api/translate`):** Cross-translates snippets between programming languages while preserving idiomatic conventions.
- 📝 **Automated PR Reviewer (`/api/pr-review`):** Generates pull request reviews with summary bullets, risk ratings, and suggestions.
- 📊 **Logic Flowchart Engine (`/api/flowchart`):** Renders complex nested algorithms into interactive **Mermaid.js** flowcharts.
- 📖 **Step-by-Step Diff Storyteller (`/api/diff-story`):** Explains code diffs in human narrative form.
- 🎨 **Shareable Snippet Cards (`/share/$slug`):** Generates Carbon-style social image preview cards.

---

## 🎨 Screenshots & Demo

*(Dark theme aesthetic with warm orange, sunset amber, and glassmorphism accents)*

| Workspace Interface | Side-by-Side Diff View |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/Isobit7/OptiCode/main/code-optimizer-explainer/frontend/public/docs/workspace_preview.png" width="250" alt="OptiCode Workspace"/> | <img src="https://raw.githubusercontent.com/Isobit7/OptiCode/main/code-optimizer-explainer/frontend/public/docs/diff_view.png" width="250" alt="OptiCode Diff View"/> |

| Security + Secret Audit | Interactive Flowchart Engine |
|:---:|:---:|
| <img src="https://raw.githubusercontent.com/Isobit7/OptiCode/main/code-optimizer-explainer/frontend/public/docs/security_audit.png" width="250" alt="Security Audit"/> | <img src="https://raw.githubusercontent.com/Isobit7/OptiCode/main/code-optimizer-explainer/frontend/public/docs/flowchart_engine.png" width="250" alt="Flowchart Engine"/> |

---

## 🛠️ Tech Stack

- **Frontend:** [React 19](https://react.dev) (Vite + TanStack Router + Tailwind CSS v4 + Framer Motion) → Deployed on **Vercel**
- **Backend:** [FastAPI](https://fastapi.tiangolo.com) (Python 3.10+) → Deployed on **Render** / **Fly.io**
- **Database:** [Supabase](https://supabase.com) (PostgreSQL + Dual OAuth Authentication)
- **Custom LLM Interface:** Multi-provider failover pipeline (`Groq API` Llama 3.3 70B $\to$ `Google Gemini` 2.5 Flash $\to$ `OpenRouter` Pool)
- **Deterministic Tools:** Fast local formatters, minifiers, and regex scanners for zero-latency operations.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js:** `v18.0.0` or higher
- **Python:** `3.10` or higher
- **Git:** installed on your system

### 1. Clone the Repository
```bash
git clone https://github.com/Isobit7/OptiCode.git
cd OptiCode/code-optimizer-explainer
```

### 2. Backend Setup (FastAPI)
```bash
cd backend
python -m venv venv

# Activate Virtual Environment:
# On Windows:
venv\Scripts\activate
# On macOS/Linux:
source venv/bin/activate

# Install dependencies:
pip install -r requirements.txt

# Copy environment variables template:
cp .env.example .env
```
*Edit `backend/.env` to supply your Groq, Gemini, or OpenRouter API keys.*

Start the backend development server:
```bash
uvicorn app.main:app --reload --port 8000
```
*FastAPI Swagger documentation will be available at `http://localhost:8000/docs`.*

### 3. Frontend Setup (React / Vite)
In a separate terminal window:
```bash
cd code-optimizer-explainer/frontend
npm install
cp .env.example .env
```
*Configure `frontend/.env`:*
```env
VITE_API_BASE_URL=http://localhost:8000
VITE_SUPABASE_URL=https://xuftyzzkdgfdgtpbyeau.supabase.co
VITE_SUPABASE_ANON_KEY=sb_publishable__73MUN8FlMbFcyw7Ez_4zQ_tv1LrFDk
VITE_GOOGLE_CLIENT_ID=658164413244-bkegsh1h6t5fmad6bpeo6q6us50ocjn3.apps.googleusercontent.com
```

Start the frontend development workspace:
```bash
npm run dev
```
*Visit `http://localhost:5173` in your browser.*

---

## 💡 Usage

1. **Paste Code:** Insert any snippet into the central composer bar or load sample code.
2. **Select Tool:** Click an Action Chip (`Explain`, `Humanize`, `Prettify`, `Shorten`, `SEO`, `Alternatives`, `Security Audit`, `Translate`, `PR Review`, or `Flowchart`).
3. **Review Transformation:** Inspect the output, toggle **Side-by-Side Diff**, copy the formatted code, or download structured review summaries.
4. **Save & Share:** Optionally log in to sync history, or click **Share** to generate a Carbon snippet URL.

---

## 💻 Terminal CLI Tool

OptiCode provides a command-line script (`opticode_cli.py`) for command-line power users:

```bash
cd code-optimizer-explainer/scripts

# Run Security Audit on local file
python opticode_cli.py scan ../backend/app/main.py --action security

# Explain code snippet from terminal
python opticode_cli.py explain path/to/file.ts --depth beginner

# Translate Python script to Go
python opticode_cli.py translate path/to/script.py --target go --out script.go
```

---

## 📂 Project Structure

```text
OptiCode/
├── code-optimizer-explainer/
│   ├── frontend/                 # React 19 + TanStack Router + Tailwind CSS App
│   │   ├── src/
│   │   │   ├── api/              # FastAPI Backend API client & Supabase auth
│   │   │   ├── components/       # Workspace UI, Modals, Forms & Dashboard Panels
│   │   │   ├── routes/           # Hero (/), Login (/login), Preferences (/preferences), Workspace (/app)
│   │   │   └── styles.css        # Ambient Glassmorphism Design Tokens
│   │   ├── .env.example
│   │   └── package.json
│   │
│   ├── backend/                  # FastAPI Application
│   │   ├── app/
│   │   │   ├── routes/           # REST Endpoints (explain, humanize, security, translate, pr-review)
│   │   │   ├── llm_interface/    # Isolated Multi-Provider LLM Client (Groq -> Gemini -> OpenRouter)
│   │   │   ├── deterministic_tools/ # Fast Python Formatters & Minifiers
│   │   │   ├── db/               # Supabase Database Client & Session Manager
│   │   │   └── main.py           # FastAPI Entrypoint
│   │   ├── tests/                # 40 Pytest Integration Suites
│   │   ├── .env.example
│   │   └── requirements.txt
│   │
│   ├── scripts/
│   │   └── opticode_cli.py       # Standalone Terminal CLI Tool
│   │
│   └── .github/
│       └── workflows/            # GitHub Actions PR Scanner (opticode-review.yml)
│
├── LICENSE                       # MIT License
├── MEMORY.md                     # Project Memory & Session Log
└── README.md                     # Main GitHub README Documentation
```

---

## 🗺️ Roadmap

- [x] Multi-language support & 6 Core AI Refinement Tools
- [x] Security Audit & Secret Scanner Engine
- [x] Universal Code Translator (20+ languages)
- [x] Automated PR Review Generator & GitHub Action
- [x] Mermaid.js Flowchart Generator & Carbon Share Cards
- [ ] **Real-Time Collaboration:** Shared live multiplayer optimization sessions with pair-programming cursors
- [ ] **VS Code Extension:** Direct OptiCode refactoring right inside your IDE context menu
- [ ] **Offline PWA Engine:** Local WebAssembly (Wasm) fallback for offline code formatting

---

## 🤝 Contributing

Contributions are warmly welcomed! OptiCode is built to remain free and open-source forever.

1. **Fork the Repository**
2. **Create a Feature Branch** (`git checkout -b feature/AmazingFeature`)
3. **Commit Your Changes** (`git commit -m 'Add some AmazingFeature'`)
4. **Push to Branch** (`git push origin feature/AmazingFeature`)
5. **Open a Pull Request**

Please review `MEMORY.md` before submitting PRs to align with established patterns.

---

## 📄 License

This project is licensed under the **MIT License** — see the [`LICENSE`](./LICENSE) file for details.

---

## 📬 Contact & Acknowledgments

- **Author & Maintainer:** OptiCode Open Source Team ([@Isobit7](https://github.com/Isobit7))
- **Repository:** [https://github.com/Isobit7/OptiCode](https://github.com/Isobit7/OptiCode)
- **Special Thanks:** [Groq](https://groq.com), [Google Gemini](https://ai.google.dev), [OpenRouter](https://openrouter.ai), [Supabase](https://supabase.com), and the [FastAPI](https://fastapi.tiangolo.com) community for powering high-speed AI inference.

---

<div align="center">
  <sub>Made with ❤️ for developers, students, and open-source creators around the world.</sub>
</div>
