const User = require('../models/User');
const Admin = require('../models/Admin');

const adminMiddleware = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }


    // First check Admin collection
    let adminUser = await Admin.findOne({ 
      uid: req.user.uid,
      isActive: true,
      registrationStatus: 'verified'
    });

    // If not found in Admin collection, check User collection for backward compatibility
    if (!adminUser) {
      adminUser = await User.findOne({ 
        uid: req.user.uid,
        role: { $in: ['pesostaff', 'admin'] },
        isActive: true,
        registrationStatus: 'verified'
      });
    }

    if (!adminUser) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required or account not verified'
      });
    }


    // Attach admin user data to request for use in routes
    req.adminUser = adminUser;
    next();
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Server error in admin authorization'
    });
  }
};

const superAdminMiddleware = async (req, res, next) => {
  try {
    // Check if user is authenticated
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }


    // First check Admin collection
    let superAdminUser = await Admin.findOne({ 
      uid: req.user.uid,
      role: 'admin',
      isActive: true,
      registrationStatus: 'verified'
    });

    // If not found in Admin collection, check User collection for backward compatibility
    if (!superAdminUser) {
      superAdminUser = await User.findOne({ 
        uid: req.user.uid,
        role: 'admin',
        isActive: true,
        registrationStatus: 'verified'
      });
    }

    if (!superAdminUser) {
      return res.status(403).json({
        success: false,
        message: 'Admin access required or account not verified'
      });
    }


    // Attach admin user data to request for use in routes
    req.adminUser = superAdminUser;
    next();
  } catch (error) {    res.status(500).json({
      success: false,
      message: 'Server error in admin authorization'
    });
  }
};

module.exports = {
  adminMiddleware,
  superAdminMiddleware
};
