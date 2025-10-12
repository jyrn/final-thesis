/**
 * Test Education Description Extraction
 */

const EducationParser = require('./services/parsers/EducationParser');

const hannahEducationText = `De La Salle Lipa,
Bachelor of Science in Computer Science
2022 - Present Second Honor Awardee (
GPA: 3.53), 3rd Year - First Semester, AY
2024 - 2025 San Pablo Colleges, Senior High School
2020 - 2022 Strand: Science, Technology, Engineering, and Mathematics (STEM) Graduated with Honor (
General Average: 93.75)`;

console.log('🎓 Testing Education Description Extraction...\n');

console.log('📄 Education text:');
console.log(hannahEducationText);

console.log('\n🧪 Testing EducationParser...');
const parser = new EducationParser();

// Create a full resume text with education section
const fullResumeText = `EDUCATION
${hannahEducationText}

SKILLS
JavaScript, React`;

// Test the parsing with the full resume text
const result = parser.parse(fullResumeText);

console.log('\n📋 Parser Results:');
console.log(`   Education entries found: ${result.data.length}`);

result.data.forEach((edu, i) => {
  console.log(`\n   ${i + 1}. ${edu.school}`);
  console.log(`      Degree: "${edu.degree}"`);
  console.log(`      Period: ${edu.startDate} - ${edu.endDate}`);
  console.log(`      GPA: "${edu.gpa}"`);
  console.log(`      Description: "${edu.description}"`);
});

console.log('\n🎯 Expected De La Salle Lipa Description:');
console.log('   "Second Honor Awardee (GPA: 3.53), 3rd Year - First Semester, AY 2024-2025"');

console.log('\n🧪 Education Description Test Complete!');
