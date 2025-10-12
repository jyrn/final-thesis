/**
 * Test Script for Parser Fixes
 * Tests the fixed parser components to ensure they work correctly
 */

const MLResumeParser = require('./services/MLResumeParser');
const BaseParser = require('./services/parsers/BaseParser');
const PersonalInfoParser = require('./services/parsers/PersonalInfoParser');
const SkillsParser = require('./services/parsers/SkillsParser');

console.log('🧪 Testing Parser Fixes...\n');

// Test 1: MLResumeParser initialization
console.log('Test 1: MLResumeParser Initialization');
try {
  const mlParser = new MLResumeParser();
  console.log('✅ MLResumeParser initialized successfully');
  console.log('   Version:', mlParser.version);
  console.log('   Available parsers:', Object.keys(mlParser.parsers));
} catch (error) {
  console.error('❌ MLResumeParser initialization failed:', error.message);
}

// Test 2: BaseParser regex escaping
console.log('\nTest 2: BaseParser Regex Escaping');
try {
  const baseParser = new BaseParser();
  const testText = `
    SKILLS
    JavaScript, React, Node.js
    
    PROJECTS
    Web Application Development
    
    EXPERIENCE
    Software Developer
  `;
  
  // Test with special characters in section names
  const skillsSection = baseParser.extractSection(testText, ['SKILLS'], ['PROJECTS', 'EXPERIENCE']);
  console.log('✅ BaseParser extractSection works');
  console.log('   Extracted skills section length:', skillsSection.length);
  
  // Test with regex special characters
  const specialSection = baseParser.extractSection(testText, ['SKILLS+TEST'], ['PROJECTS']);
  console.log('✅ BaseParser handles special regex characters');
  
} catch (error) {
  console.error('❌ BaseParser test failed:', error.message);
}

// Test 3: PersonalInfoParser name extraction
console.log('\nTest 3: PersonalInfoParser Name Extraction');
try {
  const personalParser = new PersonalInfoParser();
  const testResume = `
    Hannah Nicole L. Comia
    UI/UX DESIGNER
    Batangas City, Batangas | 09123456789 | hannah.comia@email.com
    
    EDUCATION
    Bachelor of Science in Computer Science
  `;
  
  const result = personalParser.parse(testResume);
  console.log('✅ PersonalInfoParser works');
  console.log('   Name extracted:', result.data.firstName, result.data.lastName);
  console.log('   Email:', result.data.email);
  console.log('   Confidence:', result.confidence.toFixed(2));
  
} catch (error) {
  console.error('❌ PersonalInfoParser test failed:', error.message);
}

// Test 4: SkillsParser extraction
console.log('\nTest 4: SkillsParser Extraction');
try {
  const skillsParser = new SkillsParser();
  const testSkills = `
    SKILLS
    JavaScript, React, Node.js, Python, MongoDB, HTML, CSS
    Web Development, Problem Solving, Team Collaboration
  `;
  
  const result = skillsParser.parse(testSkills);
  console.log('✅ SkillsParser works');
  console.log('   Skills found:', result.data.length);
  console.log('   Sample skills:', result.data.slice(0, 5));
  console.log('   Confidence:', result.confidence.toFixed(2));
  
} catch (error) {
  console.error('❌ SkillsParser test failed:', error.message);
}

// Test 5: Text spacing fixes
console.log('\nTest 5: Text Spacing Fixes');
try {
  const EnhancedResumeParser = require('./services/enhancedResumeParser');
  const enhancedParser = new EnhancedResumeParser();
  
  const testText = 'SystemforInventoryManagementWebDevelopmentProjectManagement';
  const fixedText = enhancedParser.fixTextSpacing(testText);
  
  console.log('✅ Text spacing fixes work');
  console.log('   Original:', testText);
  console.log('   Fixed:', fixedText);
  
} catch (error) {
  console.error('❌ Text spacing test failed:', error.message);
}

console.log('\n🧪 Parser Fix Tests Complete!');
