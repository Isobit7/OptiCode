# OptiCode Deployment Guide

## Backend Deployment (Render)

### Prerequisites
- Render account (https://render.com)
- GitHub repository connected to Render

### Deploy Steps

1. **Create Backend Service on Render:**
   - Go to https://dashboard.render.com
   - Click "New +" → "Web Service"
   - Connect your GitHub repository
   - Select branch: `main`
   - Name: `opticode-backend`
   - Runtime: `Python 3.12`
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `python -m uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Plan: Standard or higher

2. **Set Environment Variables in Render:**
   - `ENVIRONMENT`: `production`
   - `PYTHONUNBUFFERED`: `true`
   - `SUPABASE_URL`: Your Supabase project URL
   - `SUPABASE_KEY`: Your Supabase anon key
   - `GEMINI_API_KEY`: Your Google Gemini API key
   - `OPENROUTER_API_KEY`: Your OpenRouter API key
   - `ALLOWED_ORIGINS`: Add your Vercel frontend URL
   - `CSRF_SECRET_KEY`: Generate a secure random string

3. **Deploy:**
   - Render will auto-deploy when you push to main
   - Backend will be available at: `https://opticode-backend.onrender.com`

### Verify Backend
```bash
curl https://opticode-backend.onrender.com/docs
```

---

## Frontend Deployment (Vercel)

### Prerequisites
- Vercel account (https://vercel.com)
- GitHub repository connected to Vercel

### Deploy Steps

1. **Import Project to Vercel:**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Framework Preset: Vite
   - Root Directory: `OptiCode/code-optimizer-explainer/frontend`

2. **Set Environment Variables in Vercel:**
   - `VITE_API_BASE_URL`: `https://opticode-backend.onrender.com`

3. **Deploy:**
   - Vercel will auto-deploy on push to main
   - Frontend will be available at: Your Vercel project URL

### Verify Frontend
- Visit your Vercel deployment URL
- Test features with API calls to backend

---

## Environment Variables Checklist

### Backend (Render)
- [ ] `SUPABASE_URL` - Set to your Supabase project
- [ ] `SUPABASE_KEY` - Set to your Supabase anon key
- [ ] `GEMINI_API_KEY` - Set to your Gemini API key
- [ ] `OPENROUTER_API_KEY` - Set to your OpenRouter API key
- [ ] `ALLOWED_ORIGINS` - Include Vercel frontend URL
- [ ] `ENVIRONMENT` - Set to `production`

### Frontend (Vercel)
- [ ] `VITE_API_BASE_URL` - Set to Render backend URL

---

## Testing After Deployment

1. **Backend Health Check:**
   ```bash
   curl https://opticode-backend.onrender.com/api/cache/stats
   ```

2. **Frontend Test:**
   - Visit your Vercel URL
   - Try prettify feature
   - Try explain feature
   - Check user login
   - Verify data saves to Supabase

3. **API Integration Test:**
   - Open browser console
   - Call: `fetch('https://opticode-backend.onrender.com/api/prettify', {...})`
   - Should return formatted code

---

## Production Considerations

### Security
- ✅ CORS whitelist enabled
- ✅ CSRF protection with SameSite cookies
- ✅ Bcrypt password hashing (cost 12)
- ✅ Session tokens stored in Supabase
- ✅ Security headers configured

### Performance
- ✅ LRU caching enabled (500 entries, 1hr TTL)
- ✅ Code validation before LLM calls
- ✅ Rate limiting on LLM endpoints

### Monitoring
- Monitor Render logs: https://dashboard.render.com
- Monitor Vercel logs: https://vercel.com/dashboard
- Check Supabase metrics for database performance

---

## Troubleshooting

### Backend not responding
1. Check Render logs
2. Verify environment variables are set
3. Check Supabase connectivity
4. Verify API keys are valid

### Frontend not connecting to backend
1. Check `VITE_API_BASE_URL` in Vercel
2. Verify CORS is enabled on backend
3. Check browser console for CORS errors
4. Verify backend is running

### Supabase connection errors
1. Check connection string in backend env vars
2. Verify API key has correct permissions
3. Test connection with psql: `psql <connection_string>`

---

## Rollback

If deployment fails:

1. **Render:** 
   - Go to deployment history
   - Click "Redeploy" on previous working version

2. **Vercel:**
   - Go to deployments
   - Click "..." on previous version → "Promote to Production"

---

## Contact & Support

For issues:
1. Check application logs in Render/Vercel dashboards
2. Review DEPLOYMENT.md troubleshooting section
3. Check GitHub issues
