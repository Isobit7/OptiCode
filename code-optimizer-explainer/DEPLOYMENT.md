# OptiCode — Complete Deployment Guide (Vercel & Render)

This guide provides step-by-step instructions for deploying the **OptiCode** frontend to **Vercel** and the backend API to **Render** (or Vercel).

---

## 1. Deploying the Frontend to Vercel

### Step 1: Connect Repository to Vercel
1. Go to [Vercel Dashboard](https://vercel.com/new) and select **Import Project**.
2. Connect your GitHub repository (`Isobit7/OptiCode`).

### Step 2: Configure Project Settings
In the Vercel project deployment screen, expand **Framework Preset** and **Root Directory**:
- **Framework Preset**: `Vite` (or `Other`)
- **Root Directory**: Click **Edit** and set it to:
  ```text
  code-optimizer-explainer/frontend
  ```

### Step 3: Configure Environment Variables
Under **Environment Variables**, add:

| Key | Value | Description |
|---|---|---|
| `VITE_API_BASE_URL` | `https://code-optimizer-explainer-backend.onrender.com` | Your live Render backend URL (no trailing slash) |

> ⚠️ **Important:** Do NOT include a trailing slash in `VITE_API_BASE_URL`.

### Step 4: Deploy
Click **Deploy**. Vercel will run `npx cross-env NITRO_PRESET=vercel npm run build` and output your live application at `https://<your-project>.vercel.app`.

---

## 2. Deploying the Backend to Render

### Step 1: Create a New Web Service on Render
1. Go to [Render Dashboard](https://dashboard.render.com/) → **New +** → **Web Service**.
2. Connect your GitHub repository (`Isobit7/OptiCode`).

### Step 2: Configure Web Service Settings

| Setting | Value |
|---|---|
| **Name** | `code-optimizer-explainer-backend` |
| **Region** | Oregon (or closest region) |
| **Branch** | `main` |
| **Root Directory** | `code-optimizer-explainer/backend` |
| **Runtime** | `Python 3` |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Health Check Path** | `/health` |

### Step 3: Configure Environment Variables

Add the following environment variables under **Environment**:

| Key | Example Value | Description |
|---|---|---|
| `LLM_API_KEY` | `sk-or-v1-...` | Your OpenRouter / Groq API key |
| `LLM_API_URL` | `https://openrouter.ai/api/v1/chat/completions` | Provider API endpoint |
| `LLM_MODEL_NAME` | `poolside/laguna-s-2.1:free,google/gemma-4-31b-it:free` | LLM fallback chain |
| `CORS_ORIGINS` | `https://<your-vercel-app>.vercel.app` | Allowed frontend origin (`*` or specific domain) |
| `SUPABASE_URL` | `https://<id>.supabase.co` | Supabase database URL (optional for auth/history) |
| `SUPABASE_SERVICE_KEY` | `eyJhbG...` | Supabase service role key (optional) |

### Step 4: Deploy
Click **Create Web Service**. Render will install dependencies and start the Uvicorn server.

---

## 3. Deploying the Backend to Vercel (Optional Serverless Alternative)

If you prefer to deploy both frontend and backend on Vercel:

1. Create a **second project** on Vercel connected to the same repository.
2. Set **Root Directory** to `code-optimizer-explainer/backend`.
3. Vercel will automatically read `backend/vercel.json` and deploy using `@vercel/python` serverless lambdas.
4. Set `LLM_API_KEY` and other environment variables in Vercel project settings.

---

## 4. Verification Checklist & Common Pitfalls

| Issue | Root Cause | Solution |
|---|---|---|
| **CORS Error in Browser** | `Access-Control-Allow-Origin` mismatch | Ensure `CORS_ORIGINS` in backend matches your Vercel URL, or use the automatic `*.vercel.app` regex fallback in `main.py`. |
| **404 on Refreshing Subpages** | Single Page Application routing missing | Handled by `rewrites` in `frontend/vercel.json`. |
| **Double Slash API Error (`//api`)** | Trailing slash in `VITE_API_BASE_URL` | Fixed by automatic `.replace(/\/+$/, "")` sanitization in `backend.ts`. |
| **500 Error on Vercel Backend** | `ModuleNotFoundError` on relative imports | Handled by `sys.path.insert(0, ...)` at top of `app/main.py`. |
| **Render Cold Start Delay** | Render Free Tier spins down after 15 mins | Initial request after inactivity may take 30-50s to respond. |
