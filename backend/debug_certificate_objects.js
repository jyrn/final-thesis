/**
 * Debug Certificate Objects - Check Date Fields
 */

const MLResumeParser = require('./services/MLResumeParser');

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

Certifications and Seminars Student Mobility Programme | Universiti Teknologi Petronas, Malaysia April2025 Google UX Design Issuedby Google) June2025 Preparing Data for Analysis with Microsoft Excel | Coursera (Issuedby Microsoft) June2025 Harnessing the Power of Data with PowerBI | Coursera (Issuedby Microsoft) June2025 Introduction to Data Science | Cisco Networking Academy October2025 English Certificate (C2Proficient, Score:80/100) | EFSET October2025

Skills and Abilities
Design & Prototyping: Figma, Adobe XD, User-Centered Design, Wireframing, Prototyping
Web Development: HTML, CSS, React, React Native, TypeScript, Firebase, MongoDB, Cloud, GitHub
Automation & Data: UiPath, Microsoft Excel, Data Cleansing
Soft Skills: Problem Solving & Critical Thinking, Collaboration, Communication, Leadership`;

console.log('🔍 Debugging Certificate Objects...\n');

async function debugCertificateObjects() {
  try {
    const parser = new MLResumeParser();
    const result = await parser.parse(hannahResumeData);
    
    if (result.success) {
      console.log('📋 Certificate Objects Details:');
      console.log(`   Total certificates: ${result.data.certifications.length}`);
      
      result.data.certifications.forEach((cert, i) => {
        console.log(`\n   Certificate ${i + 1}:`);
        console.log(`     Type: ${typeof cert}`);
        
        if (typeof cert === 'object') {
          console.log(`     Object keys: [${Object.keys(cert).join(', ')}]`);
          console.log(`     name: "${cert.name || 'N/A'}"`);
          console.log(`     issuer: "${cert.issuer || 'N/A'}"`);
          console.log(`     dateIssued: "${cert.dateIssued || 'N/A'}"`);
          console.log(`     date: "${cert.date || 'N/A'}"`);
          console.log(`     Full object:`, JSON.stringify(cert, null, 2));
        } else {
          console.log(`     String value: "${cert}"`);
        }
      });
    } else {
      console.error('❌ Parsing failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Debug failed:', error.message);
  }
}

debugCertificateObjects().then(() => {
  console.log('\n🧪 Certificate Object Debug Complete!');
}).catch(error => {
  console.error('❌ Debug execution failed:', error);
});
