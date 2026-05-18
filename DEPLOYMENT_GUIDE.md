# Quick Deployment Guide

## Pre-Deployment Checklist

- [ ] All changes committed to Git
- [ ] Tested locally with different code smells
- [ ] Verified AI responses don't introduce new smells
- [ ] Backend builds successfully (`mvn clean package`)
- [ ] No merge conflicts

## Railway Deployment (Backend)

### Option 1: Automatic (Recommended)
```bash
# Push to GitHub
git add .
git commit -m "fix: Prevent AI refactoring from introducing new code smells"
git push origin main
```
Railway will auto-deploy from GitHub.

### Option 2: Manual
1. Go to Railway dashboard
2. Select your DevSync project
3. Click "Deploy" → "Redeploy"
4. Wait for build to complete (~3-5 minutes)

### Verify Backend:
```bash
# Test health endpoint
curl https://your-railway-app.railway.app/api/health

# Test AI refactor endpoint (requires auth)
curl -X POST https://your-railway-app.railway.app/api/ai/refactor \
  -H "Content-Type: application/json" \
  -d '{"smellType":"LongMethod","code":"...","userId":"test"}'
```

## Vercel Deployment (Frontend)

### No Changes Required! ✅
Frontend code unchanged. Existing deployment works as-is.

### Optional: Redeploy for Cache Clear
```bash
cd JavaSpectorFrontend-main
vercel --prod
```

## Post-Deployment Testing

### Test Case 1: Long Method
1. Upload a project with Long Method smell
2. Click "AI Refactored Code"
3. ✅ Verify: No Data Class created
4. ✅ Verify: Methods extracted logically

### Test Case 2: Large Class
1. Find Large Class smell
2. Click "AI Refactored Code"
3. ✅ Verify: Split classes have behavior
4. ✅ Verify: Not just data holders

### Test Case 3: Long Parameter List
1. Find Long Parameter List smell
2. Click "AI Refactored Code"
3. ✅ Verify: Parameter object has methods
4. ✅ Verify: Not just a data container

## Monitoring

### Check Railway Logs:
```bash
# In Railway dashboard
Deployments → Latest → View Logs

# Look for:
[AI REFACTOR] Request received...
[AI REFACTOR] Using provider: openai
[AI REFACTOR] Successfully parsed response
```

### Check for Errors:
```bash
# Search logs for:
[AI REFACTOR ERROR]
Failed to generate refactoring
```

## Rollback (If Needed)

### Railway:
1. Go to Deployments
2. Find previous working deployment
3. Click "Redeploy"

### Git:
```bash
git revert HEAD
git push origin main
```

## Environment Variables (Verify)

### Railway:
- `SPRING_PROFILES_ACTIVE=prod`
- `DATABASE_URL` (if using database)
- AI keys (if configured in backend)

### Vercel:
- `VITE_API_URL=https://your-railway-app.railway.app`

## Common Issues

### Issue: AI returns generic response
**Solution**: Check API key is set correctly

### Issue: "AI is disabled in settings"
**Solution**: User needs to enable AI in Settings page

### Issue: Timeout errors
**Solution**: Increase timeout in Railway (default is 30s)

### Issue: CORS errors
**Solution**: Verify `@CrossOrigin(origins = "*")` in controller

## Success Indicators

✅ No "Data Class" smells in AI suggestions
✅ Refactored code follows SOLID principles
✅ Users don't need to click "regenerate" multiple times
✅ Response time < 10 seconds
✅ No error logs in Railway

## Support

If issues persist:
1. Check Railway logs
2. Test AI provider directly (OpenAI/Ollama)
3. Verify network connectivity
4. Check API rate limits

## Quick Commands

```bash
# Build backend
mvn clean package

# Run locally
mvn spring-boot:run

# Test endpoint
curl -X POST http://localhost:8080/api/ai/refactor \
  -H "Content-Type: application/json" \
  -d @test-payload.json

# Push to production
git push origin main
```

## Timeline

- Build time: ~3-5 minutes (Railway)
- Deploy time: ~1-2 minutes (Railway)
- Total: ~5-7 minutes
- Zero downtime ✅

## Contact

For deployment issues:
- Railway: Check dashboard logs
- Vercel: Check deployment logs
- GitHub: Check Actions tab
