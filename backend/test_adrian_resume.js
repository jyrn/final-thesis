/**
 * Comprehensive Test for Adrian's Resume Classification Improvements
 */

const MLResumeParser = require('./services/MLResumeParser');
const ResumeTextCleaner = require('./services/ResumeTextCleaner');

console.log('🔬 Testing Adrian Resume Classification Improvements...\n');

// Adrian's full resume data
const adrianFullResume = `ADRIAN LOUISE D. GALVEZ Balagtas, Bulacan, Philippines Email: adriangalvez2602@gmail.com | adrian_louise_galvez @dlsl.edu.ph Phone: +63 961 056 6734 |Github: Adrian G-26 OBJECTIVE Motivated Computer Science student seeking On-the-Job Training at UTP Malaysia to leverage technical and creative skills, contribute effectively in a real-world setting, and enhance professional capabilities through hands-on experience. EDUCA TION Bachelor of Science in Computer Science De La Salle Lipa, Batangas September 2022 - Present Senior High School Certificate, STEM Mapa University, Intramuros, Manila August 2018 - May 2020 TECHNICAL SKILLS Programming: C++, Java Script, Typescript, Python Web/Mobile Development: HTML, CSS, React, React Native, Expo Dev UI/UX: Figma, UX Pilot Database: SQL, Airtable, MongoDB Video Editing: Adobe Premiere Pro, Capcut Graphic Design: Adobe Photoshop, Illustrator, Canva Productivity: MS Office Suite, Google Suite PROJECTS Front-end UI and UX Ecommerce Website Technologies: HTML5, CSS3, Vanilla Java Script Developed a responsive beauty products ecommerce site utilizing core web technologies. Implemented CSS Flexbox for product layout grids and CSS Grid for page structure, ensuring cross-device compatibility. Applied HTML5 semantic elements for improved accessibility and SEO. Built dynamic shopping cart functionality using vanilla Java Script DOM manipulation, including add Event Listener() for user interactions and local Storage for cart persistence. Web-Based Airline Reservation System Technologies: React.js, Node.js, Express.js, MongoDB Developed a full-stack flight booking platform with modern Java Script frameworks. Built React components for flight search, booking forms, and user dashboards with state management using hooks. Implemented Node.js REST APIs with Express.js middleware for authentication, flight data processing, and booking transactions. Designed MongoDB collections for users, flights, and reservations with efficient indexing and data relationships. Ecommerce Mobile Application Technologies: React Native, MongoDB Built a cross-platform mobile ecommerce app for iOS and Android using React Native framework. Utilized native modules for device-specific features like camera integration and GPS tracking, with hot reloading for efficient development cycles. Implemented responsive UI components, secure payment integration, and real-time product catalog synchronization. Medicine Tracker Mobile Application Technologies: React Native, MongoDB Built healthcare mobile app for medication management using React Native's cross-platform capabilities. Developed features for prescription tracking, dosage reminders, and medication scheduling with local database storage and push notification integration. Implemented biometric authentication and secure data handling for patient privacy compliance. Predictive Car Maintenance System (In Progress) Technologies: Python, Raspberry Pi, OBD-II Sensor, Machine Learning Engineering an Io T-based predictive maintenance system using Raspberry Pi and OBD-II sensors for real-time vehicle diagnostics. Utilizing Python-OBD library to interface with ELM327 adapters, collecting engine parameters like RPM, temperature, and fuel efficiency data. Implemented machine learning algorithms in Python to analyze sensor patterns and predict component degradation, enabling proactive maintenance scheduling. This system exports diagnostic data to CSV format for advanced analytics and trend monitoring. WORK EXPERIENCE Production Manager - Viral Coach LLC June 2024 - Present Lead a group of editors and manage/organize them. Ensure high production value for each and every client needs. Manage and organize our database using Airtable Database. Provide support to the editors by using high grade editing softwares like Descript and Frame.io. Communicated with clients and editor candidates to staff editors to our current clients. Freelance Video Editor and Graphic Designer January 2018 - May 2024 Led and completed multiple video and graphic design projects for clients. Ensured high production value and alignment with client requirements. Maintained consistent brand identity across deliverables. Provided technical troubleshooting for editing software and hardware. Coordinated with interdisciplinary teams (videographers, designers, clients). PERSONAL SKILLS Effective communication and teamwork Leadership Adaptability and willingness to learn new technologies Strong attention to detail Time management and project multitasking Problem-solving`;

async function testClassificationImprovements() {
  try {
    console.log('📊 STEP 1: Analyzing Current Classification Issues\n');
    
    // Test current parsing
    const parser = new MLResumeParser();
    const result = await parser.parse(adrianFullResume);
    
    if (result.success) {
      console.log('📋 Current Results Analysis:');
      console.log(`   Overall Confidence: ${(result.metadata.overallConfidence * 100).toFixed(1)}%`);
      console.log(`   Format Detected: ${result.metadata.formatClassification.format}`);
      console.log(`   Format Confidence: ${(result.metadata.formatClassification.confidence * 100).toFixed(1)}%`);
      
      console.log('\n🔍 Detailed Section Analysis:');
      
      // Personal Info
      console.log(`\n👤 Personal Information (${(result.metadata.confidenceScores.personalInfo * 100).toFixed(1)}%):`);
      console.log(`   Name: "${result.data.personalInfo.firstName} ${result.data.personalInfo.lastName}"`);
      console.log(`   Email: "${result.data.personalInfo.email}"`);
      console.log(`   Phone: "${result.data.personalInfo.phone}"`);
      
      // Education Analysis
      console.log(`\n🎓 Education (${(result.metadata.confidenceScores.education * 100).toFixed(1)}%):`);
      console.log(`   Entries found: ${result.data.education.length}`);
      if (result.data.education.length > 0) {
        result.data.education.forEach((edu, i) => {
          console.log(`   ${i + 1}. School: "${edu.school}"`);
          console.log(`      Degree: "${edu.degree}"`);
          console.log(`      Period: "${edu.startDate} - ${edu.endDate}"`);
          console.log(`      ⚠️ Issues: ${edu.school.length < 10 ? 'Incomplete school name' : 'OK'}`);
        });
      }
      
      // Experience Analysis
      console.log(`\n💼 Work Experience (${(result.metadata.confidenceScores.experience * 100).toFixed(1)}%):`);
      console.log(`   Entries found: ${result.data.experience.length}`);
      if (result.data.experience.length > 0) {
        result.data.experience.forEach((exp, i) => {
          console.log(`   ${i + 1}. Title: "${exp.title}"`);
          console.log(`      Company: "${exp.company}"`);
          console.log(`      Period: "${exp.startDate} - ${exp.endDate}"`);
          console.log(`      Description length: ${exp.description ? exp.description.length : 0} chars`);
        });
      }
      
      // Projects Analysis
      console.log(`\n🚀 Projects (${(result.metadata.confidenceScores.projects * 100).toFixed(1)}%):`);
      console.log(`   Projects found: ${result.data.projects.length}`);
      console.log(`   Expected: 5 projects (Ecommerce Website, Airline System, Mobile App, Medicine Tracker, Car Maintenance)`);
      if (result.data.projects.length > 0) {
        result.data.projects.forEach((proj, i) => {
          console.log(`   ${i + 1}. Name: "${proj.name}"`);
          console.log(`      Technologies: "${proj.technologies}"`);
          console.log(`      Description length: ${proj.description ? proj.description.length : 0} chars`);
        });
      }
      
      // Skills Analysis
      console.log(`\n💡 Skills (${(result.metadata.confidenceScores.skills * 100).toFixed(1)}%):`);
      console.log(`   Skills found: ${result.data.skills.length}`);
      console.log(`   Sample skills: ${result.data.skills.slice(0, 10).join(', ')}...`);
      
      console.log('\n🎯 IMPROVEMENT RECOMMENDATIONS:');
      
      // Education improvements
      if (result.data.education.some(edu => edu.school.length < 10)) {
        console.log('   📚 Education: Improve school name extraction patterns');
      }
      
      // Projects improvements
      if (result.data.projects.length < 3) {
        console.log('   🚀 Projects: Enhance project detection - missing multiple projects');
      }
      
      // Format classification improvements
      if (result.metadata.formatClassification.confidence < 0.8) {
        console.log('   🏷️ Format: Improve format classification accuracy');
      }
      
      // Experience improvements
      if (result.data.experience.length < 2) {
        console.log('   💼 Experience: Missing second job (Freelance Video Editor)');
      }
      
      console.log('\n📈 PRIORITY FIXES:');
      console.log('   1. 🔴 HIGH: Fix education school name extraction');
      console.log('   2. 🔴 HIGH: Improve project detection (5 projects expected, only 1 found)');
      console.log('   3. 🟡 MED: Extract second work experience entry');
      console.log('   4. 🟡 MED: Improve format classification confidence');
      
    } else {
      console.log('❌ Parsing failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testClassificationImprovements().then(() => {
  console.log('\n🔬 Classification Analysis Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});