/**
 * Test Current Text Spacing Issue
 * Tests the specific concatenated words from the terminal output
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');

console.log('🧪 Testing Current Text Spacing Issues...\n');

// Test the specific problematic text from the terminal
const problematicText = `Hannah Nicole L.Comia UI/UX DESIGNER San Pablo City, Laguna | 09610720526 |hannahnicolecomia16@gmail.com Linked In:www.linkedin.com/in/hannah-nicole-comia |Git Hub:github.com/xavvaa Education De La Salle Lipa,Bachelorof Sciencein Computer Science 2022-Present Second Honor Awardee(GPA:3.53),3rd Year-First Semester,AY2024-2025 San Pablo Colleges,Senior High School 2020-2022 Strand:Science,Technology,Engineering,and Mathematics(STEM) Graduatedwith Honor(General Average:93.75) Projects NLP-Based Recruitment Systemfor PESOLipa |React,Node.js,Express,Mongo DB,Cloud Developedaweb-basedplatformthatapplies Natural Language Processing(TF-IDFandcosinesimilarity)toanalyze andmatchjobseekerswithrelevantjobposts,improvingtheaccuracyandefficiencyoftheemploymentprocess. Digital Companion Appforthe Elderlyand Visually Impaired`;

console.log('Original problematic text sample:');
console.log(problematicText.substring(0, 200) + '...\n');

try {
  const textCleaner = new ResumeTextCleaner();
  const result = textCleaner.cleanResumeText(problematicText);
  
  console.log('✅ Text cleaning completed');
  console.log('Cleaned text sample:');
  console.log(result.cleanedText.substring(0, 200) + '...\n');
  
  console.log('🔍 Specific fixes check:');
  
  // Check specific problematic words
  const checks = [
    { original: 'Bachelorof Sciencein', expected: 'Bachelor of Science in' },
    { original: 'Systemfor PESOLipa', expected: 'System for PESO Lipa' },
    { original: 'Appforthe Elderlyand', expected: 'App for the Elderly and' },
    { original: 'Graduatedwith Honor', expected: 'Graduated with Honor' },
    { original: 'Developedaweb-based', expected: 'Developed a web-based' }
  ];
  
  for (const check of checks) {
    const hasOriginal = result.cleanedText.includes(check.original);
    const hasExpected = result.cleanedText.includes(check.expected);
    
    if (hasExpected) {
      console.log(`✅ "${check.original}" → "${check.expected}"`);
    } else if (hasOriginal) {
      console.log(`❌ "${check.original}" still present (not fixed)`);
    } else {
      console.log(`⚠️  Neither original nor expected found for: "${check.original}"`);
    }
  }
  
  console.log('\n📊 Cleaning statistics:');
  console.log('Original length:', result.metadata.originalLength);
  console.log('Cleaned length:', result.metadata.cleanedLength);
  console.log('Reduction:', result.metadata.reductionPercentage + '%');
  console.log('Steps applied:', result.metadata.cleaningSteps.length);
  
} catch (error) {
  console.error('❌ Text cleaning test failed:', error.message);
  console.error(error.stack);
}

console.log('\n🔧 Testing individual concatenated word fixes:');

try {
  const textCleaner = new ResumeTextCleaner();
  
  const testWords = [
    'Bachelorof',
    'Sciencein', 
    'Systemfor',
    'Appforthe',
    'Elderlyand',
    'Graduatedwith',
    'Developedaweb'
  ];
  
  for (const word of testWords) {
    const result = textCleaner.fixConcatenatedWords(word);
    console.log(`"${word}" → "${result.text}" (${result.fixesApplied} fixes)`);
  }
  
} catch (error) {
  console.error('❌ Individual word test failed:', error.message);
}

console.log('\n🧪 Test Complete!');
