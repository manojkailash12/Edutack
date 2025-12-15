@echo off
echo 🚀 Deploying Edutack to Netlify...
echo.

echo 📦 Installing Netlify CLI...
npm install -g netlify-cli

echo.
echo 🔑 Please login to Netlify (browser will open)
netlify login

echo.
echo 🏗️ Building and deploying...
netlify deploy --prod --dir=Frontend/build --functions=netlify/functions

echo.
echo ✅ Deployment complete!
echo 🌐 Your app is now live on Netlify!
echo.
echo 📋 Next steps:
echo 1. Copy environment variables from .env.netlify to Netlify dashboard
echo 2. Test your application
echo 3. Set up custom domain (optional)
echo.
pause