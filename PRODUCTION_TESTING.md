# Production Testing Guide

## 🚀 After Deployment - Testing Checklist

### 1. **Test Backend Health** (CRITICAL)

```bash
# Basic health check
curl https://edutack.onrender.com/health

# Detailed health check (shows all services status)
curl https://edutack.onrender.com/health/detailed
```

**Expected Response:**
```json
{
  "status": "OK",
  "checks": {
    "database": { "status": "OK" },
    "email": { "status": "OK" },
    "environment": { "status": "OK" }
  }
}
```

### 2. **Test Email Functionality**

```bash
# Send test email
curl -X POST https://edutack.onrender.com/health/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"your-email@gmail.com"}'
```

**Check:**
- Email should arrive within 30 seconds
- Check spam folder if not in inbox

### 3. **Test Certificate Generation**

1. Login as Admin
2. Go to Certificate Management
3. Select a student with complete marks
4. Click "Generate Certificate"
5. **Wait 30-60 seconds** (production is slower)
6. Check email for certificate

**Debug in Browser Console:**
- Look for `=== EMAIL SENDING DEBUG ===`
- Check for error messages
- Verify `emailSent: true` in response

### 4. **Test Payslip Downloads**

1. Login as Admin/Staff
2. Go to My Payslips
3. Click "View" icon (eye icon)
4. **If "Failed to view payslip":**
   - Check Render logs for errors
   - PDF will auto-regenerate on first view
   - Try again after 10 seconds

### 5. **Test Attendance Reports**

1. Login as Admin
2. Go to All Attendance Reports
3. Select department
4. **Wait for data to load** (may take 30-60s first time)
5. Try PDF/Excel downloads

**If data doesn't load:**
- Click "Refresh" button
- Check browser console for errors
- Verify backend URL in Network tab

## 🔍 Common Production Issues & Fixes

### Issue: "Email not sending"

**Diagnosis:**
```bash
curl https://edutack.onrender.com/health/detailed
```

**Fix:**
1. Check if `email.status` is "OK"
2. If "ERROR", verify environment variables in Render:
   - `EMAIL_USER=libroflow8@gmail.com`
   - `EMAIL_PASS=rkwvnraapvhezena`
3. Redeploy after adding variables

### Issue: "Payslip failed to view"

**Diagnosis:**
- Check Render logs for "PAYSLIP DOWNLOAD DEBUG"
- Look for file path errors

**Fix:**
- Payslips auto-regenerate on first view
- Wait 10 seconds and try again
- If still fails, regenerate payslip from admin panel

### Issue: "Attendance data not loading"

**Diagnosis:**
- Check browser console for API errors
- Check Network tab for failed requests

**Fix:**
1. **Cold Start**: First request after inactivity takes 30-60s
2. Click "Refresh" button
3. Clear browser cache (Ctrl+Shift+Delete)
4. Hard refresh (Ctrl+F5)

### Issue: "PDF/Excel downloads disabled"

**Diagnosis:**
- Check console for "Attendance data length: 0"

**Fix:**
1. Wait for data to load completely
2. If length is 0, no data available for that department
3. If length > 0 but button disabled, refresh page

## 📊 Performance Expectations

### Render Free Tier:
- **Cold Start**: 30-60 seconds after 15 minutes of inactivity
- **Warm Requests**: 1-3 seconds
- **Email Sending**: 15-30 seconds
- **PDF Generation**: 10-20 seconds
- **File Downloads**: 2-5 seconds

### Vercel:
- **Page Load**: 1-2 seconds
- **API Calls**: 1-3 seconds (depends on Render)
- **Static Assets**: < 1 second

## 🛠️ Debugging Tools

### 1. **Check Render Logs**
```
Render Dashboard → Your Service → Logs
```

Look for:
- `=== PRODUCTION ENVIRONMENT DETECTED ===`
- `=== EMAIL SENDING DEBUG ===`
- `=== PDF GENERATION DEBUG ===`
- `=== PAYSLIP DOWNLOAD DEBUG ===`

### 2. **Check Browser Console**
```
Press F12 → Console Tab
```

Look for:
- `=== ATTENDANCE RESPONSE DEBUG ===`
- `=== DEPARTMENT ATTENDANCE DEBUG ===`
- API error messages
- Network failures

### 3. **Check Network Tab**
```
Press F12 → Network Tab
```

Verify:
- API URL is `https://edutack.onrender.com`
- Status codes (200 = success, 500 = server error)
- Response times

## 🔄 Redeploy Instructions

### Backend (Render):
1. Go to Render Dashboard
2. Click your service
3. Click "Manual Deploy" → "Deploy latest commit"
4. Wait 2-3 minutes
5. Check logs for "Server running on port 3500"

### Frontend (Vercel):
1. Go to Vercel Dashboard
2. Click your project
3. Click "Redeploy"
4. Wait 1-2 minutes
5. Test the site

## ✅ Production Readiness Checklist

- [ ] Backend health check returns "OK"
- [ ] Email test successful
- [ ] Certificate generation works
- [ ] Payslip downloads work
- [ ] Attendance reports load
- [ ] PDF/Excel downloads work
- [ ] All environment variables set
- [ ] No errors in Render logs
- [ ] No errors in browser console

## 🆘 Emergency Fixes

### If everything is broken:

1. **Check Environment Variables** (Render Dashboard → Environment)
   ```
   EMAIL_USER=libroflow8@gmail.com
   EMAIL_PASS=rkwvnraapvhezena
   NODE_ENV=production
   MONGODB_URI=<your-connection-string>
   ```

2. **Restart Backend** (Render Dashboard → Manual Deploy)

3. **Clear All Caches**
   - Browser cache (Ctrl+Shift+Delete)
   - Vercel cache (Redeploy)
   - Render cache (Restart)

4. **Check Logs**
   - Render logs for backend errors
   - Browser console for frontend errors
   - Network tab for API failures

## 📞 Support

If issues persist after following this guide:
1. Check Render logs for specific error messages
2. Check browser console for frontend errors
3. Test health endpoint: `https://edutack.onrender.com/health/detailed`
4. Verify all environment variables are set correctly
