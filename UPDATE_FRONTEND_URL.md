# Update Frontend URL After Deployment

After you get your Vercel URL, run these commands:

## Step 1: Update the environment file
Edit `Frontend/.env.production` and replace with your actual Vercel URL:

```env
REACT_APP_API_URL=https://your-actual-vercel-url.vercel.app
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

## Step 2: Commit and push the change
```bash
git add Frontend/.env.production
git commit -m "Update frontend API URL with actual Vercel deployment URL"
git push origin main
```

## Step 3: Redeploy on Vercel
1. Go to your Vercel dashboard
2. Click on your project
3. Go to "Deployments" tab
4. Click "Redeploy" on the latest deployment
5. Wait for the new deployment to complete

Your app will now be fully functional!