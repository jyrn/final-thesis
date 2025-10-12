/**
 * Test Adrian's Real Resume Data with Improved Text Cleaning
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');
const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing Adrian\'s Real Resume Data...\n');

// Adrian's actual resume data from the log (single line)
const adrianRealData = `ADRIAN LOUISE D. GALVEZ Balagtas, Bulacan, Philippines Email: adriangalvez2602@gmail.com | adrian_louise_galvez @dlsl.edu.ph Phone: +63 961 056 6734 |Github: Adrian G-26 OBJECTIVE Motivated Computer Science student seeking On-the-Job Training at UTP Malaysia to leverage technical and creative skills, contribute effectively in a real-world setting, and enhance professional capabilities through hands-on experience. EDUCA TION Bachelor of Science in Computer Science De La Salle Lipa, Batangas September 2022 - Present Senior High School Certificate, STEM Mapa University, Intramuros, Manila August 2018 - May 2020 TECHNICAL SKILLS Programming: C++, Java Script, Typescript, Python Web/Mobile Development: HTML, CSS, React, React Native, Expo Dev UI/UX: Figma, UX Pilot Database: SQL, Airtable, MongoDB Video Editing: Adobe Premiere Pro, Capcut Graphic Design: Adobe Photoshop, Illustrator, Canva Productivity: MS Office Suite, Google Suite PROJECTS Front-end UI and UX Ecommerce Website Technologies: HTML5, CSS3, Vanilla Java Script Developed a responsive beauty products ecommerce site utilizing core web technologies. Implemented CSS Flexbox for product layout grids and CSS Grid for page structure, ensuring cross-device compatibility. Applied HTML5 semantic elements for improved accessibility and SEO. Built dynamic shopping cart functionality using vanilla Java Script DOM manipulation, including add Event Listener() for user interactions and local Storage for cart persistence. Web-Based Airline Reservation System Technologies: React.js, Node.js, Express.js, MongoDB Developed a full-stack flight booking platform with modern Java Script frameworks. Built React components for flight search, booking forms, and user dashboards with state management using hooks. Implemented Node.js REST APIs with Express.js middleware for authentication, flight data processing, and booking transactions. Designed MongoDB collections for users, flights, and reservations with efficient indexing and data relationships. Ecommerce Mobile Application Technologies: React Native, MongoDB Built a cross-platform mobile ecommerce app for iOS and Android using React Native framework. Utilized native modules for device-specific features like camera integration and GPS tracking, with hot reloading for efficient development cycles. Implemented responsive UI components, secure payment integration, and real-time product catalog synchronization. Medicine Tracker Mobile Application Technologies: React Native, MongoDB Built healthcare mobile app for medication management using React Native's cross-platform capabilities. Developed features for prescription tracking, dosage reminders, and medication scheduling with local database storage and push notification integration. Implemented biometric authentication and secure data handling for patient privacy compliance. Predictive Car Maintenance System (In Progress) Technologies: Python, Raspberry Pi, OBD-II Sensor, Machine Learning Engineering an Io T-based predictive maintenance system using Raspberry Pi and OBD-II sensors for real-time vehicle diagnostics. Utilizing Python-OBD library to interface with ELM327 adapters, collecting engine parameters like RPM, temperature, and fuel efficiency data. Implemented machine learning algorithms in Python to analyze sensor patterns and predict component degradation, enabling proactive maintenance scheduling. This system exports diagnostic data to CSV format for advanced analytics and trend monitoring. WORK EXPERIENCE Production Manager - Viral Coach LLC June 2024 - Present Lead a group of editors and manage/organize them. Ensure high production value for each and every client needs. Manage and organize our database using Airtable Database. Provide support to the editors by using high grade editing softwares like Descript and Frame.io. Communicated with clients and editor candidates to staff editors to our current clients. Freelance Video Editor and Graphic Designer January 2018 - May 2024 Led and completed multiple video and graphic design projects for clients. Ensured high production value and alignment with client requirements. Maintained consistent brand identity across deliverables. Provided technical troubleshooting for editing software and hardware. Coordinated with interdisciplinary teams (videographers, designers, clients). PERSONAL SKILLS Effective communication and teamwork Leadership Adaptability and willingness to learn new technologies Strong attention to detail Time management and project multitasking Problem-solving`;

async function testAdrianRealData() {
  try {
    console.log('📄 Original data analysis:');
    console.log(`   Length: ${adrianRealData.length} characters`);
    console.log(`   Lines: ${adrianRealData.split('\n').length}`);
    console.log(`   First 200 chars: "${adrianRealData.substring(0, 200)}..."`);
    
    console.log('\n🧹 Testing improved text cleaning...');
    const textCleaner = new ResumeTextCleaner();
    const cleaningResult = textCleaner.cleanResumeText(adrianRealData);
    
    console.log('\n📄 Cleaned data analysis:');
    console.log(`   Length: ${cleaningResult.cleanedText.length} characters`);
    const cleanedLines = cleaningResult.cleanedText.split('\n');
    console.log(`   Lines: ${cleanedLines.length}`);
    console.log(`   Improvement: ${cleanedLines.length > 1 ? '✅ Multi-line' : '❌ Still single line'}`);
    
    console.log('\n📋 First 15 lines of cleaned text:');
    cleanedLines.slice(0, 15).forEach((line, i) => {
      console.log(`   ${i + 1}: "${line}"`);
    });
    
    // Check for proper section detection
    const sectionsFound = [];
    const expectedSections = ['OBJECTIVE', 'EDUCATION', 'TECHNICAL SKILLS', 'PROJECTS', 'WORK EXPERIENCE', 'PERSONAL SKILLS'];
    
    expectedSections.forEach(section => {
      if (cleanedLines.some(line => line.trim().toUpperCase().includes(section))) {
        sectionsFound.push(section);
      }
    });
    
    console.log('\n📊 Section detection analysis:');
    console.log(`   Expected sections: ${expectedSections.length}`);
    console.log(`   Found sections: ${sectionsFound.length}`);
    console.log(`   Sections found: ${sectionsFound.join(', ')}`);
    console.log(`   Section detection: ${sectionsFound.length >= 4 ? '✅ Good' : '❌ Poor'}`);
    
    console.log('\n🤖 Testing parsing with cleaned text...');
    const parser = new MLResumeParser();
    const result = await parser.parse(cleaningResult.cleanedText);
    
    if (result.success) {
      console.log('\n✅ Parsing Results:');
      console.log(`   Overall Confidence: ${(result.metadata.overallConfidence * 100).toFixed(1)}%`);
      console.log(`   Name: ${result.data.personalInfo.firstName} ${result.data.personalInfo.lastName}`);
      console.log(`   Email: ${result.data.personalInfo.email}`);
      console.log(`   Phone: ${result.data.personalInfo.phone}`);
      console.log(`   Education: ${result.data.education.length} entries`);
      console.log(`   Experience: ${result.data.experience.length} entries`);
      console.log(`   Skills: ${result.data.skills.length} found`);
      console.log(`   Projects: ${result.data.projects.length} found`);
      console.log(`   Certifications: ${result.data.certifications.length} found`);
      
      console.log('\n📊 Confidence Breakdown:');
      Object.entries(result.metadata.confidenceScores).forEach(([section, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.7 ? '✅' : score > 0.4 ? '⚠️' : '❌';
        console.log(`   ${status} ${section}: ${percentage}%`);
      });
      
      // Compare with previous results
      console.log('\n🔄 Improvement Analysis:');
      console.log('   Before fixes:');
      console.log('   - Education: 0 entries, Experience: 0 entries, Projects: 0 found');
      console.log('   After fixes:');
      console.log(`   - Education: ${result.data.education.length} entries, Experience: ${result.data.experience.length} entries, Projects: ${result.data.projects.length} found`);
      
      const totalSections = result.data.education.length + result.data.experience.length + result.data.projects.length;
      console.log(`   Overall improvement: ${totalSections > 0 ? '✅ Significant' : '❌ Needs more work'}`);
      
    } else {
      console.log('❌ Parsing failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testAdrianRealData().then(() => {
  console.log('\n🧪 Adrian Real Data Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
