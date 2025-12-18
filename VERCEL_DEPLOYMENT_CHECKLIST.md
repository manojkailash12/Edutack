# EDUTRACK Vercel Deployment Checklist

## ✅ Pre-Deployment Verification

### Files Ready
- [x] `/vercel.json` - Main Vercel configuration
- [x] `/api/index.js` - Serverless function entry point
- [x] `/Frontend/vercel.json` - Frontend build configuration
- [x] `/Frontend/.env.production` - Production environment variables
- [x] `/Backend/.env` - Backend environment variables (for reference)
- [x] All deployment documentation files

### Email System Tested
- [x] SMTP connection verified
- [x] OTP email sending tested ✅
- [x] Certificate email tested ✅
- [x] Payslip email tested ✅
- [x] Health endpoint email tested ✅
- [x] 2-minute timeout configured
- [x] Correct email address: `manojkailash1@gmail.com`

### Database Connection
- [x] MongoDB Atlas connection tested
- [x] Connection string verified
- [x] Retry logic configured
- [x] Connection pooling enabled

## 📋 Deployment Steps

### Step 1: Push to GitHub
```bash
git add .
git commit -m "Ready for Vercel deployment"
git push origin main
```

### Step 2: Create Vercel Project
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Select "Edutack" as the root directory

### Step 3: Configure Environment Variables
Add these in Vercel project settings → Environment Variables:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority
EMAIL_USER=manojkailash1@gmail.com
EMAIL_PASS=rkwvnraapvhezena
```

**Important:** Make sure to use `manojkailash1@gmail.com` (not manojkailash12@gmail.com)

### Step 4: Deploy
1. Click "Deploy"
2. Wait for build to complete
3. Note your deployment URL

### Step 5: Update Frontend Environment
After deployment, update `Frontend/.env.production`:
```
REACT_APP_API_URL=https://your-actual-vercel-url.vercel.app
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

Then redeploy to apply changes.

## 🧪 Post-Deployment Testing

### Test 1: Health Check
```bash
curl https://your-app.vercel.app/health
```
Expected: `{"status":"OK","message":"Edutack API is running on Vercel",...}`

### Test 2: Detailed Health Check
```bash
curl https://your-app.vercel.app/health/detailed
```
Expected: Database, email, and environment checks all showing "OK"

### Test 3: Test Email
```bash
curl -X POST https://your-app.vercel.app/health/test-email \
  -H "Content-Type: application/json" \
  -d '{"to":"manojkailash1@gmail.com"}'
```
Expected: Email sent successfully

### Test 4: OTP Service
```bash
curl -X POST https://your-app.vercel.app/otp/send \
  -H "Content-Type: application/json" \
  -d '{"email":"manojkailash1@gmail.com","purpose":"verification"}'
```
Expected: OTP sent successfully

### Test 5: Frontend Access
Visit: `https://your-app.vercel.app`
Expected: EDUTRACK login page loads

## 🔍 Troubleshooting

### Issue: Email not sending
**Solution:** 
- Verify EMAIL_USER and EMAIL_PASS in Vercel environment variables
- Check if Gmail app password is still valid
- Review Vercel function logs for errors

### Issue: Database connection failed
**Solution:**
- Verify MONGODB_URI is correct
- Check MongoDB Atlas network access (allow all IPs: 0.0.0.0/0)
- Ensure database user has proper permissions

### Issue: API endpoints returning 404
**Solution:**
- Verify vercel.json routes configuration
- Check that api/index.js is properly configured
- Review Vercel deployment logs

### Issue: Frontend not loading
**Solution:**
- Check if build completed successfully
- Verify Frontend/vercel.json configuration
- Ensure all dependencies are installed

## 📊 Monitoring

### Vercel Dashboard
- Monitor function invocations
- Check error rates
- Review response times
- Monitor bandwidth usage

### Key Metrics to Watch
- Function execution time (should be < 10s)
- Error rate (should be < 1%)
- Email delivery success rate
- Database connection stability

## 🚀 Features Verified

### Email Services
- ✅ OTP sending with 2-minute timeout
- ✅ Certificate email with PDF attachment
- ✅ Payslip email with PDF attachment
- ✅ Professional HTML templates
- ✅ EDUTRACK branding applied

### File Management
- ✅ PDF generation (certificates, payslips)
- ✅ Profile photos (base64 in database)
- ✅ Serverless-compatible file storage (/tmp)

### Database Operations
- ✅ CRUD operations for all entities
- ✅ Connection pooling
- ✅ Retry logic
- ✅ Query optimization

### Authentication
- ✅ JWT token management
- ✅ Session handling
- ✅ Password reset with OTP
- ✅ Role-based access control

### Real-time Features
- ✅ Staff attendance auto-refresh
- ✅ Live data updates
- ✅ Instant notifications

## 📝 Important Notes

1. **Email Timeout:** Configured to 2 minutes for production reliability
2. **File Storage:** Uses /tmp directory for serverless compatibility
3. **Database:** MongoDB Atlas with connection pooling
4. **Security:** All sensitive data in environment variables
5. **Performance:** Optimized for serverless execution

## ✅ Deployment Complete!

Once all tests pass, your EDUTRACK application is fully deployed and operational on Vercel!

**Your app is now live at:** `https://your-app.vercel.app`

### Next Steps
1. Share the URL with users
2. Monitor Vercel dashboard for any issues
3. Set up custom domain (optional)
4. Configure SSL certificate (automatic with Vercel)
5. Set up monitoring and alerts

---

**Congratulations!** 🎉 Your EDUTRACK application is now running in production on Vercel with full functionality including email services, PDF generation, and database operations.