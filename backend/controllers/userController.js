const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');
const Employer = require('../models/Employer');

const userController = {
  // Get user profile (aligned with frontend expectations)
  async getProfile(req, res) {
    try {
      const { uid } = req.user; // From auth middleware

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
      } else if (user.role === 'employer') {
        roleProfile = await Employer.findOne({ uid });
      }

      res.json({
        success: true,
        user: {
          ...user.toObject(),
          roleProfile: roleProfile ? roleProfile.toObject() : null
        }
      });

    } catch (error) {      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user profile'
      });
    }
  },

  // Update user profile (aligned with frontend expectations)
  async updateProfile(req, res) {
    try {
      const { uid } = req.user; // From auth middleware
      const updateData = req.body;

      // Find user
      const user = await User.findOne({ uid });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Update main user fields
      const userFields = ['firstName', 'lastName', 'middleName', 'companyName', 'emailVerified'];
      userFields.forEach(field => {
        if (updateData[field] !== undefined) {
          user[field] = updateData[field];
        }
      });

      await user.save();

      // Update role-specific profile
      let roleProfile = null;
      if (user.role === 'jobseeker') {
        roleProfile = await JobSeeker.findOne({ uid });
        if (roleProfile && updateData.jobseekerData) {
          Object.assign(roleProfile, updateData.jobseekerData);
          await roleProfile.save();
        }
      } else if (user.role === 'employer') {
        roleProfile = await Employer.findOne({ uid });
        if (roleProfile && updateData.employerData) {
          Object.assign(roleProfile, updateData.employerData);
          await roleProfile.save();
        }
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          ...user.toObject(),
          roleProfile: roleProfile ? roleProfile.toObject() : null
        }
      });

    } catch (error) {      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update user profile'
      });
    }
  },

  // Check if user exists (already exists in userRoutes.js but keeping for consistency)
  async checkUserExists(req, res) {
    try {
      const { uid } = req.params;
      const user = await User.findOne({ uid });
      
      res.json({
        success: true,
        exists: !!user,
        user: user ? {
          uid: user.uid,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified
        } : null
      });
    } catch (error) {      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check user existence'
      });
    }
  },

  // Get user by UID (for admin or specific use cases)
  async getUserByUid(req, res) {
    try {
      const { uid } = req.params;
      
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
      } else if (user.role === 'employer') {
        roleProfile = await Employer.findOne({ uid });
      }

      res.json({
        success: true,
        user: {
          ...user.toObject(),
          roleProfile: roleProfile ? roleProfile.toObject() : null
        }
      });

    } catch (error) {      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user'
      });
    }
  }
};

// Legacy profile picture upload/remove functions removed
// Profile pictures now use cloud storage via /profile-picture-cloud endpoint

module.exports = userController;
