/**
 * Test Line Break Preservation in Text Cleaning
 */

const ResumeTextCleaner = require('./services/ResumeTextCleaner');

console.log('🧪 Testing Line Break Preservation...\n');

// Test with proper line breaks
const testTextWithLineBreaks = `ADRIAN CARLO S. GALANG
Quezon City, Metro Manila
Mobile: +639123456789 | Email: adriangalang@email.com
LinkedIn: linkedin.com/in/adriangalang | GitHub: github.com/adriangalang

OBJECTIVE
To secure a challenging position as a Data Analyst or Data Scientist in a dynamic organization.

EDUCATION
Bachelor of Science in Computer Science
Polytechnic University of the Philippines
2020 - 2024
GPA: 3.75/4.0

Senior High School - STEM Track
Quezon City Science High School
2018 - 2020
General Weighted Average: 95.2%

TECHNICAL SKILLS
• Programming Languages: Python, R, SQL, Java, JavaScript
• Data Analysis Tools: Pandas, NumPy, Matplotlib, Seaborn
• Machine Learning: Scikit-learn, TensorFlow, Keras
• Database Management: MySQL, PostgreSQL, MongoDB

WORK EXPERIENCE
Data Analytics Intern | TechCorp Solutions
June 2023 - August 2023
• Assisted in data collection, cleaning, and preprocessing
• Developed automated data pipelines using Python scripts
• Created weekly performance reports and KPI dashboards

PROJECTS
Sales Forecasting Model | Python, Scikit-learn, Pandas
January 2024 - March 2024
• Developed a machine learning model to predict sales
• Implemented various algorithms including Linear Regression
• Achieved 85% accuracy in sales prediction

CERTIFICATIONS
• Google Data Analytics Professional Certificate (2023)
• AWS Certified Cloud Practitioner (2023)
• Microsoft Excel Expert Certification (2022)
• Python for Data Science - Coursera (2022)`;

function testLineBreaks() {
  try {
    console.log('📝 Original text structure:');
    const lines = testTextWithLineBreaks.split('\n');
    console.log(`   Total lines: ${lines.length}`);
    console.log('   First 10 lines:');
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`   ${i + 1}: "${line}"`);
    });
    
    console.log('\n🧹 Testing text cleaning...');
    const textCleaner = new ResumeTextCleaner();
    const result = textCleaner.cleanResumeText(testTextWithLineBreaks);
    
    console.log('\n📝 Cleaned text structure:');
    const cleanedLines = result.cleanedText.split('\n');
    console.log(`   Total lines: ${cleanedLines.length}`);
    console.log('   First 10 lines:');
    cleanedLines.slice(0, 10).forEach((line, i) => {
      console.log(`   ${i + 1}: "${line}"`);
    });
    
    console.log('\n📊 Analysis:');
    console.log(`   Original lines: ${lines.length}`);
    console.log(`   Cleaned lines: ${cleanedLines.length}`);
    console.log(`   Line preservation: ${cleanedLines.length >= lines.length * 0.8 ? '✅ Good' : '❌ Poor'}`);
    
    // Check if major sections are on separate lines
    const hasProperSections = cleanedLines.some(line => line.trim() === 'EDUCATION') &&
                              cleanedLines.some(line => line.trim() === 'WORK EXPERIENCE') &&
                              cleanedLines.some(line => line.trim() === 'PROJECTS');
    
    console.log(`   Section headers preserved: ${hasProperSections ? '✅ Yes' : '❌ No'}`);
    
    // Check if name is on its own line
    const nameOnOwnLine = cleanedLines.some(line => line.trim() === 'ADRIAN CARLO S. GALANG');
    console.log(`   Name on own line: ${nameOnOwnLine ? '✅ Yes' : '❌ No'}`);
    
    if (!nameOnOwnLine) {
      console.log('   🔍 Looking for name in lines...');
      cleanedLines.forEach((line, i) => {
        if (line.includes('ADRIAN CARLO S. GALANG')) {
          console.log(`   Found name in line ${i + 1}: "${line.substring(0, 100)}..."`);
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

testLineBreaks();
console.log('\n🧪 Line Break Test Complete!');
