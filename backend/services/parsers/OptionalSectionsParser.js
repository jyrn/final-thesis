const BaseParser = require('./BaseParser');

/**
 * OptionalSectionsParser - Extracts volunteer experience, awards, achievements, and organizations
 * Version 1.0.0
 */
class OptionalSectionsParser extends BaseParser {
  constructor() {
    super();
    this.version = '1.0.0';
  }

  /**
   * Parse all optional sections from resume text
   */
  parse(text, context = {}) {
    const sections = {
      organizations: this.parseOrganizations(text),
      awards: this.parseAwards(text) // This includes both awards and achievements
    };
    
    return sections;
  }

  /**
   * Parse organizations/volunteer experience section
   */
  parseOrganizations(text) {
    const organizations = [];
    
    // Extract organizations section - also check EXPERIENCE section for organizations
    let orgText = this.extractSection(
      text,
      [
        'ORGANIZATIONS', 'Organizations', 'VOLUNTEER EXPERIENCE', 'Volunteer Experience',
        'VOLUNTEER WORK', 'Volunteer Work', 'COMMUNITY INVOLVEMENT', 'Community Involvement',
        'EXTRACURRICULAR', 'Extracurricular Activities', 'LEADERSHIP', 'Leadership Experience'
      ],
      [
        'EDUCATION', 'Education', 'SKILLS', 'Skills',
        'PROJECTS', 'Projects', 'CERTIFICATIONS', 'Certifications', 'AWARDS', 'Awards'
      ]
    );
    
    // If no dedicated section, check EXPERIENCE section for organizations
    if (!orgText || orgText.trim().length < 10) {
      const expText = this.extractSection(
        text,
        ['EXPERIENCE', 'Experience', 'WORK EXPERIENCE', 'Work Experience'],
        ['EDUCATION', 'Education', 'SKILLS', 'Skills', 'PROJECTS', 'Projects']
      );
      
      if (expText) {
        // Look for organization patterns in experience section
        orgText = expText;
      }
    }
    
    if (!orgText || orgText.trim().length < 10) {
      return organizations;
    }
    // Pattern 1: "Organization Name | Location\nDate Range\nRole"
    const pattern1 = /([A-Z][A-Za-z\s&,.'()]+(?:Rondalla|Society|Organization|Association|Committee|Team|Council|Group|Club|JPCS|Lumieres|Lasallian))\s*[|]\s*([A-Z][A-Za-z\s]+)\s*\n?\s*(\d{4})\s*[-–]\s*(\d{4}|Present|Current)\s*\n?\s*([A-Z][A-Za-z\s]+)/gi;
    
    let match;
    while ((match = pattern1.exec(orgText)) !== null) {
      const organization = match[1].trim();
      const location = match[2].trim();
      const startYear = match[3];
      const endYear = match[4];
      const role = match[5].trim();
      
      // Extract description (next 300 characters after match)
      const afterMatch = orgText.substring(match.index + match[0].length, match.index + match[0].length + 300);
      const descLines = afterMatch.split('\n').filter(l => l.trim().length > 10);
      const description = descLines.slice(0, 3).join(' ').trim();
      
      organizations.push({
        organization,
        role,
        startDate: startYear,
        endDate: endYear,
        location,
        description
      });
    }
    
    // Pattern 2: Line-by-line format with pipe separator
    if (organizations.length === 0) {
      const lines = orgText.split('\n').filter(line => line.trim().length > 0);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Pattern: "Organization Name | Location"
        const pipeMatch = line.match(/^([A-Z][A-Za-z\s&,.'()]+)\s*[|]\s*([A-Z][A-Za-z\s]+)/);
        if (pipeMatch) {
          const organization = pipeMatch[1].trim();
          const location = pipeMatch[2].trim();
          
          // Look for date and role in next lines
          let role = '';
          let startDate = '';
          let endDate = '';
          let description = '';
          
          for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
            const nextLine = lines[j].trim();
            
            // Check for dates
            const dateMatch = nextLine.match(/^(\d{4})\s*[-–]\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              startDate = dateMatch[1];
              endDate = dateMatch[2];
              continue;
            }
            
            // Check for role (single word or short phrase, usually first line after date)
            if (!role && nextLine.length < 50 && nextLine.match(/^[A-Z]/)) {
              role = nextLine;
              continue;
            }
            
            // Collect description (longer lines)
            if (role && nextLine.length > 20 && !nextLine.match(/^\d{4}/)) {
              description += nextLine + ' ';
            }
          }
          
          if (startDate) {
            organizations.push({
              organization,
              role: role || 'Member',
              startDate,
              endDate,
              location,
              description: description.trim()
            });
          }
        }
        
        // Fallback: Look for organization keywords without pipe
        else {
          const orgMatch = line.match(/^([A-Z][A-Za-z\s&,.'()]+(?:Rondalla|Society|Organization|Association|Committee|Team|Council|Group|Club|JPCS|Lumieres|Lasallian))/);
          if (orgMatch) {
            const organization = orgMatch[1].trim();
            
            let role = '';
            let startDate = '';
            let endDate = '';
            let description = '';
            
            for (let j = i + 1; j < Math.min(i + 5, lines.length); j++) {
              const nextLine = lines[j].trim();
              
              const dateMatch = nextLine.match(/(\d{4})\s*[-–]\s*(\d{4}|Present|Current)/i);
              if (dateMatch) {
                startDate = dateMatch[1];
                endDate = dateMatch[2];
                continue;
              }
              
              if (!role && nextLine.match(/^(President|Vice President|Member|Secretary|Treasurer|Coordinator|Leader|Chair|Director|Representative)/i)) {
                role = nextLine;
                continue;
              }
              
              if (role && nextLine.length > 20) {
                description += nextLine + ' ';
              }
            }
            
            if (role || startDate) {
              organizations.push({
                organization,
                role: role || 'Member',
                startDate,
                endDate,
                location: '',
                description: description.trim()
              });
            }
          }
        }
      }
    }
    
    return organizations;
  }

  /**
   * Parse awards and achievements section (combined)
   */
  parseAwards(text) {
    const awards = [];
    
    // Extract awards/achievements section
    const awardsText = this.extractSection(
      text,
      [
        'AWARDS', 'Awards', 'HONORS', 'Honors', 'AWARDS & HONORS', 'Awards and Honors',
        'RECOGNITIONS', 'Recognitions', 'HONORS & AWARDS', 'Honors and Awards',
        'ACHIEVEMENTS', 'Achievements', 'ACCOMPLISHMENTS', 'Accomplishments',
        'AWARDS & ACHIEVEMENTS', 'Awards and Achievements'
      ],
      [
        'EDUCATION', 'Education', 'EXPERIENCE', 'WORK EXPERIENCE', 'SKILLS', 'Skills',
        'PROJECTS', 'Projects', 'CERTIFICATIONS', 'Certifications', 'ACHIEVEMENTS', 'Achievements'
      ]
    );
    
    if (!awardsText || awardsText.trim().length < 10) {
      return awards;
    }
    // Pattern: "Award Name - Issuer, Date"
    const pattern = /([A-Z][A-Za-z\s']+(?:Award|Prize|Medal|Honor|Recognition|Scholarship|Grant))\s*[-–]?\s*([A-Za-z\s,&]+)?,?\s*(January|February|March|April|May|June|July|August|September|October|November|December)?\s*(\d{4})/gi;
    
    let match;
    while ((match = pattern.exec(awardsText)) !== null) {
      const title = match[1].trim();
      const issuer = match[2] ? match[2].trim() : '';
      const year = match[4];
      
      awards.push({
        title,
        issuer,
        date: year,
        description: ''
      });
    }
    
    // Also try bullet point format
    if (awards.length === 0) {
      const lines = awardsText.split('\n').filter(line => line.trim().length > 5);
      
      for (const line of lines) {
        const trimmed = line.trim();
        
        // Look for lines with award keywords
        if (trimmed.match(/Award|Prize|Medal|Honor|Recognition|Scholarship|Grant|Winner|Champion/i)) {
          const dateMatch = trimmed.match(/(\d{4})/);
          const year = dateMatch ? dateMatch[1] : '';
          
          awards.push({
            title: trimmed.replace(/\d{4}/g, '').trim(),
            issuer: '',
            date: year,
            description: ''
          });
        }
      }
    }
    
    return awards;
  }

}

module.exports = OptionalSectionsParser;
