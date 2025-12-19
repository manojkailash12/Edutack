# 🚀 EDUTRACK Deployment Guide

This guide will help you deploy the EDUTRACK application with Backend on Vercel and Frontend on Netlify.

## 📋 Prerequisites

- GitHub account
- Vercel account
- Netlify account
- MongoDB Atlas database
- Gmail account with App Password

## 🔧 Step 1: Deploy Backend to Vercel

### 1.1 Push Code to GitHub
```bash
git add .
git commit -m "Prepare for deployment"
git push origin main
```

### 1.2 Deploy to Vercel
1. Go to [vercel.com](https://vercel.com) and sign in
2. Click "New Project"
3. Import your GitHub repository
4. **Important**: Set the root directory to `Backend`
5. Click "Deploy"

### 1.3 Configure Environment Variables in Vercel
After deployment, go to your project settings and add these environment variables:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority
EMAIL_USER=libroflow8@gmail.com
EMAIL_PASS=rkwvnraapvhezena
```

### 1.4 Get Your Backend URL
After deployment, copy your Vercel backend URL (e.g., `https://your-backend-url.vercel.app`)

## 🎨 Step 2: Deploy Frontend to Netlify

### 2.1 Update Frontend Configuration
1. Open `Frontend/.env.production`
2. Replace `https://your-backend-url.vercel.app` with your actual Vercel backend URL

### 2.2 Push Updated Code
```bash
git add .
git commit -m "Update production API URL"
git push origin main
```

### 2.3 Deploy to Netlify
1. Go to [netlify.com](https://netlify.com) and sign in
2. Click "New site from Git"
3. Choose your GitHub repository
4. Configure build settings:
   - **Base directory**: `Frontend`
   - **Build command**: `npm run build`
   - **Publish directory**: `Frontend/build`
5. Click "Deploy site"

## ✅ Step 3: Test Your Deployment

### 3.1 Test Backend
Visit your Vercel backend URL to see the API info page.

### 3.2 Test Frontend
1. Visit your Netlify frontend URL
2. Try logging in with existing credentials
3. Test email functions (password reset, certificates)

## 🔍 Step 4: Verify All Features

### ✅ Authentication
- [ ] Staff login works
- [ ] Student login works
- [ ] Password reset with OTP email

### ✅ Email Functions
- [ ] OTP emails for registration
- [ ] Certificate emails with PDF attachments
- [ ] Payslip emails with PDF attachments

### ✅ Core Features
- [ ] Dashboard loads properly
- [ ] Student/Staff management
- [ ] Attendance tracking
- [ ] Internal marks
- [ ] Quiz and assignments
- [ ] Leave management

## 🛠️ Troubleshooting

### Backend Issues
- Check Vercel function logs
- Verify environment variables are set
- Ensure MongoDB connection string is correct

### Frontend Issues
- Check browser console for errors
- Verify API URL in `.env.production`
- Check network tab for failed API calls

### Email Issues
- Verify Gmail App Password is correct
- Check spam folder for test emails
- Ensure EMAIL_USER and EMAIL_PASS are set in Vercel

## 📞 Support

If you encounter issues:
1. Check the browser console for errors
2. Check Vercel function logs
3. Verify all environment variables are set correctly
4. Test API endpoints directly

## 🎉 Success!

Once deployed, your EDUTRACK application will be fully functional with:
- ✅ Secure authentication
- ✅ Email notifications
- ✅ PDF certificate generation
- ✅ Payslip management
- ✅ Complete educational management system

Your application URLs:
- **Frontend**: https://your-site-name.netlify.app
- **Backend**: https://your-backend-url.vercel.app