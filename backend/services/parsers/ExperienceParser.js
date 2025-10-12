/**
 * Work Experience Parser Module
 * Handles extraction of work experience and employment history
 */

const BaseParser = require('./BaseParser');

class ExperienceParser extends BaseParser {
  constructor() {
    super();
    this.version = '2.0.1';
    console.log('💼 ExperienceParser v2.0.1 loaded');
  }

  parse(text, context = {}) {
    console.log('💼 ExperienceParser: Starting extraction...');
    
    const experience = [];
    
    // Extract experience section
    const experienceText = this.extractSection(
      text,
      [
        'WORK EXPERIENCE', 'Work Experience', 'EXPERIENCE', 'Experience',
        'PROFESSIONAL EXPERIENCE', 'Professional Experience', 'Employment',
        'EMPLOYMENT HISTORY', 'Employment History', 'Career History'
      ],
      [
        'EDUCATION', 'Education', 'PROJECTS', 'Projects', 'SKILLS', 'Skills',
        'CERTIFICATIONS', 'Certifications', 'ACHIEVEMENTS', 'Achievements'
      ]
    );
    
    if (!experienceText) {
      console.log('💼 ⚠️ No work experience section found');
      return { data: experience, confidence: 0 };
    }
    
    console.log('💼 Found experience section, length:', experienceText.length);
    console.log('💼 First 300 chars of experience section:', experienceText.substring(0, 300));
    
    // Try multiple experience patterns
    
    // Pattern 1: "Job Title - Company Name\nDate Range" (Adrian's format)
    const pattern1 = /([A-Z][A-Za-z\s]+(?:Intern|Assistant|Developer|Analyst|Manager|Director|Engineer|Specialist|Coordinator|Editor|Designer))\s*[-–]\s*([A-Z][A-Za-z\s&]+(?:Corp|Company|Solutions|Inc|LLC|Ltd))[^\n]*\s*\n?\s*([A-Z][a-z]+\s+\d{4})\s*-\s*([A-Z][a-z]+\s+\d{4}|Present|Current)/gi;
    
    let match;
    while ((match = pattern1.exec(experienceText)) !== null) {
      const title = match[1].trim();
      const company = match[2].trim();
      const startDate = match[3].trim();
      const endDate = match[4].trim();
      
      // Extract description (next few lines after the match)
      const remainingText = experienceText.substring(match.index + match[0].length);
      const description = this.extractJobDescription(remainingText);
      
      experience.push({
        title,
        company,
        startDate,
        endDate,
        location: '',
        description,
        responsibilities: this.extractResponsibilities(description)
      });
      
      console.log(`💼 ✅ Found experience (Pattern 1): ${title} at ${company}`);
    }
    
    // Pattern 2: "Job Title - Company (Date Range)"
    if (experience.length === 0) {
      const pattern2 = /([A-Z][A-Za-z\s]+(?:Intern|Assistant|Developer|Analyst|Manager|Director|Engineer|Specialist|Coordinator))\s*[-–]\s*([A-Z][A-Za-z\s&]+(?:Corp|Company|Solutions|Inc|LLC|Ltd))[^\n]*\(([A-Z][a-z]+\s+\d{4})\s*-\s*([A-Z][a-z]+\s+\d{4}|Present|Current)\)/gi;
      
      while ((match = pattern2.exec(experienceText)) !== null) {
        const title = match[1].trim();
        const company = match[2].trim();
        const startDate = match[3].trim();
        const endDate = match[4].trim();
        
        const remainingText = experienceText.substring(match.index + match[0].length);
        const description = this.extractJobDescription(remainingText);
        
        experience.push({
          title,
          company,
          startDate,
          endDate,
          location: '',
          description,
          responsibilities: this.extractResponsibilities(description)
        });
        
        console.log(`💼 ✅ Found experience (Pattern 2): ${title} at ${company}`);
      }
    }
    
    // Pattern 2.5: Adrian's specific format "Production Manager - Viral Coach LLC\nJune\n2024 - Present"
    if (experience.length === 0) {
      const pattern2_5 = /([A-Z][A-Za-z\s]+(?:Manager|Director|Engineer|Developer|Analyst|Specialist|Coordinator|Editor|Designer))\s*[-–]\s*([A-Z][A-Za-z\s&]+(?:LLC|Inc|Corp|Company|Solutions))[^\n]*\s*\n?\s*([A-Z][a-z]+)\s*\n?\s*(\d{4})\s*-\s*(Present|Current|\d{4})/gi;
      
      while ((match = pattern2_5.exec(experienceText)) !== null) {
        const title = match[1].trim();
        const company = match[2].trim();
        const startMonth = match[3].trim();
        const startYear = match[4].trim();
        const endDate = match[5].trim();
        
        const startDate = `${startMonth} ${startYear}`;
        
        const remainingText = experienceText.substring(match.index + match[0].length);
        const description = this.extractJobDescription(remainingText);
        
        experience.push({
          title,
          company,
          startDate,
          endDate,
          location: '',
          description,
          responsibilities: this.extractResponsibilities(description)
        });
        
        console.log(`💼 ✅ Found experience (Pattern 2.5): ${title} at ${company}`);
      }
    }
    
    // Pattern 2.6: Freelance work without company suffix "Freelance Video Editor and Graphic Designer January 2018 - May 2024"
    if (experience.length < 2) {
      const freelancePattern = /(Freelance\s+[A-Z][A-Za-z\s]+(?:Editor|Designer|Developer|Analyst|Manager|Specialist|Coordinator))\s+(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*-\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4}|Present|Current)/gi;
      
      while ((match = freelancePattern.exec(experienceText)) !== null) {
        const title = match[1].trim();
        const startMonth = match[2].trim();
        const startYear = match[3].trim();
        const endMonth = match[4].trim();
        const endYear = match[5].trim();
        
        const startDate = `${startMonth} ${startYear}`;
        const endDate = endYear === 'Present' || endYear === 'Current' ? endYear : `${endMonth} ${endYear}`;
        
        const remainingText = experienceText.substring(match.index + match[0].length);
        const description = this.extractJobDescription(remainingText);
        
        experience.push({
          title,
          company: 'Freelance',
          startDate,
          endDate,
          location: '',
          description,
          responsibilities: this.extractResponsibilities(description)
        });
        
        console.log(`💼 ✅ Found experience (Freelance Pattern): ${title}`);
      }
    }
    
    // Pattern 3: Simple format "Title\nCompany\nDates"
    if (experience.length === 0) {
      const lines = experienceText.split('\n').filter(line => line.trim());
      
      for (let i = 0; i < lines.length - 2; i++) {
        const titleLine = lines[i].trim();
        const companyLine = lines[i + 1].trim();
        const dateLine = lines[i + 2].trim();
        
        // Check if this looks like a job entry
        if (this.isJobTitle(titleLine) && this.isCompanyName(companyLine) && this.isDateRange(dateLine)) {
          const dateMatch = dateLine.match(/([A-Z][a-z]+\s+\d{4})\s*-\s*([A-Z][a-z]+\s+\d{4}|Present|Current)/);
          
          if (dateMatch) {
            const description = this.extractJobDescription(lines.slice(i + 3).join('\n'));
            
            experience.push({
              title: titleLine,
              company: companyLine,
              startDate: dateMatch[1],
              endDate: dateMatch[2],
              location: '',
              description,
              responsibilities: this.extractResponsibilities(description)
            });
            
            console.log(`💼 ✅ Found experience (Pattern 3): ${titleLine} at ${companyLine}`);
            i += 2; // Skip processed lines
          }
        }
      }
    }
    
    const confidence = this.calculateExperienceConfidence(experience, experienceText);
    
    console.log(`💼 ExperienceParser: Extraction complete (confidence: ${confidence.toFixed(2)})`);
    
    return {
      data: experience,
      confidence: confidence
    };
  }

  /**
   * Extract job description from text
   */
  extractJobDescription(text) {
    const lines = text.split('\n').filter(line => line.trim());
    const descriptionLines = [];
    
    for (const line of lines) {
      const trimmed = line.trim();
      
      // Stop if we hit another job title or section
      if (this.isJobTitle(trimmed) || this.isSectionHeader(trimmed)) {
        break;
      }
      
      // Include bullet points and descriptive text
      if (trimmed.startsWith('•') || trimmed.startsWith('-') || trimmed.length > 20) {
        descriptionLines.push(trimmed);
      }
      
      // Limit description length
      if (descriptionLines.length >= 5) break;
    }
    
    return descriptionLines.join('\n');
  }

  /**
   * Extract responsibilities from description
   */
  extractResponsibilities(description) {
    const lines = description.split('\n').filter(line => line.trim());
    return lines
      .filter(line => line.startsWith('•') || line.startsWith('-'))
      .map(line => line.replace(/^[•-]\s*/, '').trim())
      .filter(resp => resp.length > 10);
  }

  /**
   * Check if text looks like a job title
   */
  isJobTitle(text) {
    const jobKeywords = [
      'intern', 'assistant', 'developer', 'analyst', 'manager', 'director',
      'engineer', 'specialist', 'coordinator', 'lead', 'senior', 'junior',
      'consultant', 'supervisor', 'administrator', 'technician'
    ];
    
    return jobKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    ) && text.length < 100;
  }

  /**
   * Check if text looks like a company name
   */
  isCompanyName(text) {
    const companyKeywords = [
      'corp', 'company', 'solutions', 'inc', 'llc', 'ltd', 'technologies',
      'systems', 'services', 'group', 'enterprises', 'consulting', 'agency'
    ];
    
    return (companyKeywords.some(keyword => 
      text.toLowerCase().includes(keyword)
    ) || /^[A-Z][A-Za-z\s&]+$/.test(text)) && text.length < 100;
  }

  /**
   * Check if text looks like a date range
   */
  isDateRange(text) {
    return /[A-Z][a-z]+\s+\d{4}\s*-\s*([A-Z][a-z]+\s+\d{4}|Present|Current)/.test(text);
  }

  /**
   * Check if text is a section header
   */
  isSectionHeader(text) {
    const sectionHeaders = [
      'education', 'projects', 'skills', 'certifications', 'achievements',
      'personal', 'objective', 'summary'
    ];
    
    return sectionHeaders.some(header => 
      text.toLowerCase().includes(header)
    ) && text.length < 50;
  }

  /**
   * Calculate confidence score for experience extraction
   */
  calculateExperienceConfidence(experience, originalText) {
    if (experience.length === 0) return 0;
    
    let score = 0.5; // Base score for finding experience section
    
    // Bonus for each experience entry found
    score += Math.min(experience.length * 0.2, 0.3);
    
    // Bonus for complete information
    experience.forEach(exp => {
      if (exp.title && exp.company) score += 0.1;
      if (exp.startDate && exp.endDate) score += 0.05;
      if (exp.description && exp.description.length > 50) score += 0.05;
    });
    
    return Math.min(score, 1.0);
  }
}

module.exports = ExperienceParser;
