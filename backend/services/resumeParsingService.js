const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

class ResumeParsingService {
  constructor() {
    this.tempDir = path.join(__dirname, '../temp');
    this.ensureTempDir();
  }

  ensureTempDir() {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }

  /**
   * Preprocess text for better parsing accuracy
   */
  preprocessText(text) {
    // Normalize whitespace and line breaks
    text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Enhanced preprocessing to fix common concatenation issues
    text = text
      // Fix common concatenation issues where sections get mashed together
      .replace(/([a-z])(EDUCATION|EXPERIENCE|SKILLS|PROJECTS|OBJECTIVE|WORK|PERSONAL|CERTIFICATIONS|AWARDS|ACHIEVEMENTS)/g, '$1\n$2')
      .replace(/(EDUCATION|EXPERIENCE|SKILLS|PROJECTS|OBJECTIVE|WORK|PERSONAL|CERTIFICATIONS|AWARDS|ACHIEVEMENTS)([A-Z][a-z])/g, '$1\n$2')
      
      // Fix name concatenation issues
      .replace(/([a-z])([A-Z][a-z]+[A-Z][a-z]+)/g, '$1\n$2') // Split concatenated names
      
      // Add line breaks before degree patterns
      .replace(/(Bachelor|Master|PhD|BS|BA|MS|MA|Associate|Certificate|Diploma)\s+(of|in)/gi, '\n$1 $2')
      
      // Add line breaks before school patterns
      .replace(/([a-z])(DeLaSalleLipa|SanPabloColleges|University|College|Institute|School|Academy)/gi, '$1\n$2')
      
      // Add line breaks before date patterns
      .replace(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi, '\n$1')
      .replace(/([a-z])(\d{4}\s*-\s*(?:\d{4}|Present|Current))/gi, '$1\n$2')
      
      // Add line breaks before contact info patterns
      .replace(/([a-zA-Z])(@[a-zA-Z])/g, '$1\n$2')
      .replace(/([a-zA-Z])(\+\d|\d{10,})/g, '$1\n$2')
      
      // Add line breaks before job title patterns
      .replace(/([a-z])(Production Manager|Video Editor|Graphic Designer|Software Engineer|Developer|Manager|Editor|Designer|Engineer|Analyst|Coordinator|Assistant|Specialist|Freelance|Intern|Student)/gi, '$1\n$2')
      
      // Add line breaks before technology and skill patterns
      .replace(/([a-z])(Technologies:|Programming:|Skills:|Languages:|Tools:|Frameworks:|Competencies:)/gi, '$1\n$2')
      .replace(/([a-z])(JavaScript|TypeScript|React|Angular|Vue|NodeJS|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|HTML|CSS|SQL|MySQL|PostgreSQL|MongoDB|Git|Docker|AWS|Azure|GCP)/gi, '$1\n$2')
      
      // Fix common concatenated words
      .replace(/([a-z])(ProblemSolving|CriticalThinking|ProjectManagement|TimeManagement|DataAnalysis|MachineLearning|UserExperience|UserInterface|WebDevelopment|MobileDevelopment|SoftwareDevelopment)/gi, '$1\n$2')
      
      // Add line breaks before company patterns
      .replace(/([a-z])(LLC|Inc|Corp|Company|Technologies|Systems|Solutions|Group)/gi, '$1\n$2');
    
    // Remove excessive whitespace
    text = text.replace(/[ \t]+/g, ' ');
    
    // Normalize common separators
    text = text.replace(/[–—]/g, '-'); // En dash, em dash to hyphen
    text = text.replace(/[""]/g, '"'); // Smart quotes to regular quotes
    text = text.replace(/['']/g, "'"); // Smart apostrophes
    
    // Remove page numbers and headers/footers
    text = text.replace(/^\s*Page \d+.*$/gm, '');
    text = text.replace(/^\s*\d+\s*$/gm, '');
    
    // Normalize section headers
    text = text.replace(/^([A-Z\s]{3,}):?\s*$/gm, (match, header) => {
      return header.trim().toLowerCase();
    });
    
    // Clean up line breaks
    text = text.replace(/\n\s+/g, '\n');
    text = text.replace(/\s+\n/g, '\n');
    
    return text.trim();
  }

  /**
   * Advanced rule-based name extraction
   */
  extractName(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Rule 1: Name confidence scoring
    const nameRules = [
      {
        pattern: /^[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/,
        score: 10, // Perfect case: "John Smith" or "Mary Jane Doe"
      },
      {
        pattern: /^[A-Z\s\.]+$/,
        score: 8, // All caps: "JOHN SMITH"
      },
      {
        pattern: /^[A-Za-z\s\.\-']+$/,
        score: 6, // Contains only name characters
      }
    ];
    
    const excludePatterns = [
      /resume|curriculum|cv/i,
      /@/,
      /\d{3,}/,
      /street|road|avenue|drive|lane/i,
      /phone|email|address|contact/i,
      /objective|summary|profile/i
    ];
    
    let bestCandidate = null;
    let bestScore = 0;
    
    // Check first 7 lines for name candidates
    for (let i = 0; i < Math.min(7, lines.length); i++) {
      const line = lines[i].trim();
      
      if (line.length < 3 || line.length > 60) continue;
      
      // Skip if matches exclude patterns
      if (excludePatterns.some(pattern => pattern.test(line))) continue;
      
      // Calculate score based on rules
      let score = 0;
      for (const rule of nameRules) {
        if (rule.pattern.test(line)) {
          score = Math.max(score, rule.score);
        }
      }
      
      // Bonus points for position in document
      if (i === 0) score += 3;
      if (i === 1) score += 2;
      if (i === 2) score += 1;
      
      // Bonus for word count (2-4 words is ideal)
      const wordCount = line.split(/\s+/).length;
      if (wordCount >= 2 && wordCount <= 4) score += 2;
      
      if (score > bestScore) {
        bestScore = score;
        bestCandidate = line;
      }
    }
    
    if (bestCandidate && bestScore >= 6) {
      return this.splitName(bestCandidate);
    }
    
    return { firstName: '', lastName: '' };
  }

  /**
   * Smart name splitting with cultural awareness
   */
  splitName(fullName) {
    const parts = fullName.trim().split(/\s+/).filter(part => part.length > 0);
    
    // Remove common titles and suffixes
    const titles = ['mr', 'mrs', 'ms', 'miss', 'dr', 'prof', 'sir', 'ma\'am'];
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
      // Could be "First Middle Last" or "First Last Last"
      return { firstName: cleanParts[0], lastName: cleanParts.slice(1).join(' ') };
    } else {
      // 4+ parts: take first as firstName, rest as lastName
      return { firstName: cleanParts[0], lastName: cleanParts.slice(1).join(' ') };
    }
  }

  /**
   * Extract address as a complete string (for dropdown form compatibility)
   */
  extractAddress(text) {
    const lines = text.split('\n').filter(line => line.trim());
    
    // Address confidence scoring patterns
    const addressPatterns = [
      {
        // Labeled address patterns (highest priority)
        pattern: /(?:Address|Location|Residence|Home|Contact Address):\s*([^\n]+(?:\n[^\n@]*)*)/i,
        score: 10,
        extract: (match) => match[1].split('\n')[0] // Take only first line
      },
      {
        // Street address with number (very specific)
        pattern: /\b\d+\s+[A-Za-z\s,]+(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Way|Circle|Cir\.?|Court|Ct\.?|Place|Pl\.?)\b[^@\n]*/i,
        score: 9,
        extract: (match) => match[0]
      },
      {
        // Philippine city/province format (specific)
        pattern: /\b[A-Za-z\s]+(?:City|Municipality)\s*,\s*[A-Za-z\s]+(?:Province|Region)(?:\s*,\s*Philippines)?/i,
        score: 8,
        extract: (match) => match[0]
      },
      {
        // Metro Manila specific
        pattern: /\b[A-Za-z\s]+(?:City|Municipality)?\s*,\s*Metro Manila(?:\s*,\s*Philippines)?/i,
        score: 8,
        extract: (match) => match[0]
      },
      {
        // Philippines suffix (lower priority)
        pattern: /\b[A-Za-z\s,]+,\s*Philippines\b/i,
        score: 6,
        extract: (match) => match[0]
      }
    ];
    
    let bestAddress = null;
    let bestScore = 0;
    
    // Try each pattern
    for (const addressPattern of addressPatterns) {
      const match = text.match(addressPattern.pattern);
      if (match) {
        const address = addressPattern.extract(match).trim();        // Validate address quality
        if (address.length >= 10 && 
            address.length <= 200 && 
            !address.includes('@') && 
            !address.match(/\d{10,}/) && // Avoid phone numbers
            !address.match(/\b(?:GPA|Grade|Semester|Year|AY|Academic|Honor|Award|Dean|List|Magna|Summa|Cum Laude)\b/i) && // Avoid academic info
            !address.match(/\b(?:Present|Current|Bachelor|Master|PhD|Degree|Course|Subject)\b/i) && // Avoid education info
            !address.match(/\b(?:Experience|Work|Job|Position|Company|Employer)\b/i)) { // Avoid work info
          
          let score = addressPattern.score;
          
          // Bonus for containing common address elements
          if (address.match(/\b(?:City|Municipality|Province|Region|Philippines|Metro Manila)\b/i)) score += 2;
          if (address.match(/\b\d+\b/)) score += 1; // Has numbers (house number, zip)
          if (address.includes(',')) score += 1; // Has proper formatting
          
          if (score > bestScore) {
            bestScore = score;
            bestAddress = address;          }
        } else {        }
      }
    }
    
    // Clean up the address
    if (bestAddress) {
      bestAddress = bestAddress
        .replace(/\s+/g, ' ') // Normalize whitespace
        .replace(/[|\t]/g, ' ') // Replace pipes and tabs
        .replace(/^[•\-\*]\s*/, '') // Remove bullet points
        .trim();
    }
    
    return bestAddress;
  }

  /**
   * Extract address from contact info lines (handles pipe-separated format)
   */
  extractAddressFromContactLine(line) {
    // Handle pipe-separated contact info: "City,Province|Phone|Email"
    const parts = line.split('|');
    
    for (const part of parts) {
      const trimmedPart = part.trim();
      
      // Skip if it's clearly phone or email
      if (trimmedPart.includes('@') || trimmedPart.match(/^\d+$/)) {
        continue;
      }
      
      // Check if this part looks like an address
      if (trimmedPart.match(/\b[A-Za-z\s,]+(?:City|Municipality|Province|Region)\b/i) ||
          trimmedPart.match(/\b[A-Za-z\s,]+,\s*[A-Za-z\s]+\b/) ||
          trimmedPart.length > 10) {
        
        // Clean up the address part
        const cleanAddress = trimmedPart
          .replace(/^\W+/, '') // Remove leading non-word chars
          .replace(/\W+$/, '') // Remove trailing non-word chars
          .trim();
          
        if (cleanAddress.length >= 5 && cleanAddress.length <= 100) {
          return cleanAddress;
        }
      }
    }
    
    return null;
  }

  /**
   * Context-aware section detection
   */
  detectSections(text) {
    const sections = {};
    const lines = text.split('\n');
    
    // Define section patterns with confidence scores
    const sectionPatterns = [
      { key: 'experience', patterns: [/^(?:work\s+)?experience$/i, /^(?:employment\s+)?history$/i, /^professional\s+experience$/i], score: 10 },
      { key: 'education', patterns: [/^education$/i, /^educational\s+background$/i, /^academic\s+qualifications$/i], score: 10 },
      { key: 'skills', patterns: [/^(?:technical\s+)?skills$/i, /^competencies$/i, /^core\s+competencies$/i], score: 10 },
      { key: 'summary', patterns: [/^(?:professional\s+)?summary$/i, /^objective$/i, /^profile$/i, /^about$/i], score: 10 },
      { key: 'certifications', patterns: [/^certifications?$/i, /^licenses?$/i, /^credentials$/i], score: 10 }
    ];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim().toLowerCase();
      
      for (const section of sectionPatterns) {
        for (const pattern of section.patterns) {
          if (pattern.test(line)) {
            sections[section.key] = {
              startLine: i,
              endLine: this.findSectionEnd(lines, i),
              confidence: section.score
            };
            break;
          }
        }
      }
    }
    
    return sections;
  }

  /**
   * Find the end of a section using contextual rules
   */
  findSectionEnd(lines, startLine) {
    const sectionHeaders = /^(?:experience|education|skills|summary|objective|certifications?|licenses?|projects?|awards?|references?)$/i;
    
    for (let i = startLine + 1; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // End if we hit another section header
      if (sectionHeaders.test(line)) {
        return i - 1;
      }
      
      // End if we hit multiple empty lines (likely end of document)
      if (i < lines.length - 2 && 
          !lines[i].trim() && 
          !lines[i + 1].trim() && 
          !lines[i + 2].trim()) {
        return i - 1;
      }
    }
    
    return lines.length - 1;
  }

  /**
   * Extract text from PDF using Python script with PyPDF2 and Tesseract
   */
  async extractTextFromPDF(pdfBuffer) {
    return new Promise((resolve, reject) => {
      const tempPdfPath = path.join(this.tempDir, `resume_${Date.now()}.pdf`);
      
      try {
        // Write PDF buffer to temporary file
        fs.writeFileSync(tempPdfPath, pdfBuffer);        // Run Python script for text extraction
        const pythonScript = path.join(__dirname, 'pdf_parser.py');
        const python = spawn('python', [pythonScript, tempPdfPath]);        let extractedText = '';
        let errorOutput = '';
        
        python.stdout.on('data', (data) => {
          extractedText += data.toString();
        });
        
        python.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        // Set timeout for multi-page PDFs (2 minutes)
        const timeout = setTimeout(() => {
          python.kill();          reject(new Error('PDF extraction timeout - file may be too large or complex'));
        }, 120000);

        python.on('close', (code) => {
          clearTimeout(timeout);
          
          // Clean up temporary file
          try {
            fs.unlinkSync(tempPdfPath);
          } catch (cleanupError) {          }
          
          if (code === 0) {            resolve(extractedText.trim());
          } else {            reject(new Error(`PDF extraction failed: ${errorOutput}`));
          }
        });
        
      } catch (error) {
        // Clean up on error
        try {
          if (fs.existsSync(tempPdfPath)) {
            fs.unlinkSync(tempPdfPath);
          }
        } catch (cleanupError) {        }
        reject(error);
      }
    });
  }

  /**
   * Parse extracted text using advanced rule-based NLP patterns
   */
  parseResumeText(text) {
    // Preprocessing: normalize text
    text = this.preprocessText(text);
    const parsedData = {
      personalInfo: {
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        address: ''
      },
      summary: '',
      experience: [],
      education: [],
      skills: [],
      certifications: []
    };

    try {
      // Use advanced rule-based parsing      // 1. Extract name using confidence scoring
      const nameResult = this.extractName(text);
      parsedData.personalInfo.firstName = nameResult.firstName;
      parsedData.personalInfo.lastName = nameResult.lastName;
      
      // 2. Extract email with validation
      const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
      if (emailMatch) {
        parsedData.personalInfo.email = emailMatch[0];
      }

      // 3. Extract phone number with multiple format support
      const phonePatterns = [
        /(?:\+?63|0)[\s\-\.]?9\d{2}[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g, // Philippine mobile
        /(?:\+?63|0)[\s\-\.]?\d{3}[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g, // Philippine landline
        /\+?\d{1,3}[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,4}[\s\-\.]?\d{3,4}/g, // International
        /\(\d{3}\)[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g, // US format
        /\d{3}[\s\-\.]?\d{3}[\s\-\.]?\d{4}/g // Simple format
      ];
      
      for (const pattern of phonePatterns) {
        const phoneMatch = text.match(pattern);
        if (phoneMatch) {
          let phone = phoneMatch[0].replace(/[\s\-\.]/g, '');
          if (phone.length >= 10 && phone.length <= 15) {
            parsedData.personalInfo.phone = phone;
            break;
          }
        }
      }

      // 4. Detect sections using contextual analysis
      const sections = this.detectSections(text);      // 5. Extract address as a single field (for dropdown compatibility)
      const addressResult = this.extractAddress(text);
      if (addressResult) {
        parsedData.personalInfo.address = addressResult;      } else {        // Try to find any location-related text for debugging
        const locationHints = text.match(/\b[A-Za-z\s,]+(?:City|Municipality|Province|Region|Philippines|Metro Manila)\b/gi);
        if (locationHints) {        }
        
        // Debug: Show lines that might contain address info
        const addressKeywords = ['address', 'location', 'residence', 'home', 'city', 'province', 'philippines', 'metro manila'];
        const addressLines = text.split('\n').filter(line => 
          addressKeywords.some(keyword => line.toLowerCase().includes(keyword))
        );
        if (addressLines.length > 0) {          // Try to extract address from contact info lines
          for (const line of addressLines.slice(0, 3)) {
            const cleanedAddress = this.extractAddressFromContactLine(line);
            if (cleanedAddress) {              parsedData.personalInfo.address = cleanedAddress;
              break;
            }
          }
        }
      }

      // Extract summary/objective
      const summaryPatterns = [
        /(?:Summary|Objective|Profile|About|Overview)[\s:]*\n?((?:[^\n]+\n?){1,5})/i,
        /(?:Career\s+Objective|Professional\s+Summary)[\s:]*\n?((?:[^\n]+\n?){1,5})/i
      ];
      
      for (const pattern of summaryPatterns) {
        const summaryMatch = text.match(pattern);
        if (summaryMatch && summaryMatch[1]) {
          parsedData.summary = summaryMatch[1].trim();
          break;
        }
      }

      // 5. Extract sections using detected boundaries with fallbacks
      const lines = text.split('\n');
      
      // Extract experience using detected section only
      if (sections.experience) {
        const experienceText = lines.slice(sections.experience.startLine + 1, sections.experience.endLine + 1).join('\n');        parsedData.experience = this.parseExperience(experienceText);      } else {        parsedData.experience = [];
      }

      // Extract education using detected section only
      if (sections.education) {
        const educationText = lines.slice(sections.education.startLine + 1, sections.education.endLine + 1).join('\n');        parsedData.education = this.parseEducation(educationText);      } else {        parsedData.education = [];
      }

      // Extract skills using detected section only
      if (sections.skills) {
        const skillsText = lines.slice(sections.skills.startLine + 1, sections.skills.endLine + 1).join('\n');
        parsedData.skills = this.parseSkills(skillsText);      } else {        parsedData.skills = [];
      }

      // Extract summary using detected section only
      if (sections.summary) {
        const summaryText = lines.slice(sections.summary.startLine + 1, sections.summary.endLine + 1).join('\n');
        parsedData.summary = summaryText.trim();      } else {        parsedData.summary = '';
      }

      // Extract certifications using detected section only
      if (sections.certifications) {
        const certificationsText = lines.slice(sections.certifications.startLine + 1, sections.certifications.endLine + 1).join('\n');
        parsedData.certifications = this.parseCertifications(certificationsText);      } else {        parsedData.certifications = [];
      }

    } catch (error) {    }

    return parsedData;
  }


  /**
   * Parse work experience section
   */
  parseExperience(experienceText) {
    const experiences = [];
    
    // Split by double newlines or common separators
    const entries = experienceText.split(/\n\s*\n|(?=\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4})|(?=\d{4}\s*[-–—]\s*(?:\d{4}|present|current))/i)
      .filter(entry => entry.trim() && entry.length > 20);

    for (const entry of entries) {
      const lines = entry.split('\n').filter(line => line.trim());
      if (lines.length < 1) continue;

      const experience = {
        company: '',
        position: '',
        duration: '',
        description: '',
        location: '',
        startDate: '',
        endDate: ''
      };

      let positionFound = false;
      let companyFound = false;
      let dateFound = false;
      
      // Process each line to extract information
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines or bullet points without content
        if (!line || line.match(/^[•\-\*]\s*$/)) continue;
        
        // Check for dates first
        const dateMatch = line.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}\s*[-–—]\s*(?:\d{4}|present|current)/i);
        if (dateMatch && !dateFound) {
          experience.duration = line;
          dateFound = true;
          
          // Extract start and end dates
          const yearMatches = line.match(/\d{4}/g);
          if (yearMatches && yearMatches.length >= 1) {
            experience.startDate = yearMatches[0];
            if (yearMatches.length >= 2) {
              experience.endDate = yearMatches[1];
            } else if (line.match(/present|current/i)) {
              experience.endDate = 'present';
            }
          }
          continue;
        }
        
        // Look for position and company patterns
        const atPattern = line.match(/^(.+?)\s+(?:at|@)\s+(.+)$/i);
        const dashPattern = line.match(/^(.+?)\s*[-–—]\s*(.+)$/);
        
        if (atPattern && !positionFound && !companyFound) {
          experience.position = atPattern[1].trim();
          experience.company = atPattern[2].trim();
          positionFound = true;
          companyFound = true;
        } else if (dashPattern && !positionFound && !companyFound) {
          // Could be "Position - Company" or "Company - Position"
          const part1 = dashPattern[1].trim();
          const part2 = dashPattern[2].trim();
          
          // Heuristic: if part2 contains common company words, it's likely the company
          if (part2.match(/\b(?:inc|corp|company|ltd|llc|group|systems|solutions|technologies)\b/i)) {
            experience.position = part1;
            experience.company = part2;
          } else {
            experience.position = part2;
            experience.company = part1;
          }
          positionFound = true;
          companyFound = true;
        } else if (!positionFound && !line.match(/\d{4}/) && !line.includes('•') && line.length > 5) {
          // First non-date line is likely the position
          experience.position = line;
          positionFound = true;
        } else if (!companyFound && positionFound && !line.match(/\d{4}/) && !line.includes('•') && line.length > 5) {
          // Second non-date line might be company
          experience.company = line;
          companyFound = true;
        } else if (line.includes('•') || line.includes('-') || (line.length > 30 && !line.match(/\d{4}/))) {
          // This looks like a description
          if (experience.description) {
            experience.description += '\n' + line;
          } else {
            experience.description = line;
          }
        }
      }

      // Clean up description
      if (experience.description) {
        experience.description = experience.description
          .replace(/^[•\-\*]\s*/gm, '') // Remove bullet points
          .replace(/\s+/g, ' ') // Normalize whitespace
          .trim();
      }

      // Only add if we have at least position or company
      if (experience.position || experience.company) {
        experiences.push(experience);
      }
    }

    return experiences.length > 0 ? experiences : [{
      company: '',
      position: '',
      duration: '',
      description: '',
      location: '',
      startDate: '',
      endDate: ''
    }];
  }

  /**
   * Parse education section with improved logic
   */
  parseEducation(educationText) {
    const educationEntries = [];
    
    // Preprocess the text to normalize formatting
    let processedText = educationText
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces between camelCase
      .replace(/(\d{4})\s*-\s*(\d{4}|\w+)/g, ' ($1 - $2)') // Normalize date format
      .trim();    // Split by lines first, then group logically
    const lines = educationText.split('\n').filter(line => line.trim());    const entries = [];
    let currentEntry = '';
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      
      // Check if this line starts a new education entry (contains school name)
      const isNewEntry = (line.match(/\b(?:De\s*La\s*Salle\s*Lipa|San\s*Pablo\s*Colleges|University|College|Institute|School)\b/i) && 
                         !line.match(/\b(?:GPA|Grade|Honor|Award|Semester|Year|AY|Strand|Average)\b/i)) ||
                         // Also split on lines that start with a school name
                         line.match(/^(?:De\s*La\s*Salle\s*Lipa|San\s*Pablo\s*Colleges)/i);
      
      if (isNewEntry && currentEntry.trim()) {
        // Save previous entry
        entries.push(currentEntry.trim());
        currentEntry = line;
      } else {
        // Add to current entry
        if (currentEntry) {
          currentEntry += '\n' + line;
        } else {
          currentEntry = line;
        }
      }
    }
    
    // Add the last entry
    if (currentEntry.trim()) {
      entries.push(currentEntry.trim());
    }    for (const entry of entries) {
      const lines = entry.split('\n').filter(line => line.trim());
      if (lines.length === 0) continue;

      const education = {
        degree: '',
        school: '',
        location: '',
        startDate: '',
        endDate: '',
        description: '' // For GPA, honors, coursework, etc.
      };

      let degreeFound = false;
      let schoolFound = false;
      let dateFound = false;      // Process each line to extract information
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        
        // Skip empty lines
        if (!line) continue;
        
        // Handle comma-separated format: "School,Degree" or "School, Degree"
        if (line.includes(',') && !degreeFound && !schoolFound) {
          const parts = line.split(',').map(p => p.trim());          for (let j = 0; j < parts.length; j++) {
            const part = parts[j];
            
            // Check if this part is a school (more specific patterns)
            if (part.match(/(?:De\s*La\s*Salle\s*Lipa|San\s*Pablo\s*Colleges|University|College|Institute|School|Academy)/i)) {
              // Better space formatting for school names
              let schoolName = part;
              // Add spaces before capital letters (but not at the start)
              schoolName = schoolName.replace(/([a-z])([A-Z])/g, '$1 $2');
              // Handle specific cases
              schoolName = schoolName.replace(/DeLaSalle/gi, 'De La Salle');
              schoolName = schoolName.replace(/SanPablo/gi, 'San Pablo');
              education.school = schoolName.trim();
              schoolFound = true;            }
            // Check if this part is a degree (avoid strand/subject descriptions)
            else if (part.match(/\b(?:Bachelor|Master|PhD|BS|BA|MS|MA|Science.*Computer|Arts|Senior\s*High|High\s*School)\b/i) && 
                     !part.match(/\b(?:Strand|Technology|Engineering|Mathematics|STEM)\b/i)) {
              
              // Extract dates from this part if present
              const dateInPart = part.match(/\d{4}\s*-\s*(?:\d{4}|Present|Current)/i);
              if (dateInPart && !dateFound) {
                const yearMatches = part.match(/\d{4}/g);
                if (yearMatches && yearMatches.length >= 1) {
                  education.startDate = yearMatches[0];
                  if (yearMatches.length >= 2) {
                    education.endDate = yearMatches[1];
                  } else if (part.match(/present|current/i)) {
                    education.endDate = 'present';
                  }
                  dateFound = true;                }
              }
              
              // Clean degree text (remove dates)
              const cleanDegree = part.replace(/\d{4}\s*-\s*(?:\d{4}|Present|Current)/i, '').trim();
              // Better space formatting for degree names
              let degreeName = cleanDegree;
              // Add spaces before capital letters (but not at the start)
              degreeName = degreeName.replace(/([a-z])([A-Z])/g, '$1 $2');
              // Handle specific degree cases
              degreeName = degreeName.replace(/BachelorofScienceinComputerScience/gi, 'Bachelor of Science in Computer Science');
              degreeName = degreeName.replace(/SeniorHighSchool/gi, 'Senior High School');
              education.degree = degreeName.trim();
              degreeFound = true;            }
          }
          continue;
        }
        
        // Check for dates (comprehensive patterns)
        const dateMatch = line.match(/\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{4}|\d{4}\s*[-–—]\s*(?:\d{4}|present|current)|\d{4}\s*-\s*(?:\d{4}|Present|Current)|\(\d{4}\s*-\s*\d{4}\)|\d{4}\s*-\s*\d{4}/i);
        if (dateMatch && !dateFound) {
          dateFound = true;
          
          // Extract start and end dates
          const yearMatches = line.match(/\d{4}/g);
          if (yearMatches && yearMatches.length >= 1) {
            education.startDate = yearMatches[0];
            if (yearMatches.length >= 2) {
              education.endDate = yearMatches[1];
            } else if (line.match(/present|current/i)) {
              education.endDate = 'present';
            }
          }          continue;
        }
        
        // Also check for dates within comma-separated parts
        if (line.includes(',')) {
          const parts = line.split(',');
          for (const part of parts) {
            const partDateMatch = part.trim().match(/\d{4}\s*-\s*(?:\d{4}|Present|Current)/i);
            if (partDateMatch && !dateFound) {
              dateFound = true;
              const yearMatches = part.match(/\d{4}/g);
              if (yearMatches && yearMatches.length >= 1) {
                education.startDate = yearMatches[0];
                if (yearMatches.length >= 2) {
                  education.endDate = yearMatches[1];
                } else if (part.match(/present|current/i)) {
                  education.endDate = 'present';
                }
              }              break;
            }
          }
        }
        
        // Enhanced degree patterns (more specific)
        const degreePatterns = [
          /\b(?:Bachelor of Science in|Bachelor of Arts in|Master of Science in|Master of Arts in)\b.*$/i,
          /\b(?:Bachelor|Master|PhD|Doctorate|Associate|Certificate|Diploma)\b(?:\s+(?:of|in)\s+[A-Za-z\s]+)?$/i,
          /\b(?:BS|BA|MS|MA|BSc|MSc|B\.S\.|M\.S\.|B\.A\.|M\.A\.)\b(?:\s+[A-Za-z\s]+)?$/i,
          /\b(?:Doctor of|Bachelor of|Master of)\b.*$/i,
          /\b(?:High School|Senior High School|Elementary)\b.*$/i
        ];
        
        // Enhanced school patterns (more specific)
        const schoolPatterns = [
          /^[A-Za-z\s]+(?:University|College|Institute|School|Academy)$/i, // Must end with institution type
          /^(?:University of|College of)\s+[A-Za-z\s]+$/i,
          /^[A-Za-z\s]+(?:State University|National University|Polytechnic)$/i,
          /^(?:UP|UST|DLSU|AdMU|FEU|TIP|PUP|PLM)(?:\s+[A-Za-z\s]*)?$/i, // Philippine universities
          /^De La Salle\s+[A-Za-z\s]*$/i,
          /^San Pablo\s+[A-Za-z\s]*$/i
        ];
        
        // Check for degree patterns first (more specific matching)
        if (!degreeFound) {
          for (const pattern of degreePatterns) {
            if (pattern.test(line)) {
              // Make sure it's not a school name
              const hasSchoolWords = /\b(?:University|College|Institute|School|Academy)\b/i.test(line);
              if (!hasSchoolWords || line.match(/\b(?:Bachelor|Master|PhD|BS|BA|MS|MA)\b/i)) {
                education.degree = line;
                degreeFound = true;                break;
              }
            }
          }
        }
        
        // Check for school patterns (must not contain degree words)
        if (!schoolFound) {
          for (const pattern of schoolPatterns) {
            if (pattern.test(line)) {
              // Make sure it's not a degree
              const hasDegreeWords = /\b(?:Bachelor|Master|PhD|BS|BA|MS|MA|Doctorate|Associate|Certificate|Diploma)\b/i.test(line);
              if (!hasDegreeWords) {
                education.school = line;
                schoolFound = true;                break;
              }
            }
          }
        }
        
        // If no patterns matched, try to intelligently assign
        if (!degreeFound && !schoolFound && !dateFound) {
          // Analyze the line to determine if it's more likely a degree or school
          const hasSchoolWords = /\b(?:University|College|Institute|School|Academy)\b/i.test(line);
          const hasDegreeWords = /\b(?:Bachelor|Master|PhD|BS|BA|MS|MA|Science|Arts|Computer|Engineering)\b/i.test(line);
          
          if (line.length > 5 && !line.includes('•') && !line.match(/\b(?:GPA|Grade|Honor|Award|Present)\b/i)) {
            if (hasSchoolWords && !hasDegreeWords) {
              education.school = line;
              schoolFound = true;            } else if (hasDegreeWords || (!hasSchoolWords && line.length < 50)) {
              education.degree = line;
              degreeFound = true;            }
          }
        }
        
        // Check for location patterns
        if (line.match(/\b[A-Za-z\s,]+(?:City|Municipality|Province|Philippines)\b/i) && !education.location) {
          education.location = line;
        }
        
        // Check for description patterns (GPA, honors, coursework, etc.)
        if (line.match(/\b(?:GPA|Grade|Magna Cum Laude|Summa Cum Laude|Cum Laude|Dean's List|Honors|Honor|Scholarship|Award|Awardee|Average|Graduated|Second|First|Third)\b/i) ||
            line.match(/\b(?:Coursework|Relevant Courses|Major|Minor|Concentration|Specialization|Strand)\b/i) ||
            line.match(/\b\d+\.\d+\s*(?:GPA|Grade)\b/i) ||
            line.match(/\b(?:AY|Academic Year|Semester|Year)\b/i) ||
            line.includes('•') || line.includes('-') || line.includes('(') || line.includes(')')) {
          
          if (education.description) {
            education.description += '\n' + line;
          } else {
            education.description = line;
          }        }
      }

      // Fallback logic if still no degree/school found
      if (!degreeFound && !schoolFound && lines.length > 0) {
        // Use first line as degree
        education.degree = lines[0].trim();
        if (lines.length > 1) {
          // Use second line as school if it's not a date
          const secondLine = lines[1].trim();
          if (!secondLine.match(/\d{4}/)) {
            education.school = secondLine;
          }
        }
      }

      // Clean up degree and school names
      if (education.degree) {
        education.degree = education.degree
          .replace(/^[•\-\*]\s*/, '') // Remove bullet points
          .replace(/^\d+\.\s*/, '') // Remove numbering
          .trim();
      }
      
      if (education.school) {
        education.school = education.school
          .replace(/^[•\-\*]\s*/, '') // Remove bullet points
          .replace(/^\d+\.\s*/, '') // Remove numbering
          .trim();
      }

      // Only add if we have at least degree or school
      if (education.degree || education.school) {
        educationEntries.push(education);
      }
    }

    return educationEntries.length > 0 ? educationEntries : [{
      degree: '',
      school: '',
      location: '',
      startDate: '',
      endDate: '',
      description: ''
    }];
  }

  /**
   * Parse skills section
   */
  parseSkills(skillsText) {
    const skills = [];
    
    // First, try to split by common patterns
    let skillItems = [];
    
    // Pattern 1: Bullet points or dashes
    if (skillsText.includes('•') || skillsText.includes('-')) {
      skillItems = skillsText.split(/[•\-]/).map(skill => skill.trim()).filter(skill => skill);
    }
    // Pattern 2: Comma separated
    else if (skillsText.includes(',')) {
      skillItems = skillsText.split(',').map(skill => skill.trim()).filter(skill => skill);
    }
    // Pattern 3: Pipe separated
    else if (skillsText.includes('|')) {
      skillItems = skillsText.split('|').map(skill => skill.trim()).filter(skill => skill);
    }
    // Pattern 4: Newline separated
    else {
      skillItems = skillsText.split('\n').map(skill => skill.trim()).filter(skill => skill);
    }
    
    for (const skill of skillItems) {
      // Clean up skill text
      let cleanSkill = skill
        .replace(/^[\-•\*]\s*/, '') // Remove bullet points
        .replace(/^\d+\.\s*/, '') // Remove numbering
        .replace(/[:;]\s*$/, '') // Remove trailing colons/semicolons
        .trim();
      
      // Skip if too short, too long, or contains unwanted patterns
      if (!cleanSkill || 
          cleanSkill.length < 2 || 
          cleanSkill.length > 50 ||
          cleanSkill.match(/^\d+$/) || // Just numbers
          cleanSkill.toLowerCase().includes('skills') ||
          cleanSkill.toLowerCase().includes('competencies') ||
          cleanSkill.toLowerCase().includes('technical') ||
          cleanSkill.toLowerCase().includes('proficient')) {
        continue;
      }
      
      // Further split if it contains multiple skills in one line
      if (cleanSkill.includes(',') && cleanSkill.length > 30) {
        const subSkills = cleanSkill.split(',').map(s => s.trim()).filter(s => s.length > 1 && s.length < 30);
        skills.push(...subSkills);
      } else {
        skills.push(cleanSkill);
      }
    }
    
    // Remove duplicates and limit to reasonable number
    const uniqueSkills = [...new Set(skills)].slice(0, 20);
    
    return uniqueSkills.length > 0 ? uniqueSkills : [''];
  }

  /**
   * Parse certifications section
   */
  parseCertifications(certificationsText) {
    const certifications = [];
    
    // Split by lines or bullet points
    const certItems = certificationsText.split(/\n|•/).map(cert => cert.trim()).filter(cert => cert);
    
    for (const cert of certItems) {
      const cleanCert = cert.replace(/^[\-•]\s*/, '').trim();
      if (cleanCert && cleanCert.length > 3) {
        certifications.push(cleanCert);
      }
    }

    return certifications.length > 0 ? certifications : [''];
  }

  /**
   * Main method to parse uploaded resume
   */
  async parseResume(pdfBuffer) {
    try {      // Extract text from PDF
      const extractedText = await this.extractTextFromPDF(pdfBuffer);      // Parse the extracted text
      const parsedData = this.parseResumeText(extractedText);      return {
        success: true,
        data: parsedData,
        rawText: extractedText
      };
      
    } catch (error) {      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }
}

module.exports = new ResumeParsingService();
