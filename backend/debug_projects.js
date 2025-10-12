/**
 * Debug Hannah's Project Detection
 */

const ProjectsParser = require('./services/parsers/ProjectsParser');
const BaseParser = require('./services/parsers/BaseParser');

const hannahProjectsText = `NLP-Based Recruitment System for PESO Lipa | React, Node.js, Express, MongoDB, Cloud
Developed a web-based platform that applies Natural Language Processing (TF-IDF and cosine similarity) to analyze and match job seekers with relevant job posts, improving the accuracy and efficiency of the employment process.

Digital Companion App for the Elderly and Visually Impaired | Figma
Designed accessible mobile interfaces in Figma with features like medication reminders and emergency alerts, improving usability and enhancing day-to-day life for elderly and impaired users.

Inventory Management System | React, JavaScript, HTML, CSS
Built a web-based inventory system with CRUD operations, search, sorting, and validation features, enabling efficient inventory tracking across different categories.

Grade Computation and Email Automation | UiPath, Microsoft Excel
Automated the manual grade computation process using UiPath RPA to calculate student grades in Excel and send results via email. This reduced computation time and eliminated human error in grade encoding.`;

console.log('🔍 Debugging Hannah\'s Project Detection...\n');

console.log('📄 Projects text:');
console.log(hannahProjectsText);
console.log('\n📊 Text analysis:');
console.log(`   Length: ${hannahProjectsText.length}`);
console.log(`   Lines: ${hannahProjectsText.split('\n').length}`);
console.log(`   Contains pipes: ${hannahProjectsText.includes('|')}`);
console.log(`   Pipe count: ${(hannahProjectsText.match(/\|/g) || []).length}`);

console.log('\n🧪 Testing regex patterns:');

// Test the pipe split regex
const pipeSplit = hannahProjectsText.split(/(?=^[A-Z][A-Za-z\s\-]+\s*\|)/m);
console.log(`   Pipe split results: ${pipeSplit.length} blocks`);
pipeSplit.forEach((block, i) => {
  console.log(`   Block ${i + 1}: "${block.substring(0, 50)}..."`);
});

// Test individual project lines
const lines = hannahProjectsText.split('\n').filter(l => l.trim().length > 0);
console.log(`\n📋 Individual lines (${lines.length}):`);
lines.forEach((line, i) => {
  const hasPipe = line.includes('|');
  const matches = line.match(/^[A-Z][A-Za-z\s\-]+\s*\|/);
  console.log(`   ${i + 1}. "${line.substring(0, 60)}..." | Pipe: ${hasPipe} | Matches: ${!!matches}`);
});

console.log('\n🚀 Testing ProjectsParser...');
const parser = new ProjectsParser();
const result = parser.parseStandard(hannahProjectsText);

console.log('📋 Parser Results:');
console.log(`   Projects found: ${result.data.length}`);
result.data.forEach((proj, i) => {
  console.log(`   ${i + 1}. Name: "${proj.name}"`);
  console.log(`      Tech: "${proj.technologies}"`);
});

console.log('\n🧪 Debug Complete!');
