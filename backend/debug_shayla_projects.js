/**
 * Debug Shayla's Project Detection
 */

const ProjectsParser = require('./services/parsers/ProjectsParser');

const shaylaProjectsText = `Web-Based Inventory Management System | JavaScript, HTML, CSS
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
• Implemented multiple interactive screens for tracking expenses, viewing analytics, managing categories, and monitoring user budgets with persistent local data storage via AsyncStorage.`;

console.log('🔍 Debugging Shayla\'s Project Detection...\n');

console.log('📄 Projects text:');
console.log(shaylaProjectsText);
console.log('\n📊 Text analysis:');
console.log(`   Length: ${shaylaProjectsText.length}`);
console.log(`   Lines: ${shaylaProjectsText.split('\n').length}`);
console.log(`   Contains pipes: ${shaylaProjectsText.includes('|')}`);

console.log('\n🧪 Testing different split patterns:');

// Test pipe split
const pipeSplit = shaylaProjectsText.split(/(?=^[A-Z][A-Za-z\s\-]+\s*\|)/m);
console.log(`   Pipe split: ${pipeSplit.length} blocks`);

// Test project title split
const projectTitleSplit = shaylaProjectsText.split(/(?=^[A-Z][A-Za-z\s\-]+(?:System|Application|App|Management|Tracker|Platform|Tool|Website|Project)\s*[\|\•])/m);
console.log(`   Project title split: ${projectTitleSplit.length} blocks`);

// Test paragraph split
const paragraphSplit = shaylaProjectsText.split(/\n\s*\n/);
console.log(`   Paragraph split: ${paragraphSplit.length} blocks`);

console.log('\n📋 Paragraph blocks:');
paragraphSplit.forEach((block, i) => {
  const lines = block.split('\n');
  const firstLine = lines[0].trim();
  console.log(`   Block ${i + 1}: "${firstLine}"`);
  console.log(`      Lines: ${lines.length}, Length: ${block.length}`);
});

console.log('\n🚀 Testing ProjectsParser...');
const parser = new ProjectsParser();
const result = parser.parseStandard(shaylaProjectsText);

console.log('📋 Parser Results:');
console.log(`   Projects found: ${result.data.length}`);
result.data.forEach((proj, i) => {
  console.log(`   ${i + 1}. Name: "${proj.name}"`);
  console.log(`      Tech: "${proj.technologies}"`);
});

console.log('\n🧪 Debug Complete!');
