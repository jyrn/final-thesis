/**
 * Test Different Resume Formats
 */

const MLResumeParser = require('./services/MLResumeParser');

console.log('🧪 Testing Different Resume Formats...\n');

// Different resume formats to test
const resumeFormats = {
  traditional: `
John Smith
Software Engineer
john.smith@email.com | (555) 123-4567 | New York, NY

OBJECTIVE
Seeking a challenging position in software development.

EXPERIENCE
Senior Developer - Tech Corp (2020-2023)
• Developed web applications using React and Node.js
• Led team of 5 developers

EDUCATION
Bachelor of Science in Computer Science
State University (2016-2020)
GPA: 3.8/4.0

SKILLS
JavaScript, Python, React, Node.js, SQL
`,

  modern: `
SARAH JOHNSON
UX/UI Designer | sarah.johnson@gmail.com | LinkedIn: /in/sarahjohnson

SUMMARY
Creative designer with 5+ years experience in user-centered design.

PROFESSIONAL EXPERIENCE
Lead UX Designer | Design Studio | 2021-Present
→ Designed mobile apps for 10+ clients
→ Increased user engagement by 40%

Junior Designer | StartupCo | 2019-2021
→ Created wireframes and prototypes
→ Collaborated with development teams

EDUCATION & CERTIFICATIONS
• M.A. Design, Art Institute (2019)
• Google UX Design Certificate (2020)
• Adobe Certified Expert (2021)

CORE COMPETENCIES
Design Thinking • Figma • Adobe Creative Suite • User Research
`,

  academic: `
Dr. Robert Chen, Ph.D.
Associate Professor of Computer Science
Email: r.chen@university.edu | Office: (555) 987-6543

EDUCATION
Ph.D. in Computer Science, MIT (2010)
Dissertation: "Machine Learning Applications in Natural Language Processing"

M.S. in Computer Science, Stanford University (2006)
B.S. in Mathematics, UC Berkeley (2004)

RESEARCH INTERESTS
• Artificial Intelligence
• Natural Language Processing  
• Machine Learning

PUBLICATIONS
1. Chen, R. (2023). "Advanced NLP Techniques." Journal of AI Research.
2. Chen, R. (2022). "Deep Learning Models." Conference on ML.

TEACHING EXPERIENCE
CS 101: Introduction to Programming (2015-Present)
CS 301: Advanced Algorithms (2018-Present)
`,

  creative: `
★ ALEX RIVERA ★
Creative Director & Brand Strategist
📧 alex@creativestudio.com | 📱 555-CREATIVE | 🌐 alexrivera.design

✨ CREATIVE VISION ✨
Award-winning creative professional specializing in brand identity and digital experiences.

🎨 EXPERIENCE
Creative Director → BrandLab Agency → 2022-Present
• Rebranded 15+ companies with 200% ROI increase
• Managed creative team of 12 designers

Art Director → Digital Dreams → 2020-2022  
• Created campaigns for Fortune 500 clients
• Won 3 industry awards for innovative design

🎓 EDUCATION
BFA Graphic Design → Art School → 2020
Portfolio: Top 5% of graduating class

🛠️ SKILLS & TOOLS
Adobe Creative Cloud ★★★★★
Figma ★★★★★
Brand Strategy ★★★★☆
Team Leadership ★★★★☆
`
};

async function testDifferentFormats() {
  const parser = new MLResumeParser();
  
  for (const [formatName, resumeText] of Object.entries(resumeFormats)) {
    console.log(`\n=== TESTING ${formatName.toUpperCase()} FORMAT ===`);
    console.log(`Sample: ${resumeText.substring(0, 100).replace(/\n/g, ' ')}...`);
    
    try {
      const result = await parser.parse(resumeText);
      
      if (result.success) {
        console.log(`✅ Parsing successful`);
        console.log(`📊 Confidence: ${(result.metadata.overallConfidence * 100).toFixed(1)}%`);
        
        const data = result.data;
        console.log(`👤 Name: ${data.personalInfo.firstName} ${data.personalInfo.lastName}`);
        console.log(`📧 Email: ${data.personalInfo.email || 'Not found'}`);
        console.log(`🎓 Education: ${data.education.length} entries`);
        console.log(`💡 Skills: ${data.skills.length} found`);
        
      } else {
        console.log(`❌ Parsing failed`);
      }
      
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }
  }
}

testDifferentFormats().then(() => {
  console.log('\n🧪 Test Complete!');
});
