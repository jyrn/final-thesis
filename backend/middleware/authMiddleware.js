const admin = require('../config/firebase');

const verifyToken = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    console.log('Auth header:', authHeader);
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ 
        success: false, 
        error: 'No valid authorization header provided' 
      });
    }

    const token = authHeader.split('Bearer ')[1];
    console.log('Extracted token length:', token?.length);
    
    if (!token || token.trim() === '') {
      return res.status(401).json({ 
        success: false, 
        error: 'No token provided' 
      });
    }

    const decodedToken = await admin.auth().verifyIdToken(token.trim());
    
    // Fetch user role from database
    const User = require('../models/User');
    const user = await User.findOne({ uid: decodedToken.uid });
    
    // Block removed users from logging in
    if (user && user.status === 'removed') {
      console.log(`🚫 Blocked login attempt from removed user: ${user.email}`);
      return res.status(403).json({
        success: false,
        error: 'Account has been removed',
        message: 'Your account has been permanently removed from the system.'
      });
    }
    
    // Auto-reactivate suspended users on login
    if (user && user.status === 'inactive') {
      console.log(`🔄 Auto-reactivating suspended user: ${user.email}`);
      await User.updateOne(
        { uid: decodedToken.uid },
        { 
          status: 'active',
          suspendedAt: null,
          lastLoginAt: new Date()
        }
      );
      console.log(`✅ User ${user.email} reactivated successfully`);
    } else if (user) {
      // Update last login for active users
      await User.updateOne(
        { uid: decodedToken.uid },
        { lastLoginAt: new Date() }
      );
    }
    
    req.user = {
      ...decodedToken,
      role: user?.role || null
    };
    next();
  } catch (error) {
    console.error('Error verifying token:', error);
    console.error('Token verification failed with:', error.message);
    return res.status(401).json({ 
      success: false, 
      error: 'Invalid token',
      details: error.message
    });
  }
};

const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        error: 'Authentication required'
      });
    }

    if (!req.user.role) {
      return res.status(403).json({
        success: false,
        error: 'User role not found'
      });
    }

    if (req.user.role !== requiredRole) {
      return res.status(403).json({
        success: false,
        error: `Access denied. Required role: ${requiredRole}, but user has role: ${req.user.role}`
      });
    }

    next();
  };
};

module.exports = { verifyToken, requireRole };