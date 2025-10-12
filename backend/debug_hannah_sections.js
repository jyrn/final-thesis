/**
 * Debug Hannah's Section Extraction Issues
 */

const MLResumeParser = require('./services/MLResumeParser');
const BaseParser = require('./services/parsers/BaseParser');

const hannahResumeData = `Hannah Nicole L. Comia
UI/UX DESIGNER
San Pablo City, Laguna, Philippines | +63 961 072 0526 | hannahnicole.comia16@gmail.com
LinkedIn: www.linkedin.com/in/hannah-nicole-comia | GitHub: github.com/kenyaa

Education
De La Salle Lipa, Bachelor of Science in Computer Science                                    2022 - Present
Second Honor Awardee (GPA: 3.53), 3rd Year - First Semester, AY 2024-2025

San Pablo Colleges, Senior High School                                                      2020 - 2022
Strand: Science, Technology, Engineering, and Mathematics (STEM)
Graduated with Honor (General Average: 93.75)

Projects
NLP-Based Recruitment System for PESO Lipa | React, Node.js, Express, MongoDB, Cloud
Developed a web-based platform that applies Natural Language Processing (TF-IDF and cosine similarity) to analyze and match job seekers with relevant job posts, improving the accuracy and efficiency of the employment process.

Digital Companion App for the Elderly and Visually Impaired | Figma
Designed accessible mobile interfaces in Figma with features like medication reminders and emergency alerts, improving usability and enhancing day-to-day life for elderly and impaired users.

Inventory Management System | React, JavaScript, HTML, CSS
Built a web-based inventory system with CRUD operations, search, sorting, and validation features, enabling efficient inventory tracking across different categories.

Grade Computation and Email Automation | UiPath, Microsoft Excel
Automated the manual grade computation process using UiPath RPA to calculate student grades in Excel and send results via email. This reduced computation time and eliminated human error in grade encoding.

Certifications and Seminars
Student Mobility Programme | Universiti Teknologi Petronas, Malaysia                        April 2025
Google UX Design | Coursera (Issued by Google)                                             June 2025
Preparing Data for Analysis with Microsoft Excel | Coursera (Issued by Microsoft)          June 2025
Harnessing the Power of Data with Power BI | Coursera (Issued by Microsoft)               June 2025
Introduction to Data Science | Cisco Networking Academy                                     October 2025
English Certificate (C2 Proficient, Score: 801/00) | EF SET                               October 2025

Skills and Abilities
Design & Prototyping: Figma, Adobe XD, User-Centered Design, Wireframing, Prototyping
Web Development: HTML, CSS, React, React Native, TypeScript, Firebase, MongoDB, Cloud, GitHub
Automation & Data: UiPath, Microsoft Excel, Data Cleansing
Soft Skills: Problem Solving & Critical Thinking, Collaboration, Communication, Leadership`;

console.log('🔍 Debugging Hannah\'s Section Extraction...\n');

async function debugHannahSections() {
  try {
    const parser = new MLResumeParser();
    
    console.log('📄 Raw Hannah data:');
    console.log(`   Length: ${hannahResumeData.length} characters`);
    console.log(`   Lines: ${hannahResumeData.split('\n').length}`);
    
    // Test section extraction
    const baseParser = new BaseParser();
    
    console.log('\n🔍 Testing Projects Section Extraction:');
    const projectsSection = baseParser.extractSection(
      hannahResumeData,
      ['PROJECTS', 'Projects', 'PROJECT', 'Project'],
      ['CERTIFICATIONS', 'Certifications', 'SKILLS', 'Skills', 'EDUCATION', 'Education']
    );
    console.log(`   Projects section length: ${projectsSection ? projectsSection.length : 0}`);
    if (projectsSection) {
      console.log(`   First 300 chars: "${projectsSection.substring(0, 300)}..."`);
      console.log(`   Lines in projects: ${projectsSection.split('\n').length}`);
      
      // Count pipe symbols
      const pipeCount = (projectsSection.match(/\|/g) || []).length;
      console.log(`   Pipe symbols found: ${pipeCount}`);
      
      // Test paragraph split
      const paragraphs = projectsSection.split(/\n\s*\n/);
      console.log(`   Paragraph split results: ${paragraphs.length} blocks`);
      paragraphs.forEach((p, i) => {
        const firstLine = p.split('\n')[0].trim();
        console.log(`     Block ${i + 1}: "${firstLine.substring(0, 50)}..."`);
      });
    }
    
    console.log('\n🔍 Testing Certifications Section Extraction:');
    const certsSection = baseParser.extractSection(
      hannahResumeData,
      ['CERTIFICATIONS', 'Certifications', 'CERTIFICATION', 'Certification', 'Certifications and Seminars'],
      ['SKILLS', 'Skills', 'EDUCATION', 'Education', 'EXPERIENCE', 'Experience']
    );
    console.log(`   Certifications section length: ${certsSection ? certsSection.length : 0}`);
    if (certsSection) {
      console.log(`   First 300 chars: "${certsSection.substring(0, 300)}..."`);
      console.log(`   Lines in certifications: ${certsSection.split('\n').length}`);
      
      // Test individual lines
      const certLines = certsSection.split('\n').filter(l => l.trim().length > 0);
      console.log(`   Non-empty lines: ${certLines.length}`);
      certLines.forEach((line, i) => {
        if (i < 10) { // Show first 10 lines
          console.log(`     Line ${i + 1}: "${line}"`);
        }
      });
    }
    
    console.log('\n🚀 Running full parsing test...');
    const result = await parser.parse(hannahResumeData);
    
    if (result.success) {
      console.log('\n📊 Results:');
      console.log(`   Projects found: ${result.data.projects.length}`);
      result.data.projects.forEach((proj, i) => {
        console.log(`     ${i + 1}. "${proj.name}" | Tech: "${proj.technologies}"`);
      });
      
      console.log(`\n   Certifications found: ${result.data.certifications.length}`);
      result.data.certifications.forEach((cert, i) => {
        const name = typeof cert === 'object' ? cert.name : cert;
        console.log(`     ${i + 1}. "${name}"`);
      });
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugHannahSections().then(() => {
  console.log('\n🧪 Hannah Section Debug Complete!');
}).catch(error => {
  console.error('❌ Debug execution failed:', error);
});
