# ✅ EDUTRACK Deployment Checklist

## 🔙 Backend (Vercel)

### Configuration
- [ ] `Backend/vercel.json` exists
- [ ] Root directory set to `Backend` in Vercel
- [ ] Environment variables added in Vercel dashboard:
  - [ ] `NODE_ENV=production`
  - [ ] `MONGODB_URI=your_mongodb_connection_string`
  - [ ] `EMAIL_USER=libroflow8@gmail.com`
  - [ ] `EMAIL_PASS=your_gmail_app_password`

### Deployment
- [ ] Code pushed to GitHub
- [ ] Project imported to Vercel
- [ ] Deployment successful
- [ ] Backend URL copied

## 🎨 Frontend (Netlify)

### Configuration
- [ ] `Frontend/.env.production` updated with backend URL
- [ ] Code pushed to GitHub

### Deployment
- [ ] Project imported to Netlify
- [ ] Build settings configured:
  - [ ] Base directory: `Frontend`
  - [ ] Build command: `npm run build`
  - [ ] Publish directory: `Frontend/build`
- [ ] Deployment successful

## 🧪 Testing

### Authentication
- [ ] Can log in as staff
- [ ] Can log in as student
- [ ] Password reset works
- [ ] OTP emails received

### Email Functions
- [ ] Registration OTP emails work
- [ ] Certificate emails with PDF work
- [ ] Payslip emails with PDF work

### Core Features
- [ ] Dashboard loads
- [ ] Can view students/staff
- [ ] Can mark attendance
- [ ] Can enter internal marks
- [ ] Can create quizzes/assignments
- [ ] Can manage leaves

## 🎯 Environment Variables Reference

### Backend (Vercel Dashboard)
```
NODE_ENV=production
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority
EMAIL_USER=libroflow8@gmail.com
EMAIL_PASS=rkwvnraapvhezena
```

### Frontend (.env.production file)
```
REACT_APP_API_URL=https://your-backend-url.vercel.app
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

## 🚀 Quick Deploy Commands

```bash
# 1. Commit changes
git add .
git commit -m "Deploy to production"
git push origin main

# 2. Deploy backend to Vercel (automatic after push)
# 3. Deploy frontend to Netlify (automatic after push)
```

## 📱 URLs to Save

- **Frontend**: https://your-site-name.netlify.app
- **Backend**: https://your-backend-url.vercel.app
- **MongoDB**: https://cloud.mongodb.com

## ⚠️ Important Notes

1. **Never commit `.env` files** - They contain sensitive information
2. **Update frontend `.env.production`** with actual backend URL before deploying
3. **Test email functions** after deployment
4. **Check Vercel logs** if backend issues occur
5. **Check browser console** if frontend issues occur