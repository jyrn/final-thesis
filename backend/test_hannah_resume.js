/**
 * Test Hannah's Resume Data - Extracted from Resume Image
 */

const MLResumeParser = require('./services/MLResumeParser');
const ResumeTextCleaner = require('./services/ResumeTextCleaner');

console.log('🧪 Testing Hannah\'s Resume Data...\n');

// Hannah's resume data extracted from the image
const hannahResumeData = `Hannah Nicole L. Comia
UI/UX DESIGNER
San Pablo City, Laguna, Philippines | +63 961 072 0526 | hannahnicole.comia16@gmail.com
LinkedIn: www.linkedin.com/in/hannah-nicole-comia | GitHub: github.com/kenyaa

Education
De La Salle Lipa, Bachelor of Science in Computer Science                                    2022 - Present
Second Honor Awardee (GPA: 3.53), 3rd Year - First Semester, AY 2024-2025

San Pablo Colleges, Senior High School                                                      2020 - 2022
Strand: Science, Technology, Engineering, and Mathematics (STEM)
Graduated with Honor (General Average: 93.75)

Projects
NLP-Based Recruitment System for PESO Lipa | React, Node.js, Express, MongoDB, Cloud
Developed a web-based platform that applies Natural Language Processing (TF-IDF and cosine similarity) to analyze and match job seekers with relevant job posts, improving the accuracy and efficiency of the employment process.

Digital Companion App for the Elderly and Visually Impaired | Figma
Designed accessible mobile interfaces in Figma with features like medication reminders and emergency alerts, improving usability and enhancing day-to-day life for elderly and impaired users.

Inventory Management System | React, JavaScript, HTML, CSS
Built a web-based inventory system with CRUD operations, search, sorting, and validation features, enabling efficient inventory tracking across different categories.

Grade Computation and Email Automation | UiPath, Microsoft Excel
Automated the manual grade computation process using UiPath RPA to calculate student grades in Excel and send results via email. This reduced computation time and eliminated human error in grade encoding.

Certifications and Seminars
Student Mobility Programme | Universiti Teknologi Petronas, Malaysia                        April 2025
Google UX Design | Coursera (Issued by Google)                                             June 2025
Preparing Data for Analysis with Microsoft Excel | Coursera (Issued by Microsoft)          June 2025
Harnessing the Power of Data with Power BI | Coursera (Issued by Microsoft)               June 2025
Introduction to Data Science | Cisco Networking Academy                                     October 2025
English Certificate (C2 Proficient, Score: 801/00) | EF SET                               October 2025

Skills and Abilities
Design & Prototyping: Figma, Adobe XD, User-Centered Design, Wireframing, Prototyping
Web Development: HTML, CSS, React, React Native, TypeScript, Firebase, MongoDB, Cloud, GitHub
Automation & Data: UiPath, Microsoft Excel, Data Cleansing
Soft Skills: Problem Solving & Critical Thinking, Collaboration, Communication, Leadership`;

async function testHannahResume() {
  try {
    console.log('📄 Hannah\'s Resume Analysis:');
    console.log(`   Length: ${hannahResumeData.length} characters`);
    console.log(`   Lines: ${hannahResumeData.split('\n').length}`);
    console.log(`   First 200 chars: "${hannahResumeData.substring(0, 200)}..."`);
    
    console.log('\n🧹 Testing text cleaning...');
    const textCleaner = new ResumeTextCleaner();
    const cleaningResult = textCleaner.cleanResumeText(hannahResumeData);
    
    console.log('\n📄 Cleaned data analysis:');
    const cleanedLines = cleaningResult.cleanedText.split('\n');
    console.log(`   Length: ${cleaningResult.cleanedText.length} characters`);
    console.log(`   Lines: ${cleanedLines.length}`);
    console.log(`   Line structure: ${cleanedLines.length > 10 ? '✅ Multi-line' : '❌ Single line'}`);
    
    console.log('\n📋 First 15 lines of cleaned text:');
    cleanedLines.slice(0, 15).forEach((line, i) => {
      console.log(`   ${i + 1}: "${line}"`);
    });
    
    console.log('\n🤖 Testing parsing with cleaned text...');
    const parser = new MLResumeParser();
    const result = await parser.parse(cleaningResult.cleanedText);
    
    if (result.success) {
      console.log('\n✅ Hannah\'s Resume Parsing Results:');
      console.log(`   Overall Confidence: ${(result.metadata.overallConfidence * 100).toFixed(1)}%`);
      console.log(`   Format Detected: ${result.metadata.formatClassification?.format || 'Unknown'}`);
      
      console.log('\n👤 Personal Information:');
      console.log(`   Name: ${result.data.personalInfo.firstName} ${result.data.personalInfo.lastName}`);
      console.log(`   Email: ${result.data.personalInfo.email}`);
      console.log(`   Phone: ${result.data.personalInfo.phone}`);
      console.log(`   LinkedIn: ${result.data.personalInfo.linkedin}`);
      console.log(`   GitHub: ${result.data.personalInfo.github}`);
      
      console.log('\n🎓 Education:');
      console.log(`   Entries found: ${result.data.education.length}`);
      result.data.education.forEach((edu, i) => {
        console.log(`   ${i + 1}. ${edu.school}`);
        console.log(`      Degree: ${edu.degree}`);
        console.log(`      Period: ${edu.startDate} - ${edu.endDate}`);
        if (edu.gpa) console.log(`      GPA: ${edu.gpa}`);
      });
      
      console.log('\n💼 Work Experience:');
      console.log(`   Entries found: ${result.data.experience.length}`);
      result.data.experience.forEach((exp, i) => {
        console.log(`   ${i + 1}. ${exp.title} at ${exp.company}`);
        console.log(`      Period: ${exp.startDate} - ${exp.endDate}`);
      });
      
      console.log('\n🚀 Projects:');
      console.log(`   Projects found: ${result.data.projects.length}`);
      console.log(`   Expected: 4 projects (NLP Recruitment, Digital Companion, Inventory Management, Grade Computation)`);
      result.data.projects.forEach((proj, i) => {
        console.log(`   ${i + 1}. ${proj.name}`);
        console.log(`      Technologies: ${proj.technologies}`);
        console.log(`      Description: ${proj.description ? proj.description.substring(0, 100) + '...' : 'None'}`);
      });
      
      console.log('\n💡 Skills:');
      console.log(`   Skills found: ${result.data.skills.length}`);
      console.log(`   Sample skills: ${result.data.skills.slice(0, 10).join(', ')}...`);
      
      console.log('\n🎓 Certifications:');
      console.log(`   Certifications found: ${result.data.certifications.length}`);
      console.log(`   Expected: 6 certifications (Student Mobility, Google UX, Excel, Power BI, Data Science, English)`);
      result.data.certifications.forEach((cert, i) => {
        if (typeof cert === 'object') {
          console.log(`   ${i + 1}. ${cert.name || cert.title || 'Unknown'}`);
          console.log(`      Issuer: ${cert.issuer || 'Unknown'}`);
          console.log(`      Date: ${cert.date || 'Unknown'}`);
        } else {
          console.log(`   ${i + 1}. ${cert}`);
        }
      });
      
      console.log('\n📊 Confidence Breakdown:');
      Object.entries(result.metadata.confidenceScores).forEach(([section, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.7 ? '✅' : score > 0.4 ? '⚠️' : '❌';
        console.log(`   ${status} ${section}: ${percentage}%`);
      });
      
      console.log('\n🎯 Expected vs Actual:');
      console.log('   Expected Data:');
      console.log('   - Name: Hannah Nicole L. Comia');
      console.log('   - Title: UI/UX Designer');
      console.log('   - Education: 2 entries (De La Salle Lipa, San Pablo Colleges)');
      console.log('   - Projects: 4 projects');
      console.log('   - Certifications: 6 certifications');
      console.log('   - Skills: Design, Web Development, Automation categories');
      
      console.log('\n   Actual Results:');
      console.log(`   - Name: ${result.data.personalInfo.firstName} ${result.data.personalInfo.lastName}`);
      console.log(`   - Education: ${result.data.education.length} entries`);
      console.log(`   - Projects: ${result.data.projects.length} projects`);
      console.log(`   - Certifications: ${result.data.certifications.length} certifications`);
      console.log(`   - Skills: ${result.data.skills.length} skills`);
      
      const educationMatch = result.data.education.length >= 2 ? '✅' : '❌';
      const projectsMatch = result.data.projects.length >= 3 ? '✅' : '❌';
      const certificationsMatch = result.data.certifications.length >= 4 ? '✅' : '❌';
      
      console.log('\n   Match Quality:');
      console.log(`   ${educationMatch} Education: ${result.data.education.length >= 2 ? 'Good' : 'Needs improvement'}`);
      console.log(`   ${projectsMatch} Projects: ${result.data.projects.length >= 3 ? 'Good' : 'Needs improvement'}`);
      console.log(`   ${certificationsMatch} Certifications: ${result.data.certifications.length >= 4 ? 'Good' : 'Needs improvement'}`);
      
    } else {
      console.log('❌ Parsing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testHannahResume().then(() => {
  console.log('\n🧪 Hannah Resume Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
