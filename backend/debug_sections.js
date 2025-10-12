/**
 * Debug Section Detection
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');

const adrianData = `ADRIAN LOUISE D. GALVEZ Balagtas, Bulacan, Philippines Email: adriangalvez2602@gmail.com | adrian_louise_galvez @dlsl.edu.ph Phone: +63 961 056 6734 |Github: Adrian G-26 OBJECTIVE Motivated Computer Science student seeking On-the-Job Training at UTP Malaysia to leverage technical and creative skills, contribute effectively in a real-world setting, and enhance professional capabilities through hands-on experience. EDUCA TION Bachelor of Science in Computer Science De La Salle Lipa, Batangas September 2022 - Present Senior High School Certificate, STEM Mapa University, Intramuros, Manila August 2018 - May 2020 TECHNICAL SKILLS Programming: C++, Java Script, Typescript, Python Web/Mobile Development: HTML, CSS, React, React Native, Expo Dev UI/UX: Figma, UX Pilot Database: SQL, Airtable, MongoDB Video Editing: Adobe Premiere Pro, Capcut Graphic Design: Adobe Photoshop, Illustrator, Canva Productivity: MS Office Suite, Google Suite PROJECTS Front-end UI and UX Ecommerce Website Technologies: HTML5, CSS3, Vanilla Java Script Developed a responsive beauty products ecommerce site utilizing core web technologies. Web-Based Airline Reservation System Technologies: React.js, Node.js, Express.js, MongoDB Developed a full-stack flight booking platform with modern Java Script frameworks. WORK EXPERIENCE Production Manager - Viral Coach LLC June 2024 - Present Lead a group of editors and manage/organize them.`;

console.log('🔍 Debugging Section Detection...\n');

const textCleaner = new ResumeTextCleaner();
const result = textCleaner.cleanResumeText(adrianData);

console.log('📄 Cleaned text structure:');
const lines = result.cleanedText.split('\n');
console.log(`Total lines: ${lines.length}\n`);

console.log('📋 All lines with numbers:');
lines.forEach((line, i) => {
  console.log(`${i + 1}: "${line}"`);
});

console.log('\n🔍 Looking for section headers:');
const sections = ['OBJECTIVE', 'EDUCATION', 'TECHNICAL SKILLS', 'PROJECTS', 'WORK EXPERIENCE'];
sections.forEach(section => {
  const found = lines.find(line => line.trim().toUpperCase().includes(section));
  if (found) {
    const lineIndex = lines.indexOf(found);
    console.log(`✅ ${section}: Found at line ${lineIndex + 1}: "${found}"`);
  } else {
    console.log(`❌ ${section}: Not found`);
  }
});

console.log('\n🧪 Debug Complete!');
