const mongoose = require('mongoose');

const ResumeSchema = new mongoose.Schema({
  jobSeekerUid: {
    type: String,
    required: true,
    index: true
  },
  jobSeekerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'JobSeeker',
    required: true
  },
  
  // File Information
  filename: {
    type: String,
    required: true
  },
  originalName: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  fileSize: {
    type: Number,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  
  // Cloud Storage Information
  pdfCloudUrl: {
    type: String, // Cloudinary URL for the generated PDF
    default: null
  },
  pdfPublicId: {
    type: String, // Cloudinary public ID for management
    default: null
  },
  
  // Original Uploaded Resume
  uploadedResumeUrl: {
    type: String, // Cloudinary URL for original uploaded PDF
    default: null
  },
  uploadedResumePublicId: {
    type: String, // Cloudinary public ID for uploaded resume
    default: null
  },
  showUploadedToEmployers: {
    type: Boolean, // User consent to show original uploaded resume to employers
    default: false
  },
  
  // Processing Status
  processingStatus: {
    type: String,
    enum: ['pending', 'processing', 'completed', 'failed'],
    default: 'pending'
  },
  
  // Personal Information
  personalInfo: {
    fullName: String,
    email: String,
    phone: String,
    age: String,
    birthday: String,
    photo: String, // Cloud storage URL or legacy base64
    // Address information
    address: String,
    zipCode: String,
    // PSGC location codes (grouped in separate object)
    location: {
      region: String,
      province: String,
      city: String,
      barangay: String
    },
    // Readable location names for display
    readableLocation: {
      region: String,
      province: String,
      city: String,
      barangay: String
    }
  },
  
  // Professional Summary
  summary: String,
  
  // Skills
  skills: [String],
  
  // Work Experience
  workExperience: [{
    company: String,
    position: String,
    description: String,
    startDate: String,
    endDate: String,
    location: String
  }],
  
  // Educational Background
  education: [{
    degree: String,
    school: String,
    location: String,
    startDate: String,
    endDate: String,
    description: String
  }],
  
  // Optional Sections (Certificates, Projects, Awards, Volunteer)
  optionalSections: [{
    id: String,
    type: {
      type: String,
      enum: ['certificates', 'projects', 'awards', 'volunteer']
    },
    title: String,
    data: mongoose.Schema.Types.Mixed // Flexible data structure for different section types
  }],
  
  // Section Order for customization
  sectionOrder: [{
    id: String,
    type: {
      type: String,
      enum: ['personal', 'summary', 'experience', 'education', 'skills', 'optional']
    },
    title: String,
    optionalType: String // For optional sections
  }],
  
  // Version Control
  version: {
    type: Number,
    default: 1
  },
  isActive: {
    type: Boolean,
    default: true
  },
  
  // Timestamps
  uploadedAt: {
    type: Date,
    default: Date.now
  },
  processedAt: {
    type: Date
  },
  updatedAt: {
    type: Date,
    default: Date.now
  }
});

// Index for efficient queries
ResumeSchema.index({ jobSeekerUid: 1, isActive: 1 });
ResumeSchema.index({ processingStatus: 1 });

// Update timestamp on save
ResumeSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method to mark as processed
ResumeSchema.methods.markAsProcessed = function(resumeData) {
  this.processingStatus = 'completed';
  this.personalInfo = resumeData.personalInfo;
  this.summary = resumeData.summary;
  this.skills = resumeData.skills;
  this.workExperience = resumeData.workExperience || resumeData.experience;
  this.education = resumeData.education;
  this.optionalSections = resumeData.optionalSections || [];
  this.sectionOrder = resumeData.sectionOrder || [];
  this.processedAt = new Date();
};

// Method to mark as failed
ResumeSchema.methods.markAsFailed = function(errorMessage) {
  this.processingStatus = 'failed';
};

// Static method to get active resume for job seeker
ResumeSchema.statics.getActiveResumeForJobSeeker = function(jobSeekerUid) {
  return this.findOne({ 
    jobSeekerUid, 
    isActive: true 
  }).sort({ uploadedAt: -1 });
};

module.exports = mongoose.model('Resume', ResumeSchema);
