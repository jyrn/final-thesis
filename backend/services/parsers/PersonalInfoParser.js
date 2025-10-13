/**
 * Personal Information Parser Module
 * Handles extraction of name, email, phone, address, etc.
 */

const BaseParser = require('./BaseParser');

class PersonalInfoParser extends BaseParser {
  constructor() {
    super();
    this.version = '2.0.1';
  }

  parse(text, context = {}) {
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
      // Standard email pattern
      /([a-z0-9._-]+@[a-z0-9.-]+\.[a-z]{2,})/i,
      // Email with proper spacing (cleaned text)
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

    // Extract phone
    const phonePatterns = [
      /(\+?\d{1,3}[\s\-]?\(?\d{3}\)?[\s\-]?\d{3}[\s\-]?\d{4})/,
      /(\+?\d{11,13})/,
      /(\d{3}[\s\-]\d{3}[\s\-]\d{4})/
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
    const linkedinMatch = text.match(/linkedin\.com\/in\/([a-z0-9\-]+)/i);
    if (linkedinMatch) {
      personalInfo.linkedin = `https://linkedin.com/in/${linkedinMatch[1]}`;
      console.log('👤 Found LinkedIn:', personalInfo.linkedin);
    }

    // Extract GitHub
    const githubMatch = text.match(/github\.com\/([a-z0-9\-]+)/i);
    if (githubMatch) {
      personalInfo.github = `https://github.com/${githubMatch[1]}`;
      console.log('👤 Found GitHub:', personalInfo.github);
    }

    // Extract name (top of resume, before email)
    const nameResult = this.extractName(text, personalInfo.email);
    personalInfo.firstName = nameResult.firstName;
    personalInfo.lastName = nameResult.lastName;

    // Calculate confidence
    this.confidence = this.calculateConfidence(personalInfo, {
      firstName: 0.3,
      lastName: 0.3,
      email: 0.2,
      phone: 0.2
    });

    console.log('👤 PersonalInfoParser: Extraction complete (confidence:', this.confidence.toFixed(2), ')');

    return {
      data: personalInfo,
      confidence: this.confidence
    };
  }

  /**
   * Extract name from resume text
   */
  extractName(text, email = '') {
    console.log('👤 Extracting name...');
    
    // Strategy 1: Look at first 800 characters (increased for    // Enhanced name extraction for different formats
    console.log('👤 Extracting name...');
    const lines = text.split('\n').filter(line => line.trim());
    
    // Try multiple name extraction strategies
    const nameResult = this.extractNameFromText(text);
    if (nameResult.firstName) {
      return {
        firstName: nameResult.firstName,
        lastName: nameResult.lastName
      };
    } else {
      console.log('👤 ⚠️ Could not extract name');
      return { firstName: '', lastName: '' };
    }
  }

  extractNameFromText(text) {
    // Strategy 1: Look at first 800 characters (increased for more coverage)
    const topSection = text.substring(0, 800);
    const lines = topSection.split('\n').filter(l => l.trim().length > 0);
    
    console.log('👤 First 10 lines for name extraction:');
    lines.slice(0, 10).forEach((line, i) => {
      console.log(`👤   Line ${i + 1}: "${line.trim()}"`);
    });
    
    // Try to find name in first several lines
    for (let i = 0; i < Math.min(lines.length, 10); i++) {
      const line = lines[i].trim();
      
      // Multiple name patterns for different resume formats
      let nameAtStart = null;
      
      // Pattern 1: Standard format "Hannah Nicole L. Comia"
      nameAtStart = line.match(/^([A-Z][a-zA-Z]+(?:\s+[A-Z][a-zA-Z]*\.?\s*)*[A-Z][a-zA-Z]+)(?:\s|$)/);
      
      // Pattern 2: All caps format "SHAYLA BRIANNA S. BUENO"
      if (!nameAtStart) {
        nameAtStart = line.match(/^([A-Z]{2,}\s+[A-Z]{2,}(?:\s+[A-Z]\.?\s*)*[A-Z]{2,})(?:\s|$)/);
      }
      
      // Pattern 3: Mixed case with middle initial "Carlo Silvino R Dela Roca"
      if (!nameAtStart) {
        nameAtStart = line.match(/^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z]\.?\s*)*[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)(?:\s|$)/);
      }
      
      if (nameAtStart) {
        const fullName = nameAtStart[1].trim();
        const nameParts = fullName.split(/\s+/);
        if (nameParts.length >= 2) {
          let firstName = nameParts[0];
          let lastName = nameParts[nameParts.length - 1];
          
          // Special handling for names with initials like "Hannah Nicole L.Comia"
          // If we have 4+ parts and the second-to-last is an initial, use the last part
          if (nameParts.length >= 4) {
            const secondToLast = nameParts[nameParts.length - 2];
            if (secondToLast.length <= 2 && secondToLast.includes('.')) {
              // This is an initial, so lastName is correct
              lastName = nameParts[nameParts.length - 1];
            }
          }
          // If we have 3 parts like "Hannah Nicole Comia", use first and last
          else if (nameParts.length === 3) {
            lastName = nameParts[2]; // Use the actual last name, not middle name
          }
          
          console.log(`👤 Found name at start of line ${i + 1}:`, firstName, lastName);
          console.log(`👤 Full name parts:`, nameParts);
          return {
            firstName: firstName,
            lastName: lastName
          };
        }
      }
      
      // Skip if line contains email, phone, or URLs (but we already checked for name at start)
      if (line.match(/@|http|www\.|linkedin|github|\+?\d{3}[\s\-]\d{3}|tel:|phone/i)) {
        console.log(`👤   Skipping line ${i + 1}: contains contact info`);
        continue;
      }
      
      // Skip if line contains common resume headers
      if (line.match(/^(RESUME|CV|CURRICULUM|VITAE|PROFILE|SUMMARY|OBJECTIVE|CONTACT|EDUCATION|EXPERIENCE|SKILLS|PROJECTS)$/i)) {
        console.log(`👤   Skipping line ${i + 1}: is section header`);
        continue;
      }
      
      // Pattern 1: First Last or First Middle Last (standard case)
      const nameMatch = line.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?)*)\s+([A-Z][a-z]+)$/);
      if (nameMatch) {
        console.log('👤 Found name (pattern match):', nameMatch[1], nameMatch[2]);
        return {
          firstName: nameMatch[1],
          lastName: nameMatch[2]
        };
      }
      
      // Pattern 2: ALL CAPS name
      const allCapsMatch = line.match(/^([A-Z]{2,})\s+([A-Z]{2,})(?:\s+[A-Z]{2,})?$/);
      if (allCapsMatch) {
        console.log('👤 Found name (all caps):', allCapsMatch[1], allCapsMatch[2]);
        return {
          firstName: this.toTitleCase(allCapsMatch[1]),
          lastName: this.toTitleCase(allCapsMatch[2])
        };
      }
      
      // Pattern 3: Mixed case with possible middle name
      const mixedCaseMatch = line.match(/^([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]*\.?\s+)?([A-Z][a-zA-Z]+)$/);
      if (mixedCaseMatch && line.length < 50 && !line.match(/\d/)) {
        const firstName = mixedCaseMatch[1];
        const lastName = mixedCaseMatch[3];
        console.log('👤 Found name (mixed case):', firstName, lastName);
        return {
          firstName: firstName,
          lastName: lastName
        };
      }
      
      // Pattern 4: Name with comma (Last, First format)
      const commaMatch = line.match(/^([A-Z][a-zA-Z]+),\s+([A-Z][a-zA-Z]+)$/);
      if (commaMatch) {
        console.log('👤 Found name (comma format):', commaMatch[2], commaMatch[1]);
        return {
          firstName: commaMatch[2],
          lastName: commaMatch[1]
        };
      }
      
      // Pattern 5: Single word that might be a name (less reliable)
      if (i < 3 && line.length > 2 && line.length < 30 && /^[A-Z][a-zA-Z\s]+$/.test(line) && !line.match(/\d/)) {
        const words = line.split(/\s+/);
        if (words.length === 1 && words[0].length > 2) {
          // Check next line for potential last name
          if (i + 1 < lines.length) {
            const nextLine = lines[i + 1].trim();
            if (nextLine.length > 2 && nextLine.length < 30 && /^[A-Z][a-zA-Z]+$/.test(nextLine) && !nextLine.match(/\d|@|http/)) {
              console.log('👤 Found name (split lines):', words[0], nextLine);
              return {
                firstName: words[0],
                lastName: nextLine
              };
            }
          }
        }
      }
    }
    
    // Strategy 2: Extract from email if available
    if (email) {
      const emailName = this.extractNameFromEmail(email);
      if (emailName.firstName && emailName.lastName) {
        console.log('👤 Found name (from email):', emailName.firstName, emailName.lastName);
        return emailName;
      }
    }
    
    console.log('👤 ⚠️ Could not extract name');
    return { firstName: '', lastName: '' };
  }

  /**
   * Extract name from email address
   */
  extractNameFromEmail(email) {
    if (!email) return { firstName: '', lastName: '' };
    
    const localPart = email.split('@')[0];
    
    // Remove numbers and special chars
    const cleaned = localPart.replace(/[0-9._-]/g, ' ').trim();
    
    // Split into parts
    const parts = cleaned.split(/\s+/).filter(p => p.length > 1);
    
    if (parts.length >= 2) {
      return {
        firstName: this.toTitleCase(parts[0]),
        lastName: this.toTitleCase(parts[parts.length - 1])
      };
    } else if (parts.length === 1 && parts[0].length > 3) {
      // Try to split camelCase or concatenated name
      const camelSplit = parts[0].match(/[A-Z][a-z]+/g);
      if (camelSplit && camelSplit.length >= 2) {
        return {
          firstName: camelSplit[0],
          lastName: camelSplit[camelSplit.length - 1]
        };
      }
    }
    
    return { firstName: '', lastName: '' };
  }

  /**
   * Convert string to title case
   */
  toTitleCase(str) {
    return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
  }
}

module.exports = PersonalInfoParser;
