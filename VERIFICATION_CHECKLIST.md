# OptiCode Deployment Verification Checklist

## Quick Test (5 minutes)

### 1. **Check Backend is Running**
```bash
# In your browser, visit:
https://opticode-backend.onrender.com/docs

# Should see: Swagger UI with blue "Schemas" section
# If 404 or blank page → Backend not running
```

### 2. **Check Frontend is Deployed**
```bash
# Visit your Vercel URL:
https://your-project.vercel.app

# Should see: OptiCode landing page with buttons
# If blank or error → Frontend build failed
```

### 3. **Check API Connection (Most Important)**
```bash
# Open browser DevTools:
# 1. Press F12 (or Ctrl+Shift+I on Windows)
# 2. Go to Console tab
# 3. Paste this and press Enter:

fetch('https://opticode-backend.onrender.com/api/cache/stats')
  .then(r => r.json())
  .then(d => console.log('✓ Backend working:', d))
  .catch(e => console.error('✗ Backend error:', e.message))
```

**Expected Results:**
- ✅ **Success:** Shows cache stats in console (size, hit_rate, etc.)
- ❌ **CORS Error:** `Access to XMLHttpRequest blocked by CORS policy`
- ❌ **Connection Error:** `Failed to fetch` or timeout

---

## Detailed Verification Tests

### **TEST 1: Backend Health**

```bash
# Test 1a: Backend responds
curl https://opticode-backend.onrender.com/api/cache/stats

# Expected: JSON response with cache stats
# If 503 or error → Backend crashed, check Render logs
```

### **TEST 2: Frontend Loads**

```bash
# Test 2a: Frontend HTML loads
curl https://your-project.vercel.app | head -20

# Should show: <html>, <head>, React code
# If error or empty → Vercel deployment failed
```

### **TEST 3: Environment Variables Set Correctly**

**Backend (Render):**
1. Go to Render Dashboard → opticode-backend
2. Click **Environment** tab
3. Verify you see these variables listed:
   - ✅ `CORS_ORIGINS` (should show your Vercel URL)
   - ✅ `PYTHONUNBUFFERED` (should be `1`)
   - ✅ `SUPABASE_URL` (should start with `https://`)
   - ✅ `SUPABASE_KEY` (should be long string)

**Frontend (Vercel):**
1. Go to Vercel Dashboard → Project Settings
2. Click **Environment Variables**
3. Verify:
   - ✅ `VITE_API_BASE_URL` (should be `https://opticode-backend.onrender.com`)

### **TEST 4: CORS Working**

**In browser console** (F12 → Console tab):

```javascript
// Test if backend allows requests from your frontend
fetch('https://opticode-backend.onrender.com/api/prettify', {
  method: 'POST',
  headers: {'Content-Type': 'application/json'},
  body: JSON.stringify({
    code: 'def hello(): pass',
    language: 'python'
  })
})
  .then(r => r.json())
  .then(d => console.log('✓ API working:', d))
  .catch(e => console.error('✗ CORS/API error:', e.message))
```

**Results:**
- ✅ **Success:** Shows formatted code output
- ❌ **CORS Error:** Check Render CORS_ORIGINS env var
- ❌ **500 Error:** Check Render backend logs

### **TEST 5: Feature Test (Prettify)**

1. Go to https://your-project.vercel.app
2. Paste this messy code:
   ```python
   def test(  ):x=1;y=2;return x+y
   ```
3. Click **Prettify**
4. Should show formatted code in output

**If it doesn't work:**
- Check browser console (F12 → Console) for errors
- Check Network tab (F12 → Network) for failed requests
- Look at Render logs for backend errors

### **TEST 6: User Authentication Test**

1. Click **Sign In / Get Started**
2. Try to register/login
3. Should show login form

**If failing:**
- Check Render logs for database connection errors
- Verify SUPABASE_URL and SUPABASE_KEY are set

---

## Complete Verification Table

| Component | How to Test | Success Indicator | Failure Indicator |
|-----------|------------|-------------------|-------------------|
| **Backend Running** | `curl https://opticode-backend.onrender.com/docs` | Shows Swagger UI | 404 or timeout |
| **Frontend Deployed** | Visit Vercel URL | Shows OptiCode page | Blank or error |
| **API Connection** | Fetch test in console | No CORS error | "CORS policy blocked" |
| **Prettify Works** | Paste code → Click Prettify | Shows formatted code | Error or same code |
| **Environment Vars** | Render Dashboard → Environment | All vars listed | Missing variables |
| **Supabase Connected** | Try login → Check Render logs | No database errors | "Connection refused" |

---

## Logs to Check

### **If Backend Isn't Working**

**Render Dashboard:**
1. Click **opticode-backend**
2. Go to **Logs** tab
3. Look for:
   - ✅ `Application startup complete` = Good
   - ❌ `ModuleNotFoundError` = Missing dependency
   - ❌ `Address already in use` = Port conflict
   - ❌ `RuntimeError: Supabase connection failed` = Database issue

### **If Frontend Isn't Loading**

**Vercel Dashboard:**
1. Go to **Deployments** → Latest
2. Click **Logs** tab
3. Look for:
   - ✅ `Build completed successfully` = Good
   - ❌ `ENOENT: no such file` = Missing file
   - ❌ `SyntaxError` = Code error
   - ❌ Environment variables not showing = Not set in Vercel

### **If API Calls Failing**

**Browser DevTools:**
1. Press F12
2. Go to **Network** tab
3. Try a feature (e.g., Prettify)
4. Look for failed requests:
   - Status 200-299 = Success
   - Status 400-499 = Bad request or CORS issue
   - Status 500+ = Backend error

---

## Quick Verification Script

**Run this in browser console to test everything:**

```javascript
async function verifyDeployment() {
  console.log('🔍 Verifying OptiCode Deployment...\n');
  
  const results = [];
  
  // Test 1: Backend
  try {
    const res = await fetch('https://opticode-backend.onrender.com/api/cache/stats');
    if (res.ok) {
      results.push('✅ Backend: Running');
    } else {
      results.push(`❌ Backend: HTTP ${res.status}`);
    }
  } catch(e) {
    results.push(`❌ Backend: ${e.message}`);
  }
  
  // Test 2: API Endpoint
  try {
    const res = await fetch('https://opticode-backend.onrender.com/api/prettify', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({code: 'def x(): pass', language: 'python'})
    });
    if (res.ok) {
      results.push('✅ API: Responding');
    } else if (res.status === 401) {
      results.push('❌ API: Auth failed');
    } else {
      results.push(`❌ API: HTTP ${res.status}`);
    }
  } catch(e) {
    results.push(`❌ API: ${e.message}`);
  }
  
  // Test 3: Environment Variables
  const apiUrl = import.meta.env.VITE_API_BASE_URL;
  if (apiUrl && apiUrl !== 'http://localhost:8000') {
    results.push(`✅ Frontend Env: ${apiUrl}`);
  } else {
    results.push(`❌ Frontend Env: Not set or localhost`);
  }
  
  // Print results
  results.forEach(r => console.log(r));
  return results;
}

// Run it
verifyDeployment();
```

---

## What "Correct" Looks Like

### ✅ **Working Deployment:**
- Backend responds to API calls
- Frontend loads without errors
- Prettify/Explain features work
- No CORS errors in console
- Features show real AI responses (not generic fallbacks)

### ❌ **Not Working:**
- CORS errors in console
- API returns 503/500
- Features don't work or show generic responses
- "Cannot reach server" errors

---

## Specific Issues & Solutions

### **Issue: "CORS policy blocked"**
- **Check:** Render → Environment → `CORS_ORIGINS` includes your Vercel URL
- **Fix:** Add exact Vercel URL (e.g., `https://opticode-abc123.vercel.app`)
- **Redeploy:** Click "Manual Redeploy" in Render

### **Issue: "Vite env undefined"**
- **Check:** Vercel → Settings → Environment Variables → `VITE_API_BASE_URL` exists
- **Fix:** Add it if missing
- **Redeploy:** Go to Deployments → ... → Redeploy

### **Issue: Backend returns 500**
- **Check:** Render → Logs tab
- **Look for:** Error messages about LLM keys or Supabase
- **Fix:** Add missing environment variables

### **Issue: Nothing loads**
- **Check:** Is your Vercel deployment showing "Ready"?
- **Check:** Is your Render service showing "Live"?
- **Fix:** Manually redeploy both if needed

---

## Final Confirmation

Once you see all these ✅:

```
✅ Backend running
✅ Frontend deployed  
✅ API responding
✅ CORS working
✅ Features functioning
```

**Your deployment is CORRECT! 🎉**
