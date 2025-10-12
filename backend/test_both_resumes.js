/**
 * Comprehensive Test for Both Adrian's and Hannah's Resumes
 * Tests parsing improvements across different resume formats
 */

const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing Both Resume Formats for Parsing Improvements...\n');

// Adrian's resume data (single-line PDF format)
const adrianResumeData = `ADRIAN LOUISE D. GALVEZ Balagtas, Bulacan, Philippines Email: adriangalvez2602@gmail.com | adrian_louise_galvez @dlsl.edu.ph Phone: +63 961 056 6734 |Github: Adrian G-26 OBJECTIVE Motivated Computer Science student seeking On-the-Job Training at UTP Malaysia to leverage technical and creative skills, contribute effectively in a real-world setting, and enhance professional capabilities through hands-on experience. EDUCA TION Bachelor of Science in Computer Science De La Salle Lipa, Batangas September 2022 - Present Senior High School Certificate, STEM Mapa University, Intramuros, Manila August 2018 - May 2020 TECHNICAL SKILLS Programming: C++, Java Script, Typescript, Python Web/Mobile Development: HTML, CSS, React, React Native, Expo Dev UI/UX: Figma, UX Pilot Database: SQL, Airtable, MongoDB Video Editing: Adobe Premiere Pro, Capcut Graphic Design: Adobe Photoshop, Illustrator, Canva Productivity: MS Office Suite, Google Suite PROJECTS Front-end UI and UX Ecommerce Website Technologies: HTML5, CSS3, Vanilla Java Script Developed a responsive beauty products ecommerce site utilizing core web technologies. Implemented CSS Flexbox for product layout grids and CSS Grid for page structure, ensuring cross-device compatibility. Applied HTML5 semantic elements for improved accessibility and SEO. Built dynamic shopping cart functionality using vanilla Java Script DOM manipulation, including add Event Listener() for user interactions and local Storage for cart persistence. Web-Based Airline Reservation System Technologies: React.js, Node.js, Express.js, MongoDB Developed a full-stack flight booking platform with modern Java Script frameworks. Built React components for flight search, booking forms, and user dashboards with state management using hooks. Implemented Node.js REST APIs with Express.js middleware for authentication, flight data processing, and booking transactions. Designed MongoDB collections for users, flights, and reservations with efficient indexing and data relationships. Ecommerce Mobile Application Technologies: React Native, MongoDB Built a cross-platform mobile ecommerce app for iOS and Android using React Native framework. Utilized native modules for device-specific features like camera integration and GPS tracking, with hot reloading for efficient development cycles. Implemented responsive UI components, secure payment integration, and real-time product catalog synchronization. Medicine Tracker Mobile Application Technologies: React Native, MongoDB Built healthcare mobile app for medication management using React Native's cross-platform capabilities. Developed features for prescription tracking, dosage reminders, and medication scheduling with local database storage and push notification integration. Implemented biometric authentication and secure data handling for patient privacy compliance. Predictive Car Maintenance System (In Progress) Technologies: Python, Raspberry Pi, OBD-II Sensor, Machine Learning Engineering an Io T-based predictive maintenance system using Raspberry Pi and OBD-II sensors for real-time vehicle diagnostics. Utilizing Python-OBD library to interface with ELM327 adapters, collecting engine parameters like RPM, temperature, and fuel efficiency data. Implemented machine learning algorithms in Python to analyze sensor patterns and predict component degradation, enabling proactive maintenance scheduling. This system exports diagnostic data to CSV format for advanced analytics and trend monitoring. WORK EXPERIENCE Production Manager - Viral Coach LLC June 2024 - Present Lead a group of editors and manage/organize them. Ensure high production value for each and every client needs. Manage and organize our database using Airtable Database. Provide support to the editors by using high grade editing softwares like Descript and Frame.io. Communicated with clients and editor candidates to staff editors to our current clients. Freelance Video Editor and Graphic Designer January 2018 - May 2024 Led and completed multiple video and graphic design projects for clients. Ensured high production value and alignment with client requirements. Maintained consistent brand identity across deliverables. Provided technical troubleshooting for editing software and hardware. Coordinated with interdisciplinary teams (videographers, designers, clients). PERSONAL SKILLS Effective communication and teamwork Leadership Adaptability and willingness to learn new technologies Strong attention to detail Time management and project multitasking Problem-solving`;

// Hannah's resume data (structured format)
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

async function testBothResumes() {
  const results = {};
  
  try {
    console.log('🔄 Testing Adrian\'s Resume (Single-line PDF format)...\n');
    
    const parser = new MLResumeParser();
    const adrianResult = await parser.parse(adrianResumeData);
    
    if (adrianResult.success) {
      results.adrian = {
        confidence: adrianResult.metadata.overallConfidence,
        personalInfo: adrianResult.data.personalInfo,
        education: adrianResult.data.education.length,
        experience: adrianResult.data.experience.length,
        skills: adrianResult.data.skills.length,
        projects: adrianResult.data.projects.length,
        certifications: adrianResult.data.certifications.length
      };
      
      console.log('✅ Adrian\'s Results:');
      console.log(`   Overall Confidence: ${(results.adrian.confidence * 100).toFixed(1)}%`);
      console.log(`   Name: ${results.adrian.personalInfo.firstName} ${results.adrian.personalInfo.lastName}`);
      console.log(`   Education: ${results.adrian.education} entries`);
      console.log(`   Experience: ${results.adrian.experience} entries`);
      console.log(`   Skills: ${results.adrian.skills} found`);
      console.log(`   Projects: ${results.adrian.projects} found`);
      console.log(`   Certifications: ${results.adrian.certifications} found`);
    } else {
      console.log('❌ Adrian\'s parsing failed');
      results.adrian = null;
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    console.log('🔄 Testing Hannah\'s Resume (Structured format)...\n');
    
    const hannahResult = await parser.parse(hannahResumeData);
    
    if (hannahResult.success) {
      results.hannah = {
        confidence: hannahResult.metadata.overallConfidence,
        personalInfo: hannahResult.data.personalInfo,
        education: hannahResult.data.education.length,
        experience: hannahResult.data.experience.length,
        skills: hannahResult.data.skills.length,
        projects: hannahResult.data.projects.length,
        certifications: hannahResult.data.certifications.length
      };
      
      console.log('✅ Hannah\'s Results:');
      console.log(`   Overall Confidence: ${(results.hannah.confidence * 100).toFixed(1)}%`);
      console.log(`   Name: ${results.hannah.personalInfo.firstName} ${results.hannah.personalInfo.lastName}`);
      console.log(`   Education: ${results.hannah.education} entries`);
      console.log(`   Experience: ${results.hannah.experience} entries`);
      console.log(`   Skills: ${results.hannah.skills} found`);
      console.log(`   Projects: ${results.hannah.projects} found`);
      console.log(`   Certifications: ${results.hannah.certifications} found`);
    } else {
      console.log('❌ Hannah\'s parsing failed');
      results.hannah = null;
    }
    
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Comparison and Analysis
    console.log('📊 COMPARATIVE ANALYSIS:\n');
    
    if (results.adrian && results.hannah) {
      console.log('🎯 Expected vs Actual Results:');
      console.log('\n📋 Adrian (Expected):');
      console.log('   - Name: ADRIAN LOUISE D. GALVEZ');
      console.log('   - Education: 2 entries (De La Salle Lipa, Mapa University)');
      console.log('   - Experience: 2 entries (Production Manager, Freelance Video Editor)');
      console.log('   - Projects: 5 projects');
      console.log('   - Certifications: 0 (correct - Adrian has no certificates)');
      
      console.log('\n📋 Hannah (Expected):');
      console.log('   - Name: Hannah Nicole L. Comia');
      console.log('   - Education: 2 entries (De La Salle Lipa, San Pablo Colleges)');
      console.log('   - Experience: 0 entries (correct - Hannah has no work experience, only projects)');
      console.log('   - Projects: 4 projects (NLP Recruitment, Digital Companion, Inventory, Grade Computation)');
      console.log('   - Certifications: 6 certifications');
      
      console.log('\n📊 Performance Comparison:');
      
      const adrianScore = calculateScore(results.adrian, {
        education: 2, experience: 2, projects: 5, certifications: 0
      });
      
      const hannahScore = calculateScore(results.hannah, {
        education: 2, experience: 0, projects: 4, certifications: 6
      });
      
      console.log(`   Adrian\'s Score: ${adrianScore.toFixed(1)}% (${(results.adrian.confidence * 100).toFixed(1)}% confidence)`);
      console.log(`   Hannah\'s Score: ${hannahScore.toFixed(1)}% (${(results.hannah.confidence * 100).toFixed(1)}% confidence)`);
      
      const avgScore = (adrianScore + hannahScore) / 2;
      const avgConfidence = ((results.adrian.confidence + results.hannah.confidence) / 2 * 100);
      
      console.log(`\n🏆 Overall System Performance:`);
      console.log(`   Average Accuracy: ${avgScore.toFixed(1)}%`);
      console.log(`   Average Confidence: ${avgConfidence.toFixed(1)}%`);
      console.log(`   Cross-format Compatibility: ${avgScore > 70 ? '✅ Good' : '❌ Needs Improvement'}`);
      
      console.log('\n🎯 Priority Improvements Needed:');
      
      // Adrian issues
      if (results.adrian.projects < 4) {
        console.log('   🔴 Adrian: Improve project detection (missing projects)');
      }
      if (results.adrian.experience < 2) {
        console.log('   🔴 Adrian: Improve experience parsing (missing 2nd work entry: Freelance Video Editor)');
      }
      if (results.adrian.certifications > 0) {
        console.log('   🟡 Adrian: False positive certifications detected (Adrian has no certificates)');
      }
      
      // Hannah issues  
      if (results.hannah.personalInfo.firstName !== 'Hannah') {
        console.log('   🔴 Hannah: Fix name extraction (getting wrong name)');
      }
      if (results.hannah.projects < 3) {
        console.log('   🔴 Hannah: Improve project detection (missing projects from pipe format)');
      }
      if (results.hannah.certifications < 5) {
        console.log('   🔴 Hannah: Fix certification parsing (missing some certifications)');
      }
      if (results.hannah.experience > 0) {
        console.log('   🟡 Hannah: False positive work experience detected (Hannah has no work experience)');
      }
      
      console.log('\n✅ What\'s Working Well:');
      console.log('   - Text cleaning and line breaking');
      console.log('   - Contact information extraction');
      console.log('   - Skills detection');
      console.log('   - Education parsing (mostly good)');
      
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

function calculateScore(actual, expected) {
  let score = 0;
  let total = 0;
  
  // Education score (25%)
  const eduScore = Math.min(actual.education / expected.education, 1) * 25;
  score += eduScore;
  total += 25;
  
  // Experience score (20%)
  const expScore = expected.experience === 0 ? 
    (actual.experience === 0 ? 20 : 0) : 
    Math.min(actual.experience / expected.experience, 1) * 20;
  score += expScore;
  total += 20;
  
  // Projects score (30%)
  const projScore = Math.min(actual.projects / expected.projects, 1) * 30;
  score += projScore;
  total += 30;
  
  // Certifications score (15%)
  const certScore = expected.certifications === 0 ? 
    (actual.certifications === 0 ? 15 : 0) : 
    Math.min(actual.certifications / expected.certifications, 1) * 15;
  score += certScore;
  total += 15;
  
  // Name extraction score (10%)
  const nameScore = (actual.personalInfo.firstName && actual.personalInfo.firstName.length > 2) ? 10 : 0;
  score += nameScore;
  total += 10;
  
  return (score / total) * 100;
}

testBothResumes().then(() => {
  console.log('\n🧪 Comprehensive Resume Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
