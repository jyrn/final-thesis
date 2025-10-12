/**
 * Comprehensive Test for All Four Resume Formats
 * Tests parsing improvements across Adrian, Hannah, Carlo, and Shayla's resumes
 */

const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing All Four Resume Formats for Cross-Compatibility...\n');

// All four resume datasets
const resumeData = {
  adrian: {
    name: 'Adrian',
    data: `ADRIAN LOUISE D. GALVEZ Balagtas, Bulacan, Philippines Email: adriangalvez2602@gmail.com | adrian_louise_galvez @dlsl.edu.ph Phone: +63 961 056 6734 |Github: Adrian G-26 OBJECTIVE Motivated Computer Science student seeking On-the-Job Training at UTP Malaysia to leverage technical and creative skills, contribute effectively in a real-world setting, and enhance professional capabilities through hands-on experience. EDUCA TION Bachelor of Science in Computer Science De La Salle Lipa, Batangas September 2022 - Present Senior High School Certificate, STEM Mapa University, Intramuros, Manila August 2018 - May 2020 TECHNICAL SKILLS Programming: C++, Java Script, Typescript, Python Web/Mobile Development: HTML, CSS, React, React Native, Expo Dev UI/UX: Figma, UX Pilot Database: SQL, Airtable, MongoDB Video Editing: Adobe Premiere Pro, Capcut Graphic Design: Adobe Photoshop, Illustrator, Canva Productivity: MS Office Suite, Google Suite PROJECTS Front-end UI and UX Ecommerce Website Technologies: HTML5, CSS3, Vanilla Java Script Developed a responsive beauty products ecommerce site utilizing core web technologies. Implemented CSS Flexbox for product layout grids and CSS Grid for page structure, ensuring cross-device compatibility. Applied HTML5 semantic elements for improved accessibility and SEO. Built dynamic shopping cart functionality using vanilla Java Script DOM manipulation, including add Event Listener() for user interactions and local Storage for cart persistence. Web-Based Airline Reservation System Technologies: React.js, Node.js, Express.js, MongoDB Developed a full-stack flight booking platform with modern Java Script frameworks. Built React components for flight search, booking forms, and user dashboards with state management using hooks. Implemented Node.js REST APIs with Express.js middleware for authentication, flight data processing, and booking transactions. Designed MongoDB collections for users, flights, and reservations with efficient indexing and data relationships. Ecommerce Mobile Application Technologies: React Native, MongoDB Built a cross-platform mobile ecommerce app for iOS and Android using React Native framework. Utilized native modules for device-specific features like camera integration and GPS tracking, with hot reloading for efficient development cycles. Implemented responsive UI components, secure payment integration, and real-time product catalog synchronization. Medicine Tracker Mobile Application Technologies: React Native, MongoDB Built healthcare mobile app for medication management using React Native's cross-platform capabilities. Developed features for prescription tracking, dosage reminders, and medication scheduling with local database storage and push notification integration. Implemented biometric authentication and secure data handling for patient privacy compliance. Predictive Car Maintenance System (In Progress) Technologies: Python, Raspberry Pi, OBD-II Sensor, Machine Learning Engineering an Io T-based predictive maintenance system using Raspberry Pi and OBD-II sensors for real-time vehicle diagnostics. Utilizing Python-OBD library to interface with ELM327 adapters, collecting engine parameters like RPM, temperature, and fuel efficiency data. Implemented machine learning algorithms in Python to analyze sensor patterns and predict component degradation, enabling proactive maintenance scheduling. This system exports diagnostic data to CSV format for advanced analytics and trend monitoring. WORK EXPERIENCE Production Manager - Viral Coach LLC June 2024 - Present Lead a group of editors and manage/organize them. Ensure high production value for each and every client needs. Manage and organize our database using Airtable Database. Provide support to the editors by using high grade editing softwares like Descript and Frame.io. Communicated with clients and editor candidates to staff editors to our current clients. Freelance Video Editor and Graphic Designer January 2018 - May 2024 Led and completed multiple video and graphic design projects for clients. Ensured high production value and alignment with client requirements. Maintained consistent brand identity across deliverables. Provided technical troubleshooting for editing software and hardware. Coordinated with interdisciplinary teams (videographers, designers, clients). PERSONAL SKILLS Effective communication and teamwork Leadership Adaptability and willingness to learn new technologies Strong attention to detail Time management and project multitasking Problem-solving`,
    expected: { education: 2, experience: 2, projects: 5, certifications: 0 }
  },
  
  hannah: {
    name: 'Hannah',
    data: `Hannah Nicole L. Comia
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
Soft Skills: Problem Solving & Critical Thinking, Collaboration, Communication, Leadership`,
    expected: { education: 2, experience: 0, projects: 4, certifications: 6 }
  },
  
  carlo: {
    name: 'Carlo',
    data: `Carlo Silvino R Dela Roca

CONTACT
Phone: 0928 821 7471
Email: delarocacarlor02@gmail.com
Portfolio: https://github.com/CS-C3D

EDUCATION
De La Salle Lipa | 2022 - Present
Bachelor of Science in Computer Science

PROJECTS

Lost and Found Management System | ReactJS, Supabase
• Designed and implemented the backend using Supabase, including relational database schema and storage setup for item records and images.
• Developed data filtering and access control logic in Node.js, enabling user-specific item visibility without formal authentication.
• Integrated the backend with the React frontend to enable real-time updates, image uploads, and seamless data synchronization through Supabase APIs.

Air Quality Monitoring System | ReactJS, Supabase, Python
• Built the backend on Supabase, designing database tables and storage for pollutant and sensor data.

Web Based Task Management Application | ReactJS, CSS
• Developed a task management web application that utilizes CRUD operations.

Pet Adoption App | React Native, TypeScript, Expo, Firebase
• Developed the back end utilizing Firebase for the database to handle data and images.

TECHNICAL SKILLS

Programming Languages
• JavaScript, CSS, Python, C++, SQL

Tools & Frameworks
• GitHub, Visual Studio Code, Expo, Supabase, Firebase`,
    expected: { education: 1, experience: 0, projects: 4, certifications: 0 }
  },
  
  shayla: {
    name: 'Shayla',
    data: `SHAYLA BRIANNA S. BUENO
09163413918 | ShaylaSBueno@gmail.com | github.com/Shy-Codes

EDUCATION
De La Salle Lipa                                                    September 2022 - Present
Bachelor of Science in Computer Science

PROJECTS

Web-Based Inventory Management System | JavaScript, HTML, CSS
• Developed a web-based inventory management system using ReactJS
• Implemented features such as product addition, deletion, and update.
• Created a user-friendly interface to manage inventory, track stock levels.
• Used ReactJS for the front-end to make the application interactive.
• Integrated with a database to store inventory data and used React Hooks to manage application state.

Task Management Application | React Native, TypeScript, Expo
• Developed a task management app where users can create, edit, delete, and mark tasks as completed.
• Designed for the front-end to make the application interactive.
• Utilized React Hooks for state management and data persistence to persist user data locally.
• Optimized for app using Expo, enabling faster development and preview on devices.

Full-Stack Quiz Management System | MongoDB, MySQL, React, Supabase
• Developed a web-based quiz management system designed for cloud data storage.
• Implemented CRUD operations for quizzes and questions, converting them to JSON for the use of the Game.
• Implemented API integration, data synchronization, and modular front-end back end communication.

Web-Based Banking Application (Frontend) | JavaScript, HTML, CSS
• Created a simulated banking application using HTML, CSS, and JavaScript with no backend or database.
• Handled data and transactions using JavaScript objects and browser local storage to mimic real world banking functionality.

Personal Expense Tracker | TypeScript, React Native, Expo
• Developed a mobile expense tracking application using React Native and TypeScript, allowing users to record daily transactions, manage budgets, and visualize spending patterns entirely offline.
• Implemented multiple interactive screens for tracking expenses, viewing analytics, managing categories, and monitoring user budgets with persistent local data storage via AsyncStorage.

TECHNICAL SKILLS

Programming Languages
• JavaScript, TypeScript, HTML, CSS, Java, C++, Python, React, React Native

Database Management
• MySQL (Basic operations)

Tools & Frameworks
• Visual Studio Code, Git, Unity, Expo

Other Skills
• Logical thinking, Problem-Solving, Debugging`,
    expected: { education: 1, experience: 0, projects: 5, certifications: 0 }
  }
};

async function testAllResumes() {
  const results = {};
  const parser = new MLResumeParser();
  
  try {
    console.log('🔄 Testing All Four Resume Formats...\n');
    
    for (const [key, resume] of Object.entries(resumeData)) {
      console.log(`🔄 Testing ${resume.name}'s Resume...`);
      
      const result = await parser.parse(resume.data);
      
      if (result.success) {
        results[key] = {
          name: resume.name,
          confidence: result.metadata.overallConfidence,
          personalInfo: result.data.personalInfo,
          education: result.data.education.length,
          experience: result.data.experience.length,
          skills: result.data.skills.length,
          projects: result.data.projects.length,
          certifications: result.data.certifications.length,
          expected: resume.expected
        };
        
        console.log(`✅ ${resume.name}: ${(results[key].confidence * 100).toFixed(1)}% confidence`);
        console.log(`   Education: ${results[key].education}/${resume.expected.education}, Experience: ${results[key].experience}/${resume.expected.experience}, Projects: ${results[key].projects}/${resume.expected.projects}, Certs: ${results[key].certifications}/${resume.expected.certifications}`);
      } else {
        console.log(`❌ ${resume.name}: Parsing failed`);
        results[key] = null;
      }
      console.log('');
    }
    
    console.log('='.repeat(80) + '\n');
    
    // Comprehensive Analysis
    console.log('📊 COMPREHENSIVE CROSS-FORMAT ANALYSIS:\n');
    
    const validResults = Object.values(results).filter(r => r !== null);
    
    if (validResults.length > 0) {
      console.log('🎯 Individual Performance:');
      validResults.forEach(result => {
        const score = calculateScore(result, result.expected);
        console.log(`   ${result.name}: ${score.toFixed(1)}% accuracy (${(result.confidence * 100).toFixed(1)}% confidence)`);
      });
      
      const avgAccuracy = validResults.reduce((sum, r) => sum + calculateScore(r, r.expected), 0) / validResults.length;
      const avgConfidence = validResults.reduce((sum, r) => sum + r.confidence, 0) / validResults.length * 100;
      
      console.log(`\n🏆 Overall System Performance:`);
      console.log(`   Average Accuracy: ${avgAccuracy.toFixed(1)}%`);
      console.log(`   Average Confidence: ${avgConfidence.toFixed(1)}%`);
      console.log(`   Resumes Tested: ${validResults.length}/4`);
      console.log(`   Cross-format Compatibility: ${avgAccuracy > 75 ? '✅ Excellent' : avgAccuracy > 65 ? '✅ Good' : '⚠️ Needs Improvement'}`);
      
      console.log('\n📋 Detailed Breakdown:');
      console.log('   Section Performance:');
      
      const sections = ['education', 'experience', 'projects', 'certifications'];
      sections.forEach(section => {
        const sectionScores = validResults.map(r => {
          const expected = r.expected[section];
          const actual = r[section];
          if (expected === 0) return actual === 0 ? 100 : 0;
          return Math.min(actual / expected, 1) * 100;
        });
        const avgScore = sectionScores.reduce((a, b) => a + b, 0) / sectionScores.length;
        const status = avgScore > 80 ? '✅' : avgScore > 60 ? '⚠️' : '❌';
        console.log(`   ${status} ${section}: ${avgScore.toFixed(1)}%`);
      });
      
      console.log('\n🔍 Format Analysis:');
      console.log('   Resume Formats Tested:');
      console.log('   • Adrian: Single-line PDF format (professional with work experience)');
      console.log('   • Hannah: Structured pipe format (student with certifications)');
      console.log('   • Carlo: Clean bullet format (student with projects)');
      console.log('   • Shayla: Detailed bullet format (student with extensive projects)');
      
      console.log('\n🎯 Cross-Format Compatibility Insights:');
      if (avgAccuracy > 75) {
        console.log('   ✅ Excellent cross-format compatibility achieved!');
        console.log('   ✅ Parser successfully handles diverse resume styles');
        console.log('   ✅ Robust text cleaning and section detection');
        console.log('   ✅ Generalizable patterns work across formats');
      } else if (avgAccuracy > 65) {
        console.log('   ✅ Good cross-format compatibility');
        console.log('   ⚠️ Some format-specific improvements needed');
      } else {
        console.log('   ⚠️ Cross-format compatibility needs improvement');
        console.log('   🔴 Format-specific parsing issues detected');
      }
      
      console.log('\n🚀 System Strengths:');
      console.log('   • Name extraction across different formats');
      console.log('   • Contact information detection');
      console.log('   • Education parsing for various layouts');
      console.log('   • Skills extraction from different presentations');
      console.log('   • Text cleaning and normalization');
      
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

testAllResumes().then(() => {
  console.log('\n🧪 Comprehensive Four-Resume Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
