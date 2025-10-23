# Production Deployment Guide - Admin Report Filters

## Overview
This guide ensures the admin report filtering system works correctly in production deployment on platforms like Render, Netlify, or Vercel.

## Current Status
✅ **Development bypasses are properly secured** - Only active when `NODE_ENV=development`
✅ **Backend endpoints fixed** - All three report endpoints working correctly
✅ **Frontend uses proper API configuration** - No hardcoded localhost URLs
✅ **Date and status filtering implemented** - UTC timezone handling included

## Production Requirements

### 1. Environment Variables Setup

#### Backend (.env.production)
```bash
NODE_ENV=production
MONGO_URI=mongodb+srv://janyrin:thesis123@cluster0.q8cca3z.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0
PORT=10000

# Firebase Admin SDK (already configured)
FIREBASE_PROJECT_ID=final-thesis-njz
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@final-thesis-njz.iam.gserviceaccount.com

# URLs
FRONTEND_URL=https://skillsync-mgjt.onrender.com
BASE_URL=https://skillsync-backend-gwwo.onrender.com
```

#### Frontend (.env.production)
```bash
REACT_APP_API_URL=https://skillsync-backend-gwwo.onrender.com/api
REACT_APP_FIREBASE_PROJECT_ID=final-thesis-njz
REACT_APP_FIREBASE_API_KEY=AIzaSyA6XWt2265t10GRCmea8NxIaoiaHNR3RRU
# ... other Firebase config
```

### 2. Authentication Flow in Production

#### How it works:
1. **Admin Login**: Users must log in through the admin portal with valid credentials
2. **Firebase Token**: Frontend receives Firebase ID token after successful authentication
3. **Token Storage**: Token stored in `localStorage.getItem('adminToken')`
4. **API Requests**: All report API calls include `Authorization: Bearer <firebase-token>`
5. **Backend Verification**: 
   - `authMiddleware.js` verifies Firebase token with Firebase Admin SDK
   - `adminMiddleware.js` checks user is verified admin in database
6. **Database Check**: User must exist in `Admin` or `User` collection with:
   - `role: 'admin'` or `role: 'pesostaff'`
   - `isActive: true`
   - `registrationStatus: 'verified'`

### 3. Required Database Records

For the admin reports to work, you need at least one admin user in the database:

```javascript
// In Admin collection or User collection
{
  uid: "firebase-user-uid", // Must match Firebase Auth UID
  email: "admin@example.com",
  role: "admin", // or "pesostaff"
  isActive: true,
  registrationStatus: "verified",
  // ... other fields
}
```

### 4. API Endpoints (Production Ready)

All endpoints require valid Firebase authentication:

```bash
GET /api/admin/reports/employers-data?startDate=2024-01-01&endDate=2024-12-31&status=active
GET /api/admin/reports/jobs-data?startDate=2024-01-01&endDate=2024-12-31&status=active
GET /api/admin/reports/jobseekers-data?startDate=2024-01-01&endDate=2024-12-31&status=active
```

Headers required:
```
Authorization: Bearer <firebase-id-token>
```

### 5. Development vs Production Differences

| Feature | Development | Production |
|---------|-------------|------------|
| Authentication | `dev-admin-token` bypass | Real Firebase tokens only |
| API URL | `localhost:3001` | `https://skillsync-backend-gwwo.onrender.com` |
| Admin Verification | Mock admin user | Real database lookup |
| Token Fallback | Development token | Error if no token |

### 6. Deployment Checklist

#### Before Deployment:
- [ ] Verify all environment variables are set correctly
- [ ] Ensure at least one admin user exists in database
- [ ] Test Firebase authentication is working
- [ ] Confirm CORS settings allow frontend domain

#### After Deployment:
- [ ] Test admin login functionality
- [ ] Verify report endpoints return data
- [ ] Test date filtering with various ranges
- [ ] Test status filtering for all categories
- [ ] Check browser console for any errors

### 7. Troubleshooting Production Issues

#### Common Issues:

1. **401 Unauthorized**
   - Check Firebase token is valid and not expired
   - Verify Firebase Admin SDK configuration
   - Ensure user is logged in properly

2. **403 Forbidden**
   - User exists in Firebase but not in database
   - User not marked as admin/pesostaff
   - User account not verified (`registrationStatus !== 'verified'`)
   - User account inactive (`isActive !== true`)

3. **500 Internal Server Error**
   - Check server logs for specific error
   - Verify database connection
   - Check environment variables are loaded

4. **CORS Errors**
   - Verify `FRONTEND_URL` in backend environment
   - Check CORS middleware configuration

### 8. Security Notes

- Development bypasses are automatically disabled in production
- All API requests require valid Firebase authentication
- Admin access requires database verification
- No hardcoded credentials or tokens in production code

### 9. Testing in Production

To test the report filters in production:

1. Log in as admin user through the admin portal
2. Navigate to Reports tab
3. Select date range and status filters
4. Verify data loads correctly for all categories
5. Check browser network tab for successful API calls (200 status)

## Files Modified for Production Compatibility

- `backend/middleware/authMiddleware.js` - Development bypass secured
- `backend/middleware/adminMiddleware.js` - Development bypass secured  
- `backend/routes/adminRoutes.js` - Fixed variable references
- `frontend/src/components/admin/ReportsTab.tsx` - Uses proper API config
- `frontend/src/config/apiConfig.ts` - Production URL fallback

## Conclusion

The admin report filtering system is now production-ready with proper authentication, secure development bypasses, and correct API configurations. The system will work seamlessly when deployed to production platforms.
