/**
 * Skills Parser Module
 * Handles extraction of technical and soft skills
 */

const BaseParser = require('./BaseParser');

class SkillsParser extends BaseParser {
  constructor() {
    super();
    
    // Comprehensive skill database
    this.skillDatabase = {
      programming: [
        'Python', 'Java', 'JavaScript', 'TypeScript', 'C\\+\\+', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 
        'Swift', 'Kotlin', 'Scala', 'Perl', 'R', 'MATLAB', 'Dart', 'Objective-C'
      ],
      web: [
        'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Node\\.js', 'Express', 'Django', 'Flask', 
        'Spring', 'ASP\\.NET', 'Laravel', 'Ruby on Rails', 'Next\\.js', 'Nuxt\\.js', 'Svelte'
      ],
      mobile: [
        'React Native', 'Flutter', 'Ionic', 'Xamarin', 'Android', 'iOS', 'Swift', 'Kotlin'
      ],
      database: [
        'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'Oracle', 'SQLite',
        'Cassandra', 'DynamoDB', 'MariaDB', 'Neo4j', 'Elasticsearch'
      ],
      cloud: [
        'AWS', 'Azure', 'GCP', 'Google Cloud', 'Heroku', 'DigitalOcean', 'Vercel', 'Netlify'
      ],
      devops: [
        'Docker', 'Kubernetes', 'Jenkins', 'CI/CD', 'Git', 'GitHub', 'GitLab', 'Bitbucket',
        'Terraform', 'Ansible', 'Chef', 'Puppet'
      ],
      design: [
        'Figma', 'Adobe XD', 'Sketch', 'Photoshop', 'Illustrator', 'InDesign', 'Canva',
        'Blender', 'Maya', 'Unity', 'Unreal Engine'
      ],
      dataScience: [
        'Machine Learning', 'Deep Learning', 'Data Analysis', 'AI', 'TensorFlow', 'PyTorch',
        'Scikit-learn', 'Pandas', 'NumPy', 'Jupyter', 'Tableau', 'Power BI'
      ],
      softSkills: [
        'Team Collaboration', 'Communication', 'Problem Solving', 'Leadership', 'Critical Thinking',
        'Time Management', 'Adaptability', 'Creativity', 'Project Management', 'Agile', 'Scrum',
        'Analytical Thinking', 'Decision Making', 'Conflict Resolution', 'Negotiation', 'Presentation'
      ]
    };
  }

  parse(text, context = {}) {
    
    const skills = [];
    const seenSkills = new Set();
    
    // Extract skills section
    const skillsText = this.extractSection(
      text,
      ['SKILLS', 'Technical Skills', 'Core Competencies', 'Expertise', 'Technologies'],
      ['EXPERIENCE', 'WORK EXPERIENCE', 'PROJECTS', 'EDUCATION', 'CERTIFICATIONS']
    );
    
    // Strategy 1: Keyword matching from skill database
    console.log('💡 Strategy 1: Keyword matching...');
    for (const [category, categorySkills] of Object.entries(this.skillDatabase)) {
      for (const skill of categorySkills) {
        const regex = new RegExp('\\b' + skill + '\\b', 'i');
        if (regex.test(text)) {
          const cleanSkill = skill.replace(/\\\\/g, '');
          const normalized = cleanSkill.toLowerCase().replace(/[^a-z0-9]/g, '');
          
          if (!seenSkills.has(normalized)) {
            skills.push({ name: cleanSkill, category: category });
            seenSkills.add(normalized);
          }
        }
      }
    }
    
    console.log('💡 Found', skills.length, 'skills via keyword matching');
    
    // Strategy 2: Parse comma-separated skills from skills section
    if (skillsText) {
      console.log('💡 Strategy 2: Parsing skills section...');
      const cleanText = skillsText
        .replace(/Skills?\s*(?:and\s+Abilities)?:?/gi, '')
        .replace(/Technical\s*Skills?:?/gi, '')
        .replace(/Soft\s*Skills?:?/gi, '');
      
      const parts = cleanText.split(/[,;]/);
      
      for (const part of parts) {
        let trimmed = part.trim();
        if (trimmed.length < 2 || trimmed.length > 60) continue;
        
        // Skip non-skill patterns
        if (trimmed.match(/^(and|or|the|a|an|in|on|at|for|with|to)$/i)) continue;
        if (trimmed.match(/Education|Projects?|Experience|Certifications?/i)) continue;
        
        const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seenSkills.has(normalized)) {
          skills.push({ name: trimmed, category: 'other' });
          seenSkills.add(normalized);
        }
      }
    }
    
    // Convert to simple array of skill names
    const skillNames = skills.map(s => s.name);
    
    this.confidence = skillNames.length > 0 ? 0.9 : 0;
    
    console.log('💡 SkillsParser: Extraction complete -', skillNames.length, 'skills (confidence:', this.confidence.toFixed(2), ')');
    
    return {
      data: skillNames,
      confidence: this.confidence,
      metadata: {
        categorized: skills,
        totalCount: skillNames.length
      }
    };
  }
}

module.exports = SkillsParser;
