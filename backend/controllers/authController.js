const User = require('../models/User');
const JobSeeker = require('../models/JobSeeker');
const Employer = require('../models/Employer');
const admin = require('../config/firebase');
const { filterDataByRole } = require('../middleware/roleBasedAccess');
const emailService = require('../services/emailService');

const authController = {
  // Create user profile after Firebase registration
  async createUserProfile(req, res) {
    try {
      const { uid, email, role, firstName, lastName, middleName, companyName, emailVerified } = req.body;

      // Validate required fields
      if (!uid || !email || !role) {
        return res.status(400).json({
          success: false,
          error: 'Missing required fields: uid, email, and role are required'
        });
      }

      // Validate role-specific required fields
      if (role === 'jobseeker') {
        if (!firstName || !lastName) {
          return res.status(400).json({
            success: false,
            error: 'First name and last name are required for job seekers'
          });
        }
      } else if (role === 'employer') {
        if (!companyName) {
          return res.status(400).json({
            success: false,
            error: 'Company name is required for employers'
          });
        }
      }

      // Parallel check for existing user and email availability
      const [existingUser, emailTaken] = await Promise.all([
        User.findOne({ uid }),
        User.isEmailTaken(email)
      ]);
      
      if (existingUser) {
        // If user already exists, return success with existing user data
        return res.status(200).json({
          success: true,
          message: 'User profile already exists',
          user: {
            uid: existingUser.uid,
            email: existingUser.email,
            role: existingUser.role,
            emailVerified: existingUser.emailVerified,
            registrationStatus: existingUser.registrationStatus
          }
        });
      }

      if (emailTaken) {
        return res.status(400).json({
          success: false,
          error: 'Email address is already registered. Please use a different email or try logging in.'
        });
      }

      // Create main user record with role-specific fields
      const userData = {
        uid,
        email: email.toLowerCase(),
        role,
        emailVerified: false, // Always set to false initially to require OTP verification
        registrationStatus: 'pending',
        canLogin: false
      };

      // Add role-specific fields to main user record
      if (role === 'jobseeker') {
        userData.firstName = firstName?.trim();
        userData.lastName = lastName?.trim();
        userData.middleName = middleName?.trim() || '';
      } else if (role === 'employer') {
        userData.companyName = companyName?.trim();
      }

      // Create user and role profile in parallel
      const user = await User.create(userData);
      
      // Prepare role profile data
      let roleProfileData = null;
      if (role === 'jobseeker') {
        roleProfileData = {
          userId: user._id,
          uid: user.uid,
          firstName: firstName?.trim(),
          lastName: lastName?.trim(),
          middleName: middleName?.trim() || '',
          email: email
        };
      } else if (role === 'employer') {
        roleProfileData = {
          userId: user._id,
          uid: user.uid,
          email: email,
          companyName: companyName?.trim()
        };
      }

      // Create role profile (User.create already saves, no need for user.save())
      let roleProfile = null;
      if (roleProfileData) {
        if (role === 'jobseeker') {
          roleProfile = await JobSeeker.create(roleProfileData);
        } else if (role === 'employer') {
          roleProfile = await Employer.create(roleProfileData);
        }
      }

      // Generate OTP synchronously before sending response
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      
      user.emailVerificationOTP = otp;
      user.emailVerificationOTPExpires = otpExpires;
      await user.save();
      
      console.log(`Generated OTP for ${user.email}: ${otp}`);

      // Return filtered data based on role
      const responseData = {
        ...user.toObject(),
        roleProfile: roleProfile ? roleProfile.toObject() : null
      };

      // Send response after OTP is generated and saved
      res.status(201).json({
        success: true,
        message: 'User profile created successfully. OTP will be sent to your email shortly.',
        user: {
          ...responseData,
          requiresEmailVerification: true,
          requiresOTPVerification: true
        }
      });

      // Send OTP email asynchronously after response is sent
      setImmediate(async () => {
        try {
          console.log('🔍 CONTROLLER DEBUG: About to call emailService.sendOTPEmail');
          const emailResult = await emailService.sendOTPEmail(user.email, otp, user.role);
          console.log('🔍 CONTROLLER DEBUG: emailService.sendOTPEmail returned:', emailResult);
          if (!emailResult.success) {
            console.error('Failed to send OTP email:', emailResult.error);
          }
        } catch (otpError) {
          console.error('Failed to send OTP email:', otpError);
        }
      });

    } catch (error) {
      console.error('Create user profile error:', error);
      
      // If user was created but role profile failed, clean up
      if (error.message && error.message.includes('role profile')) {
        try {
          await User.findOneAndDelete({ uid: req.body.uid });
        } catch (cleanupError) {
          console.error('Failed to cleanup user after role profile error:', cleanupError);
        }
      }
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to create user profile'
      });
    }
  },

  // Verify Firebase token and return user data
  async verifyToken(req, res) {
    try {
      const token = req.headers.authorization?.split('Bearer ')[1];
      
      if (!token) {
        return res.status(401).json({
          success: false,
          error: 'No token provided'
        });
      }

      // Verify Firebase token
      const decodedToken = await admin.auth().verifyIdToken(token);
      const { uid } = decodedToken;

      // Get user from database
      const user = await User.findOne({ uid });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found in database. Please register first.'
        });
      }

      // Check if user can login (verified and registered)
      if (!user.canUserLogin()) {
        const reasons = [];
        if (!user.emailVerified) reasons.push('email not verified');
        if (user.registrationStatus !== 'verified') reasons.push('registration not verified');
        if (!user.isActive) reasons.push('account inactive');
        
        return res.status(403).json({
          success: false,
          error: `Login not allowed: ${reasons.join(', ')}`,
          requiresVerification: !user.emailVerified,
          registrationStatus: user.registrationStatus
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
        },
        firebaseUser: decodedToken
      });

    } catch (error) {
      console.error('Token verification error:', error);
      res.status(401).json({
        success: false,
        error: 'Invalid or expired token'
      });
    }
  },

  // Get current user profile
  async getCurrentUser(req, res) {
    try {
      const { uid } = req.user; // From auth middleware

      const user = await User.findOne({ uid });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // Check if user can login (additional security check)
      if (!user.canUserLogin()) {
        return res.status(403).json({
          success: false,
          error: 'Access denied. Account requires verification.',
          requiresVerification: !user.emailVerified,
          registrationStatus: user.registrationStatus
        });
      }

      // Update last login time
      user.lastLoginAt = new Date();
      await user.save();

      // Get role-specific profile
      let roleProfile = null;
      if (user.role === 'jobseeker') {
        roleProfile = await JobSeeker.findOne({ uid });
      } else if (user.role === 'employer') {
        roleProfile = await Employer.findOne({ uid });
      }

      // Calculate profile completion if role profile exists
      let profileCompletion = 0;
      if (roleProfile && typeof roleProfile.getProfileCompletionPercentage === 'function') {
        profileCompletion = roleProfile.getProfileCompletionPercentage();
      }

      res.json({
        success: true,
        user: {
          ...user.toObject(),
          roleProfile: roleProfile ? roleProfile.toObject() : null,
          profileCompletion,
          permissions: user.permissions,
          verificationStatus: {
            emailVerified: user.emailVerified,
            registrationStatus: user.registrationStatus,
            canLogin: user.canLogin
          }
        }
      });

    } catch (error) {
      console.error('Get current user error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to get user profile'
      });
    }
  },

  // Update user profile
  async updateUserProfile(req, res) {
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

      // Validate role-specific updates
      if (user.role === 'jobseeker' && updateData.companyName) {
        return res.status(400).json({
          success: false,
          error: 'Job seekers cannot have company information'
        });
      }
      
      if (user.role === 'employer' && (updateData.firstName || updateData.lastName)) {
        return res.status(400).json({
          success: false,
          error: 'Employers use company name, not personal names'
        });
      }

      // Update main user fields based on role
      const allowedUserFields = user.role === 'jobseeker' 
        ? ['firstName', 'lastName', 'middleName', 'emailVerified']
        : ['companyName', 'emailVerified'];
        
      allowedUserFields.forEach(field => {
        if (updateData[field] !== undefined) {
          user[field] = typeof updateData[field] === 'string' ? updateData[field].trim() : updateData[field];
        }
      });

      await user.save();

      // Update role-specific profile
      let roleProfile = null;
      if (user.role === 'jobseeker') {
        roleProfile = await JobSeeker.findOne({ uid });
        if (roleProfile && updateData.jobseekerData) {
          // Sync basic fields with User model
          if (updateData.firstName) roleProfile.firstName = updateData.firstName.trim();
          if (updateData.lastName) roleProfile.lastName = updateData.lastName.trim();
          if (updateData.middleName !== undefined) roleProfile.middleName = updateData.middleName.trim();
          
          // Update other jobseeker-specific fields
          Object.assign(roleProfile, updateData.jobseekerData);
          await roleProfile.save();
        }
      } else if (user.role === 'employer') {
        roleProfile = await Employer.findOne({ uid });
        if (roleProfile && updateData.employerData) {
          // Sync company name with User model
          if (updateData.companyName) roleProfile.companyName = updateData.companyName.trim();
          
          // Update other employer-specific fields
          Object.assign(roleProfile, updateData.employerData);
          await roleProfile.save();
        }
      }

      // Calculate updated profile completion
      let profileCompletion = 0;
      if (roleProfile && typeof roleProfile.getProfileCompletionPercentage === 'function') {
        profileCompletion = roleProfile.getProfileCompletionPercentage();
      }

      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: {
          ...user.toObject(),
          roleProfile: roleProfile ? roleProfile.toObject() : null,
          profileCompletion
        }
      });

    } catch (error) {
      console.error('Update user profile error:', error);
      
      // Handle validation errors
      if (error.name === 'ValidationError') {
        const validationErrors = Object.values(error.errors).map(err => err.message);
        return res.status(400).json({
          success: false,
          error: 'Validation failed',
          details: validationErrors
        });
      }
      
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to update user profile'
      });
    }
  },

  // Verify email with token
  async verifyEmail(req, res) {
    try {
      const { token } = req.params;
      
      if (!token) {
        return res.status(400).json({
          success: false,
          error: 'Verification token is required'
        });
      }

      // Find user by verification token
      const user = await User.findOne({
        verificationToken: token,
        verificationTokenExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired verification token'
        });
      }

      // Verify the user's email
      user.verifyEmail();
      await user.save();

      res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
        user: {
          uid: user.uid,
          email: user.email,
          emailVerified: user.emailVerified,
          registrationStatus: user.registrationStatus,
          canLogin: user.canLogin
        }
      });

    } catch (error) {
      console.error('Email verification error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify email'
      });
    }
  },

  // Resend verification email
  async resendVerification(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email address is required'
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found with this email address'
        });
      }

      if (user.emailVerified) {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified'
        });
      }

      // Generate 6-digit OTP instead of token
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      const otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

      // Store OTP in user record
      user.emailVerificationOTP = otp;
      user.emailVerificationOTPExpires = otpExpires;
      await user.save();

      // Send OTP via email
      const emailResult = await emailService.sendOTPEmail(user.email, otp, user.role);
      
      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
      }

      console.log(`OTP for ${user.email}: ${otp}`); // Keep for development

      res.json({
        success: true,
        message: 'OTP sent successfully to your email',
        // Remove this in production - only for development
        developmentOTP: process.env.NODE_ENV === 'development' ? otp : undefined
      });

    } catch (error) {
      console.error('Resend verification error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to resend verification email'
      });
    }
  },

  // Check if email exists (for login validation and cross-role conflict detection)
  async checkEmailExists(req, res) {
    try {
      const { email } = req.params;
      const { role } = req.query; // Optional role parameter for cross-role checking
      
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email address is required'
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No account found with this email address. Please register first.',
          exists: false
        });
      }

      // Check for cross-role conflict if role is provided
      let crossRoleConflict = false;
      if (role && user.role !== role) {
        crossRoleConflict = true;
      }

      res.json({
        success: true,
        exists: true,
        crossRoleConflict,
        user: {
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          registrationStatus: user.registrationStatus,
          canLogin: user.canLogin,
          requiresVerification: !user.emailVerified
        }
      });

    } catch (error) {
      console.error('Check email exists error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to check email'
      });
    }
  },

  // Send OTP for email verification
  async sendOTP(req, res) {
    try {
      const { email } = req.body;
      
      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email address is required'
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found with this email address'
        });
      }

      // Allow OTP sending even if email is already verified (for Google OAuth users)
      // This ensures all users go through our OTP verification process
      if (user.emailVerified && user.registrationStatus === 'verified') {
        return res.status(400).json({
          success: false,
          error: 'Email is already verified and account is active'
        });
      }

      // Check if user already has a valid OTP (within last 2 minutes)
      const now = new Date();
      const twoMinutesAgo = new Date(now.getTime() - 2 * 60 * 1000);
      
      let otp;
      let otpExpires;
      
      if (user.emailVerificationOTP && 
          user.emailVerificationOTPExpires && 
          user.emailVerificationOTPExpires > now &&
          user.updatedAt > twoMinutesAgo) {
        // Use existing valid OTP if it was generated recently
        otp = user.emailVerificationOTP;
        otpExpires = user.emailVerificationOTPExpires;
        console.log(`Using existing OTP for ${email}: ${otp}`);
      } else {
        // Generate new 6-digit OTP
        otp = Math.floor(100000 + Math.random() * 900000).toString();
        otpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

        // Store OTP in user record
        user.emailVerificationOTP = otp;
        user.emailVerificationOTPExpires = otpExpires;
        await user.save();
        console.log(`Generated new OTP for ${email}: ${otp}`);
      }

      // Send OTP via email
      const emailResult = await emailService.sendOTPEmail(email, otp, user.role);
      
      if (!emailResult.success) {
        console.error('Failed to send OTP email:', emailResult.error);
        // Still return success to user but log the email failure
        // In production, you might want to return an error here
      }

      console.log(`OTP for ${email}: ${otp}`); // Keep for development

      res.json({
        success: true,
        message: 'OTP sent successfully to your email',
        // Remove this in production - only for development
        developmentOTP: process.env.NODE_ENV === 'development' ? otp : undefined
      });

    } catch (error) {
      console.error('Send OTP error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to send OTP'
      });
    }
  },

  // Verify OTP for email verification
  async verifyOTP(req, res) {
    try {
      const { email, otp } = req.body;
      
      if (!email || !otp) {
        return res.status(400).json({
          success: false,
          error: 'Email and OTP are required'
        });
      }

      const user = await User.findOne({ 
        email: email.toLowerCase(),
        emailVerificationOTP: otp,
        emailVerificationOTPExpires: { $gt: Date.now() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired OTP'
        });
      }

      // Verify the user's email and clear OTP fields
      user.verifyEmail();
      user.emailVerificationOTP = undefined;
      user.emailVerificationOTPExpires = undefined;
      await user.save();

      // Also update Firebase user's email verification status (if user exists)
      try {
        // First check if Firebase user exists
        await admin.auth().getUser(user.uid);
        // If user exists, update their email verification status
        await admin.auth().updateUser(user.uid, {
          emailVerified: true
        });
        console.log(`✅ Firebase email verification updated for user: ${user.uid}`);
      } catch (firebaseError) {
        if (firebaseError.code === 'auth/user-not-found') {
          console.log(`ℹ️ Firebase user ${user.uid} not found - skipping Firebase email verification update (user may have been deleted during OAuth flow)`);
        } else {
          console.error('❌ Failed to update Firebase email verification:', firebaseError);
        }
        // Don't fail the request if Firebase update fails, as database is already updated
      }

      res.json({
        success: true,
        message: 'Email verified successfully. You can now log in.',
        user: {
          uid: user.uid,
          email: user.email,
          role: user.role,
          emailVerified: user.emailVerified,
          registrationStatus: user.registrationStatus,
          canLogin: user.canLogin
        }
      });

    } catch (error) {
      console.error('OTP verification error:', error);
      res.status(500).json({
        success: false,
        error: error.message || 'Failed to verify OTP'
      });
    }
  },

  // Request password reset
  async requestPasswordReset(req, res) {
    try {
      const { email } = req.body;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      // Find user by email
      const user = await User.findOne({ email: email.toLowerCase() });
      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'No account found with this email address'
        });
      }

      // Generate password reset token
      const crypto = require('crypto');
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      // Save reset token to user
      user.passwordResetToken = resetToken;
      user.passwordResetExpires = resetTokenExpires;
      await user.save();

      // Send password reset email
      await emailService.sendPasswordResetEmail(email, resetToken, user.role);

      res.json({
        success: true,
        message: 'Password reset email sent successfully'
      });

    } catch (error) {
      console.error('Password reset request error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to send password reset email'
      });
    }
  },

  // Reset password with token
  async resetPassword(req, res) {
    try {
      const { token, email, newPassword } = req.body;

      if (!token || !email || !newPassword) {
        return res.status(400).json({
          success: false,
          error: 'Token, email, and new password are required'
        });
      }

      // Find user with valid reset token
      const user = await User.findOne({
        email: email.toLowerCase(),
        passwordResetToken: token,
        passwordResetExpires: { $gt: new Date() }
      });

      if (!user) {
        return res.status(400).json({
          success: false,
          error: 'Invalid or expired password reset token'
        });
      }

      // Update password in Firebase
      try {
        await admin.auth().updateUser(user.uid, {
          password: newPassword
        });
      } catch (firebaseError) {
        console.error('Firebase password update error:', firebaseError);
        return res.status(500).json({
          success: false,
          error: 'Failed to update password'
        });
      }

      // Clear reset token
      user.passwordResetToken = undefined;
      user.passwordResetExpires = undefined;
      await user.save();

      res.json({
        success: true,
        message: 'Password reset successfully',
        userRole: user.role
      });

    } catch (error) {
      console.error('Password reset error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to reset password'
      });
    }
  },

  // Get user role by email
  async getUserRole(req, res) {
    try {
      const { email } = req.query;

      if (!email) {
        return res.status(400).json({
          success: false,
          error: 'Email is required'
        });
      }

      const user = await User.findOne({ email: email.toLowerCase() });

      if (!user) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      res.json({
        success: true,
        role: user.role
      });

    } catch (error) {
      console.error('Get user role error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get user role'
      });
    }
  }
};

module.exports = authController;
