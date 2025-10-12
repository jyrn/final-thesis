/**
 * Enhanced Personal Information Parser Module
 * Handles extraction of name, email, phone, address, etc. for different resume formats
 */

const BaseParser = require('./BaseParser');

class EnhancedPersonalInfoParser extends BaseParser {
  constructor() {
    super();
    this.version = '2.1.0';
    console.log('👤 EnhancedPersonalInfoParser v2.1.0 loaded');
  }

  parse(text, context = {}) {
    console.log('👤 EnhancedPersonalInfoParser v2.1.0: Starting extraction...');
    
    const personalInfo = {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      address: '',
      linkedin: '',
      github: '',
      website: ''
    };

    // Extract email (improved with cleaned text)
    const emailPatterns = [
      /([a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
      /\b([a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,})\b/i
    ];
    
    for (const pattern of emailPatterns) {
      const emailMatch = text.match(pattern);
      if (emailMatch) {
        personalInfo.email = emailMatch[1].trim();
        console.log('👤 Found email:', personalInfo.email);
        break;
      }
    }

    // Extract phone with multiple patterns
    const phonePatterns = [
      /(\+?\d{1,3}[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})/,
      /(\+?\d{11,13})/,
      /(\d{3}[\s\-]\d{3}[\s\-]\d{4})/,
      /(\(\d{3}\)\s?\d{3}[\s\-]\d{4})/,
      /(\d{3}\.\d{3}\.\d{4})/
    ];
    
    for (const pattern of phonePatterns) {
      const phoneMatch = text.match(pattern);
      if (phoneMatch) {
        personalInfo.phone = phoneMatch[1].trim();
        console.log('👤 Found phone:', personalInfo.phone);
        break;
      }
    }

    // Extract LinkedIn
    const linkedinPatterns = [
      /linkedin\.com\/in\/([a-z0-9\-]+)/i,
      /\/in\/([a-z0-9\-]+)/i,
      /(https?:\/\/(?:www\.)?linkedin\.com\/in\/[a-z0-9\-]+)/i
    ];
    
    for (const pattern of linkedinPatterns) {
      const linkedinMatch = text.match(pattern);
      if (linkedinMatch) {
        personalInfo.linkedin = linkedinMatch[0].includes('http') ? 
          linkedinMatch[1] : `https://linkedin.com/in/${linkedinMatch[1]}`;
        console.log('👤 Found LinkedIn:', personalInfo.linkedin);
        break;
      }
    }

    // Extract GitHub
    const githubPatterns = [
      /github\.com\/([a-z0-9\-]+)/i,
      /(https?:\/\/(?:www\.)?github\.com\/[a-z0-9\-]+)/i
    ];
    
    for (const pattern of githubPatterns) {
      const githubMatch = text.match(pattern);
      if (githubMatch) {
        personalInfo.github = githubMatch[0].includes('http') ? 
          githubMatch[1] : `https://github.com/${githubMatch[1]}`;
        console.log('👤 Found GitHub:', personalInfo.github);
        break;
      }
    }

    // Enhanced name extraction for different formats
    const nameResult = this.extractNameFromText(text);
    if (nameResult.firstName) {
      personalInfo.firstName = nameResult.firstName;
      personalInfo.lastName = nameResult.lastName;
      console.log(`👤 Found name: ${personalInfo.firstName} ${personalInfo.lastName}`);
    } else {
      console.log('👤 ⚠️ Could not extract name');
    }

    // Calculate confidence
    this.confidence = this.calculatePersonalInfoConfidence(personalInfo);
    
    console.log(`👤 EnhancedPersonalInfoParser: Extraction complete (confidence: ${this.confidence.toFixed(2)} )`);
    
    return {
      data: personalInfo,
      confidence: this.confidence
    };
  }

  /**
   * Enhanced name extraction for different resume formats
   */
  extractNameFromText(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    
    // Strategy 1: Look for names in first few lines
    console.log('👤 Analyzing lines for name extraction:');
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i].trim();
      console.log(`👤   Line ${i + 1}: "${line}"`);
      
      // First, try to extract name from line even if it has contact info
      if (i === 0) {
        const namePatterns = [
          // Pattern for "Hannah Nicole L.Comia" (concatenated middle initial and last name)
          /^([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z]\.?[A-Z][a-z]+)/,
          /^([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+)/,
          /^([A-Z]+\s+[A-Z]+\s+[A-Z]\.?\s+[A-Z]+)/,
          /^([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s|$)/
        ];
        
        for (const pattern of namePatterns) {
          const nameMatch = line.match(pattern);
          if (nameMatch) {
            console.log(`👤   Found name in line ${i + 1}: "${nameMatch[1]}"`);
            return this.splitName(nameMatch[1]);
          }
        }
      }
      
      // Skip lines with too much contact info (but only after trying name extraction)
      if (this.hasContactInfo(line)) {
        console.log(`👤   Skipping line ${i + 1}: contains contact info`);
        continue;
      }
      
      // Skip if line is too short to be a full name
      if (line.length < 8) {
        console.log(`👤   Skipping line ${i + 1}: too short`);
        continue;
      }
      
      // Try different name patterns
      const namePatterns = [
        // Pattern 1: "SHAYLA BRIANNA S. BUENO" (all caps with middle initial)
        /^([A-Z]+\s+[A-Z]+\s+[A-Z]\.?\s+[A-Z]+)/,
        
        // Pattern 2: "Dr. Robert Chen, Ph.D." (academic format)
        /^(?:Dr\.?\s+|Prof\.?\s+)?([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?\s*)*[A-Z][a-z]+)(?:\s*,\s*(?:Ph\.?D\.?|M\.?D\.?|Jr\.?|Sr\.?))?/,
        
        // Pattern 3: "★ ALEX RIVERA ★" (creative format)
        /[★☆✨]+\s*([A-Z]+\s+[A-Z]+)\s*[★☆✨]+/,
        
        // Pattern 4: "SARAH JOHNSON" (all caps)
        /^([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]{2,})*)/,
        
        // Pattern 5: "Hannah Nicole L.Comia" (standard)
        /^([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?\s*)*[A-Z][a-z]+)/,
        
        // Pattern 6: "John Smith" (simple)
        /^([A-Z][a-z]+\s+[A-Z][a-z]+)/
      ];
      
      for (const pattern of namePatterns) {
        const match = line.match(pattern);
        if (match) {
          const fullName = match[1].trim();
          return this.splitName(fullName);
        }
      }
    }
    
    // Strategy 2: Look for name at the very beginning of text (even if line has contact info)
    const firstLine = lines[0] || '';
    console.log(`👤 Checking first line for name: "${firstLine.substring(0, 100)}..."`);
    
    // Try to extract name from beginning of first line - handle different formats
    const namePatterns = [
      // Pattern 1: "ADRIAN CARLO S. GALANG" (all caps with middle initial)
      /^([A-Z]+\s+[A-Z]+\s+[A-Z]\.?\s+[A-Z]+)/,
      // Pattern 2: "Hannah Nicole L. Comia" (title case with middle initial)
      /^([A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+)/,
      // Pattern 3: "John Smith" (simple first last)
      /^([A-Z][a-z]+\s+[A-Z][a-z]+)(?:\s|$)/
    ];
    
    for (const pattern of namePatterns) {
      const nameAtStart = firstLine.match(pattern);
      if (nameAtStart) {
        console.log(`👤 Found name at start of first line: "${nameAtStart[1]}"`);
        return this.splitName(nameAtStart[1]);
      }
    }
    
    console.log('👤 No name found at start of first line, trying other strategies...');
    
    // Strategy 3: Look for name patterns anywhere in first 500 chars
    const topSection = text.substring(0, 500);
    const nameInText = topSection.match(/\b([A-Z][a-z]+\s+[A-Z][a-z]+)\b/);
    if (nameInText) {
      return this.splitName(nameInText[1]);
    }
    
    return { firstName: '', lastName: '' };
  }

  /**
   * Check if line contains contact information
   */
  hasContactInfo(line) {
    const lowerLine = line.toLowerCase();
    return line.includes('@') || 
           line.includes('|') || 
           line.match(/\+?\d{10,}/) || 
           lowerLine.includes('email') ||
           lowerLine.includes('phone') ||
           lowerLine.includes('mobile') ||
           lowerLine.includes('linkedin') ||
           lowerLine.includes('github') ||
           lowerLine.includes('metro manila') ||
           lowerLine.includes('quezon city') ||
           lowerLine.includes('manila') ||
           lowerLine.includes('philippines') ||
           // Skip lines that are clearly location/contact info
           (lowerLine.includes('city') && lowerLine.includes('metro')) ||
           // Skip lines with multiple contact elements
           (line.includes('|') && (line.includes('@') || line.includes('+')));
  }

  /**
   * Split full name into first and last name
   */
  splitName(fullName) {
    // Handle concatenated middle initial and last name (e.g., "L.Comia" -> "L." "Comia")
    let processedName = fullName.trim();
    processedName = processedName.replace(/([A-Z]\.?)([A-Z][a-z]+)/, '$1 $2');
    
    const parts = processedName.split(/\s+/).filter(part => part.length > 0);
    
    // Remove titles and suffixes
    const titles = ['dr', 'prof', 'mr', 'mrs', 'ms', 'miss'];
    const suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', 'v', 'phd', 'md', 'esq'];
    
    const cleanParts = parts.filter(part => {
      const lower = part.toLowerCase().replace(/[.,]/g, '');
      return !titles.includes(lower) && !suffixes.includes(lower);
    });
    
    if (cleanParts.length === 0) return { firstName: '', lastName: '' };
    if (cleanParts.length === 1) return { firstName: cleanParts[0], lastName: '' };
    
    // Handle different name patterns
    if (cleanParts.length === 2) {
      return { firstName: cleanParts[0], lastName: cleanParts[1] };
    } else if (cleanParts.length === 3) {
      // 3 parts: "Hannah Nicole Comia" -> firstName: "Hannah Nicole", lastName: "Comia"
      return { firstName: `${cleanParts[0]} ${cleanParts[1]}`, lastName: cleanParts[2] };
    } else if (cleanParts.length === 4) {
      // 4 parts: "Hannah Nicole L. Comia" -> firstName: "Hannah Nicole", lastName: "Comia"
      // Check if 3rd part is middle initial (single letter with optional period)
      if (cleanParts[2].length <= 2 && cleanParts[2].match(/^[A-Z]\.?$/)) {
        return { firstName: `${cleanParts[0]} ${cleanParts[1]}`, lastName: cleanParts[3] };
      } else {
        // Otherwise, take first two as firstName, rest as lastName
        return { firstName: `${cleanParts[0]} ${cleanParts[1]}`, lastName: cleanParts.slice(2).join(' ') };
      }
    } else {
      // 5+ parts: take first two as firstName, rest as lastName
      return { firstName: `${cleanParts[0]} ${cleanParts[1]}`, lastName: cleanParts.slice(2).join(' ') };
    }
  }

  /**
   * Calculate confidence score for personal info
   */
  calculatePersonalInfoConfidence(personalInfo) {
    let score = 0;
    let maxScore = 0;
    
    // Name (most important)
    maxScore += 0.4;
    if (personalInfo.firstName && personalInfo.lastName) {
      score += 0.4;
    } else if (personalInfo.firstName) {
      score += 0.2;
    }
    
    // Email
    maxScore += 0.3;
    if (personalInfo.email) score += 0.3;
    
    // Phone
    maxScore += 0.2;
    if (personalInfo.phone) score += 0.2;
    
    // Social links
    maxScore += 0.1;
    if (personalInfo.linkedin || personalInfo.github) score += 0.1;
    
    return maxScore > 0 ? score / maxScore : 0;
  }
}

module.exports = EnhancedPersonalInfoParser;
