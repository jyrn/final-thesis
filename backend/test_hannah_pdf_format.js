/**
 * Test Hannah's Actual PDF Format (from server logs)
 */

const CertificationsParser = require('./services/parsers/CertificationsParser');

// This is the actual format from the server logs
const hannahPdfCertText = `and Seminars Student Mobility Programme | Universiti Teknologi Petronas, Malaysia April2025 Google UX Design Issuedby Google) June2025 Preparing Data for Analysis with Microsoft Excel | Coursera (Issuedby Microsoft) June2025 Harnessing the Power of Data with PowerBI | Coursera (Issuedby Microsoft) June2025 Introduction to Data Science | Cisco Networking Academy October2025 English Certificate (C2Proficient, Score:80/100) | EFSET October2025 Skillsand Abilities Design&Prototyping: Figma, User-Centered Design, Wireframing, Prototyping Web Development: HTML, CSS, React, React Native, TypeScript, Firebase, MongoDB, Cloud, GitHub Automation&Data: UiPath, Microsoft Excel, Data Cleansing Soft`;

console.log('🔍 Testing Hannah\'s Actual PDF Certification Format...\n');

console.log('📄 PDF Certification text:');
console.log(`   Length: ${hannahPdfCertText.length}`);
console.log(`   Text: "${hannahPdfCertText}"`);

console.log('\n🧪 Testing CertificationsParser...');
const parser = new CertificationsParser();

// Test the parseBulletFormat method directly
const result = parser.parseBulletFormat(hannahPdfCertText);

console.log('\n📋 Parser Results:');
console.log(`   Certifications found: ${result.data.length}`);
console.log(`   Expected: 6 certifications`);

result.data.forEach((cert, i) => {
  const name = typeof cert === 'object' ? cert.name : cert;
  const issuer = typeof cert === 'object' ? cert.issuer : 'Unknown';
  const date = typeof cert === 'object' ? cert.date : 'Unknown';
  console.log(`   ${i + 1}. "${name}"`);
  console.log(`      Issuer: "${issuer}"`);
  console.log(`      Date: "${date}"`);
});

console.log('\n🎯 Expected Certifications:');
console.log('   1. Student Mobility Programme');
console.log('   2. Google UX Design');
console.log('   3. Preparing Data for Analysis with Microsoft Excel');
console.log('   4. Harnessing the Power of Data with PowerBI');
console.log('   5. Introduction to Data Science');
console.log('   6. English Certificate (C2 Proficient, Score: 80/100)');

console.log('\n🧪 PDF Format Test Complete!');
