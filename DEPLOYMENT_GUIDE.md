# PESO Website Deployment Guide

## Overview
This guide will help you deploy your PESO website using Render (recommended) for both frontend and backend.

## Prerequisites
- GitHub account
- Render account (free tier available)
- Your MongoDB Atlas database (already configured)
- Firebase project (already configured)

## Step-by-Step Deployment

### Step 1: Prepare Your Code for Deployment

1. **Push your code to GitHub** (if not already done):
   ```bash
   git add .
   git commit -m "Prepare for deployment"
   git push origin main
   ```

### Step 2: Deploy Backend on Render

1. **Go to [Render](https://render.com)** and sign up/login
2. **Click "New +" → "Web Service"**
3. **Connect your GitHub repository**
4. **Configure the backend service:**
   - **Name**: `peso-backend`
   - **Root Directory**: `backend`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Instance Type**: `Free`

5. **Add Environment Variables** (click "Advanced" → "Add Environment Variable"):
   ```
   MONGO_URI=mongodb+srv://janyrin:thesis123@cluster0.q8cca3z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
   PORT=10000
   JWT_SECRET=your_production_jwt_secret_key_here_make_it_strong
   NODE_ENV=production
   FIREBASE_TYPE=service_account
   FIREBASE_PROJECT_ID=final-thesis-njz
   FIREBASE_PRIVATE_KEY_ID=8d78a58ee06f84ea45220e6dbb73b9d1f21c7892
   FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQDA7wdzlW3JWVbK\nT7Svze8VKW21ebi4gA7uuD9mrN2jM6/6LJVJrmfGNDUNcOPm6VLW1/3W228PR6f2\nPvN6DQdFugmgtC08kTDkTJ7ZevljZF9ww1jOn6zsK0+71P+0SQk+ajQhktxGqpUP\nXOne7QAYH0d4RZXotIoM0hsgpGE4VCWuuiYwlKSzx0d2pOgcv/lsUSKiYjn/MWR3\n+9MiL3ms4hMSxkatbRowLPQR48IxW+XlZ1VdbbCBUz8bxZWcJtZyn+2DqkNcuAAK\njyhnBCHtfoneAVo7B+3ng1PUPKKSlWM/pj2xVsDXnH3x9GWNRUwygJzEHo/c6jXB\nKLvxFsPLAgMBAAECggEATRlYO3bMBCoI9lkKxjR/5c+D8YD+cfBuxzPm1jOfcIAP\nw2Q8llC1VK35Q3FJCbZU7dkrrchL5enHM67tYmlBbjpNbaSC7VDCHoGF+zfa4D60\nqx3NZ+jEVC5ssw2Hz7ZeFMyhH4eOMkkpvxVsujKwlnMtfuEj6nX3Mu9letJlrXm1\nXVE3uvKIjb7Y5yZNMRwG/kGoSNyewvsgG/aLj4xUQkBlcEbOiwlZwgVGAAS9xcrA\nhGEOICcGQcsWau2kdmjlQSkCygZJYVTCmRpUPdjrmA/vkRE+tK3/OS7H+kio9JO6\nT2FKMOqoO2ywnD92/kIOrZ0nSKVqI23uDwhAwPNTVQKBgQDh9/oG6FnZ+O7DO3nZ\nIMD1kRv85Ms/eCh2vI4igmcewHNEsETKN4GD9UkONyQINgrWG4+4/CEQkQVQSmgX\n9ITZxeWZuQMwyTdgZLH+2Tw5++jVqe5l373mKA7XldDJ8AqYEMeWYTzh9HSOF22+\nI1Yil2Jfx/TfmGmivOLFruIhLwKBgQDakx7ArI/HpKXdyzRSYhuMCZzOF/qyN3Lb\nw9aZUyI+A3OEDf/S4dOXaL+4gX3rQHbQchyY5K6yg0bPTunekBEciRX/NX8dGQQ9\nFDzu+xjVRNZfmz7DU44kjYKURRngWtOlrjsfntbles4B5hHF48mqpdGC1WYEOc7N\nkZsMu+mIJQKBgQCdPndxeRyVbwGPQAMRkhZUjA7i07+Pwii+P4XVA9OIdbmAsfyc\njzWEQxr8VmivghPWXEWOH31OzuvYrH51NQWBmZGlgDZ1K4BqhofKZRbg7qhejqrD\nn4fA8l0priola/GjUgHhZnb8caTt/+WxK1vUJG4jYrzHH4Na6IARuhnHpwKBgF2Y\nB+AbREoJz9ikbdglGISjjRiXHgt4QN+oAVmQRqZlVe6jC/uiJbe86/O2x1OYPAhQ\nBLzXl5LrMcQNl4ltCVa9wMSShMbR8oWxB9KRhPW1z1ILKRn8ym4Ohm61FDqEygI1\nFC4bFwwWxOX9PXkObEl9TbSHanK+yjYudkVCpeJdAoGBAJo8TbiwFYhes05B1KSk\nZ+G9VPNIhBe+qLaTVK/8Au5s6AeeFjS4Zz/1svfUIcSa7JgApXvoGRMndH7SZsnQ\n2PWRn9GyQ2TKFdLzc/DNq+BKjbB9atI5azpHGynnGeeJtVJEa3nEoKwgRld7Z2eO\nvhliEog1h9MMhtbkeb+ATeB7\n-----END PRIVATE KEY-----"
   FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@final-thesis-njz.iam.gserviceaccount.com
   FIREBASE_CLIENT_ID=100701964525774663349
   FIREBASE_AUTH_URI=https://accounts.google.com/o/oauth2/auth
   FIREBASE_TOKEN_URI=https://oauth2.googleapis.com/token
   FIREBASE_AUTH_PROVIDER_X509_CERT_URL=https://www.googleapis.com/oauth2/v1/certs
   FIREBASE_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/firebase-adminsdk-fbsvc%40final-thesis-njz.iam.gserviceaccount.com
   EMAIL_USER=noreply.pesogov@gmail.com
   EMAIL_PASS=zmmdpsvctqlxftwy
   CLOUDINARY_CLOUD_NAME=dy9dgxeas
   CLOUDINARY_API_KEY=913581662852461
   CLOUDINARY_API_SECRET=ig9uYNAmuU0lqP4XSU5vBuqbmsc
   ENABLE_ML_SERVICES=false
   USE_BERT_NER=false
   USE_LAYOUT_ANALYSIS=false
   USE_OCR=false
   USE_KNOWLEDGE_INTEGRATION=false
   USE_VALIDATION=true
   USE_HITL=false
   ENABLE_CACHING=true
   CACHE_TTL=3600
   MAX_CONCURRENT_REQUESTS=10
   REQUEST_TIMEOUT=60000
   LOG_LEVEL=info
   ENABLE_DEBUG=false
   ```

6. **Click "Create Web Service"**
7. **Wait for deployment** (5-10 minutes)
8. **Note your backend URL** (e.g., `https://peso-backend-xyz.onrender.com`)

### Step 3: Deploy Frontend on Render

1. **Click "New +" → "Static Site"**
2. **Connect your GitHub repository**
3. **Configure the frontend service:**
   - **Name**: `peso-frontend`
   - **Root Directory**: `frontend`
   - **Build Command**: `npm run build`
   - **Publish Directory**: `build`

4. **Add Environment Variables:**
   ```
   REACT_APP_API_URL=https://your-backend-url.onrender.com
   REACT_APP_FIREBASE_API_KEY=AIzaSyA6XWt2265t10GRCmea8NxIaoiaHNR3RRU
   REACT_APP_FIREBASE_AUTH_DOMAIN=final-thesis-njz.firebaseapp.com
   REACT_APP_FIREBASE_PROJECT_ID=final-thesis-njz
   REACT_APP_FIREBASE_STORAGE_BUCKET=final-thesis-njz.firebasestorage.app
   REACT_APP_FIREBASE_MESSAGING_SENDER_ID=117958639369
   REACT_APP_FIREBASE_APP_ID=1:117958639369:web:8e358f46c2c3e47f941dd8
   REACT_APP_FIREBASE_MEASUREMENT_ID=G-CV2RDBRD4R
   GENERATE_SOURCEMAP=false
   ```

5. **Click "Create Static Site"**
6. **Wait for deployment** (5-10 minutes)

### Step 4: Update Frontend API Configuration

After backend deployment, you need to update your frontend to use the correct API URL:

1. **Update your frontend's API configuration file** (usually in `src/config/` or similar)
2. **Replace localhost URLs** with your deployed backend URL
3. **Redeploy frontend** if needed

### Step 5: Configure CORS (Important!)

Make sure your backend allows requests from your frontend domain. Check your backend's CORS configuration:

```javascript
// In your backend server.js or app.js
const cors = require('cors');

app.use(cors({
  origin: [
    'http://localhost:3000',
    'https://your-frontend-url.onrender.com'
  ],
  credentials: true
}));
```

## Alternative Deployment Options

### Option 1: Vercel (Frontend) + Render (Backend)
- Deploy frontend on Vercel (better for React apps)
- Deploy backend on Render
- Configure environment variables on both platforms

### Option 2: Railway (Full Stack)
- Deploy both frontend and backend on Railway
- Similar configuration to Render
- Good performance and free tier

### Option 3: Heroku (Paid)
- More expensive but very reliable
- Good for production applications
- Easy database add-ons

## Post-Deployment Checklist

- [ ] Backend is accessible at deployed URL
- [ ] Frontend loads without errors
- [ ] Database connections work
- [ ] Firebase authentication works
- [ ] File uploads work (Cloudinary)
- [ ] Email notifications work
- [ ] All API endpoints respond correctly

## Troubleshooting

### Common Issues:

1. **Build Failures:**
   - Check Node.js version compatibility
   - Ensure all dependencies are in package.json
   - Check for environment-specific code

2. **API Connection Issues:**
   - Verify CORS configuration
   - Check environment variables
   - Ensure API URLs are correct

3. **Database Connection Issues:**
   - Verify MongoDB connection string
   - Check network access in MongoDB Atlas
   - Ensure environment variables are set correctly

4. **Firebase Issues:**
   - Verify Firebase configuration
   - Check Firebase project settings
   - Ensure service account key is correct

## Security Notes

- Never commit `.env` files to Git
- Use strong JWT secrets in production
- Enable HTTPS only in production
- Regularly rotate API keys and secrets
- Monitor your application logs

## Support

If you encounter issues:
1. Check deployment logs in Render dashboard
2. Verify all environment variables are set
3. Test API endpoints individually
4. Check browser console for frontend errors

Your website should now be live and accessible to users worldwide!
