const mongoose = require('mongoose');
require('dotenv').config();
const Employer = require('../models/Employer');

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/peso-job-portal', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkEmployers() {
  try {
    console.log(' Checking employers in database...');
    
    // Find all employers
    const allEmployers = await Employer.find({});
    console.log(` Total employers: ${allEmployers.length}`);
    
    // Find employers with documents array
    const employersWithDocsArray = await Employer.find({
      documents: { $exists: true }
    });
    console.log(` Employers with documents array: ${employersWithDocsArray.length}`);
    
    // Find employers with non-empty documents
    const employersWithDocs = await Employer.find({
      documents: { $exists: true, $ne: [] }
    });
    console.log(` Employers with actual documents: ${employersWithDocs.length}`);
    
    // Show sample employer data
    if (employersWithDocs.length > 0) {
      const sample = employersWithDocs[0];
      console.log('\n Sample employer with documents:');
      console.log('Company:', sample.companyName);
      console.log('Account Status:', sample.accountStatus);
      console.log('Document Verification Status:', sample.documentVerificationStatus);
      console.log('Documents count:', sample.documents?.length || 0);
      
      if (sample.documents && sample.documents.length > 0) {
        console.log('\n Sample document:');
        const doc = sample.documents[0];
        console.log('Type:', doc.documentType);
        console.log('Name:', doc.documentName);
        console.log('Verification Status:', doc.verificationStatus || 'NOT SET');
        console.log('Uploaded At:', doc.uploadedAt);
      }
    }
    
  } catch (error) {
    console.error(' Error checking employers:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkEmployers();
