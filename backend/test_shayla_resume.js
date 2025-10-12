/**
 * Test Shayla's Resume Data - Extracted from Resume Image
 */

const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing Shayla\'s Resume Data...\n');

// Shayla's resume data extracted from the image
const shaylaResumeData = `SHAYLA BRIANNA S. BUENO
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
• Logical thinking, Problem-Solving, Debugging`;

async function testShaylaResume() {
  try {
    console.log('📄 Shayla\'s Resume Analysis:');
    console.log(`   Length: ${shaylaResumeData.length} characters`);
    console.log(`   Lines: ${shaylaResumeData.split('\n').length}`);
    console.log(`   First 200 chars: "${shaylaResumeData.substring(0, 200)}..."`);
    
    console.log('\n🤖 Testing parsing...');
    const parser = new MLResumeParser();
    const result = await parser.parse(shaylaResumeData);
    
    if (result.success) {
      console.log('\n✅ Shayla\'s Resume Parsing Results:');
      console.log(`   Overall Confidence: ${(result.metadata.overallConfidence * 100).toFixed(1)}%`);
      console.log(`   Format Detected: ${result.metadata.formatClassification?.format || 'Unknown'}`);
      
      console.log('\n👤 Personal Information:');
      console.log(`   Name: ${result.data.personalInfo.firstName} ${result.data.personalInfo.lastName}`);
      console.log(`   Email: ${result.data.personalInfo.email}`);
      console.log(`   Phone: ${result.data.personalInfo.phone}`);
      console.log(`   GitHub: ${result.data.personalInfo.github}`);
      
      console.log('\n🎓 Education:');
      console.log(`   Entries found: ${result.data.education.length}`);
      result.data.education.forEach((edu, i) => {
        console.log(`   ${i + 1}. ${edu.school}`);
        console.log(`      Degree: ${edu.degree}`);
        console.log(`      Period: ${edu.startDate} - ${edu.endDate}`);
      });
      
      console.log('\n💼 Work Experience:');
      console.log(`   Entries found: ${result.data.experience.length}`);
      result.data.experience.forEach((exp, i) => {
        console.log(`   ${i + 1}. ${exp.title} at ${exp.company}`);
        console.log(`      Period: ${exp.startDate} - ${exp.endDate}`);
      });
      
      console.log('\n🚀 Projects:');
      console.log(`   Projects found: ${result.data.projects.length}`);
      console.log(`   Expected: 5 projects (Inventory Management, Task Management, Quiz System, Banking App, Expense Tracker)`);
      result.data.projects.forEach((proj, i) => {
        console.log(`   ${i + 1}. ${proj.name}`);
        console.log(`      Technologies: ${proj.technologies}`);
      });
      
      console.log('\n💡 Skills:');
      console.log(`   Skills found: ${result.data.skills.length}`);
      console.log(`   Sample skills: ${result.data.skills.slice(0, 10).join(', ')}...`);
      
      console.log('\n🎓 Certifications:');
      console.log(`   Certifications found: ${result.data.certifications.length}`);
      console.log(`   Expected: 0 certifications (Shayla has no certificates)`);
      
      console.log('\n📊 Confidence Breakdown:');
      Object.entries(result.metadata.confidenceScores).forEach(([section, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.7 ? '✅' : score > 0.4 ? '⚠️' : '❌';
        console.log(`   ${status} ${section}: ${percentage}%`);
      });
      
      console.log('\n🎯 Expected vs Actual:');
      console.log('   Expected Data:');
      console.log('   - Name: Shayla Brianna S. Bueno');
      console.log('   - Education: 1 entry (De La Salle Lipa)');
      console.log('   - Experience: 0 entries (student, no work experience)');
      console.log('   - Projects: 5 projects');
      console.log('   - Certifications: 0 certifications');
      console.log('   - Skills: Programming languages, database, tools');
      
      console.log('\n   Actual Results:');
      console.log(`   - Name: ${result.data.personalInfo.firstName} ${result.data.personalInfo.lastName}`);
      console.log(`   - Education: ${result.data.education.length} entries`);
      console.log(`   - Experience: ${result.data.experience.length} entries`);
      console.log(`   - Projects: ${result.data.projects.length} projects`);
      console.log(`   - Certifications: ${result.data.certifications.length} certifications`);
      console.log(`   - Skills: ${result.data.skills.length} skills`);
      
      const educationMatch = result.data.education.length >= 1 ? '✅' : '❌';
      const experienceMatch = result.data.experience.length === 0 ? '✅' : '❌';
      const projectsMatch = result.data.projects.length >= 4 ? '✅' : '❌';
      const certificationsMatch = result.data.certifications.length === 0 ? '✅' : '❌';
      
      console.log('\n   Match Quality:');
      console.log(`   ${educationMatch} Education: ${result.data.education.length >= 1 ? 'Good' : 'Needs improvement'}`);
      console.log(`   ${experienceMatch} Experience: ${result.data.experience.length === 0 ? 'Correct (no work experience)' : 'False positive detected'}`);
      console.log(`   ${projectsMatch} Projects: ${result.data.projects.length >= 4 ? 'Good' : 'Needs improvement'}`);
      console.log(`   ${certificationsMatch} Certifications: ${result.data.certifications.length === 0 ? 'Correct (no certificates)' : 'False positive detected'}`);
      
    } else {
      console.log('❌ Parsing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testShaylaResume().then(() => {
  console.log('\n🧪 Shayla Resume Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
