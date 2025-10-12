/**
 * Test Carlo's Resume Data - Extracted from Resume Image
 */

const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing Carlo\'s Resume Data...\n');

// Carlo's resume data extracted from the image
const carloResumeData = `Carlo Silvino R Dela Roca

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
• GitHub, Visual Studio Code, Expo, Supabase, Firebase`;

async function testCarloResume() {
  try {
    console.log('📄 Carlo\'s Resume Analysis:');
    console.log(`   Length: ${carloResumeData.length} characters`);
    console.log(`   Lines: ${carloResumeData.split('\n').length}`);
    console.log(`   First 200 chars: "${carloResumeData.substring(0, 200)}..."`);
    
    console.log('\n🤖 Testing parsing...');
    const parser = new MLResumeParser();
    const result = await parser.parse(carloResumeData);
    
    if (result.success) {
      console.log('\n✅ Carlo\'s Resume Parsing Results:');
      console.log(`   Overall Confidence: ${(result.metadata.overallConfidence * 100).toFixed(1)}%`);
      console.log(`   Format Detected: ${result.metadata.formatClassification?.format || 'Unknown'}`);
      
      console.log('\n👤 Personal Information:');
      console.log(`   Name: ${result.data.personalInfo.firstName} ${result.data.personalInfo.lastName}`);
      console.log(`   Email: ${result.data.personalInfo.email}`);
      console.log(`   Phone: ${result.data.personalInfo.phone}`);
      console.log(`   Portfolio: ${result.data.personalInfo.website || result.data.personalInfo.github}`);
      
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
      console.log(`   Expected: 4 projects (Lost and Found, Air Quality, Task Management, Pet Adoption)`);
      result.data.projects.forEach((proj, i) => {
        console.log(`   ${i + 1}. ${proj.name}`);
        console.log(`      Technologies: ${proj.technologies}`);
      });
      
      console.log('\n💡 Skills:');
      console.log(`   Skills found: ${result.data.skills.length}`);
      console.log(`   Sample skills: ${result.data.skills.slice(0, 10).join(', ')}...`);
      
      console.log('\n🎓 Certifications:');
      console.log(`   Certifications found: ${result.data.certifications.length}`);
      console.log(`   Expected: 0 certifications (Carlo has no certificates)`);
      
      console.log('\n📊 Confidence Breakdown:');
      Object.entries(result.metadata.confidenceScores).forEach(([section, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.7 ? '✅' : score > 0.4 ? '⚠️' : '❌';
        console.log(`   ${status} ${section}: ${percentage}%`);
      });
      
      console.log('\n🎯 Expected vs Actual:');
      console.log('   Expected Data:');
      console.log('   - Name: Carlo Silvino R Dela Roca');
      console.log('   - Education: 1 entry (De La Salle Lipa)');
      console.log('   - Experience: 0 entries (student, no work experience)');
      console.log('   - Projects: 4 projects');
      console.log('   - Certifications: 0 certifications');
      console.log('   - Skills: Programming languages and tools');
      
      console.log('\n   Actual Results:');
      console.log(`   - Name: ${result.data.personalInfo.firstName} ${result.data.personalInfo.lastName}`);
      console.log(`   - Education: ${result.data.education.length} entries`);
      console.log(`   - Experience: ${result.data.experience.length} entries`);
      console.log(`   - Projects: ${result.data.projects.length} projects`);
      console.log(`   - Certifications: ${result.data.certifications.length} certifications`);
      console.log(`   - Skills: ${result.data.skills.length} skills`);
      
      const educationMatch = result.data.education.length >= 1 ? '✅' : '❌';
      const experienceMatch = result.data.experience.length === 0 ? '✅' : '❌';
      const projectsMatch = result.data.projects.length >= 3 ? '✅' : '❌';
      const certificationsMatch = result.data.certifications.length === 0 ? '✅' : '❌';
      
      console.log('\n   Match Quality:');
      console.log(`   ${educationMatch} Education: ${result.data.education.length >= 1 ? 'Good' : 'Needs improvement'}`);
      console.log(`   ${experienceMatch} Experience: ${result.data.experience.length === 0 ? 'Correct (no work experience)' : 'False positive detected'}`);
      console.log(`   ${projectsMatch} Projects: ${result.data.projects.length >= 3 ? 'Good' : 'Needs improvement'}`);
      console.log(`   ${certificationsMatch} Certifications: ${result.data.certifications.length === 0 ? 'Correct (no certificates)' : 'False positive detected'}`);
      
    } else {
      console.log('❌ Parsing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testCarloResume().then(() => {
  console.log('\n🧪 Carlo Resume Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
