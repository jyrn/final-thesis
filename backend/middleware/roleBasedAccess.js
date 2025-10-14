const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');
const Employer = require('../models/Employer');

/**
 * Role-based access control middleware
 * Ensures users can only access resources they're authorized for
 */

// Check if user has specific permission
const hasPermission = (requiredPermission) => {
  return async (req, res, next) => {
    try {
      const { uid } = req.user; // From auth middleware
      
      // Get user from database
      const user = await User.findOne({ uid });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user has the required permission
      if (!user.hasPermission(requiredPermission)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required permission: ${requiredPermission}`
        });
      }

      // Add user data to request for downstream use
      req.userData = user;
      next();
    } catch (error) {      res.status(500).json({
        success: false,
        error: 'Failed to verify permissions'
      });
    }
  };
};

// Ensure user can only access their own data
const ensureOwnership = async (req, res, next) => {
  try {
    const { uid } = req.user;
    const requestedUid = req.params.uid || req.body.uid || req.query.uid;
    
    if (requestedUid && requestedUid !== uid) {
      return res.status(403).json({
        success: false,
        error: 'Access denied. You can only access your own data'
      });
    }
    
    next();
  } catch (error) {    res.status(500).json({
      success: false,
      error: 'Failed to verify ownership'
    });
  }
};

// Role-specific middleware
const requireRole = (allowedRoles) => {
  return async (req, res, next) => {
    try {
      const { uid } = req.user;
      
      const user = await User.findOne({ uid });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      if (!allowedRoles.includes(user.role)) {
        return res.status(403).json({
          success: false,
          error: `Access denied. Required role: ${allowedRoles.join(' or ')}`
        });
      }

      req.userData = user;
      next();
    } catch (error) {      res.status(500).json({
        success: false,
        error: 'Failed to verify role'
      });
    }
  };
};

// JobSeeker specific access control
const requireJobSeeker = async (req, res, next) => {
  try {
    const { uid } = req.user;
    
    const jobseeker = await JobSeeker.findOne({ uid });
    if (!jobseeker) {
      return res.status(404).json({
        success: false,
        error: 'JobSeeker profile not found'
      });
    }

    if (!jobseeker.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    req.jobseekerData = jobseeker;
    next();
  } catch (error) {    res.status(500).json({
      success: false,
      error: 'Failed to verify JobSeeker access'
    });
  }
};

// Employer specific access control
const requireEmployer = async (req, res, next) => {
  try {
    const { uid } = req.user;
    
    const employer = await Employer.findOne({ uid });
    if (!employer) {
      return res.status(404).json({
        success: false,
        error: 'Employer profile not found'
      });
    }

    if (!employer.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    req.employerData = employer;
    next();
  } catch (error) {    res.status(500).json({
      success: false,
      error: 'Failed to verify Employer access'
    });
  }
};

// Require verified employer for sensitive actions
const requireVerifiedEmployer = async (req, res, next) => {
  try {
    const { uid } = req.user;
    
    const employer = await Employer.findOne({ uid });
    if (!employer) {
      return res.status(404).json({
        success: false,
        error: 'Employer profile not found'
      });
    }

    if (employer.accountStatus !== 'verified') {
      return res.status(403).json({
        success: false,
        error: 'Account must be verified to perform this action'
      });
    }

    if (!employer.isActive) {
      return res.status(403).json({
        success: false,
        error: 'Account is inactive'
      });
    }

    req.employerData = employer;
    next();
  } catch (error) {    res.status(500).json({
      success: false,
      error: 'Failed to verify employer status'
    });
  }
};

// Check if user can perform specific action
const canPerformAction = (action) => {
  return async (req, res, next) => {
    try {
      const { uid } = req.user;
      const user = await User.findOne({ uid });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Get role-specific profile
      let roleProfile = null;
      if (user.role === 'jobseeker') {
        roleProfile = await JobSeeker.findOne({ uid });
        if (!roleProfile?.canPerform(action)) {
          return res.status(403).json({
            success: false,
            error: `Access denied. Cannot perform action: ${action}`
          });
        }
      } else if (user.role === 'employer') {
        roleProfile = await Employer.findOne({ uid });
        if (!roleProfile?.canPerform(action)) {
          return res.status(403).json({
            success: false,
            error: `Access denied. Cannot perform action: ${action}`
          });
        }
      }

      req.userData = user;
      req.roleProfile = roleProfile;
      next();
    } catch (error) {      res.status(500).json({
        success: false,
        error: 'Failed to verify action permissions'
      });
    }
  };
};

// Filter data based on user role and permissions
const filterDataByRole = (data, userRole, targetRole = null) => {
  if (userRole === 'employer' && targetRole === 'jobseeker') {
    // Employers can see limited jobseeker data based on privacy settings
    return data.map(item => {
      if (typeof item.getPublicProfile === 'function') {
        return item.getPublicProfile();
      }
      return item;
    });
  }
  
  if (userRole === 'jobseeker' && targetRole === 'employer') {
    // JobSeekers can see public employer data
    return data.map(item => {
      if (typeof item.getPublicProfile === 'function') {
        return item.getPublicProfile();
      }
      return item;
    });
  }
  
  return data;
};

module.exports = {
  hasPermission,
  ensureOwnership,
  requireRole,
  requireJobSeeker,
  requireEmployer,
  requireVerifiedEmployer,
  canPerformAction,
  filterDataByRole
};
