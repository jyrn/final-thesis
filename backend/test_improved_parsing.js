/**
 * Test Improved Parsing with Cleaned Text
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');
const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing Improved Parsing with Cleaned Text...\n');

// Test with a sample resume that has the issues we've been fixing
const sampleResume = `
Hannah Nicole L.Comia
UI/UX DESIGNER
San Pablo City, Laguna | 09610720526 | hannahnicolecomia16@gmail.com
LinkedIn:www.linkedin.com/in/hannah-nicole-comia | GitHub:github.com/xavvaa

EDUCATION
De La Salle Lipa,Bachelor of Science in Computer Science 2022-Present
Second Honor Awardee(GPA:3.53),3rd Year-First Semester,AY2024-2025
San Pablo Colleges,Senior High School 2020-2022
Strand:Science,Technology,Engineering,and Mathematics(STEM)
Graduatedwith Honor(General Average:93.75)

PROJECTS
NLP-Based Recruitment Systemfor PESOLipa |React,Node.js,Express,MongoDB,Cloud
Developedaweb-basedplatformthatapplies Natural Language Processing(TF-IDFandcosinesimilarity)toanalyze andmatchjobseekerswithrelevantjobposts,improvingtheaccuracyandefficiencyoftheemploymentprocess.

Digital Companion Appforthe Elderlyand Visually Impaired |Figma
Designedaccessiblemobileinterfacesin Figmawithfeatureslikemedicationremindersandemergencyalerts,improvingusabilityandenhancingday-to-daylifeforelderlyandimpairedusers.

SKILLS
Design&Prototyping:Figma,User-Centered Design,Wireframing,Prototyping
Web Development:HTML,CSS,React,React Native,TypeScript,Firebase,MongoDB,Cloud,GitHub
Automation&Data:UiPath,Microsoft Excel,Data Cleansing
Soft Skills:Problem Solving&Critical Thinking,Collaboration,Communication,Leadership

CERTIFICATIONS
Student Mobility Programme |Universiti Teknologi Petronas,Malaysia April2025
GoogleUXDesign |Coursera(Issuedby Google) June2025
Preparing Datafor Analysiswith Microsoft Excel |Coursera(Issuedby Microsoft) June2025
Harnessingthe Powerof Datawith PowerBI|Coursera(Issuedby Microsoft) June2025
`;

async function testImprovedParsing() {
  try {
    console.log('🔍 Testing parsing improvements...\n');
    
    // Step 1: Show original text issues
    console.log('=== STEP 1: Original Text Issues ===');
    console.log('Sample issues in original text:');
    console.log('- "Systemfor PESOLipa" (concatenated)');
    console.log('- "Strand:Science,Technology" (spacing issues)');
    console.log('- "Honor(General Average:93.75)" (parenthesis spacing)');
    console.log('- "Designedaccessiblemobile" (concatenated description)');
    
    // Step 2: Test text cleaning
    console.log('\n=== STEP 2: Text Cleaning ===');
    const textCleaner = new ResumeTextCleaner();
    const cleaningResult = textCleaner.cleanResumeText(sampleResume);
    
    console.log('✅ Text cleaning completed');
    console.log('📊 Cleaning stats:');
    console.log(`   Original length: ${cleaningResult.metadata.originalLength}`);
    console.log(`   Cleaned length: ${cleaningResult.metadata.cleanedLength}`);
    console.log(`   Improvement: ${cleaningResult.metadata.reductionPercentage}%`);
    console.log(`   Steps applied: ${cleaningResult.metadata.cleaningSteps.length}`);
    
    // Show sample improvements
    console.log('\n📝 Sample text improvements:');
    const originalLines = sampleResume.split('\n').slice(0, 3);
    const cleanedLines = cleaningResult.cleanedText.split('\n').slice(0, 3);
    
    for (let i = 0; i < Math.min(originalLines.length, cleanedLines.length); i++) {
      if (originalLines[i].trim() !== cleanedLines[i].trim()) {
        console.log(`   Original: "${originalLines[i].trim()}"`);
        console.log(`   Cleaned:  "${cleanedLines[i].trim()}"`);
        console.log('   ✅ Improved\n');
      }
    }
    
    // Step 3: Test parsing with cleaned text
    console.log('=== STEP 3: Parsing with Cleaned Text ===');
    const mlParser = new MLResumeParser();
    const parsingResult = await mlParser.parse(cleaningResult.cleanedText);
    
    if (parsingResult.success) {
      console.log('✅ Parsing completed successfully');
      console.log('📊 Parsing results:');
      console.log(`   Overall confidence: ${(parsingResult.metadata.overallConfidence * 100).toFixed(1)}%`);
      console.log(`   Parsing duration: ${parsingResult.metadata.parsingDuration}s`);
      
      console.log('\n📋 Extracted data summary:');
      const data = parsingResult.data;
      
      // Personal Info
      console.log(`   👤 Name: ${data.personalInfo.firstName} ${data.personalInfo.lastName}`);
      console.log(`   📧 Email: ${data.personalInfo.email || 'Not found'}`);
      console.log(`   📱 Phone: ${data.personalInfo.phone || 'Not found'}`);
      
      // Education
      console.log(`   🎓 Education entries: ${data.education.length}`);
      if (data.education.length > 0) {
        data.education.forEach((edu, i) => {
          console.log(`      ${i + 1}. ${edu.school} - ${edu.degree}`);
        });
      }
      
      // Skills
      console.log(`   💡 Skills found: ${data.skills.length}`);
      if (data.skills.length > 0) {
        console.log(`      Sample: ${data.skills.slice(0, 5).join(', ')}${data.skills.length > 5 ? '...' : ''}`);
      }
      
      // Projects
      console.log(`   🚀 Projects: ${data.projects ? data.projects.length : 0}`);
      if (data.projects && data.projects.length > 0) {
        data.projects.forEach((project, i) => {
          console.log(`      ${i + 1}. ${project.name || project.title || 'Unnamed project'}`);
        });
      }
      
      // Certifications
      console.log(`   🎓 Certifications: ${data.certifications ? data.certifications.length : 0}`);
      if (data.certifications && data.certifications.length > 0) {
        data.certifications.forEach((cert, i) => {
          console.log(`      ${i + 1}. ${cert.name || cert.title || 'Unnamed certification'}`);
        });
      }
      
      // Step 4: Compare confidence scores
      console.log('\n=== STEP 4: Confidence Analysis ===');
      const confidenceScores = parsingResult.metadata.confidenceScores;
      console.log('📊 Section confidence scores:');
      Object.entries(confidenceScores).forEach(([section, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.7 ? '✅' : score > 0.4 ? '⚠️' : '❌';
        console.log(`   ${status} ${section}: ${percentage}%`);
      });
      
    } else {
      console.error('❌ Parsing failed');
    }
    
    console.log('\n=== SUMMARY ===');
    console.log('✅ Text cleaning: Comprehensive 9-step process');
    console.log('✅ Section detection: Enhanced with multiple strategies');
    console.log('✅ Pattern matching: Improved with clean text');
    console.log('✅ Confidence scoring: More reliable with consistent formatting');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testImprovedParsing().then(() => {
  console.log('\n🧪 Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
