const mongoose = require('mongoose');

const InterviewTemplateSchema = new mongoose.Schema({
  employerUid: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  
  whatToBring: {
    type: String,
    default: 'Updated resume/CV\nValid government-issued ID\nPortfolio or work samples (if applicable)\nAny relevant certificates or credentials'
  },
  
  dressCode: {
    type: String,
    default: 'Business Casual'
  },
  
  nextSteps: {
    type: String,
    default: 'Please confirm your attendance by replying to this email\nReview the job description and company information\nPrepare questions you\'d like to ask during the interview\nArrive 10-15 minutes early'
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
InterviewTemplateSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('InterviewTemplate', InterviewTemplateSchema);
