/**
 * Test Comma and Parenthesis Spacing Fixes
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');

console.log('🧪 Testing Comma and Parenthesis Spacing Fixes...\n');

const testCases = [
  // The specific example you mentioned
  'Strand:Science,Technology,Engineering, and Mathematics(STEM) Graduated with Honor(General Average:93.75)',
  
  // More comma inconsistency examples
  'Skills:JavaScript,Python,React, and Node.js',
  'Technologies:HTML,CSS,JavaScript, and TypeScript',
  'Languages:English,Filipino, and Spanish',
  
  // Parenthesis spacing issues
  'Bachelor of Science(Computer Science)',
  'GPA:3.53)3rd Year',
  'Award(Dean\'s List)Spring 2024',
  'Certificate(Google UX Design)',
  'Experience(5 years)Software Development',
  
  // Colon spacing issues
  'Education:Bachelor of Science',
  'Skills:Programming Languages',
  'Location:San Pablo City',
  
  // Mixed issues
  'Degree:Bachelor of Science in Computer Science(BSCS)Graduated with Honors(Magna Cum Laude)',
  'Skills:HTML,CSS,JavaScript,React, and Node.js(Full Stack Development)',
  'Award:Dean\'s List(Fall 2023)Academic Excellence'
];

try {
  const textCleaner = new ResumeTextCleaner();
  
  console.log('🔍 Testing comma and parenthesis fixes:');
  
  for (let i = 0; i < testCases.length; i++) {
    const text = testCases[i];
    console.log(`\n${i + 1}. Original:`);
    console.log(`   "${text}"`);
    
    const result = textCleaner.cleanResumeText(text);
    console.log(`   Cleaned:`);
    console.log(`   "${result.cleanedText}"`);
    
    // Check specific improvements
    const hasConsistentCommaSpacing = !result.cleanedText.match(/[a-zA-Z],[a-zA-Z]/);
    const hasProperParenthesisSpacing = !result.cleanedText.match(/[a-zA-Z]\(/) && !result.cleanedText.match(/\)[a-zA-Z]/);
    const hasProperColonSpacing = !result.cleanedText.match(/[a-zA-Z]:[a-zA-Z]/);
    const improved = result.cleanedText !== text;
    
    console.log(`   ${improved ? '✅' : '❌'} Improved: ${improved}`);
    console.log(`   ${hasConsistentCommaSpacing ? '✅' : '❌'} Consistent comma spacing: ${hasConsistentCommaSpacing}`);
    console.log(`   ${hasProperParenthesisSpacing ? '✅' : '❌'} Proper parenthesis spacing: ${hasProperParenthesisSpacing}`);
    console.log(`   ${hasProperColonSpacing ? '✅' : '❌'} Proper colon spacing: ${hasProperColonSpacing}`);
  }
  
  console.log('\n📊 Summary:');
  console.log('The fixes should handle:');
  console.log('1. Inconsistent comma spacing: "word1,word2, and word3" → "word1, word2, and word3"');
  console.log('2. Missing parenthesis spacing: "word(text)" → "word (text)"');
  console.log('3. Missing colon spacing: "label:value" → "label: value"');
  console.log('4. Combined issues in complex text');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}

console.log('\n🧪 Test Complete!');
