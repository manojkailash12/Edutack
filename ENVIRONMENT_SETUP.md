# 🔧 Environment Variables Setup

## 🔙 Backend Environment Variables (Vercel Dashboard)

Add these in your Vercel project settings → Environment Variables:

```env
NODE_ENV=production
MONGODB_URI=mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority
EMAIL_USER=libroflow8@gmail.com
EMAIL_PASS=rkwvnraapvhezena
```

## 🎨 Frontend Environment Variables

### Development (.env)
```env
REACT_APP_API_URL=http://localhost:3500
REACT_APP_ENVIRONMENT=development
```

### Production (.env.production)
```env
REACT_APP_API_URL=https://your-backend-url.vercel.app
REACT_APP_ENVIRONMENT=production
GENERATE_SOURCEMAP=false
```

## 📧 Email Configuration

Your Gmail account (`libroflow8@gmail.com`) is already configured with:
- App Password: `rkwvnraapvhezena`
- 2-minute timeout for production reliability
- EDUTRACK branding in email templates

## 🗄️ Database Configuration

MongoDB Atlas is configured with:
- Connection string includes retry writes and majority write concern
- Optimized for serverless environments
- Automatic connection pooling

## ⚠️ Security Notes

1. **Never commit `.env` files** to version control
2. **Use environment variables** for all sensitive data
3. **Rotate passwords** regularly
4. **Monitor usage** in MongoDB Atlas and Gmail

## 🔄 How to Update

### Backend URL Change
1. Update `REACT_APP_API_URL` in `Frontend/.env.production`
2. Commit and push changes
3. Netlify will automatically redeploy

### Database Change
1. Update `MONGODB_URI` in Vercel dashboard
2. Vercel will automatically use new connection

### Email Change
1. Update `EMAIL_USER` and `EMAIL_PASS` in Vercel dashboard
2. Update email templates if needed