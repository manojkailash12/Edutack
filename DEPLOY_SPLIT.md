# 🚀 Split Deployment Guide

## Backend on Render + Frontend on Netlify

This approach separates the backend and frontend for more reliable deployment.

### Step 1: Deploy Backend to Render

1. **Go to Render.com** and sign up/login
2. **Connect GitHub** repository
3. **Create New Web Service**
   - Repository: `manojkailash12/Edutack`
   - Branch: `main`
   - Root Directory: `Backend`
   - Build Command: `npm install`
   - Start Command: `npm start`

4. **Add Environment Variables** in Render:
   ```
   NODE_ENV=production
   PORT=3500
   MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority
   EMAIL_USER=libroflow8@gmail.com
   EMAIL_PASS=rkwvnraapvhezena
   ```

5. **Deploy** - Render will give you a URL like: `https://edutack-backend.onrender.com`

### Step 2: Update Frontend API URL

1. **Update** `Frontend/src/config/api/axios.js`
2. **Replace** the Render URL with your actual Render backend URL
3. **Commit and push** changes

### Step 3: Deploy Frontend to Netlify

1. **Netlify will auto-deploy** from GitHub
2. **Frontend will connect** to Render backend
3. **Test login** - should work perfectly!

### Benefits of This Approach:

- ✅ **Reliable**: Render handles Node.js backends perfectly
- ✅ **Free**: Both Render and Netlify have generous free tiers
- ✅ **Fast**: Netlify CDN for frontend, dedicated backend
- ✅ **Scalable**: Can upgrade either service independently

### Troubleshooting:

- **CORS Issues**: Check Render logs for CORS errors
- **Database**: Ensure MongoDB URI is correct in Render
- **API Calls**: Check Network tab in browser dev tools