/**
 * Test Comma Fix Specifically
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');

console.log('🧪 Testing Comma Fix Specifically...\n');

const commaTests = [
  // From the terminal output
  'operations,search,sorting,andvalidation',
  'search,sorting,and',
  'HTML,CSS,JavaScript,andReact',
  'design,development,testing,anddeployment',
  'React,Node.js,Express,MongoDB',
  'features,enablingefficient',
  'alerts,improvingusability',
  
  // More realistic examples
  'JavaScript,Python,Java,andC++',
  'planning,execution,testing,andmaintenance',
  'frontend,backend,database,anddeployment',
  'analysis,design,implementation,andtesting'
];

try {
  const textCleaner = new ResumeTextCleaner();
  
  console.log('🔍 Testing comma-separated concatenations:');
  
  for (let i = 0; i < commaTests.length; i++) {
    const text = commaTests[i];
    console.log(`\n${i + 1}. Original: "${text}"`);
    
    const result = textCleaner.cleanResumeText(text);
    console.log(`   Cleaned:  "${result.cleanedText}"`);
    
    // Check specific improvements
    const hasProperCommaSpacing = result.cleanedText.includes(', ');
    const fixedAndWords = !result.cleanedText.includes('and') || result.cleanedText.includes(' and ');
    const improved = result.cleanedText !== text;
    
    console.log(`   ${improved ? '✅' : '❌'} Improved: ${improved}`);
    console.log(`   ${hasProperCommaSpacing ? '✅' : '❌'} Comma spacing: ${hasProperCommaSpacing}`);
    console.log(`   ${fixedAndWords ? '✅' : '❌'} "and" words: ${fixedAndWords}`);
  }
  
  console.log('\n📊 Summary:');
  console.log('The comma fixes should:');
  console.log('1. Add spaces after commas: "word1,word2" → "word1, word2"');
  console.log('2. Fix "and" concatenations: "andword" → "and word"');
  console.log('3. Handle complex lists: "a,b,andword" → "a, b, and word"');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
}

console.log('\n🧪 Test Complete!');
