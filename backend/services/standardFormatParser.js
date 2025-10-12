/**
 * Standard Format Resume Parser
 * Handles resumes without pipe separators (like Karl's resume)
 */

class StandardFormatParser {
  /**
   * Extract name from the top of the resume
   */
  static extractName(text) {
    console.log('📛 Extracting name (standard format)...');
    
    // Get first 500 characters where name is usually located
    const topSection = text.substring(0, 500);
    
    // Try multiple patterns
    const patterns = [
      // Pattern 1: Name at the very beginning (2-4 words, capitalized)
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
      
      // Pattern 2: After some whitespace/newlines
      /^\s*([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})/,
      
      // Pattern 3: Before email or phone
      /([A-Z][a-z]+(?:\s+[A-Z][a-z]+){1,3})\s*(?=.*?@|.*?\+?\d{3})/,
      
      // Pattern 4: Line with just a name (no other text)
      /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*$/m
    ];
    
    for (const pattern of patterns) {
      const match = topSection.match(pattern);
      if (match) {
        const fullName = match[1].trim();
        
        // Skip if it looks like a section header
        if (fullName.match(/^(Education|Experience|Projects|Skills|Certifications|Summary|Objective|Profile)/i)) {
          continue;
        }
        
        // Split into first and last name
        const nameParts = fullName.split(/\s+/);
        if (nameParts.length >= 2) {
          const firstName = nameParts[0];
          const lastName = nameParts.slice(1).join(' ');
          
          console.log('📛 ✅ Found name:', firstName, lastName);
          return { firstName, lastName };
        }
      }
    }
    
    console.log('📛 ❌ Could not extract name');
    return { firstName: '', lastName: '' };
  }
  
  /**
   * Extract projects from standard format (no pipe separator)
   */
  static extractProjects(text) {
    console.log('🚀 Extracting projects (standard format)...');
    const projects = [];
    
    // Find the PROJECTS section
    const projectsSectionMatch = text.match(/\b(PROJECTS?|Personal\s+Projects?)\b\s*(.+?)(?=\b(EDUCATION|EXPERIENCE|SKILLS|CERTIFICATIONS|$))/is);
    
    if (!projectsSectionMatch) {
      console.log('🚀 ❌ No PROJECTS section found');
      return projects;
    }
    
    const projectsText = projectsSectionMatch[2];
    console.log('🚀 Found PROJECTS section, length:', projectsText.length);
    console.log('🚀 First 300 chars:', projectsText.substring(0, 300));
    
    // Try multiple splitting strategies
    let projectBlocks = [];
    
    // Strategy 1: Split by bullet points (-, •, *, numbered)
    const bulletSplit = projectsText.split(/(?=^[\-•\*]\s+[A-Z]|^\d+\.\s+[A-Z])/m);
    if (bulletSplit.length > 1 && bulletSplit.some(b => b.trim().length > 20)) {
      projectBlocks = bulletSplit;
      console.log('🚀 Using bullet point split strategy');
    }
    
    // Strategy 2: Split by double newlines (paragraph-based)
    if (projectBlocks.length === 0) {
      const paragraphSplit = projectsText.split(/\n\s*\n/);
      if (paragraphSplit.length > 1) {
        projectBlocks = paragraphSplit;
        console.log('🚀 Using paragraph split strategy');
      }
    }
    
    // Strategy 3: Split by project name patterns (capitalized titles followed by description)
    if (projectBlocks.length === 0) {
      // Look for lines that start with capital letters and are likely project names
      const lines = projectsText.split(/\n/);
      let currentProject = '';
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Check if this line looks like a project title
        // (starts with capital, not too long, doesn't start with lowercase words)
        if (line.length > 10 && line.length < 100 && 
            /^[A-Z]/.test(line) && 
            !line.match(/^(The|A|An|In|On|At|For|With|By|From|To)\s/i)) {
          
          // Save previous project if exists
          if (currentProject.trim().length > 20) {
            projectBlocks.push(currentProject);
          }
          currentProject = line + '\n';
        } else if (line.length > 0) {
          currentProject += line + '\n';
        }
      }
      
      // Add last project
      if (currentProject.trim().length > 20) {
        projectBlocks.push(currentProject);
      }
      
      if (projectBlocks.length > 0) {
        console.log('🚀 Using pattern-based split strategy');
      }
    }
    
    // Strategy 4: If still nothing, treat entire section as one project
    if (projectBlocks.length === 0) {
      projectBlocks = [projectsText];
      console.log('🚀 Using single project strategy');
    }
    
    console.log('🚀 Found', projectBlocks.length, 'project blocks');
    
    // Process each project block
    for (const block of projectBlocks) {
      const trimmed = block.trim();
      if (trimmed.length < 20) continue;
      
      // Extract project name (first line, usually)
      const lines = trimmed.split(/\n+/).filter(l => l.trim().length > 0);
      if (lines.length === 0) continue;
      
      let projectName = lines[0]
        .replace(/^[\-•\*]\s+/, '')
        .replace(/^\d+\.\s+/, '')
        .trim();
      
      // Remove date range if present at the end
      projectName = projectName.replace(/\s*\(?\d{4}\s*-\s*(?:\d{4}|Present)\)?$/i, '').trim();
      
      // Skip if too short or too long
      if (projectName.length < 5 || projectName.length > 150) continue;
      
      // Skip if it looks like a section header
      if (projectName.match(/^(Education|Experience|Projects|Skills|Certifications|Technical\s+Skills)/i)) continue;
      
      // Extract description (rest of the lines)
      const description = lines.slice(1).join(' ').trim();
      
      // Try to identify technologies mentioned
      const techKeywords = [
        'Python', 'Java', 'JavaScript', 'TypeScript', 'C\\+\\+', 'C#', 'React', 'Node.js',
        'HTML', 'CSS', 'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Firebase', 'Unity', 
        'Django', 'Flask', 'Angular', 'Vue', 'Express', 'Spring', 'Git', 'Docker',
        'PHP', 'Ruby', 'Swift', 'Kotlin', 'Go', 'Rust', 'TensorFlow', 'PyTorch'
      ];
      
      const foundTechs = [];
      for (const tech of techKeywords) {
        const regex = new RegExp('\\b' + tech + '\\b', 'i');
        if (regex.test(block)) {
          foundTechs.push(tech.replace(/\\\\/g, ''));
        }
      }
      
      const technologies = foundTechs.join(', ');
      
      projects.push({
        name: projectName,
        technologies: technologies,
        description: description.substring(0, 500),
        startDate: '',
        endDate: '',
        url: ''
      });
      
      console.log('🚀 ✅ Added project:', projectName);
      console.log('🚀    Technologies:', technologies || 'None detected');
      console.log('🚀    Description preview:', description.substring(0, 80) + '...');
    }
    
    console.log('🚀 Total projects extracted:', projects.length);
    return projects;
  }
  
  /**
   * Extract skills using keyword matching
   */
  static extractSkills(text) {
    console.log('💡 Extracting skills (standard format)...');
    const skills = [];
    const seenSkills = new Set();
    
    // Common tech skills and soft skills
    const skillKeywords = [
      // Programming languages
      'Python', 'Java', 'JavaScript', 'TypeScript', 'C\\+\\+', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      // Web technologies
      'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Node\\.js', 'Express', 'Django', 'Flask', 'Spring',
      // Databases
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase', 'Oracle',
      // Tools & Platforms
      'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'CI/CD',
      // Design
      'Figma', 'Adobe XD', 'Photoshop', 'Illustrator', 'Sketch',
      // Data & AI
      'Machine Learning', 'Data Analysis', 'AI', 'Deep Learning', 'TensorFlow', 'PyTorch',
      // Soft skills
      'Team Collaboration', 'Communication', 'Problem Solving', 'Leadership', 'Critical Thinking',
      'Time Management', 'Adaptability', 'Creativity',
      // Methodologies
      'Agile', 'Scrum', 'Waterfall', 'DevOps', 'REST API', 'GraphQL', 'Microservices'
    ];
    
    // Search for each skill in the text
    for (const skill of skillKeywords) {
      const regex = new RegExp('\\b' + skill + '\\b', 'i');
      if (regex.test(text)) {
        const cleanSkill = skill.replace(/\\\\/g, '');
        const normalized = cleanSkill.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        if (!seenSkills.has(normalized)) {
          skills.push(cleanSkill);
          seenSkills.add(normalized);
          console.log('💡 ✅ Found skill:', cleanSkill);
        }
      }
    }
    
    console.log('💡 Total skills found:', skills.length);
    return skills;
  }
  
  /**
   * Extract certificates using date patterns
   */
  static extractCertificates(text) {
    console.log('🎓 Extracting certificates (standard format)...');
    const certificates = [];
    
    // Find CERTIFICATIONS section
    const certSectionMatch = text.match(/\b(CERTIFICATIONS?|CERTIFICATES?)\b\s*(.+?)(?=\b(EDUCATION|EXPERIENCE|SKILLS|PROJECTS|$))/is);
    
    if (!certSectionMatch) {
      console.log('🎓 ❌ No CERTIFICATIONS section found');
      return certificates;
    }
    
    const certText = certSectionMatch[2];
    console.log('🎓 Found CERTIFICATIONS section, length:', certText.length);
    
    // Pattern: Certificate name followed by issuer and date
    // Example: "Introduction to AI - Elements of AI December 2024"
    const certPattern = /([A-Z][A-Za-z\s\-:]{10,100}?)\s*(?:-|–)\s*([A-Za-z\s]+?)\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/gi;
    
    let match;
    while ((match = certPattern.exec(certText)) !== null) {
      const name = match[1].trim();
      const issuer = match[2].trim();
      const month = match[3];
      const year = match[4];
      
      // Skip if it looks like education
      if (name.match(/\b(Bachelor|Master|University|College|School|Degree)\b/i)) {
        continue;
      }
      
      // Convert month to number
      const monthMap = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      const monthNum = monthMap[month.toLowerCase()] || '01';
      const date = `${year}-${monthNum}`;
      
      certificates.push({
        name,
        issuer,
        date,
        description: ''
      });
      
      console.log('🎓 ✅ Found certificate:', name);
    }
    
    console.log('🎓 Total certificates found:', certificates.length);
    return certificates;
  }
}

module.exports = StandardFormatParser;
