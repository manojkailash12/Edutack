# Deployment Guide for Netlify

## Prerequisites
1. Create a Netlify account at https://netlify.com
2. Install Netlify CLI: `npm install -g netlify-cli`
3. Have your MongoDB Atlas connection string ready
4. Have your email credentials ready

## Step 1: Prepare Environment Variables
1. Use the provided `.env.production` file or copy `.env.example`
2. Your current values are already set:
   - `MONGODB_URI`: Already configured with your MongoDB Atlas
   - `EMAIL_USER`: Already set to libroflow8@gmail.com
   - `EMAIL_PASS`: Already configured
   - `NODE_ENV`: Set to "production"

## Step 2: Build the Frontend
```bash
cd Frontend
npm install
npm run build
```

## Step 3: Deploy to Netlify

### Option A: Using Netlify CLI (Recommended)
```bash
# From the root directory (Edutack/)
netlify login
netlify init
netlify deploy --prod
```

### Option B: Using Git + Netlify Dashboard
1. Push your code to GitHub
2. Go to Netlify Dashboard
3. Click "New site from Git"
4. Connect your GitHub repository
5. Set build settings:
   - Base directory: `Frontend`
   - Build command: `npm run build`
   - Publish directory: `Frontend/build`

## Step 4: Configure Environment Variables in Netlify
1. Go to your site's dashboard on Netlify
2. Navigate to Site settings > Environment variables
3. Add all the variables from your `.env` file

## Step 5: Update CORS Origin
After deployment, update the CORS origin in `Backend/netlify/functions/api.js`:
- Replace `https://your-netlify-app.netlify.app` with your actual Netlify URL

## Step 6: Test Your Deployment
1. Visit your Netlify URL
2. Test login functionality
3. Test quiz creation and submission
4. Verify all features work correctly

## Troubleshooting
- Check Netlify Function logs in the dashboard
- Ensure all environment variables are set
- Verify MongoDB connection string is correct
- Check CORS configuration if you get cross-origin errors