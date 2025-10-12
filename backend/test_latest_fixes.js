/**
 * Test Latest Fixes
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');

console.log('🧪 Testing Latest Fixes...\n');

const testCases = [
  'hannahnicolecomia16 @gmail.com',
  'Mo n goDB',
  'Po w erBI',
  'TF-IDFandcosinesimilarity',
  'toanalyze andmatchjobseekers',
  'Harnessingthe Power',
  'Introductionto Data Science',
  'Java Script and Type Script',
  'Git Hub and Fire base'
];

try {
  const textCleaner = new ResumeTextCleaner();
  
  console.log('🔍 Testing specific fixes:');
  
  for (const testCase of testCases) {
    const result = textCleaner.cleanResumeText(testCase);
    console.log(`"${testCase}" → "${result.cleanedText}"`);
  }
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}

console.log('\n🧪 Test Complete!');
