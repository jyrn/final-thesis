/**
 * Test Karl's Resume Data
 */

const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing Karl\'s Resume Data...\n');

// Karl's resume data - add your actual resume text here
const karlResumeData = `KARL ADRIAN M. SANTOS
09123456789 | karlsantos@gmail.com | github.com/karl-dev

EDUCATION
De La Salle Lipa                                                    September 2022 - Present
Bachelor of Science in Computer Science
GPA: 3.65

PROJECTS

E-Commerce Platform | React, Node.js, MongoDB, Express
• Developed a full-stack e-commerce web application with user authentication and product management.
• Implemented shopping cart functionality with real-time inventory tracking.
• Integrated payment gateway using Stripe API for secure transactions.
• Built RESTful APIs for product catalog, user management, and order processing.

Mobile Fitness Tracker | React Native, Firebase, TypeScript
• Created a cross-platform mobile app for tracking workouts and nutrition.
• Implemented real-time data synchronization using Firebase Realtime Database.
• Designed intuitive UI/UX with custom charts for progress visualization.
• Added social features allowing users to share achievements and compete with friends.

Student Portal System | PHP, MySQL, Bootstrap
• Built a comprehensive student information system for academic management.
• Developed modules for enrollment, grade viewing, and schedule management.
• Implemented role-based access control for students, faculty, and administrators.
• Created automated email notifications for important announcements.

Weather Forecast App | Python, Flask, OpenWeather API
• Developed a web application providing real-time weather data and forecasts.
• Integrated OpenWeather API for accurate meteorological information.
• Implemented location-based search with autocomplete functionality.
• Added data visualization using Chart.js for temperature and precipitation trends.

TECHNICAL SKILLS

Programming Languages
• JavaScript, TypeScript, Python, PHP, Java, C++, HTML, CSS

Frameworks & Libraries
• React, React Native, Node.js, Express.js, Flask, Bootstrap

Database Management
• MongoDB, MySQL, Firebase, PostgreSQL

Tools & Technologies
• Git, GitHub, VS Code, Postman, Docker, AWS

Other Skills
• RESTful API Design, Agile Development, Problem Solving, Team Collaboration

CERTIFICATIONS

AWS Certified Cloud Practitioner | Amazon Web Services                          March 2024
Meta Front-End Developer Certificate | Coursera (Issued by Meta)                January 2024
Python for Data Science | IBM (Coursera)                                        December 2023`;

async function testKarlResume() {
  try {
    console.log('📄 Karl\'s Resume Analysis:');
    console.log(`   Length: ${karlResumeData.length} characters`);
    console.log(`   Lines: ${karlResumeData.split('\n').length}`);
    console.log(`   First 200 chars: "${karlResumeData.substring(0, 200)}..."`);
    
    console.log('\n🤖 Testing parsing...');
    const parser = new MLResumeParser();
    const result = await parser.parse(karlResumeData);
    
    if (result.success) {
      console.log('\n✅ Karl\'s Resume Parsing Results:');
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
      console.log(`   Expected: 4 projects (E-Commerce, Fitness Tracker, Student Portal, Weather App)`);
      result.data.projects.forEach((proj, i) => {
        console.log(`   ${i + 1}. ${proj.name}`);
        console.log(`      Technologies: ${proj.technologies}`);
        if (proj.description) {
          console.log(`      Description: ${proj.description.substring(0, 100)}...`);
        }
      });
      
      console.log('\n💡 Skills:');
      console.log(`   Skills found: ${result.data.skills.length}`);
      console.log(`   Sample skills: ${result.data.skills.slice(0, 10).join(', ')}...`);
      
      console.log('\n🎓 Certifications:');
      console.log(`   Certifications found: ${result.data.certifications.length}`);
      console.log(`   Expected: 3 certifications (AWS, Meta Front-End, Python for Data Science)`);
      result.data.certifications.forEach((cert, i) => {
        console.log(`   ${i + 1}. ${cert.name}`);
        if (cert.issuer) console.log(`      Issuer: ${cert.issuer}`);
        if (cert.date) console.log(`      Date: ${cert.date}`);
      });
      
      console.log('\n📊 Confidence Breakdown:');
      Object.entries(result.metadata.confidenceScores).forEach(([section, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.7 ? '✅' : score > 0.4 ? '⚠️' : '❌';
        console.log(`   ${status} ${section}: ${percentage}%`);
      });
      
      console.log('\n🎯 Expected vs Actual:');
      console.log('   Expected Data:');
      console.log('   - Name: Karl Adrian M. Santos');
      console.log('   - Education: 1 entry (De La Salle Lipa)');
      console.log('   - Experience: 0 entries (student, no work experience)');
      console.log('   - Projects: 4 projects');
      console.log('   - Certifications: 3 certifications');
      console.log('   - Skills: Programming languages, frameworks, databases, tools');
      
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
      const certificationsMatch = result.data.certifications.length >= 3 ? '✅' : '❌';
      
      console.log('\n   Match Quality:');
      console.log(`   ${educationMatch} Education: ${result.data.education.length >= 1 ? 'Good' : 'Needs improvement'}`);
      console.log(`   ${experienceMatch} Experience: ${result.data.experience.length === 0 ? 'Correct (no work experience)' : 'False positive detected'}`);
      console.log(`   ${projectsMatch} Projects: ${result.data.projects.length >= 4 ? 'Good' : 'Needs improvement'}`);
      console.log(`   ${certificationsMatch} Certifications: ${result.data.certifications.length >= 3 ? 'Good' : 'Needs improvement'}`);
      
    } else {
      console.log('❌ Parsing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testKarlResume().then(() => {
  console.log('\n🧪 Karl Resume Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
