const BaseParser = require('./BaseParser');

/**
 * OptionalSectionsParser - Extracts volunteer experience, awards, achievements, and organizations
 * Version 1.0.0
 */
class OptionalSectionsParser extends BaseParser {
  constructor() {
    super();
    this.version = '1.0.0';
    console.log('💫 OptionalSectionsParser v1.0.0 loaded');
  }

  /**
   * Parse all optional sections from resume text
   */
  parse(text, context = {}) {
    console.log('💫 OptionalSectionsParser: Starting extraction...');
    
    const sections = {
      organizations: this.parseOrganizations(text),
      awards: this.parseAwards(text) // This includes both awards and achievements
    };
    
    console.log('💫 OptionalSectionsParser: Extraction complete');
    console.log(`💫   Organizations: ${sections.organizations.length}`);
    console.log(`💫   Awards & Achievements: ${sections.awards.length}`);
    
    return sections;
  }

  /**
   * Parse organizations/volunteer experience section
   */
  parseOrganizations(text) {
    const organizations = [];
    
    // Extract organizations section
    const orgText = this.extractSection(
      text,
      [
        'ORGANIZATIONS', 'Organizations', 'VOLUNTEER EXPERIENCE', 'Volunteer Experience',
        'VOLUNTEER WORK', 'Volunteer Work', 'COMMUNITY INVOLVEMENT', 'Community Involvement',
        'EXTRACURRICULAR', 'Extracurricular Activities', 'LEADERSHIP', 'Leadership Experience'
      ],
      [
        'EDUCATION', 'Education', 'EXPERIENCE', 'WORK EXPERIENCE', 'SKILLS', 'Skills',
        'PROJECTS', 'Projects', 'CERTIFICATIONS', 'Certifications', 'AWARDS', 'Awards'
      ]
    );
    
    if (!orgText || orgText.trim().length < 10) {
      return organizations;
    }
    
    console.log('💫 Found organizations section, length:', orgText.length);
    
    // Pattern 1: "Organization Name - Role\nDate Range\nDescription"
    const pattern1 = /([A-Z][A-Za-z\s&,]+(?:Club|Society|Organization|Association|Committee|Team|Council|Group))\s*[-–]\s*([A-Z][A-Za-z\s]+)\s+(January|February|March|April|May|June|July|August|September|October|November|December)?\s*(\d{4})\s*[-–]\s*(January|February|March|April|May|June|July|August|September|October|November|December)?\s*(\d{4}|Present|Current)/gi;
    
    let match;
    while ((match = pattern1.exec(orgText)) !== null) {
      const organization = match[1].trim();
      const role = match[2].trim();
      const startYear = match[4];
      const endYear = match[6];
      
      // Extract description (next 200 characters after match)
      const afterMatch = orgText.substring(match.index + match[0].length, match.index + match[0].length + 200);
      const description = afterMatch.split('\n')[0].trim();
      
      organizations.push({
        organization,
        role,
        startDate: startYear,
        endDate: endYear,
        description
      });
      
      console.log(`💫 ✅ Found organization: ${organization} - ${role}`);
    }
    
    // Pattern 2: Bullet point format
    if (organizations.length === 0) {
      const lines = orgText.split('\n').filter(line => line.trim().length > 0);
      
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Look for organization names with roles
        const orgMatch = line.match(/^([A-Z][A-Za-z\s&,]+(?:Club|Society|Organization|Association|Committee|Team|Council|Group))/);
        if (orgMatch) {
          const organization = orgMatch[1].trim();
          
          // Look for role and date in next lines
          let role = '';
          let startDate = '';
          let endDate = '';
          let description = '';
          
          for (let j = i + 1; j < Math.min(i + 4, lines.length); j++) {
            const nextLine = lines[j].trim();
            
            // Check for role
            if (nextLine.match(/^(President|Vice President|Member|Secretary|Treasurer|Coordinator|Leader|Chair|Director)/i)) {
              role = nextLine;
            }
            
            // Check for dates
            const dateMatch = nextLine.match(/(\d{4})\s*[-–]\s*(\d{4}|Present|Current)/i);
            if (dateMatch) {
              startDate = dateMatch[1];
              endDate = dateMatch[2];
            }
            
            // Collect description
            if (!dateMatch && !nextLine.match(/^(President|Vice President|Member)/i)) {
              description += nextLine + ' ';
            }
          }
          
          if (role || startDate) {
            organizations.push({
              organization,
              role: role || 'Member',
              startDate,
              endDate,
              description: description.trim()
            });
            
            console.log(`💫 ✅ Found organization: ${organization}`);
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
    
    console.log('💫 Found awards section, length:', awardsText.length);
    
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
      
      console.log(`💫 ✅ Found award: ${title}`);
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
          
          console.log(`💫 ✅ Found award: ${trimmed.substring(0, 50)}`);
        }
      }
    }
    
    return awards;
  }

}

module.exports = OptionalSectionsParser;
