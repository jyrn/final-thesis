const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  uid: {
    type: String,
    required: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    unique: true
  },
  role: {
    type: String,
    enum: ['jobseeker', 'employer', 'pesostaff', 'admin'],
    required: true
  },
  
  // JobSeeker specific fields (only populated if role is 'jobseeker')
  firstName: {
    type: String,
    required: function() { return this.role === 'jobseeker'; }
  },
  lastName: {
    type: String,
    required: function() { return this.role === 'jobseeker'; }
  },
  middleName: {
    type: String
  },
  
  // Employer specific fields (only populated if role is 'employer')
  companyName: {
    type: String,
    required: function() { return this.role === 'employer'; }
  },
  
  // Admin specific fields (only populated if role is 'pesostaff' or 'admin')
  adminName: {
    type: String,
    required: function() { return this.role === 'pesostaff' || this.role === 'admin'; }
  },
  adminLevel: {
    type: String,
    enum: ['pesostaff', 'admin'],
    required: function() { return this.role === 'pesostaff' || this.role === 'admin'; }
  },
  department: {
    type: String,
    required: function() { return this.role === 'pesostaff' || this.role === 'admin'; }
  },
  
  // Common authentication fields
  emailVerified: {
    type: Boolean,
    default: false
  },
  isActive: {
    type: Boolean,
    default: true
  },
  status: {
    type: String,
    enum: ['active', 'inactive', 'removed'],
    default: 'active'
  },
  suspendedAt: {
    type: Date,
    default: null
  },
  lastLoginAt: {
    type: Date
  },
  profileComplete: {
    type: Boolean,
    default: false
  },
  profilePicture: {
    type: String,
    default: null
  },
  
  // Registration and verification status
  registrationStatus: {
    type: String,
    enum: ['pending', 'verified', 'rejected'],
    default: 'pending'
  },
  verificationToken: {
    type: String
  },
  verificationTokenExpires: {
    type: Date
  },
  emailVerificationOTP: {
    type: String
  },
  emailVerificationOTPExpires: {
    type: Date
  },
  
  // Password reset fields
  passwordResetToken: {
    type: String
  },
  passwordResetExpires: {
    type: Date
  },
  emailVerifiedAt: {
    type: Date
  },
  canLogin: {
    type: Boolean,
    default: false
  },
  
  // User-specific saved jobs
  savedJobs: [{
    type: String, // Job ID
    savedAt: {
      type: Date,
      default: Date.now
    }
  }],
  
  // Role-based permissions
  permissions: {
    type: [String],
    default: function() {
      if (this.role === 'jobseeker') {
        return ['view_jobs', 'apply_jobs', 'manage_profile', 'upload_resume'];
      } else if (this.role === 'employer') {
        return ['post_jobs', 'view_applications', 'manage_company', 'verify_documents'];
      } else if (this.role === 'pesostaff') {
        return ['verify_employers', 'manage_jobs', 'view_analytics', 'manage_users'];
      } else if (this.role === 'admin') {
        return ['all_permissions', 'manage_admins', 'system_settings', 'verify_employers', 'manage_jobs', 'view_analytics', 'manage_users', 'generate_reports', 'delete_users', 'system_backup'];
      }
      return [];
    }
  },
  
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Update the updatedAt field before saving
UserSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  
  // Convert email to lowercase for consistency
  if (this.isModified('email')) {
    this.email = this.email.toLowerCase();
  }
  
  if (this.isModified('email') || this.isModified('firstName') || this.isModified('lastName') || this.isModified('companyName')) {
    // Mark profile as potentially incomplete when key fields change
    this.profileComplete = false;
  }
  
  // Auto-update canLogin status based on verification
  if (this.isModified('emailVerified') || this.isModified('registrationStatus')) {
    this.canLogin = this.emailVerified && this.registrationStatus === 'verified' && this.isActive;
  }
  
  next();
});

// Method to check if user has specific permission
UserSchema.methods.hasPermission = function(permission) {
  return this.permissions.includes(permission);
};

// Method to get role-specific data
UserSchema.methods.getRoleSpecificData = function() {
  if (this.role === 'jobseeker') {
    return {
      firstName: this.firstName,
      lastName: this.lastName,
      middleName: this.middleName
    };
  } else if (this.role === 'employer') {
    return {
      companyName: this.companyName
    };
  } else if (this.role === 'pesostaff' || this.role === 'admin') {
    return {
      adminName: this.adminName,
      adminLevel: this.adminLevel,
      department: this.department
    };
  }
  return {};
};

// Method to check if user can login
UserSchema.methods.canUserLogin = function() {
  return this.emailVerified && 
         this.registrationStatus === 'verified' && 
         this.isActive && 
         this.canLogin;
};

// Method to verify email
UserSchema.methods.verifyEmail = function() {
  this.emailVerified = true;
  this.emailVerifiedAt = new Date();
  this.registrationStatus = 'verified';
  this.canLogin = true;
  this.verificationToken = undefined;
  this.verificationTokenExpires = undefined;
};

// Method to generate verification token
UserSchema.methods.generateVerificationToken = function() {
  const crypto = require('crypto');
  this.verificationToken = crypto.randomBytes(32).toString('hex');
  this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  return this.verificationToken;
};

// Static method to check if email already exists
UserSchema.statics.isEmailTaken = async function(email, excludeUid = null) {
  const query = { email: email.toLowerCase() };
  if (excludeUid) {
    query.uid = { $ne: excludeUid };
  }
  const existingUser = await this.findOne(query);
  return !!existingUser;
};

module.exports = mongoose.model('User', UserSchema);