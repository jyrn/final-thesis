const mongoose = require('mongoose');
const Resume = require('../models/Resume');
const Application = require('../models/Application');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/peso-job-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function fixResumeUrls() {
  try {
    console.log('🔍 Checking for resume records with localhost URLs...');
    
    // Fix Resume collection
    const resumesWithLocalhost = await Resume.find({
      fileUrl: { $regex: /localhost:3001/ }
    });
    
    console.log(`Found ${resumesWithLocalhost.length} resume records with localhost URLs`);
    
    for (const resume of resumesWithLocalhost) {
      const oldUrl = resume.fileUrl;
      const newUrl = oldUrl.replace('http://localhost:3001', '');
      
      await Resume.updateOne(
        { _id: resume._id },
        { $set: { fileUrl: newUrl } }
      );
      
      console.log(`✅ Updated resume ${resume._id}: ${oldUrl} → ${newUrl}`);
    }
    
    // Fix Application collection - resumeFile.filePath
    const applicationsWithLocalhost = await Application.find({
      'resumeFile.filePath': { $regex: /localhost:3001/ }
    });
    
    console.log(`Found ${applicationsWithLocalhost.length} application records with localhost URLs`);
    
    for (const application of applicationsWithLocalhost) {
      const oldUrl = application.resumeFile.filePath;
      const newUrl = oldUrl.replace('http://localhost:3001', '');
      
      await Application.updateOne(
        { _id: application._id },
        { $set: { 'resumeFile.filePath': newUrl } }
      );
      
      console.log(`✅ Updated application ${application._id}: ${oldUrl} → ${newUrl}`);
    }
    
    console.log('🎉 Database migration completed successfully!');
    
    // Verify the changes
    const remainingResumeIssues = await Resume.countDocuments({
      fileUrl: { $regex: /localhost:3001/ }
    });
    
    const remainingApplicationIssues = await Application.countDocuments({
      'resumeFile.filePath': { $regex: /localhost:3001/ }
    });
    
    console.log(`Remaining issues - Resumes: ${remainingResumeIssues}, Applications: ${remainingApplicationIssues}`);
    
  } catch (error) {
    console.error('❌ Error during migration:', error);
  } finally {
    mongoose.connection.close();
  }
}

fixResumeUrls();
