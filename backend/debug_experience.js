/**
 * Debug Adrian's Experience Detection
 */

const ExperienceParser = require('./services/parsers/ExperienceParser');

const adrianExperienceText = `Production Manager - Viral Coach LLC
June
2024 - Present Lead a group of editors and manage/organize them. Ensure high production value for each and every client needs. Manage and organize our database using Airtable Database. Provide support to the editors by using high grade editing softwares like Descript and Frame.io. Communicated with clients and editor candidates to staff editors to our current clients. Freelance Video Editor and Graphic Designer January 2018 - May 2024 Led and completed multiple video and graphic design projects for clients. Ensured high production value and alignment with client requirements. Maintained consistent brand identity across deliverables. Provided technical troubleshooting for editing software and hardware. Coordinated with interdisciplinary teams (videographers, designers, clients).`;

console.log('🔍 Debugging Adrian\'s Experience Detection...\n');

console.log('📄 Experience text:');
console.log(adrianExperienceText);
console.log('\n📊 Text analysis:');
console.log(`   Length: ${adrianExperienceText.length}`);
console.log(`   Lines: ${adrianExperienceText.split('\n').length}`);

console.log('\n🧪 Testing ExperienceParser patterns directly...');
const parser = new ExperienceParser();

// Test the patterns directly on the experience text
const experience = [];

// Pattern 1: "Job Title - Company Name\nDate Range"
const pattern1 = /([A-Z][A-Za-z\s]+(?:Intern|Assistant|Developer|Analyst|Manager|Director|Engineer|Specialist|Coordinator|Editor|Designer))\s*[-–]\s*([A-Z][A-Za-z\s&]+(?:Corp|Company|Solutions|Inc|LLC|Ltd))[^\n]*\s*\n?\s*([A-Z][a-z]+\s+\d{4})\s*-\s*([A-Z][a-z]+\s+\d{4}|Present|Current)/gi;

let match;
console.log('   Testing Pattern 1...');
while ((match = pattern1.exec(adrianExperienceText)) !== null) {
  console.log(`   Found match: "${match[0]}"`);
  console.log(`   Title: "${match[1]}", Company: "${match[2]}", Start: "${match[3]}", End: "${match[4]}"`);
  experience.push({
    title: match[1].trim(),
    company: match[2].trim(),
    startDate: match[3].trim(),
    endDate: match[4].trim()
  });
}

const result = { data: experience };

console.log('📋 Parser Results:');
console.log(`   Experiences found: ${result.data.length}`);
result.data.forEach((exp, i) => {
  console.log(`   ${i + 1}. Title: "${exp.title}"`);
  console.log(`      Company: "${exp.company}"`);
  console.log(`      Period: "${exp.startDate} - ${exp.endDate}"`);
  console.log(`      Description: "${exp.description ? exp.description.substring(0, 100) + '...' : 'None'}"`);
});

console.log('\n🔍 Looking for "Freelance" patterns...');
const freelanceMatches = adrianExperienceText.match(/Freelance[^.]*\./g);
console.log('   Freelance matches:', freelanceMatches);

const dateMatches = adrianExperienceText.match(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*-\s*([A-Z][a-z]+\s+\d{4}|Present|Current)/g);
console.log('   Date matches:', dateMatches);

console.log('\n🧪 Debug Complete!');
