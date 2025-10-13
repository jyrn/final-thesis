const mongoose = require('mongoose');
const Resume = require('../models/Resume');

// Load environment variables
require('dotenv').config();

async function fixResumeVisibility() {
  try {
    // Connect to MongoDB
    const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/peso_job_portal';
    await mongoose.connect(mongoUri, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    
    console.log('✅ Connected to MongoDB');
    
    // Find all resumes that don't have the showToEmployers field set
    const resumesWithoutVisibility = await Resume.find({
      $or: [
        { showToEmployers: { $exists: false } },
        { showToEmployers: null }
      ]
    });
    
    console.log(`📊 Found ${resumesWithoutVisibility.length} resumes without showToEmployers field`);
    
    if (resumesWithoutVisibility.length === 0) {
      console.log('✅ All resumes already have the showToEmployers field');
      return;
    }
    
    // Update all resumes to have showToEmployers: true by default
    const updateResult = await Resume.updateMany(
      {
        $or: [
          { showToEmployers: { $exists: false } },
          { showToEmployers: null }
        ]
      },
      {
        $set: { showToEmployers: true }
      }
    );
    
    console.log(`✅ Updated ${updateResult.modifiedCount} resumes with showToEmployers: true`);
    
    // Verify the update
    const remainingResumes = await Resume.find({
      $or: [
        { showToEmployers: { $exists: false } },
        { showToEmployers: null }
      ]
    });
    
    console.log(`📊 Remaining resumes without showToEmployers field: ${remainingResumes.length}`);
    
    if (remainingResumes.length === 0) {
      console.log('🎉 All resumes now have the showToEmployers field!');
    }
    
  } catch (error) {
    console.error('❌ Error fixing resume visibility:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the script
if (require.main === module) {
  fixResumeVisibility();
}

module.exports = fixResumeVisibility;
