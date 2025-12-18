# Production Deployment Fixes

## Issues in Production vs Local Development

### 1. **Email Not Sending in Production**
**Cause**: Environment variables not properly set in Render

**Solution**:
1. Go to Render Dashboard → Your Service → Environment
2. Add these environment variables:
   ```
   EMAIL_USER=libroflow8@gmail.com
   EMAIL_PASS=rkwvnraapvhezena
   NODE_ENV=production
   ```
3. Click "Save Changes" and wait for automatic redeploy

### 2. **PDF/Excel Downloads Not Working**
**Cause**: Frontend caching issues or API timeout

**Solution**:
1. Clear browser cache (Ctrl+Shift+Delete)
2. Hard refresh (Ctrl+F5)
3. Check browser console for errors
4. Verify backend is responding: `https://edutack.onrender.com/health`

### 3. **Attendance Data Not Loading**
**Cause**: Cold start delays on Render free tier

**Solution**:
- First request after inactivity takes 30-60 seconds (cold start)
- Subsequent requests are fast
- Click "Try Loading Again" button if data doesn't load
- Use Refresh button to force reload

## Environment Variables Checklist

### Backend (Render):
- [x] `NODE_ENV=production`
- [x] `PORT=3500`
- [x] `MONGODB_URI=<your-mongodb-connection-string>`
- [x] `EMAIL_USER=libroflow8@gmail.com`
- [x] `EMAIL_PASS=rkwvnraapvhezena`

### Frontend (Vercel):
- [x] `REACT_APP_API_URL=https://edutack.onrender.com`
- [x] `GENERATE_SOURCEMAP=false`

## Testing Production Deployment

### 1. Test Backend Health
```bash
curl https://edutack.onrender.com/health
```

### 2. Test Email Configuration
```bash
cd Backend
node checkEnv.js
```

### 3. Test Frontend Connection
1. Open browser console (F12)
2. Navigate to any page
3. Check Network tab for API calls
4. Verify API URL is `https://edutack.onrender.com`

## Common Production Issues

### Issue: "Certificate generated but email not sent"
**Fix**: 
1. Check Render logs for email errors
2. Verify EMAIL_USER and EMAIL_PASS are set
3. Check if Gmail is blocking the app (enable "Less secure app access")

### Issue: "Attendance data shows after refresh only"
**Fix**:
1. This is expected behavior due to caching
2. Data loads automatically on first visit
3. Use Refresh button to get latest data

### Issue: "PDF download button disabled"
**Fix**:
1. Wait for data to load completely
2. Check console for "Attendance data length" log
3. If length is 0, no data available
4. If length > 0 but button disabled, clear cache and refresh

## Performance Optimization

### Render Free Tier Limitations:
- Cold start: 30-60 seconds after inactivity
- Memory: 512MB
- Timeout: 30 seconds per request

### Recommendations:
1. Keep backend active with uptime monitoring (e.g., UptimeRobot)
2. Optimize large queries with pagination
3. Use caching for frequently accessed data
4. Compress images before upload

## Debugging Production Issues

### Enable Debug Logs:
1. Open browser console (F12)
2. Look for debug messages starting with `===`
3. Check Network tab for failed requests
4. Check Render logs for backend errors

### Common Debug Messages:
- `=== EMAIL SENDING DEBUG ===` - Email process started
- `=== PDF GENERATION DEBUG ===` - PDF creation started
- `=== ATTENDANCE RESPONSE DEBUG ===` - Data received from API
- `=== DEPARTMENT ATTENDANCE DEBUG ===` - Department data loaded

## Support

If issues persist:
1. Check Render logs: Dashboard → Logs
2. Check Vercel logs: Dashboard → Deployments → View Function Logs
3. Clear all caches and try again
4. Verify environment variables are set correctly
