/**
 * Debug Adrian's Experience Section Extraction
 */

const MLResumeParser = require('./services/MLResumeParser');

const adrianResume = `ADRIAN LOUISE D. GALVEZ Balagtas, Bulacan, Philippines Email: adriangalvez2602@gmail.com | adrian_louise_galvez @dlsl.edu.ph Phone: +63 961 056 6734 |Github: Adrian G-26 OBJECTIVE Motivated Computer Science student seeking On-the-Job Training at UTP Malaysia to leverage technical and creative skills, contribute effectively in a real-world setting, and enhance professional capabilities through hands-on experience. EDUCATION Bachelor of Science in Computer Science De La Salle Lipa, Batangas September 2022 - Present Senior High School Certificate, STEM Mapa University, Intramuros, Manila August 2018 - May 2020 TECHNICAL SKILLS Programming: C++, Java Script, Typescript, Python Web/Mobile Development: HTML, CSS, React, React Native, Expo Dev UI/UX: Figma, UX Pilot Database: SQL, Airtable, MongoDB Video Editing: Adobe Premiere Pro, Capcut Graphic Design: Adobe Photoshop, Illustrator, Canva Productivity: MS Office Suite, Google Suite PROJECTS Front-end UI and UX Ecommerce Website Technologies: HTML5, CSS3, Vanilla Java Script Developed a responsive beauty products ecommerce site utilizing core web technologies. Web-Based Airline Reservation System Technologies: React.js, Node.js, Express.js, MongoDB Developed a full-stack flight booking platform with modern Java Script frameworks. Ecommerce Mobile Application Technologies: React Native, MongoDB Built a cross-platform mobile ecommerce app with React Native and MongoDB backend. Medicine Tracker Mobile Application Technologies: React Native, MongoDB Built healthcare mobile app for medication tracking and reminders. EXPERIENCE Production Manager - Viral Coach LLC June 2024 - Present Lead a group of editors and manage/organize them. Ensure high production value for each and every client needs. Manage and organize our database using Airtable Database. Provide support to the editors by using high grade editing softwares like Adobe Premiere Pro. Freelance Video Editor and Graphic Designer May 2023 - Present Edit videos for various clients using Adobe Premiere Pro and Capcut. Create graphics and designs using Adobe Photoshop, Illustrator, and Canva.`;

async function debugExperience() {
  console.log('🔍 Debugging Adrian\'s Experience Extraction\n');
  console.log('📄 Resume length:', adrianResume.length, 'characters\n');
  
  // Check if EXPERIENCE keyword exists
  const hasExperience = adrianResume.includes('EXPERIENCE');
  console.log('✅ Contains "EXPERIENCE":', hasExperience);
  
  if (hasExperience) {
    const expIndex = adrianResume.indexOf('EXPERIENCE');
    console.log('📍 EXPERIENCE starts at position:', expIndex);
    console.log('📄 Text around EXPERIENCE:');
    console.log(adrianResume.substring(expIndex - 50, expIndex + 200));
    console.log('\n');
  }
  
  // Parse the resume
  const parser = new MLResumeParser();
  const result = await parser.parse(adrianResume);
  
  if (result.success) {
    console.log('\n📊 Parsing Results:');
    console.log(`   Experience entries found: ${result.data.experience.length}`);
    console.log(`   Expected: 2 (Production Manager, Freelance)`);
    
    if (result.data.experience.length > 0) {
      result.data.experience.forEach((exp, i) => {
        console.log(`\n   ${i + 1}. ${exp.title} at ${exp.company}`);
        console.log(`      Period: ${exp.startDate} - ${exp.endDate}`);
        console.log(`      Description: ${exp.description ? exp.description.substring(0, 100) + '...' : 'None'}`);
      });
    } else {
      console.log('\n   ❌ No experience entries found!');
    }
  }
}

debugExperience().catch(console.error);
