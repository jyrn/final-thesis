/**
 * Test Real Resume from Image
 */

const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing Real Resume from Image...\n');

// Extracted text from Adrian's resume image
const realResumeText = `
ADRIAN CARLO S. GALANG
Quezon City, Metro Manila
Mobile: +639123456789 | Email: adriangalang@email.com
LinkedIn: linkedin.com/in/adriangalang | GitHub: github.com/adriangalang

OBJECTIVE
To secure a challenging position as a Data Analyst or Data Scientist in a dynamic organization where I can utilize my analytical skills, technical expertise, and passion for data-driven insights to contribute to business growth and innovation.

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
• Programming Languages: Python, R, SQL, Java, JavaScript, HTML, CSS
• Data Analysis Tools: Pandas, NumPy, Matplotlib, Seaborn, Plotly
• Machine Learning: Scikit-learn, TensorFlow, Keras
• Database Management: MySQL, PostgreSQL, MongoDB
• Data Visualization: Tableau, Power BI, Excel
• Version Control: Git, GitHub
• Cloud Platforms: AWS, Google Cloud Platform
• Statistical Software: SPSS, R Studio

PROJECTS
Sales Forecasting Model | Python, Scikit-learn, Pandas
January 2024 - March 2024
• Developed a machine learning model to predict sales for a retail company using historical data
• Implemented various algorithms including Linear Regression, Random Forest, and XGBoost
• Achieved 85% accuracy in sales prediction, helping the company optimize inventory management
• Created interactive dashboards using Plotly for stakeholder presentations

Web-Based Library Management System | Java, MySQL, HTML, CSS, JavaScript
September 2023 - December 2023
• Built a comprehensive library management system with user authentication and book tracking
• Implemented CRUD operations for book inventory, member management, and borrowing records
• Designed responsive user interface with modern CSS frameworks
• Integrated barcode scanning functionality for efficient book checkout process

Customer Segmentation Analysis | Python, K-means Clustering, Tableau
June 2023 - August 2023
• Performed customer segmentation analysis for an e-commerce platform using clustering algorithms
• Analyzed customer behavior patterns and purchasing trends from 50,000+ transaction records
• Created detailed customer personas and recommended targeted marketing strategies
• Presented findings to stakeholders through interactive Tableau dashboards

WORK EXPERIENCE
Data Analytics Intern | TechCorp Solutions
June 2023 - August 2023
• Assisted in data collection, cleaning, and preprocessing for various client projects
• Developed automated data pipelines using Python scripts to streamline reporting processes
• Created weekly performance reports and KPI dashboards for management review
• Collaborated with cross-functional teams to identify business insights from data analysis

Student Assistant | PUP Computer Science Department
September 2022 - May 2023
• Provided technical support to faculty and students with computer laboratory equipment
• Assisted in organizing programming workshops and coding competitions
• Maintained computer systems and software installations across multiple laboratories
• Tutored junior students in programming fundamentals and data structures

CERTIFICATIONS
• Google Data Analytics Professional Certificate (2023)
• AWS Certified Cloud Practitioner (2023)
• Microsoft Excel Expert Certification (2022)
• Python for Data Science - Coursera (2022)

ACHIEVEMENTS
• Dean's List - 6 consecutive semesters (2020-2023)
• Best Capstone Project Award - Computer Science Department (2024)
• 1st Place - Regional Programming Competition (2022)
• Outstanding Student Leader Award (2021)

PERSONAL SKILLS
• Strong analytical and problem-solving abilities
• Excellent communication and presentation skills
• Team collaboration and leadership
• Attention to detail and accuracy
• Time management and multitasking
• Adaptability and continuous learning
`;

async function testRealResume() {
  try {
    console.log('🔍 Testing parsing with real resume...\n');
    
    const parser = new MLResumeParser();
    const result = await parser.parse(realResumeText);
    
    if (result.success) {
      console.log('✅ Parsing successful');
      console.log(`📊 Overall Confidence: ${(result.metadata.overallConfidence * 100).toFixed(1)}%`);
      console.log(`⏱️ Duration: ${result.metadata.parsingDuration}s`);
      
      const data = result.data;
      
      console.log('\n📋 DETAILED PARSING RESULTS:');
      
      // Personal Info
      console.log('\n👤 PERSONAL INFORMATION:');
      console.log(`   Name: ${data.personalInfo.firstName} ${data.personalInfo.lastName}`);
      console.log(`   Email: ${data.personalInfo.email || 'Not found'}`);
      console.log(`   Phone: ${data.personalInfo.phone || 'Not found'}`);
      console.log(`   LinkedIn: ${data.personalInfo.linkedin || 'Not found'}`);
      console.log(`   GitHub: ${data.personalInfo.github || 'Not found'}`);
      
      // Education
      console.log('\n🎓 EDUCATION:');
      console.log(`   Found: ${data.education.length} entries`);
      if (data.education.length > 0) {
        data.education.forEach((edu, i) => {
          console.log(`   ${i + 1}. ${edu.school}`);
          console.log(`      Degree: ${edu.degree}`);
          console.log(`      Period: ${edu.startDate} - ${edu.endDate}`);
          if (edu.gpa) console.log(`      GPA: ${edu.gpa}`);
        });
      } else {
        console.log('   ❌ No education entries found');
      }
      
      // Skills
      console.log('\n💡 SKILLS:');
      console.log(`   Found: ${data.skills.length} skills`);
      if (data.skills.length > 0) {
        console.log(`   Sample: ${data.skills.slice(0, 10).join(', ')}${data.skills.length > 10 ? '...' : ''}`);
      } else {
        console.log('   ❌ No skills found');
      }
      
      // Projects
      console.log('\n🚀 PROJECTS:');
      console.log(`   Found: ${data.projects ? data.projects.length : 0} projects`);
      if (data.projects && data.projects.length > 0) {
        data.projects.forEach((project, i) => {
          console.log(`   ${i + 1}. ${project.name || project.title || 'Unnamed'}`);
          if (project.technologies) console.log(`      Tech: ${project.technologies}`);
          if (project.duration) console.log(`      Duration: ${project.duration}`);
        });
      } else {
        console.log('   ❌ No projects found');
      }
      
      // Work Experience
      console.log('\n💼 WORK EXPERIENCE:');
      console.log(`   Found: ${data.experience ? data.experience.length : 0} entries`);
      if (data.experience && data.experience.length > 0) {
        data.experience.forEach((exp, i) => {
          console.log(`   ${i + 1}. ${exp.title || 'Unknown Title'} at ${exp.company || 'Unknown Company'}`);
          if (exp.duration) console.log(`      Duration: ${exp.duration}`);
        });
      } else {
        console.log('   ❌ No work experience found');
      }
      
      // Certifications
      console.log('\n🎓 CERTIFICATIONS:');
      console.log(`   Found: ${data.certifications ? data.certifications.length : 0} certifications`);
      if (data.certifications && data.certifications.length > 0) {
        data.certifications.forEach((cert, i) => {
          console.log(`   ${i + 1}. ${cert.name || cert.title || 'Unnamed'}`);
          if (cert.issuer) console.log(`      Issuer: ${cert.issuer}`);
          if (cert.dateIssued) console.log(`      Date: ${cert.dateIssued}`);
        });
      } else {
        console.log('   ❌ No certifications found');
      }
      
      // Confidence Analysis
      console.log('\n📊 CONFIDENCE BREAKDOWN:');
      const confidenceScores = result.metadata.confidenceScores;
      Object.entries(confidenceScores).forEach(([section, score]) => {
        const percentage = (score * 100).toFixed(1);
        const status = score > 0.7 ? '✅' : score > 0.4 ? '⚠️' : '❌';
        console.log(`   ${status} ${section}: ${percentage}%`);
      });
      
    } else {
      console.log('❌ Parsing failed');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error(error.stack);
  }
}

// Run the test
testRealResume().then(() => {
  console.log('\n🧪 Real Resume Test Complete!');
}).catch(error => {
  console.error('❌ Test execution failed:', error);
});
