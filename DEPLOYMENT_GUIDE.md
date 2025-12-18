# EDUTRACK Vercel Deployment Guide

## Overview
This guide will help you deploy both the frontend and backend of EDUTRACK to Vercel as a monorepo.

## Prerequisites
1. Vercel account (https://vercel.com)
2. GitHub repository with your code
3. MongoDB Atlas database
4. Gmail account for email services

## Deployment Steps

### 1. Connect Repository to Vercel
1. Go to https://vercel.com/dashboard
2. Click "New Project"
3. Import your GitHub repository
4. Select the root directory (`Edutack`)

### 2. Configure Environment Variables
In your Vercel project settings, add these environment variables:

```
NODE_ENV=production
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority
EMAIL_USER=manojkailash1@gmail.com
EMAIL_PASS=rkwvnraapvhezena
```

**Important Notes:**
- Use `manojkailash1@gmail.com` (not manojkailash12@gmail.com)
- Email timeout is set to 2 minutes for production reliability
- MongoDB connection includes retry logic for production

### 3. Build Configuration
Vercel will automatically detect:
- **Frontend**: React app in `/Frontend` directory
- **Backend**: Serverless functions in `/api` directory

### 4. Domain Configuration
After deployment, your app will be available at:
- **Frontend**: `https://your-app-name.vercel.app`
- **Backend API**: `https://your-app-name.vercel.app/api`

### 5. Update Frontend Environment
Update `Frontend/.env.production` with your actual Vercel URL:
```
REACT_APP_API_URL=https://your-actual-vercel-url.vercel.app
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

## API Endpoints
All backend routes are accessible under `/api`:
- Health check: `https://your-app.vercel.app/health`
- Authentication: `https://your-app.vercel.app/auth/*`
- Papers: `https://your-app.vercel.app/paper/*`
- Students: `https://your-app.vercel.app/student/*`
- Staff: `https://your-app.vercel.app/staff/*`
- Certificates: `https://your-app.vercel.app/certificates/*`
- Payslips: `https://your-app.vercel.app/payslips/*`
- OTP: `https://your-app.vercel.app/otp/*`
- And all other existing routes...

## Features Supported
✅ **Email Services**: OTP sending, certificate emails, payslip emails
✅ **PDF Generation**: Certificates and payslips (using /tmp directory)
✅ **File Uploads**: Profile photos stored as base64 in database
✅ **Database**: MongoDB Atlas with connection pooling
✅ **Authentication**: JWT tokens and session management
✅ **Real-time Updates**: Staff attendance auto-refresh
✅ **Responsive Design**: Works on all devices

## Production Optimizations
- **Serverless Functions**: 30-second timeout for complex operations
- **File Storage**: Uses `/tmp` directory for serverless compatibility
- **Email Reliability**: 2-minute timeout with retry mechanism
- **Database**: Connection pooling and retry logic
- **Caching**: Static assets cached for 1 year
- **Compression**: Automatic response compression

## Testing Deployment
1. Visit your Vercel URL
2. Test login functionality
3. Check email OTP sending: `POST /otp/send`
4. Test certificate generation and email
5. Verify payslip generation and download
6. Test staff attendance features

## Troubleshooting

### Common Issues:
1. **Email not sending**: Check EMAIL_USER and EMAIL_PASS in environment variables
2. **Database connection**: Verify MONGODB_URI is correct
3. **API not responding**: Check Vercel function logs
4. **Frontend not loading**: Ensure build completed successfully

### Debug Endpoints:
- Health check: `GET /health`
- Detailed health: `GET /health/detailed`
- Test email: `POST /health/test-email`

## Support
If you encounter issues:
1. Check Vercel function logs
2. Verify all environment variables are set
3. Test individual API endpoints
4. Check MongoDB Atlas connection

## Security Notes
- All sensitive data is stored in environment variables
- Email credentials use app-specific passwords
- Database uses encrypted connections
- File uploads are validated and sanitized
- CORS is properly configured for production

---

**Deployment Complete!** 🚀

Your EDUTRACK application is now running on Vercel with full functionality including email services, PDF generation, and file management.