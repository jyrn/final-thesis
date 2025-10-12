/**
 * Test Specific Issues from Terminal Output
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');

console.log('🧪 Testing Specific Issues from Terminal...\n');

// Extract the specific problematic phrases from the terminal output
const problematicPhrases = [
  'forPESOLipa',
  'Developedaweb-basedplatformthatapplies',
  'withfeatureslikemedicationreminders',
  'improvingusabilityandenhancingday-to-daylifeforelderlyandimpairedusers',
  'Builtaweb-basedinventorysystemwithCRUDoperations',
  'enablingefficient itemtrackingacrossdifferentcategories',
  'Automatedthemanualgradecomputationprocessusing',
  'Thisreducedcomputationtimeandeliminatedhumanerrorsingradeencoding'
];

try {
  const textCleaner = new ResumeTextCleaner();
  
  console.log('🔍 Testing individual problematic phrases:');
  
  for (const phrase of problematicPhrases) {
    console.log(`\nOriginal: "${phrase}"`);
    
    // Test the full cleaning process
    const result = textCleaner.cleanResumeText(phrase);
    console.log(`Cleaned:  "${result.cleanedText}"`);
    
    // Test just the concatenated word fixes
    const concatResult = textCleaner.fixConcatenatedWords(phrase);
    console.log(`Concat:   "${concatResult.text}" (${concatResult.fixesApplied} fixes)`);
  }
  
  console.log('\n📊 Summary of fixes needed:');
  console.log('- forPESOLipa → for PESO Lipa');
  console.log('- Developedaweb-based → Developed a web-based');
  console.log('- withfeatureslike → with features like');
  console.log('- improvingusability → improving usability');
  console.log('- enhancingday-to-day → enhancing day-to-day');
  console.log('- lifeforelderlyand → life for elderly and');
  console.log('- impairedusers → impaired users');
  console.log('- Builtaweb-based → Built a web-based');
  console.log('- enablingefficient → enabling efficient');
  console.log('- itemtrackingacross → item tracking across');
  console.log('- differentcategories → different categories');
  console.log('- Automatedthemanual → Automated the manual');
  console.log('- gradecomputationprocess → grade computation process');
  console.log('- processusing → process using');
  console.log('- Thisreduced → This reduced');
  console.log('- computationtime → computation time');
  console.log('- andeliminated → and eliminated');
  console.log('- humanerrors → human errors');
  console.log('- gradeencoding → grade encoding');
  
} catch (error) {
  console.error('❌ Test failed:', error.message);
  console.error(error.stack);
}

console.log('\n🧪 Test Complete!');
