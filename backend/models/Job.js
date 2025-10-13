const mongoose = require('mongoose');

const JobSchema = new mongoose.Schema({
  // Basic Job Information
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    maxlength: 5000
  },
  
  // Company & Employer Information
  employerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Employer',
    required: true
  },
  employerUid: {
    type: String,
    required: true
  },
  companyName: {
    type: String,
    required: true
  },
  companyDetails: {
    name: String,
    description: String,
    industry: String,
    website: String,
    logo: String,
    size: String,
    founded: Number,
    headquarters: String
  },
  
  // Job Details
  location: {
    type: String,
    required: true
  },
  salary: {
    type: String, // Format: "₱50,000 - ₱75,000"
    required: false
  },
  salaryMin: {
    type: Number,
    required: false
  },
  salaryMax: {
    type: Number,
    required: false
  },
  type: {
    type: String,
    required: true,
    enum: ['Full-time', 'Part-time', 'Contract', 'Internship', 'Freelance']
  },
  level: {
    type: String,
    required: true,
    enum: ['Entry Level', 'Junior', 'Mid-level', 'Senior', 'Lead', 'Manager', 'Director', 'Executive']
  },
  department: {
    type: String,
    required: false,
    trim: true,
    maxlength: 100,
    default: ''
  },
  
  // Work Arrangement
  workplaceType: {
    type: String,
    enum: ['On-site', 'Remote', 'Hybrid', ''],
    default: 'On-site'
  },
  remote: {
    type: Boolean,
    default: false
  },
  
  // Job Requirements & Responsibilities
  requirements: [{
    type: String,
    trim: true
  }],
  responsibilities: [{
    type: String,
    trim: true
  }],
  benefits: [{
    type: String,
    trim: true
  }],
  
  // Education Requirements
  educationLevel: {
    type: String,
    required: false,
    enum: ['', 'High School', 'Associate Degree', 'Bachelor\'s Degree', 'Master\'s Degree', 'Doctorate', 'Professional Certification'],
    default: ''
  },
  preferredCourse: {
    type: String,
    required: false,
    trim: true,
    maxlength: 200,
    default: ''
  },
  
  // Job Status & Management
  status: {
    type: String,
    enum: ['active', 'paused', 'closed', 'draft', 'removed', 'flagged'],
    default: 'active'
  },
  
  // Application Management
  applicationCount: {
    type: Number,
    default: 0
  },
  maxApplications: {
    type: Number,
    default: null // null means unlimited
  },
  
  // SEO and Search
  tags: [{
    type: String,
    lowercase: true,
    trim: true
  }],
  
  // Dates
  postedDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    default: function() {
      // Default expiry is 30 days from posting
      return new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    }
  },
  lastUpdated: {
    type: Date,
    default: Date.now
  },
  
  // Analytics
  viewCount: {
    type: Number,
    default: 0
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

// Indexes for better query performance
JobSchema.index({ employerId: 1, status: 1 });
JobSchema.index({ status: 1, postedDate: -1 });
JobSchema.index({ location: 1, status: 1 });
JobSchema.index({ type: 1, level: 1, status: 1 });
JobSchema.index({ tags: 1, status: 1 });
JobSchema.index({ title: 'text', description: 'text', companyName: 'text' });

// Update the updatedAt field before saving
JobSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  this.lastUpdated = Date.now();
  
  // Auto-generate tags from title and requirements
  if (this.isModified('title') || this.isModified('requirements')) {
    const titleWords = this.title.toLowerCase().split(/\s+/);
    const reqWords = this.requirements.flatMap(req => req.toLowerCase().split(/\s+/));
    const allWords = [...titleWords, ...reqWords];
    
    // Filter out common words and create tags
    const commonWords = ['the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'a', 'an'];
    this.tags = [...new Set(allWords.filter(word => 
      word.length > 2 && !commonWords.includes(word)
    ))].slice(0, 20); // Limit to 20 tags
  }
  
  next();
});

// Method to check if job is still active and accepting applications
JobSchema.methods.isAcceptingApplications = function() {
  if (this.status !== 'active') return false;
  if (this.expiryDate && this.expiryDate < new Date()) return false;
  if (this.maxApplications && this.applicationCount >= this.maxApplications) return false;
  return true;
};

// Method to increment application count
JobSchema.methods.incrementApplicationCount = function() {
  this.applicationCount += 1;
  return this.save();
};

// Method to increment view count
JobSchema.methods.incrementViewCount = function() {
  this.viewCount += 1;
  return this.save();
};

// Method to get public job data (for job seekers)
JobSchema.methods.getPublicData = function() {
  return {
    id: this._id,
    title: this.title,
    description: this.description,
    company: this.companyName,
    companyDetails: this.companyDetails,
    location: this.location,
    salary: this.salary,
    salaryMin: this.salaryMin,
    salaryMax: this.salaryMax,
    type: this.type,
    level: this.level,
    department: this.department,
    workplaceType: this.workplaceType,
    remote: this.remote,
    requirements: this.requirements,
    responsibilities: this.responsibilities,
    benefits: this.benefits,
    educationLevel: this.educationLevel,
    preferredCourse: this.preferredCourse,
    postedDate: this.postedDate,
    lastUpdated: this.lastUpdated,
    applicationCount: this.applicationCount,
    viewCount: this.viewCount,
    isRemote: this.workplaceType === 'Remote' || this.remote,
    isHybrid: this.workplaceType === 'Hybrid',
    experienceLevel: this.level
  };
};

// Method to format posted date as relative time
JobSchema.methods.formatPostedDate = function() {
  const now = new Date();
  const diffTime = Math.abs(now.getTime() - this.postedDate.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays === 1) return "1 day ago";
  if (diffDays < 7) return `${diffDays} days ago`;
  if (diffDays < 14) return "1 week ago";
  if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
  return `${Math.floor(diffDays / 30)} months ago`;
};

// Static method to get active jobs for job seekers
JobSchema.statics.getActiveJobs = function(filters = {}) {
  const query = { 
    status: 'active',
    expiryDate: { $gt: new Date() }
  };
  
  // Apply filters
  if (filters.location) {
    query.location = new RegExp(filters.location, 'i');
  }
  if (filters.type) {
    query.type = filters.type;
  }
  if (filters.level) {
    query.level = filters.level;
  }
  if (filters.workplaceType) {
    query.workplaceType = filters.workplaceType;
  }
  if (filters.department) {
    query.department = filters.department;
  }
  if (filters.salaryMin) {
    query.salaryMin = { $gte: filters.salaryMin };
  }
  if (filters.salaryMax) {
    query.salaryMax = { $lte: filters.salaryMax };
  }
  
  return this.find(query)
    .populate('employerId', 'companyName isVerified accountStatus')
    .sort({ postedDate: -1 });
};

// Static method to search jobs
JobSchema.statics.searchJobs = function(searchTerm, filters = {}) {
  const query = { 
    status: 'active',
    expiryDate: { $gt: new Date() }
  };
  
  if (searchTerm) {
    query.$text = { $search: searchTerm };
  }
  
  // Apply filters (same as getActiveJobs)
  Object.assign(query, this.buildFilterQuery(filters));
  
  return this.find(query)
    .populate('employerId', 'companyName isVerified accountStatus')
    .sort(searchTerm ? { score: { $meta: 'textScore' } } : { postedDate: -1 });
};

// Helper method to build filter query
JobSchema.statics.buildFilterQuery = function(filters) {
  const query = {};
  
  if (filters.location) query.location = new RegExp(filters.location, 'i');
  if (filters.type) query.type = filters.type;
  if (filters.level) query.level = filters.level;
  if (filters.workplaceType) query.workplaceType = filters.workplaceType;
  if (filters.department) query.department = filters.department;
  if (filters.salaryMin) query.salaryMin = { $gte: filters.salaryMin };
  if (filters.salaryMax) query.salaryMax = { $lte: filters.salaryMax };
  
  return query;
};

module.exports = mongoose.model('Job', JobSchema);
