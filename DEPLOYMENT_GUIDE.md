# Edutrack Netlify Deployment Guide

This guide will help you deploy both the frontend and backend of Edutrack to Netlify.

## Prerequisites

1. GitHub account
2. Netlify account
3. MongoDB Atlas account (for database)
4. Gmail account with App Password (for email functionality)

## Step 1: Prepare Your GitHub Repository

1. Create a new repository on GitHub
2. Push your Edutrack code to the repository:

```bash
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin https://github.com/yourusername/edutrack.git
git push -u origin main
```

## Step 2: Deploy Backend to Netlify

### 2.1 Create Backend Site

1. Go to [Netlify](https://netlify.com) and log in
2. Click "New site from Git"
3. Choose GitHub and select your repository
4. Configure build settings:
   - **Base directory**: `Edutack/Backend`
   - **Build command**: `npm install`
   - **Publish directory**: `public`
   - **Functions directory**: `netlify/functions`

### 2.2 Set Environment Variables

In Netlify dashboard → Site settings → Environment variables, add:

```
DATABASE_URI=mongodb+srv://username:password@cluster.mongodb.net/edutrack
EMAIL_USER=your-email@gmail.com
EMAIL_PASS=your-gmail-app-password
NODE_ENV=production
```

### 2.3 Deploy Backend

Click "Deploy site" - your backend will be available at: `https://your-backend-name.netlify.app`

## Step 3: Deploy Frontend to Netlify

### 3.1 Update Frontend Environment

1. Edit `Edutack/Frontend/.env.production`:
```
REACT_APP_API_URL=https://your-backend-name.netlify.app
GENERATE_SOURCEMAP=false
```

2. Commit and push changes:
```bash
git add .
git commit -m "Update production API URL"
git push
```

### 3.2 Create Frontend Site

1. Create another new site from Git
2. Configure build settings:
   - **Base directory**: `Edutack/Frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `build`

### 3.3 Deploy Frontend

Click "Deploy site" - your frontend will be available at: `https://your-frontend-name.netlify.app`

## Step 4: Configure Custom Domains (Optional)

1. In Netlify dashboard → Domain settings
2. Add custom domain if you have one
3. Update CORS settings in backend if needed

## Step 5: Test Deployment

1. Visit your frontend URL
2. Test login functionality
3. Test API endpoints
4. Verify file uploads work
5. Test email functionality

## Important Notes

### Backend Considerations:
- Uses Netlify Functions for serverless deployment
- File uploads are stored in `/tmp` (temporary) - consider using cloud storage for production
- Database connections are handled automatically
- Cold starts may cause initial delays

### Frontend Considerations:
- React app is served as static files
- API calls are routed through environment variables
- All routes redirect to index.html for SPA functionality

### Database Setup:
1. Create MongoDB Atlas cluster
2. Add your Netlify IP to whitelist (or use 0.0.0.0/0 for all IPs)
3. Create database user with read/write permissions
4. Use connection string in environment variables

### Email Setup:
1. Enable 2-factor authentication on Gmail
2. Generate App Password in Google Account settings
3. Use App Password (not regular password) in EMAIL_PASS

## Troubleshooting

### Common Issues:

1. **API calls failing**: Check REACT_APP_API_URL in frontend
2. **Database connection errors**: Verify MongoDB Atlas connection string
3. **Email not sending**: Check Gmail App Password and settings
4. **File uploads failing**: Files are stored in `/tmp` - implement cloud storage for persistence
5. **Cold start delays**: First request after inactivity may be slow

### Logs:
- Backend logs: Netlify dashboard → Functions → View logs
- Frontend logs: Browser developer console
- Build logs: Netlify dashboard → Deploys → Build log

## Security Checklist

- [ ] Environment variables are set correctly
- [ ] Database has proper access controls
- [ ] CORS is configured for your domain
- [ ] Sensitive data is not in repository
- [ ] HTTPS is enabled (automatic with Netlify)

## Performance Optimization

- [ ] Enable Netlify's asset optimization
- [ ] Configure caching headers
- [ ] Optimize images and assets
- [ ] Monitor function execution times
- [ ] Consider CDN for file uploads

Your Edutrack application should now be fully deployed on Netlify!