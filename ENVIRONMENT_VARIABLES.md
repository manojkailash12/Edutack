# EDUTRACK Environment Variables

## Vercel Environment Variables
Copy and paste these exact values into your Vercel project settings:

### Required Variables
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority
EMAIL_USER=manojkailash1@gmail.com
EMAIL_PASS=rkwvnraapvhezena
```

## Variable Descriptions

### NODE_ENV
- **Value**: `production`
- **Purpose**: Sets the application to production mode
- **Impact**: Enables production optimizations, uses /tmp directory for files

### MONGODB_URI
- **Value**: `mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority`
- **Purpose**: MongoDB Atlas connection string
- **Features**: Includes retry logic and write majority for reliability

### EMAIL_USER
- **Value**: `manojkailash1@gmail.com` (NOT manojkailash12@gmail.com)
- **Purpose**: Gmail account for sending emails
- **Used for**: OTP emails, certificate emails, payslip emails

### EMAIL_PASS
- **Value**: `rkwvnraapvhezena`
- **Purpose**: Gmail app-specific password
- **Security**: This is an app password, not the actual Gmail password

## Email Configuration Details
- **Timeout**: 2 minutes (120 seconds) for production reliability
- **Service**: Gmail SMTP
- **Security**: TLS encryption enabled
- **Rate Limiting**: 5 emails per 20 seconds
- **Connection Pooling**: Up to 5 concurrent connections

## Production Features Enabled
✅ **PDF Generation**: Certificates and payslips in /tmp directory
✅ **Email Services**: OTP, certificates, payslips with 2-minute timeout
✅ **File Storage**: Base64 profile photos in database
✅ **Database**: Connection pooling with retry logic
✅ **Security**: CORS, TLS, input validation
✅ **Performance**: Compression, caching, connection reuse

## How to Add in Vercel
1. Go to your Vercel project dashboard
2. Click on "Settings" tab
3. Click on "Environment Variables" in the sidebar
4. Add each variable:
   - Name: `NODE_ENV`, Value: `production`
   - Name: `MONGODB_URI`, Value: `mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority`
   - Name: `EMAIL_USER`, Value: `manojkailash1@gmail.com`
   - Name: `EMAIL_PASS`, Value: `rkwvnraapvhezena`
5. Click "Save" for each variable
6. Redeploy your application

## Testing Environment Variables
After deployment, test with these endpoints:
- Health check: `GET https://your-app.vercel.app/health/detailed`
- Email test: `POST https://your-app.vercel.app/health/test-email`

The health check will verify:
- Database connection
- Email service availability
- All required environment variables are set