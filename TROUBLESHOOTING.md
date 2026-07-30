# OptiCode Deployment Troubleshooting Guide

## Common Issues & Solutions

### 1. **Vercel Frontend: API calls failing (CORS errors)**

**Symptoms:**
- Console shows: `Access to XMLHttpRequest at '...' from origin '...' has been blocked by CORS policy`
- Frontend loads but API calls fail

**Solutions:**

a) **Check Environment Variable:**
```bash
# In Vercel Dashboard:
1. Go to Settings → Environment Variables
2. Verify VITE_API_BASE_URL is set to your Render backend URL
3. It should be: https://opticode-backend.onrender.com (no trailing slash)
4. Rebuild project (Deployments → ... → Redeploy)
```

b) **Verify Backend CORS:**
```bash
# Test backend CORS header:
curl -H "Origin: https://your-vercel-url.vercel.app" \
  https://opticode-backend.onrender.com/api/cache/stats
```

c) **Fix Render CORS:**
- Go to Render Dashboard → opticode-backend → Environment
- Set `CORS_ORIGINS` to your actual Vercel URL:
  ```
  https://opticode-yourusername.vercel.app
  ```
- Click Save and reboot service

---

### 2. **Render Backend: "No open ports detected" / Service crashes**

**Symptoms:**
- Render shows: "No open ports detected"
- Service fails to start
- Deployment log shows uvicorn error

**Solutions:**

a) **Fix Start Command:**
```bash
# Must use $PORT (environment variable), not hardcoded 8000
# ✗ WRONG:
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000

# ✓ CORRECT:
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

b) **Check Environment Variables:**
- Verify all required env vars are set in Render Dashboard:
  - `SUPABASE_URL` - Your Supabase project URL
  - `SUPABASE_KEY` - Your Supabase anon key
  - `GEMINI_API_KEY` - Your Google API key
  - `OPENROUTER_API_KEY` - Your OpenRouter key
  - `PYTHONUNBUFFERED` - Set to `1`

c) **Check Logs:**
```bash
# In Render Dashboard:
1. Click on opticode-backend
2. Go to Logs tab
3. Look for Python import errors or missing dependencies
4. If you see "ModuleNotFoundError", check requirements.txt
```

d) **Rebuild:**
- Go to Deployments
- Click "..." on failed deployment
- Select "Rebuild"

---

### 3. **Vercel Frontend: VITE_API_BASE_URL showing as undefined**

**Symptoms:**
- Frontend builds successfully
- But `import.meta.env.VITE_API_BASE_URL` is undefined
- API calls default to `http://localhost:8000`

**Solutions:**

a) **Rebuild with Environment Variables:**
```bash
# Vercel Dashboard:
1. Settings → Environment Variables
2. Add: VITE_API_BASE_URL = https://opticode-backend.onrender.com
3. Go to Deployments → [Latest] → ... → Redeploy
4. DO NOT use "Deploy" - use "Redeploy" to rebuild with new env vars
```

b) **Check Vercel Build Logs:**
- Go to Deployments → [Build #] → Logs
- Search for "VITE_API_BASE_URL"
- Should show the value being injected

c) **Verify React/Vite is loading it:**
- Frontend code should access it as:
  ```javascript
  const API_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'
  ```

---

### 4. **Backend: 500 Errors / LLM API failures**

**Symptoms:**
- API endpoints return 500 error
- Logs show LLM API failures
- Specific error: "RateLimitError" or "API key invalid"

**Solutions:**

a) **Check API Keys:**
```bash
# Render Dashboard → Environment Variables
# Verify these are set correctly:
- GEMINI_API_KEY (from Google Cloud)
- OPENROUTER_API_KEY (from OpenRouter)
```

b) **Check Rate Limits:**
```bash
# Some APIs have quota limits
# Check:
1. Google Gemini Dashboard - Free tier limits
2. OpenRouter Dashboard - Credit balance
3. Consider upgrading free tier
```

c) **View Detailed Logs:**
```bash
# Render Dashboard → Logs
# Look for specific error messages
# Backend logs will show which LLM provider failed and why
```

---

### 5. **Supabase Connection Issues**

**Symptoms:**
- 503 errors: "RuntimeError: Supabase connection failed"
- User login doesn't work
- History not saving

**Solutions:**

a) **Verify Credentials:**
```bash
# Render Dashboard → Environment Variables
# Check these match your Supabase project:
- SUPABASE_URL = https://xxxyyyzzz.supabase.co
- SUPABASE_KEY = eyJhbGc... (your anon key, NOT service key)
```

b) **Test Connection:**
```bash
# From backend logs, should see successful Supabase queries
# If failing, check:
1. Key is correct (don't use service_role key)
2. Project is active (not paused)
3. Database hasn't exceeded quota
```

c) **Restart Service:**
- Render Dashboard → opticode-backend → Manual Redeploy

---

### 6. **Deployment Succeeded but Nothing Works**

**Diagnostic Checklist:**

```bash
# 1. Check Render backend is running
curl https://opticode-backend.onrender.com/docs
# Should return Swagger UI page

# 2. Check Vercel frontend loads
curl https://your-project.vercel.app
# Should return HTML (not error)

# 3. Test API from frontend
# Open browser console on Vercel URL
# Try: fetch('https://opticode-backend.onrender.com/api/cache/stats')
# Check for CORS errors

# 4. Check environment variables
# Vercel: Settings → Environment Variables → Verify VITE_API_BASE_URL
# Render: Environment → Verify all LLM keys and Supabase credentials

# 5. Check logs
# Vercel: Deployments → [Latest] → Logs
# Render: Logs tab
```

---

### 7. **Frontend loads but features don't work**

**Likely causes:**

1. **API calls failing silently:**
   - Open browser DevTools → Network tab
   - Try using an AI feature (explain, prettify, etc.)
   - Check if API requests are failing with 4xx or 5xx errors

2. **Backend configuration:**
   - Verify `CORS_ORIGINS` includes your Vercel URL
   - Restart Render service

3. **Missing LLM Keys:**
   - Check Render environment variables
   - Backend will fall back to local responses if LLM fails
   - But returns generic responses, not user-specific

---

## Quick Fix: Full Redeploy

If nothing works, do a complete redeploy:

### Backend (Render):
1. Render Dashboard → opticode-backend
2. Go to Environment → Verify all variables
3. Click "Manual Redeploy"
4. Wait 3-5 minutes
5. Check logs for errors

### Frontend (Vercel):
1. Vercel Dashboard → Project Settings → Environment Variables
2. Add/Update: `VITE_API_BASE_URL` = `https://opticode-backend.onrender.com`
3. Go to Deployments
4. Click "..." on latest deployment → Redeploy
5. Wait 2-3 minutes

---

## Testing After Fixes

```bash
# 1. Test Backend
curl https://opticode-backend.onrender.com/api/cache/stats

# 2. Test Frontend
Open https://your-vercel-url.vercel.app in browser

# 3. Test API Integration
# In browser console:
fetch('https://opticode-backend.onrender.com/api/prettify', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({code: 'def x(): pass', language: 'python'})
}).then(r => r.json()).then(console.log)
```

---

## Getting Help

**Check these first:**

1. **Render Logs:**
   - Dashboard → opticode-backend → Logs
   - Shows detailed error messages

2. **Vercel Build Logs:**
   - Dashboard → Deployments → [Build #] → Logs
   - Shows build errors and environment variable values

3. **Browser Console:**
   - DevTools → Console
   - Shows frontend errors and failed API calls

4. **Network Tab:**
   - DevTools → Network
   - Shows HTTP requests and responses
   - Look for 4xx/5xx errors or CORS issues

---

## Common Error Messages

| Error | Cause | Fix |
|-------|-------|-----|
| `CORS policy blocked request` | Backend doesn't allow frontend origin | Update Render CORS_ORIGINS env var |
| `import.meta.env is undefined` | Env vars not injected at build time | Redeploy Vercel with environment variables |
| `No open ports detected` | Start command uses hardcoded port | Change to use $PORT variable |
| `ModuleNotFoundError` | Missing Python dependency | Check requirements.txt on Render |
| `Supabase connection failed` | Invalid credentials or quota exceeded | Verify SUPABASE_URL and SUPABASE_KEY |
| `API key invalid` | Wrong LLM key format or expired | Check GEMINI_API_KEY and OPENROUTER_API_KEY |
