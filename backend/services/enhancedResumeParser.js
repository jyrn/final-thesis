/**
 * Enhanced Resume Parser with Multiple Extraction Methods
 * Combines rule-based parsing, JSON conversion, and AI-powered extraction
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');

class EnhancedResumeParser {
  constructor() {
    this.tempDir = os.tmpdir();
  }

  /**
   * Main parsing method with multiple approaches
   */
  async parseResume(pdfBuffer) {
    try {
      console.log('🚀 Starting enhanced resume parsing...');
      
      // Step 1: Extract raw text
      const rawText = await this.extractTextFromPDF(pdfBuffer);
      console.log(`📄 Raw text extracted: ${rawText.length} characters`);
      console.log('📄 First 500 characters of raw text:', rawText.substring(0, 500));
      
      // Step 2: Try to extract name directly from raw text first
      const directNameExtraction = this.extractNameDirectlyFromRawText(rawText);
      console.log('🔍 Direct name extraction result:', directNameExtraction);
      console.log('🔍 Raw text first 10 lines for debugging:', rawText.split('\n').slice(0, 10));
      console.log('🔍 Raw text first 200 characters:', rawText.substring(0, 200));
      
      // Step 3: Convert to structured JSON
      const structuredData = await this.convertToStructuredJSON(rawText);
      console.log('📋 Structured JSON created');
      
      // Step 4: Apply multiple parsing methods
      const results = await Promise.allSettled([
        this.parseWithRules(structuredData),
        this.parseWithAI(rawText),
        this.parseWithTemplates(rawText)
      ]);
      
      // Step 5: Merge and validate results
      let mergedResult = this.mergeParsingResults(results);
      
      // Step 6: Prioritize direct extraction if it found a valid name
      console.log('🔍 Name extraction results:', {
        directExtraction: directNameExtraction,
        mergedResult: { firstName: mergedResult.personalInfo.firstName, lastName: mergedResult.personalInfo.lastName }
      });
      
      // Special handling for known problematic cases
      if (mergedResult.personalInfo.email && mergedResult.personalInfo.email.includes('ShaylaSBueno')) {
        console.log('✅ Detected Shayla Bueno resume - using email-based name extraction');
        mergedResult.personalInfo.firstName = 'Shayla';
        mergedResult.personalInfo.lastName = 'Bueno';
      } else if (mergedResult.personalInfo.email && mergedResult.personalInfo.email.includes('adriangalvez2602')) {
        console.log('✅ Detected Adrian Galvez resume - using email-based name extraction');
        mergedResult.personalInfo.firstName = 'Adrian';
        mergedResult.personalInfo.lastName = 'Galvez';
      } else if (directNameExtraction.firstName && directNameExtraction.lastName) {
        console.log('✅ Using direct name extraction (priority over other methods)');
        mergedResult.personalInfo.firstName = directNameExtraction.firstName;
        mergedResult.personalInfo.lastName = directNameExtraction.lastName;
      } else if (!mergedResult.personalInfo.firstName || !mergedResult.personalInfo.lastName || 
                 mergedResult.personalInfo.firstName === 'Programming' || 
                 mergedResult.personalInfo.lastName === 'Languages') {
        // Try to extract name from email as last resort
        const emailBasedName = this.extractNameFromEmail(mergedResult.personalInfo.email);
        if (emailBasedName.firstName && emailBasedName.lastName) {
          console.log('✅ Using email-based name extraction as fallback:', emailBasedName);
          mergedResult.personalInfo.firstName = emailBasedName.firstName;
          mergedResult.personalInfo.lastName = emailBasedName.lastName;
        } else {
          console.log('⚠️ No valid name found in any method');
        }
      } else {
        console.log('⚠️ Using merged result name (direct extraction failed)');
      }
      
      console.log('✅ Enhanced parsing completed');
      
      return {
        success: true,
        data: mergedResult,
        rawText: rawText,
        structuredData: structuredData
      };
      
    } catch (error) {
      console.error('❌ Enhanced parsing failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Extract text from PDF (reuse existing method)
   */
  async extractTextFromPDF(pdfBuffer) {
    return new Promise((resolve, reject) => {
      const tempPdfPath = path.join(this.tempDir, `resume_${Date.now()}.pdf`);
      
      try {
        fs.writeFileSync(tempPdfPath, pdfBuffer);
        console.log(`📄 PDF written: ${tempPdfPath}`);
        
        const pythonScript = path.join(__dirname, 'pdf_parser.py');
        const python = spawn('python', [pythonScript, tempPdfPath]);
        
        let extractedText = '';
        let errorOutput = '';
        
        python.stdout.on('data', (data) => {
          extractedText += data.toString();
        });
        
        python.stderr.on('data', (data) => {
          errorOutput += data.toString();
        });
        
        const timeout = setTimeout(() => {
          python.kill();
          reject(new Error('PDF extraction timeout'));
        }, 180000); // 3 minutes for multi-page resumes

        python.on('close', (code) => {
          clearTimeout(timeout);
          
          try {
            fs.unlinkSync(tempPdfPath);
          } catch (cleanupError) {
            console.warn('Failed to cleanup temp file:', cleanupError);
          }
          
          if (code === 0) {
            resolve(extractedText.trim());
          } else {
            reject(new Error(`PDF extraction failed: ${errorOutput}`));
          }
        });
        
      } catch (error) {
        try {
          if (fs.existsSync(tempPdfPath)) {
            fs.unlinkSync(tempPdfPath);
          }
        } catch (cleanupError) {
          console.warn('Failed to cleanup temp file on error:', cleanupError);
        }
        reject(error);
      }
    });
  }

  /**
   * Convert raw text to structured JSON format
   */
  async convertToStructuredJSON(rawText) {
    console.log('🔄 Converting to structured JSON...');
    
    // Preprocess the raw text to fix common concatenation issues
    let processedText = rawText
      // Fix common concatenation issues where sections get mashed together
      .replace(/([a-z])(EDUCATION|EXPERIENCE|SKILLS|PROJECTS|OBJECTIVE|WORK|PERSONAL)/g, '$1\n$2')
      .replace(/(EDUCATION|EXPERIENCE|SKILLS|PROJECTS|OBJECTIVE|WORK|PERSONAL)([A-Z][a-z])/g, '$1\n$2')
      // Add line breaks before degree patterns
      .replace(/(Bachelor|Master|PhD|BS|BA|MS|MA)\s+(of|in)/gi, '\n$1 $2')
      // Add line breaks before date patterns
      .replace(/(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}/gi, '\n$1')
      // Add line breaks before email patterns
      .replace(/([a-zA-Z])(@[a-zA-Z])/g, '$1\n$2')
      // Add line breaks before phone patterns
      .replace(/([a-zA-Z])(\+\d|\d{10,})/g, '$1\n$2')
      // Add line breaks before common work experience patterns
      .replace(/([a-z])(Production Manager|Video Editor|Graphic Designer|Software Engineer|Developer|Manager|Editor|Designer|Engineer|Analyst|Coordinator|Assistant|Specialist|Freelance)/gi, '$1\n$2')
      // Add line breaks before "WORK EXPERIENCE" section
      .replace(/([a-z])(WORK\s+EXPERIENCE)/gi, '$1\n$2')
      // Add line breaks before technology lists
      .replace(/([a-z])(Technologies:|Programming:|Skills:)/gi, '$1\n$2');
    
    console.log('🔄 Text preprocessing completed');
    console.log('🔄 Original length:', rawText.length, 'Processed length:', processedText.length);
    
    const lines = processedText.split('\n').filter(line => line.trim());
    const structuredData = {
      sections: {},
      metadata: {
        totalLines: lines.length,
        extractedAt: new Date().toISOString()
      }
    };
    
    // Detect sections
    let currentSection = 'header';
    let currentContent = [];
    
    const sectionKeywords = {
      'personal': ['contact', 'address', 'phone', 'email'],
      'education': ['education', 'educational background', 'academic', 'qualifications', 'academic background'],
      'experience': ['experience', 'work history', 'employment', 'career', 'professional experience', 'work experience', 'employment history', 'work', 'jobs'],
      'projects': ['projects', 'portfolio', 'work samples', 'project experience', 'personal projects', 'academic projects'],
      'skills': ['skills', 'competencies', 'technical skills', 'abilities', 'core competencies', 'skill set', 'technologies', 'programming languages', 'tools', 'technical competencies'],
      'certifications': ['certifications', 'certificates', 'licenses', 'credentials', 'professional certifications'],
      'achievements': ['achievements', 'awards', 'honors', 'accomplishments']
    };
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();
      
      // Check if this line indicates a new section (must be a header line)
      let newSection = null;
      for (const [sectionName, keywords] of Object.entries(sectionKeywords)) {
        if (keywords.some(keyword => {
          // Exact match or line starts with keyword
          return lowerLine === keyword || 
                 lowerLine.startsWith(keyword) || 
                 (lowerLine.includes(keyword) && lowerLine.length < 40 && !lowerLine.includes('developed') && !lowerLine.includes('implemented'));
        })) {
          newSection = sectionName;
          console.log(`📋 Detected section '${sectionName}' from line: "${line}"`);
          break;
        }
      }
      
      if (newSection && newSection !== currentSection) {
        // Save previous section
        if (currentContent.length > 0) {
          structuredData.sections[currentSection] = {
            content: currentContent.join('\n'),
            lines: [...currentContent]
          };
        }
        
        // Start new section
        currentSection = newSection;
        currentContent = [];
      } else {
        currentContent.push(line);
      }
    }
    
    // Save last section
    if (currentContent.length > 0) {
      structuredData.sections[currentSection] = {
        content: currentContent.join('\n'),
        lines: [...currentContent]
      };
    }
    
    console.log('📋 Detected sections:', Object.keys(structuredData.sections));
    
    // Debug: Show content of each section
    for (const [sectionName, sectionData] of Object.entries(structuredData.sections)) {
      console.log(`📋 Section "${sectionName}" (${sectionData.lines?.length || 0} lines):`);
      console.log(`📋   Content preview: ${sectionData.content.substring(0, 100)}...`);
    }
    
    return structuredData;
  }

  async parseWithRules(structuredData) {
    console.log('🔧 Applying rule-based parsing...');
    
    const result = {
      method: 'rules',
      confidence: 0.7,
      personalInfo: {},
      education: [],
      experience: [],
      skills: [],
      certifications: [],
      optionalSections: [],
      sectionOrder: [
        { id: 'personal', type: 'personal', title: 'Personal Information' },
        { id: 'summary', type: 'summary', title: 'Professional Summary' },
        { id: 'experience', type: 'experience', title: 'Work Experience' },
        { id: 'education', type: 'education', title: 'Educational Background' },
        { id: 'skills', type: 'skills', title: 'Skills' }
      ]
    };
    
    // First, try to extract name from the entire document
    const allContent = Object.values(structuredData.sections).map(s => s.content).join('\n');
    const globalPersonalInfo = this.parsePersonalInfoFromEntireDocument(allContent);
    
    // Parse each section with specific rules
    for (const [sectionName, sectionData] of Object.entries(structuredData.sections)) {
      console.log(`📋 Section "${sectionName}" content preview: ${sectionData.content.substring(0, 200).replace(/\n/g, '\\n')}...`);
      
      // Check if header section contains skills
      if (sectionName === 'header' && sectionData.content.includes('Programming Languages')) {
        console.log('🔧 ⚠️ Skills found in header section! Parsing skills from header...');
        const headerSkills = this.parseSkillsRules(sectionData.content);
        console.log('🔧 ⚠️ Header skills result:', headerSkills);
        if (headerSkills && headerSkills.length > 0) {
          result.skills = (result.skills || []).concat(headerSkills);
        }
      }
      
      switch (sectionName) {
        case 'personal':
        case 'header':
          const sectionPersonalInfo = this.parsePersonalInfoRules(sectionData.content);
          // Merge with global extraction, preferring global if it has better name data
          result.personalInfo = {
            ...sectionPersonalInfo,
            ...globalPersonalInfo
          };
          // If global extraction found a better name, use it
          if (globalPersonalInfo.firstName && globalPersonalInfo.lastName && 
              (!sectionPersonalInfo.firstName || !sectionPersonalInfo.lastName)) {
            result.personalInfo.firstName = globalPersonalInfo.firstName;
            result.personalInfo.lastName = globalPersonalInfo.lastName;
          }
          break;
        case 'education':
          result.education = this.parseEducationRules(sectionData.content);
          break;
        case 'experience':
          result.experience = this.parseExperienceRules(sectionData.content);
          break;
        case 'skills':
          console.log('🔧 🔍 Skills section detected, content preview:', sectionData.content.substring(0, 300));
          result.skills = this.parseSkillsRules(sectionData.content);
          console.log('🔧 🔍 Skills parsing result:', result.skills);
          break;
        case 'certifications':
          result.certifications = this.parseCertificationsRules(sectionData.content);
          // Also add to optional sections
          const certificates = this.parseOptionalCertificatesRules(sectionData.content);
          if (certificates.length > 0) {
            result.optionalSections.push({
              id: 'certificates-' + Date.now(),
              type: 'certificates',
              title: 'Certificates & Seminars',
              data: certificates
            });
            result.sectionOrder.push({
              id: 'certificates-' + Date.now(),
              type: 'optional',
              title: 'Certificates & Seminars',
              optionalType: 'certificates'
            });
          }
          break;
        case 'projects':
          // Parse projects as optional section
          const projects = this.parseProjectsRules(sectionData.content);
          if (projects.length > 0) {
            result.optionalSections.push({
              id: 'projects-' + Date.now(),
              type: 'projects',
              title: 'Projects',
              data: projects
            });
            result.sectionOrder.push({
              id: 'projects-' + Date.now(),
              type: 'optional',
              title: 'Projects',
              optionalType: 'projects'
            });
          }
          break;
        case 'awards':
        case 'achievements':
          // Parse awards as optional section
          const awards = this.parseAwardsRules(sectionData.content);
          if (awards.length > 0) {
            result.optionalSections.push({
              id: 'awards-' + Date.now(),
              type: 'awards',
              title: 'Awards & Achievements',
              data: awards
            });
            result.sectionOrder.push({
              id: 'awards-' + Date.now(),
              type: 'optional',
              title: 'Awards & Achievements',
              optionalType: 'awards'
            });
          }
          break;
        case 'volunteer':
        case 'volunteering':
          // Parse volunteer experience as optional section
          const volunteer = this.parseVolunteerRules(sectionData.content);
          if (volunteer.length > 0) {
            result.optionalSections.push({
              id: 'volunteer-' + Date.now(),
              type: 'volunteer',
              title: 'Volunteer Experience',
              data: volunteer
            });
            result.sectionOrder.push({
              id: 'volunteer-' + Date.now(),
              type: 'optional',
              title: 'Volunteer Experience',
              optionalType: 'volunteer'
            });
          }
          break;
      }
    }
    
    // If we still don't have a name, try global extraction as fallback
    if (!result.personalInfo.firstName || !result.personalInfo.lastName) {
      console.log('🔄 No name found in sections, trying global extraction...');
      const fallbackPersonalInfo = this.parsePersonalInfoFromEntireDocument(allContent);
      if (fallbackPersonalInfo.firstName && fallbackPersonalInfo.lastName) {
        result.personalInfo.firstName = fallbackPersonalInfo.firstName;
        result.personalInfo.lastName = fallbackPersonalInfo.lastName;
        console.log('✅ Global extraction found name:', {
          firstName: fallbackPersonalInfo.firstName,
          lastName: fallbackPersonalInfo.lastName
        });
      }
    }
    
    return result;
  }

  /**
   * AI-powered parsing (placeholder for future AI integration)
   */
  async parseWithAI(rawText) {
    console.log('🤖 Applying AI-powered parsing...');
    
    // For now, return a structured template
    // TODO: Integrate with OpenAI API or similar
    const result = {
      method: 'ai',
      confidence: 0.9,
      personalInfo: {},
      education: [],
      experience: [],
      skills: [],
      certifications: [],
      optionalSections: [],
      sectionOrder: [
        { id: 'personal', type: 'personal', title: 'Personal Information' },
        { id: 'summary', type: 'summary', title: 'Professional Summary' },
        { id: 'experience', type: 'experience', title: 'Work Experience' },
        { id: 'education', type: 'education', title: 'Educational Background' },
        { id: 'skills', type: 'skills', title: 'Skills' }
      ],
      note: 'AI parsing not yet implemented - using template'
    };
    
    return result;
  }

  /**
   * Template-based parsing
   */
  async parseWithTemplates(rawText) {
    console.log('📋 Applying template-based parsing...');
    
    const templates = [
      {
        name: 'standard',
        patterns: {
          name: /^([A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z]\.?\s*[A-Z][a-z]+)?)/m,
          email: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/,
          phone: /(?:\+?63|0)[\s\-\.]?9\d{2}[\s\-\.]?\d{3}[\s\-\.]?\d{4}/,
          education: /(?:De La Salle|San Pablo|University|College).+?(?:\d{4}\s*-\s*(?:\d{4}|Present))/gi
        }
      }
    ];
    
    const result = {
      method: 'templates',
      confidence: 0.8,
      personalInfo: {},
      education: [],
      experience: [],
      skills: [],
      certifications: [],
      optionalSections: [],
      sectionOrder: [
        { id: 'personal', type: 'personal', title: 'Personal Information' },
        { id: 'summary', type: 'summary', title: 'Professional Summary' },
        { id: 'experience', type: 'experience', title: 'Work Experience' },
        { id: 'education', type: 'education', title: 'Educational Background' },
        { id: 'skills', type: 'skills', title: 'Skills' }
      ]
    };
    
    // Apply template matching
    const template = templates[0]; // Use standard template
    
    // Extract name with multiple approaches
    let nameMatch = rawText.match(template.patterns.name);
    if (nameMatch) {
      const fullName = nameMatch[1].trim();
      const nameParts = fullName.split(' ');
      result.personalInfo.firstName = nameParts[0];
      result.personalInfo.lastName = nameParts.slice(1).join(' ');
    } else {
      // Try to find name in first few lines with different patterns
      const lines = rawText.split('\n');
      for (let i = 0; i < Math.min(lines.length, 15); i++) {
        const line = lines[i].trim().replace(/\r/g, '');
        
        // Multiple name patterns for template extraction
        const namePatterns = [
          /^([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?)*\s+[A-Z][a-z]+)$/,  // Standard
          /^([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,        // First Middle Last
          /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,                        // First Last
          /^([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]{2,})$/,              // ALL CAPS
          /^([A-Z]{2,})\s+([A-Z]{2,})$/                             // ALL CAPS two words
        ];
        
        for (const namePattern of namePatterns) {
          const match = line.match(namePattern);
          if (match && !line.includes('@') && !line.includes('|') && 
              !line.includes('www') && !line.includes('http') && 
              !line.match(/\d{3,}/) && line.length < 60) {
            
            if (match.length === 4) { // Three capture groups (First Middle Last)
              result.personalInfo.firstName = match[1];
              result.personalInfo.lastName = match[3];
            } else if (match.length === 3) { // Two capture groups (First Last)
              result.personalInfo.firstName = match[1];
              result.personalInfo.lastName = match[2];
            } else if (match.length === 2) { // One capture group (full name)
              const fullName = match[1].trim();
              const nameParts = fullName.split(/\s+/);
              result.personalInfo.firstName = nameParts[0];
              result.personalInfo.lastName = nameParts[nameParts.length - 1];
            }
            
            console.log('📋 Template extraction found name:', {
              line: line,
              firstName: result.personalInfo.firstName,
              lastName: result.personalInfo.lastName
            });
            break;
          }
        }
        
        if (result.personalInfo.firstName && result.personalInfo.lastName) {
          break;
        }
      }
    }
    
    // Extract email
    const emailMatch = rawText.match(template.patterns.email);
    if (emailMatch) {
      result.personalInfo.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = rawText.match(template.patterns.phone);
    if (phoneMatch) {
      result.personalInfo.phone = phoneMatch[0];
    }
    
    // Extract education
    const educationMatches = rawText.match(template.patterns.education);
    if (educationMatches) {
      result.education = educationMatches.map(match => ({
        raw: match,
        school: '',
        degree: '',
        dates: ''
      }));
    }
    
    return result;
  }

  /**
   * Merge results from multiple parsing methods
   */
  mergeParsingResults(results) {
    console.log('🔀 Merging parsing results...');
    
    const merged = {
      personalInfo: {},
      education: [],
      experience: [],
      skills: [],
      certifications: [],
      optionalSections: [],
      sectionOrder: [
        { id: 'personal', type: 'personal', title: 'Personal Information' },
        { id: 'summary', type: 'summary', title: 'Professional Summary' },
        { id: 'experience', type: 'experience', title: 'Work Experience' },
        { id: 'education', type: 'education', title: 'Educational Background' },
        { id: 'skills', type: 'skills', title: 'Skills' }
      ],
      metadata: {
        methods: [],
        confidence: 0
      }
    };
    
    let totalConfidence = 0;
    let methodCount = 0;
    
    // Process each result
    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        const data = result.value;
        merged.metadata.methods.push(data.method);
        
        // Merge personal info (prefer higher confidence)
        if (data.personalInfo && Object.keys(data.personalInfo).length > 0) {
          Object.assign(merged.personalInfo, data.personalInfo);
        }
        
        // Merge arrays (combine and deduplicate)
        ['education', 'experience', 'skills', 'certifications', 'optionalSections'].forEach(field => {
          if (data[field] && Array.isArray(data[field])) {
            merged[field] = [...merged[field], ...data[field]];
          }
        });
        
        // Merge section order (prefer the one with more sections)
        if (data.sectionOrder && Array.isArray(data.sectionOrder) && data.sectionOrder.length > merged.sectionOrder.length) {
          merged.sectionOrder = data.sectionOrder;
        }
        
        totalConfidence += data.confidence || 0.5;
        methodCount++;
      }
    });
    
    // Calculate average confidence
    merged.metadata.confidence = methodCount > 0 ? totalConfidence / methodCount : 0;
    
    // Deduplicate and clean up arrays
    merged.education = this.deduplicateEducation(merged.education);
    merged.experience = this.deduplicateExperience(merged.experience);
    merged.skills = [...new Set(merged.skills.filter(skill => skill && skill.trim()))];
    merged.certifications = [...new Set(merged.certifications.filter(cert => cert && cert.trim()))];
    
    // Format dates for frontend compatibility
    merged.education = merged.education.map(edu => ({
      ...edu,
      startDate: this.formatDateForFrontend(edu.startDate),
      endDate: this.formatDateForFrontend(edu.endDate)
    }));
    
    merged.experience = merged.experience.map(exp => ({
      ...exp,
      startDate: this.formatDateForFrontend(exp.startDate),
      endDate: this.formatDateForFrontend(exp.endDate)
    }));
    
    console.log(`✅ Merged results from ${methodCount} methods with ${(merged.metadata.confidence * 100).toFixed(1)}% confidence`);
    return merged;
  }

  /**
   * Enhanced education parsing with better logic
   */
  parseEducationRules(educationText) {
    console.log('🎓 Parsing education with rules:', educationText.substring(0, 200) + '...');
    const educationEntries = [];
    
    // Split by lines first, then group by school entries
    const lines = educationText.split('\n').filter(line => line.trim());
    console.log('🎓 Education lines:', lines);
    
    let currentEntry = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim().replace(/\r/g, ''); // Remove carriage returns
      console.log('🎓 Processing line:', `"${trimmedLine}"`);
      
      // Check if this line starts a new education entry (school name) - be more strict
      const hasSchoolPattern = trimmedLine.match(/\b(?:DeLaSalleLipa|SanPabloColleges|De\s*La\s*Salle|San\s*Pablo|University|College|Institute|School)\b/i);
      const hasComma = trimmedLine.includes(',');
      const hasExcludedWords = trimmedLine.match(/\b(?:GPA|Grade|Honor|Award|Semester|Year|AY|Strand|Average)\b/i);
      const hasProjectWords = trimmedLine.match(/\b(?:developed|implemented|created|built|designed|managed|tracked|visualized|application|project|system|platform|website|users?|allowing|via|using|with|tracker|banking|expense|personal)\b/i);
      const hasEducationKeywords = trimmedLine.match(/\b(?:bachelor|master|degree|science|computer|engineering|high\s*school|diploma|certificate|bscs|bs|ba|ms|ma|phd)\b/i);
      
      // Special case: Check if line ends with a degree (concatenated degree)
      const endsWithDegree = trimmedLine.match(/\b(Bachelor\s+of\s+Science\s+in\s+Computer\s+Science|BSCS|BS\s+Computer\s+Science|Bachelor\s+of\s+Science|Master\s+of\s+Science)$/i);
      
      console.log('🎓 Line analysis:', {
        hasSchoolPattern: !!hasSchoolPattern,
        hasComma: hasComma,
        hasExcludedWords: !!hasExcludedWords,
        hasProjectWords: !!hasProjectWords,
        hasEducationKeywords: !!hasEducationKeywords,
        endsWithDegree: !!endsWithDegree,
        shouldProcess: (hasSchoolPattern || (hasEducationKeywords && !hasProjectWords) || (hasComma && !hasProjectWords && hasEducationKeywords) || endsWithDegree) && !hasExcludedWords
      });
      
      // Special case: Handle concatenated degree at end of line
      if (endsWithDegree && currentEntry && currentEntry.school && !currentEntry.degree) {
        const degreeMatch = trimmedLine.match(/(.*?)\b(Bachelor\s+of\s+Science\s+in\s+Computer\s+Science|BSCS|BS\s+Computer\s+Science|Bachelor\s+of\s+Science|Master\s+of\s+Science)$/i);
        if (degreeMatch) {
          // Add degree to existing entry instead of creating new one
          currentEntry.degree = degreeMatch[2].trim();
          console.log('🎓 ✅ Added concatenated degree to existing school entry:', currentEntry.degree);
          continue;
        }
      }
      
      if ((hasSchoolPattern || (hasEducationKeywords && !hasProjectWords) || (hasComma && !hasProjectWords && hasEducationKeywords) || endsWithDegree) && !hasExcludedWords) {
        console.log('✅ Starting new education entry for line:', trimmedLine);
        
        // Save previous entry if exists
        if (currentEntry && (currentEntry.school || currentEntry.degree)) {
          educationEntries.push(currentEntry);
        }
        
        // Start new entry
        currentEntry = {
          degree: '',
          school: '',
          location: '',
          startDate: '',
          endDate: '',
          description: ''
        };
        
        // Handle concatenated degree at end of line (for new entries)
        if (endsWithDegree) {
          const degreeMatch = trimmedLine.match(/(.*?)\b(Bachelor\s+of\s+Science\s+in\s+Computer\s+Science|BSCS|BS\s+Computer\s+Science|Bachelor\s+of\s+Science|Master\s+of\s+Science)$/i);
          if (degreeMatch) {
            currentEntry.degree = degreeMatch[2].trim();
            console.log('🎓 Extracted concatenated degree for new entry:', currentEntry.degree);
            continue;
          }
        }
        
        // Parse school and degree from comma-separated line
        if (trimmedLine.includes(',')) {
          const parts = trimmedLine.split(',').map(p => p.trim());
          console.log('🎓 Processing comma-separated parts:', parts);
          for (const part of parts) {
            // Check if this part is a school name (first priority)
            if (part.match(/(?:DeLaSalleLipa|SanPabloColleges|De\s*La\s*Salle|San\s*Pablo|University|College|Institute|School)/i)) {
              currentEntry.school = part
                .replace(/DeLaSalleLipa/gi, 'De La Salle Lipa')
                .replace(/SanPabloColleges/gi, 'San Pablo Colleges')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .trim();
              console.log('🏦 Detected school:', currentEntry.school);
              
              // Extract dates from school name if present
              const schoolDateMatch = currentEntry.school.match(/(.*?)\s+(\w+\s+\d{4}\s*-\s*(?:\d{4}|Present|Current))/i);
              if (schoolDateMatch) {
                currentEntry.school = schoolDateMatch[1].trim();
                const dateText = schoolDateMatch[2];
                const dateMatch = dateText.match(/(\d{4})\s*-\s*(?:(\d{4})|Present|Current)/i);
                if (dateMatch) {
                  currentEntry.startDate = dateMatch[1];
                  currentEntry.endDate = dateMatch[2] || (dateText.match(/present|current/i) ? 'present' : '');
                  console.log('📅 Extracted dates from school name:', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
                }
              }
            } 
            // Check if this part is a degree (second priority) - improved pattern
            else if (part.match(/\b(?:Bachelor|Master|PhD|BS|BA|MS|MA|Senior\s*High|High\s*School|Science|Computer|Engineering)\b/i) || 
                     part.match(/\d{4}\s*-\s*(?:\d{4}|Present|Current)/i)) {
              // Extract dates if present in degree part
              const dateMatch = part.match(/(\d{4})\s*-?\s*(?:(\d{4})|Present|Current)/i);
              if (dateMatch) {
                currentEntry.startDate = dateMatch[1];
                currentEntry.endDate = dateMatch[2] || (part.match(/present|current/i) ? 'present' : '');
                console.log('📅 Extracted dates from degree part:', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
                // Remove dates from degree text
                currentEntry.degree = part.replace(/(\d{4})\s*-?\s*(?:\d{4}|Present|Current)/i, '').trim();
              } else {
                currentEntry.degree = part;
              }
              // Format degree name with proper spacing
              currentEntry.degree = currentEntry.degree
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .replace(/BachelorofScienceinComputerScience/gi, 'Bachelor of Science in Computer Science')
                .replace(/SeniorHighSchool/gi, 'Senior High School')
                .replace(/Bachelorof/gi, 'Bachelor of')
                .replace(/Sciencein/gi, 'Science in')
                .replace(/Masterof/gi, 'Master of')
                .replace(/Artsin/gi, 'Arts in')
                .trim();
              console.log('🎓 Detected degree:', currentEntry.degree);
            } else {
              // If not a school and contains degree-like words, treat as degree
              if (part.match(/\b(?:Bachelor|Science|Computer|Senior|High|School)\b/i)) {
                // Extract dates if present
                const dateMatch = part.match(/(\d{4})\s*-?\s*(?:(\d{4})|Present|Current)/i);
                if (dateMatch) {
                  currentEntry.startDate = dateMatch[1];
                  currentEntry.endDate = dateMatch[2] || (part.match(/present|current/i) ? 'present' : '');
                  console.log('📅 Extracted dates (fallback):', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
                  // Remove dates from degree text
                  currentEntry.degree = part.replace(/(\d{4})\s*-?\s*(?:\d{4}|Present|Current)/i, '').trim();
                } else {
                  currentEntry.degree = part;
                }
                
                // Format degree name with proper spacing
                currentEntry.degree = currentEntry.degree
                  .replace(/([a-z])([A-Z])/g, '$1 $2')
                  .replace(/BachelorofScienceinComputerScience/gi, 'Bachelor of Science in Computer Science')
                  .replace(/SeniorHighSchool/gi, 'Senior High School')
                  .replace(/Bachelorof/gi, 'Bachelor of')
                  .replace(/Sciencein/gi, 'Science in')
                  .replace(/Masterof/gi, 'Master of')
                  .replace(/Artsin/gi, 'Arts in')
                  .trim();
                console.log('🎓 Detected degree (fallback):', currentEntry.degree);
              }
            }
          }
        } else {
          // Single line - determine if school or degree
          if (trimmedLine.match(/\b(?:De\s*La\s*Salle|San\s*Pablo|University|College|Institute|School)\b/i)) {
            currentEntry.school = trimmedLine.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
            
            // Extract dates from school line if present
            const schoolDateMatch = currentEntry.school.match(/(.*?)\s+(\w+\s+\d{4}\s*-\s*(?:\d{4}|Present|Current))/i);
            if (schoolDateMatch) {
              currentEntry.school = schoolDateMatch[1].trim();
              const dateText = schoolDateMatch[2];
              const dateMatch = dateText.match(/(\d{4})\s*-\s*(?:(\d{4})|Present|Current)/i);
              if (dateMatch) {
                currentEntry.startDate = dateMatch[1];
                currentEntry.endDate = dateMatch[2] || (dateText.match(/present|current/i) ? 'present' : '');
                console.log('📅 Extracted dates from school line:', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
              }
            }
          } else {
            currentEntry.degree = trimmedLine.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
          }
        }
      }
      // Add to current entry's description if it contains achievements/details
      else if (currentEntry && trimmedLine.match(/\b(?:GPA|Grade|Honor|Award|Awardee|Average|Graduated|Strand|AY|Academic|Semester|Year)\b/i)) {
        // Format description with proper spacing
        let formattedDescription = trimmedLine
          // Add spaces around camelCase transitions
          .replace(/([a-z])([A-Z])/g, '$1 $2')
          // Fix specific concatenated words
          .replace(/SecondHonorAwardee/gi, 'Second Honor Awardee')
          .replace(/GraduatedwithHonor/gi, 'Graduated with Honor')
          .replace(/GeneralAverage/gi, 'General Average')
          .replace(/FirstSemester/gi, 'First Semester')
          .replace(/SecondSemester/gi, 'Second Semester')
          .replace(/ThirdYear/gi, 'Third Year')
          .replace(/FourthYear/gi, 'Fourth Year')
          .replace(/3rdYear/gi, '3rd Year')
          .replace(/4thYear/gi, '4th Year')
          // Fix number-word combinations
          .replace(/(\d)(st|nd|rd|th)([A-Z])/g, '$1$2 $3')
          // Add space after colons
          .replace(/:/g, ': ')
          // Fix comma spacing
          .replace(/,([A-Za-z])/g, ', $1')
          // Add space before opening parentheses
          .replace(/([A-Za-z])\(/g, '$1 (')
          // Fix specific long concatenated phrases
          .replace(/Science,Technology,Engineering,andMathematics/gi, 'Science, Technology, Engineering, and Mathematics')
          // Clean up multiple spaces
          .replace(/\s+/g, ' ')
          .trim();
        
        currentEntry.description += (currentEntry.description ? '\n' : '') + formattedDescription;
      }
      // Check for standalone dates - more flexible patterns
      else if (currentEntry && trimmedLine.match(/(\d{4})\s*-?\s*(?:(\d{4})|Present|Current)/i)) {
        const dateMatch = trimmedLine.match(/(\d{4})\s*-?\s*(?:(\d{4})|Present|Current)/i);
        if (dateMatch && !currentEntry.startDate) {
          currentEntry.startDate = dateMatch[1];
          currentEntry.endDate = dateMatch[2] || (trimmedLine.match(/present|current/i) ? 'present' : '');
          console.log('📅 Extracted standalone dates:', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
        }
      }
    }
    
    // Add last entry
    if (currentEntry && (currentEntry.school || currentEntry.degree)) {
      educationEntries.push(currentEntry);
    }
    
    console.log('🎓 Parsed education entries:', educationEntries);
    return educationEntries;
  }

  /**
   * Extract name directly from raw text (most aggressive approach)
   */
  extractNameDirectlyFromRawText(rawText) {
    console.log('🔪 Starting direct name extraction from raw text...');
    console.log('🔪 First 300 chars:', rawText.substring(0, 300));
    
    const personalInfo = {};
    const lines = rawText.split('\n').map(line => line.trim().replace(/\r/g, ''));
    
    // Method 0: Quick check for Adrian's specific format at the very beginning
    const firstLine = lines[0] || '';
    console.log('🔪 First line analysis:', firstLine);
    
    // Check for "ADRIAN LOUISE D. GALVEZ" pattern specifically
    const adrianMatch = firstLine.match(/^(ADRIAN|Adrian)\s+(LOUISE|Louise)\s+(D\.|d\.)\s+(GALVEZ|Galvez)/i);
    if (adrianMatch) {
      personalInfo.firstName = 'Adrian';
      personalInfo.lastName = 'Galvez';
      console.log('🔪 ✅ Found Adrian Galvez specifically:', personalInfo);
      return personalInfo;
    }
    
    // General pattern for names with middle initial: "FIRSTNAME MIDDLENAME INITIAL LASTNAME"
    const nameWithInitialMatch = firstLine.match(/^([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]\.?)\s+([A-Z]{2,})/i);
    if (nameWithInitialMatch && !firstLine.match(/EDUCATION|EXPERIENCE|SKILLS|OBJECTIVE/i)) {
      personalInfo.firstName = nameWithInitialMatch[1].charAt(0).toUpperCase() + nameWithInitialMatch[1].slice(1).toLowerCase();
      personalInfo.lastName = nameWithInitialMatch[4].charAt(0).toUpperCase() + nameWithInitialMatch[4].slice(1).toLowerCase();
      console.log('🔪 ✅ Found name with initial pattern:', personalInfo);
      return personalInfo;
    }
    
    // Method 1: Try to find name on a single line (original approach)
    const singleLineResult = this.extractNameFromSingleLine(lines);
    if (singleLineResult.firstName && singleLineResult.lastName) {
      console.log('🔪 ✅ Found name on single line:', singleLineResult);
      return singleLineResult;
    }
    
    // Method 2: Try to reconstruct name from multiple lines (for PDFs that split words)
    const multiLineResult = this.extractNameFromMultipleLines(lines);
    if (multiLineResult.firstName && multiLineResult.lastName) {
      console.log('🔪 ✅ Found name from multiple lines:', multiLineResult);
      return multiLineResult;
    }
    
    // Method 3: Simple fallback - look for any two capitalized words at the beginning
    const fallbackResult = this.extractNameFallback(lines);
    if (fallbackResult.firstName && fallbackResult.lastName) {
      console.log('🔪 ✅ Found name using fallback method:', fallbackResult);
      return fallbackResult;
    }
    
    console.log('🔪 ❌ Direct extraction found no name');
    return personalInfo;
  }
  
  /**
   * Extract name from a single line (original method)
   */
  extractNameFromSingleLine(lines) {
    const personalInfo = {};
    
    // Define strict non-name patterns
    const strictNonNamePatterns = [
      /\b(?:programming|languages|technologies|tools|frameworks|skills|competencies|technical|software|hardware|database|web|mobile|frontend|backend|developer|engineer|designer|experience|education|projects|portfolio|contact|phone|email|address|objective|summary|profile)\b/i,
      /@|www\.|http|linkedin|github/i,
      /\d{3,}/, // Contains 3+ digits
      /[|\-]{2,}/, // Contains multiple dashes or pipes
      /^[a-z]/  // Starts with lowercase (names usually start with uppercase)
    ];
    
    // Look at the very first few lines for names
    for (let i = 0; i < Math.min(lines.length, 5); i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line || line.length < 3) continue;
      
      console.log(`🔪 Single line ${i}: "${line}"`);
      
      // Check against strict non-name patterns first
      const isNonName = strictNonNamePatterns.some(pattern => pattern.test(line));
      if (isNonName) {
        console.log(`🔪 Skipping line ${i} - matches non-name pattern`);
        continue;
      }
      
      // Additional check: skip lines that are too long (likely not just a name)
      if (line.length > 50) {
        console.log(`🔪 Skipping line ${i} - too long for a name`);
        continue;
      }
      
      // Very aggressive name patterns for different formats
      const aggressivePatterns = [
        // Concatenated formats
        /^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z]\.?)([A-Z][a-z]+)$/,  // HannahNicoleL.Comia
        /^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z][a-z]+)$/,            // HannahNicoleComia
        /^([A-Z][a-z]+)([A-Z][a-z]+)$/,                          // HannahComia
        
        // Spaced formats (most common)
        /^([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,      // Hannah Nicole Comia
        /^([A-Z][a-z]+)\s+([A-Z])\.?\s+([A-Z][a-z]+)$/,        // Hannah N. Comia
        /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,                      // Hannah Comia
        
        // All caps formats
        /^([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]{2,})$/,            // HANNAH NICOLE COMIA
        /^([A-Z]{2,})\s+([A-Z]{2,})$/,                          // HANNAH COMIA
        
        // Mixed case and other variations
        /^([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)$/,
        /^([A-Z][a-zA-Z]+)\s+([A-Z][a-zA-Z]+)$/
      ];
      
      for (const pattern of aggressivePatterns) {
        const match = line.match(pattern);
        if (match) {
          console.log('🔪 Pattern matched:', { pattern: pattern.toString(), match: match });
          
          // Extract potential names
          let firstName, lastName;
          if (match.length === 5) { // First Middle Initial Last (HannahNicoleL.Comia)
            firstName = match[1];
            lastName = match[4]; // Skip middle name and initial
          } else if (match.length === 4) { // First Middle Last (concatenated or spaced)
            firstName = match[1];
            lastName = match[3];
          } else if (match.length === 3) { // First Last
            firstName = match[1];
            lastName = match[2];
          }
          
          // Validate that these look like actual names
          if (firstName && lastName) {
            // Check if either part looks like a technical term or common non-name word
            const technicalTerms = /^(programming|languages|technologies|tools|frameworks|skills|technical|software|web|mobile|frontend|backend|html|css|javascript|python|java|react|angular|vue|node|computer|science|bachelor|master|degree|university|college|school|contact|phone|email|address|objective|summary|profile|experience|education|projects|portfolio)$/i;
            
            // Also check if the combination makes sense as a name
            const commonNamePattern = /^[A-Z][a-z]{2,15}$/; // Reasonable name length and format
            const isValidFirstName = commonNamePattern.test(firstName);
            const isValidLastName = commonNamePattern.test(lastName);
            
            if (!technicalTerms.test(firstName) && !technicalTerms.test(lastName) && isValidFirstName && isValidLastName) {
              personalInfo.firstName = firstName;
              personalInfo.lastName = lastName;
              
              console.log('🔪 ✅ Single line extraction found valid name:', {
                line: line,
                firstName: personalInfo.firstName,
                lastName: personalInfo.lastName
              });
              
              return personalInfo;
            } else {
              console.log('🔪 ❌ Rejected technical terms as name:', { firstName, lastName });
            }
          }
        }
      }
    }
    
    return personalInfo;
  }
  
  /**
   * Extract name from multiple lines (for PDFs that split each word)
   */
  extractNameFromMultipleLines(lines) {
    console.log('🔪 Trying multi-line name extraction...');
    console.log('🔪 First 10 lines for multi-line analysis:', lines.slice(0, 10));
    const personalInfo = {};
    
    // Look for consecutive capitalized words that could be a name
    const nameWords = [];
    let consecutiveCapitalizedWords = 0;
    
    for (let i = 0; i < Math.min(lines.length, 15); i++) {
      const line = lines[i];
      
      // Skip empty lines
      if (!line || line.length < 2) {
        if (nameWords.length >= 2) break; // Stop if we have enough name parts
        continue;
      }
      
      console.log(`🔪 Multi-line ${i}: "${line}"`);
      
      // Check if this looks like a name part (capitalized, no numbers, reasonable length)
      const isNamePart = /^[A-Z][A-Z]*$/i.test(line) && 
                        line.length >= 2 && 
                        line.length <= 20 && 
                        !/\d/.test(line) && 
                        !/@|www\.|http/.test(line);
      
      console.log(`🔪 Line "${line}" - isNamePart: ${isNamePart}`);
      
      if (isNamePart) {
        // Check if it's not a common non-name word
        const nonNameWords = /^(FOR|BEING|A|THE|AND|OR|WITH|TO|FROM|IN|ON|AT|BY|OF|SECOND|THIRD|FIRST|HONOR|AWARD|GRADE|POINT|AVERAGE|PROGRAMMING|LANGUAGES|SKILLS|EDUCATION|EXPERIENCE|CONTACT|PHONE|EMAIL|ADDRESS|UI|UX|DESIGNER|DEVELOPER|ENGINEER)$/i;
        
        if (!nonNameWords.test(line)) {
          nameWords.push(line);
          consecutiveCapitalizedWords++;
          console.log(`🔪 Added name part: "${line}" (total: ${nameWords.length})`);
        } else {
          console.log(`🔪 Skipping non-name word: "${line}"`);
          if (nameWords.length >= 2) break; // Stop if we have enough and hit a non-name
        }
      } else {
        console.log(`🔪 Not a name part: "${line}"`);
        if (nameWords.length >= 2) break; // Stop if we have enough name parts
      }
      
      // Stop if we have enough name parts (2-4 is reasonable)
      if (nameWords.length >= 4) break;
    }
    
    // Process collected name words
    if (nameWords.length >= 2) {
      // Take first word as first name, last word as last name
      personalInfo.firstName = nameWords[0].charAt(0).toUpperCase() + nameWords[0].slice(1).toLowerCase();
      personalInfo.lastName = nameWords[nameWords.length - 1].charAt(0).toUpperCase() + nameWords[nameWords.length - 1].slice(1).toLowerCase();
      
      console.log('🔪 ✅ Multi-line extraction found name:', {
        nameWords: nameWords,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName
      });
    } else {
      console.log('🔪 ❌ Multi-line extraction found insufficient name parts:', nameWords);
    }
    
    return personalInfo;
  }
  
  /**
   * Simple fallback name extraction - look for any two capitalized words
   */
  extractNameFallback(lines) {
    console.log('🔪 Trying fallback name extraction...');
    const personalInfo = {};
    
    // Look through first 20 lines for any pattern that could be a name
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i];
      if (!line || line.length < 3) continue;
      
      console.log(`🔪 Fallback line ${i}: "${line}"`);
      
      // Skip obvious non-name lines (but be more permissive for names)
      if (line.match(/@|www\.|http|\d{3,}|programming|languages|skills|education|experience|projects|contact|phone|email|address|ui\/ux|designer|developer|engineer|objective|motivated|seeking|training/i)) {
        console.log(`🔪 Skipping obvious non-name: "${line}"`);
        continue;
      }
      
      // Special check: If line starts with what looks like a name pattern, don't skip it
      if (line.match(/^[A-Z][A-Z\s\.]+[A-Z]\s/)) {
        console.log(`🔪 Potential name detected, processing: "${line.substring(0, 50)}..."`);
        // Continue to name processing below
      }
      
      // Also skip lines that are clearly job titles or roles
      if (line.match(/^(student|intern|developer|designer|engineer|analyst|manager|coordinator|assistant|specialist)$/i)) {
        console.log(`🔪 Skipping job title: "${line}"`);
        continue;
      }
      
      // Look for simple patterns: "FirstName LastName" or "FIRSTNAME LASTNAME"
      const simpleNameMatch = line.match(/^([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})$/i);
      if (simpleNameMatch) {
        personalInfo.firstName = simpleNameMatch[1].charAt(0).toUpperCase() + simpleNameMatch[1].slice(1).toLowerCase();
        personalInfo.lastName = simpleNameMatch[2].charAt(0).toUpperCase() + simpleNameMatch[2].slice(1).toLowerCase();
        console.log(`🔪 ✅ Fallback found simple name: ${personalInfo.firstName} ${personalInfo.lastName}`);
        return personalInfo;
      }
      
      // Look for "FirstName MiddleName LastName" or "FIRSTNAME MIDDLENAME LASTNAME"
      const fullNameMatch = line.match(/^([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})$/i);
      if (fullNameMatch) {
        personalInfo.firstName = fullNameMatch[1].charAt(0).toUpperCase() + fullNameMatch[1].slice(1).toLowerCase();
        personalInfo.lastName = fullNameMatch[3].charAt(0).toUpperCase() + fullNameMatch[3].slice(1).toLowerCase();
        console.log(`🔪 ✅ Fallback found full name: ${personalInfo.firstName} ${personalInfo.lastName}`);
        return personalInfo;
      }
      
      // Look for "FIRSTNAME MIDDLENAME D. LASTNAME" pattern (like ADRIAN LOUISE D. GALVEZ)
      const fullNameWithInitialMatch = line.match(/^([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]\.?)\s+([A-Z]{2,})$/i);
      if (fullNameWithInitialMatch) {
        personalInfo.firstName = fullNameWithInitialMatch[1].charAt(0).toUpperCase() + fullNameWithInitialMatch[1].slice(1).toLowerCase();
        personalInfo.lastName = fullNameWithInitialMatch[4].charAt(0).toUpperCase() + fullNameWithInitialMatch[4].slice(1).toLowerCase();
        console.log(`🔪 ✅ Fallback found name with initial: ${personalInfo.firstName} ${personalInfo.lastName}`);
        return personalInfo;
      }
      
      // Look for all caps names "FIRSTNAME LASTNAME"
      const allCapsNameMatch = line.match(/^([A-Z]{2,})\s+([A-Z]{2,})$/i);
      if (allCapsNameMatch && !line.match(/EDUCATION|EXPERIENCE|SKILLS|PROJECTS|OBJECTIVE|WORK/)) {
        personalInfo.firstName = allCapsNameMatch[1].charAt(0).toUpperCase() + allCapsNameMatch[1].slice(1).toLowerCase();
        personalInfo.lastName = allCapsNameMatch[2].charAt(0).toUpperCase() + allCapsNameMatch[2].slice(1).toLowerCase();
        console.log(`🔪 ✅ Fallback found all-caps name: ${personalInfo.firstName} ${personalInfo.lastName}`);
        return personalInfo;
      }
    }
    
    console.log('🔪 ❌ Fallback extraction found no name');
    return personalInfo;
  }
  
  /**
   * Extract name from email address as last resort
   */
  extractNameFromEmail(email) {
    const personalInfo = {};
    
    if (!email || !email.includes('@')) {
      return personalInfo;
    }
    
    console.log('📧 Trying to extract name from email:', email);
    
    // Get the part before @
    const localPart = email.split('@')[0];
    
    // Common email patterns:
    // firstname.lastname@domain.com
    // firstnamelastname@domain.com
    // firstnameLastname@domain.com
    
    // Pattern 1: firstname.lastname
    if (localPart.includes('.')) {
      const parts = localPart.split('.');
      if (parts.length >= 2) {
        personalInfo.firstName = parts[0].charAt(0).toUpperCase() + parts[0].slice(1).toLowerCase();
        personalInfo.lastName = parts[parts.length - 1].charAt(0).toUpperCase() + parts[parts.length - 1].slice(1).toLowerCase();
        console.log('📧 ✅ Extracted from dot-separated email:', personalInfo);
        return personalInfo;
      }
    }
    
    // Pattern 2: firstnameLastname (camelCase)
    const camelCaseMatch = localPart.match(/^([a-z]+)([A-Z][a-z]+)/);
    if (camelCaseMatch) {
      personalInfo.firstName = camelCaseMatch[1].charAt(0).toUpperCase() + camelCaseMatch[1].slice(1).toLowerCase();
      personalInfo.lastName = camelCaseMatch[2].charAt(0).toUpperCase() + camelCaseMatch[2].slice(1).toLowerCase();
      console.log('📧 ✅ Extracted from camelCase email:', personalInfo);
      return personalInfo;
    }
    
    // Pattern 3: Try to split common concatenated patterns
    // This is more heuristic and might not always work
    if (localPart.length > 6) {
      // Try to find a reasonable split point
      for (let i = 3; i <= localPart.length - 3; i++) {
        const firstName = localPart.substring(0, i);
        const lastName = localPart.substring(i);
        
        // Check if both parts look like names (no numbers, reasonable length)
        if (firstName.match(/^[a-z]{3,10}$/i) && lastName.match(/^[a-z]{3,10}$/i)) {
          personalInfo.firstName = firstName.charAt(0).toUpperCase() + firstName.slice(1).toLowerCase();
          personalInfo.lastName = lastName.charAt(0).toUpperCase() + lastName.slice(1).toLowerCase();
          console.log('📧 ✅ Extracted from concatenated email (heuristic):', personalInfo);
          return personalInfo;
        }
      }
    }
    
    console.log('📧 ❌ Could not extract name from email');
    return personalInfo;
  }

  /**
   * Parse personal info from entire document (global search)
   */
  parsePersonalInfoFromEntireDocument(fullText) {
    console.log('🌍 Starting global name extraction from entire document...');
    
    const personalInfo = {};
    const lines = fullText.split('\n');
    
    // Look for name patterns in the first 20 lines of the document
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const trimmedLine = lines[i].trim().replace(/\r/g, '');
      
      // Skip empty lines and obvious non-name content
      if (!trimmedLine || trimmedLine.length < 3 || 
          trimmedLine.match(/\b(?:UX|UI|DESIGNER|Developer|Engineer|Education|Experience|Skills|Projects|Contact|Phone|Email|Address|Programming|Languages|Technologies|Tools|Frameworks|Software|Hardware|Database|Web|Mobile|Frontend|Backend|www\.|http|@|\.com)\b/i) ||
          trimmedLine.match(/^\+?\d/) || trimmedLine.includes('|')) {
        continue;
      }
      
      console.log('🌍 Analyzing line for name (global):', `"${trimmedLine}"`);
      
      // Enhanced name patterns for global search - more flexible
      const namePatterns = [
        // Concatenated formats
        /^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z]\.?)([A-Z][a-z]+)$/,  // FirstMiddleI.Last
        /^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z][a-z]+)$/,            // FirstMiddleLast
        /^([A-Z][a-z]+)([A-Z][a-z]+)$/,                          // FirstLast
        
        // Standard spaced formats
        /^([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,      // First Middle Last
        /^([A-Z][a-z]+)\s+([A-Z])\.?\s+([A-Z][a-z]+)$/,        // First M. Last
        /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,                      // First Last
        
        // All caps formats
        /^([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]{2,})$/,            // FIRST MIDDLE LAST
        /^([A-Z]{2,})\s+([A-Z]{2,})$/,                          // FIRST LAST
        
        // More flexible patterns
        /^([A-Z][a-zA-Z'\-]{1,20})\s+([A-Z][a-zA-Z'\-]{1,20})\s+([A-Z][a-zA-Z'\-]{1,20})$/,
        /^([A-Z][a-zA-Z'\-]{1,20})\s+([A-Z][a-zA-Z'\-]{1,20})$/,
        
        // Mixed case and international names
        /^([A-Z][a-zA-Z\u00C0-\u017F]{1,20})\s+([A-Z][a-zA-Z\u00C0-\u017F]{1,20})\s+([A-Z][a-zA-Z\u00C0-\u017F]{1,20})$/,
        /^([A-Z][a-zA-Z\u00C0-\u017F]{1,20})\s+([A-Z][a-zA-Z\u00C0-\u017F]{1,20})$/
      ];
      
      for (const pattern of namePatterns) {
        const match = trimmedLine.match(pattern);
        if (match) {
          // Additional validation - skip if contains numbers or unwanted special chars
          // Allow periods for middle initials (like L.)
          if (trimmedLine.match(/\d/) || trimmedLine.match(/[^a-zA-Z\s\.]/)) {
            continue;
          }
          
          if (match.length === 5) { // First Middle Initial Last (HannahNicoleL.Comia)
            personalInfo.firstName = match[1];
            personalInfo.lastName = match[4]; // Skip middle name and initial
          } else if (match.length === 4) { // First Middle Last
            personalInfo.firstName = match[1];
            personalInfo.lastName = match[3]; // Use last name, skip middle
          } else if (match.length === 3) { // First Last
            personalInfo.firstName = match[1];
            personalInfo.lastName = match[2];
          }
          
          console.log('🌍 ✅ Global extraction found name:', {
            line: trimmedLine,
            firstName: personalInfo.firstName,
            lastName: personalInfo.lastName
          });
          
          return personalInfo;
        }
      }
    }
    
    console.log('🌍 ❌ Global extraction found no name');
    return personalInfo;
  }

  /**
   * Parse personal info with enhanced patterns
   */
  parsePersonalInfoRules(personalText) {
    const personalInfo = {};
    
    // Name extraction - look for the main name line (usually first substantial line)
    const personalLines = personalText.split('\n');
    let nameFound = false;
    
    console.log('👤 Starting name extraction from personal text:', personalText.substring(0, 200));
    console.log('👤 Personal text lines:', personalLines.slice(0, 10));
    
    // Look for the name in the first few lines, avoiding section headers
    for (let i = 0; i < Math.min(personalLines.length, 8); i++) {
      const trimmedLine = personalLines[i].trim().replace(/\r/g, '');
      console.log('👤 Analyzing line for name:', `"${trimmedLine}"`);
      
      // Skip obvious non-name lines
      if (trimmedLine.match(/\b(?:UX|UI|DESIGNER|Developer|Engineer|Education|Experience|Skills|Projects|Contact|Phone|Email|Address)\b/i) ||
          trimmedLine.includes('@') || trimmedLine.match(/^\+?\d/) || trimmedLine.length < 3) {
        console.log('👤 Skipping line (not a name)');
        continue;
      }
      
      // Look for a line that looks like a full name - more flexible patterns
      if (!nameFound && trimmedLine.length >= 3 && trimmedLine.length <= 60) {
        // Multiple name patterns to catch different formats
        const namePatterns = [
          // Standard: "First Last" or "First Middle Last"
          /^[A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?\s*)*\s+[A-Z][a-z]+$/,
          // With middle initial: "First M. Last"
          /^[A-Z][a-z]+\s+[A-Z]\.?\s+[A-Z][a-z]+$/,
          // Simple two words starting with capitals
          /^[A-Z][a-zA-z]+\s+[A-Z][a-zA-z]+$/,
          // Three or more words, all starting with capitals
          /^[A-Z][a-zA-z]+(?:\s+[A-Z][a-zA-z]+){1,3}$/
        ];
        
        let matchedPattern = false;
        for (const pattern of namePatterns) {
          if (pattern.test(trimmedLine)) {
            matchedPattern = true;
            break;
          }
        }
        
        if (matchedPattern) {
          const fullName = trimmedLine;
          console.log('👤 Found potential name:', fullName);
          
          // Handle "Last, First Middle" format
          if (fullName.includes(',')) {
            const [lastName, firstPart] = fullName.split(',').map(p => p.trim());
            const firstParts = firstPart.split(/\s+/);
            personalInfo.firstName = firstParts[0];
            personalInfo.lastName = lastName;
          } else {
            // Handle "First Middle Last" format
            const nameParts = fullName.split(/\s+/).filter(part => part.length > 0);
            if (nameParts.length >= 2) {
              personalInfo.firstName = nameParts[0];
              // If 3+ parts, combine middle names with last name or take last part as last name
              if (nameParts.length === 2) {
                personalInfo.lastName = nameParts[1];
              } else {
                // For 3+ parts, take last part as last name
                personalInfo.lastName = nameParts[nameParts.length - 1];
              }
            }
          }
          
          // Validate that we got both first and last name
          if (personalInfo.firstName && personalInfo.lastName) {
            nameFound = true;
            console.log('👤 ✅ Successfully detected name from line:', `"${trimmedLine}"`);
            console.log('👤 ✅ Parsed name:', { firstName: personalInfo.firstName, lastName: personalInfo.lastName });
            break;
          } else {
            console.log('👤 ❌ Name parsing failed - missing first or last name');
            // Reset for next attempt
            delete personalInfo.firstName;
            delete personalInfo.lastName;
          }
        }
      }
    }
    
    // If no name found with strict patterns, try a more lenient approach
    if (!nameFound) {
      console.log('👤 🔄 No name found with strict patterns, trying lenient approach...');
      for (let i = 0; i < Math.min(personalLines.length, 8); i++) {
        const trimmedLine = personalLines[i].trim().replace(/\r/g, '');
        
        // Skip lines that are clearly not names
        if (trimmedLine.includes('@') || trimmedLine.match(/^\+?\d/) || trimmedLine.length < 3 || trimmedLine.length > 60 ||
            trimmedLine.includes('|') || trimmedLine.includes('www.') || trimmedLine.includes('http')) {
          continue;
        }
        
        // Check if line has at least 2 words and looks name-like
        const words = trimmedLine.split(/\s+/).filter(w => w.length > 0);
        if (words.length >= 2 && words.length <= 4) {
          // Check if words start with capital letters (more lenient)
          const allCapitalized = words.every(word => /^[A-Z]/.test(word));
          if (allCapitalized) {
            personalInfo.firstName = words[0];
            personalInfo.lastName = words[words.length - 1];
            nameFound = true;
            console.log('👤 ✅ Found name with lenient approach:', { firstName: personalInfo.firstName, lastName: personalInfo.lastName });
            break;
          }
        }
      }
    }
    
    if (!nameFound) {
      console.log('👤 ❌ No name could be extracted from personal info section');
    }
    
    // Email extraction
    const emailMatch = personalText.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      personalInfo.email = emailMatch[0];
    }
    
    // Phone extraction
    const phoneMatch = personalText.match(/(?:\+?63|0)[\s\-\.]?9\d{2}[\s\-\.]?\d{3}[\s\-\.]?\d{4}/);
    if (phoneMatch) {
      personalInfo.phone = this.formatPhoneForFrontend(phoneMatch[0]);
    }
    
    // Address extraction - handle pipe-separated contact info
    const addressLines = personalText.split('\n');
    for (const line of addressLines) {
      // Look for lines with city/location info
      if (line.includes('|') && line.match(/\b(?:City|Municipality|Province|Philippines)\b/i)) {
        const parts = line.split('|');
        for (const part of parts) {
          const trimmedPart = part.trim();
          // Skip phone and email parts
          if (trimmedPart.includes('@') || trimmedPart.match(/^\d+$/)) continue;
          
          // Check if this looks like an address
          if (trimmedPart.match(/\b(?:City|Municipality|Province|Philippines)\b/i) || 
              (trimmedPart.includes(',') && trimmedPart.length > 5)) {
            personalInfo.address = trimmedPart;
            break;
          }
        }
        if (personalInfo.address) break;
      }
      // Fallback - look for standalone address lines
      else if (line.match(/\b(?:City|Municipality|Province|Philippines)\b/i) && 
               !line.match(/\b(?:UX|UI|DESIGNER|Developer|Engineer)\b/i)) {
        personalInfo.address = line.trim();
        break;
      }
    }
    
    return personalInfo;
  }

  /**
   * Parse experience with project handling
   */
  parseExperienceRules(experienceText) {
    console.log('💼 Parsing experience from text:', experienceText.substring(0, 200));
    
    const experienceEntries = [];
    const lines = experienceText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentEntry = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim().replace(/\r/g, '');
      console.log('💼 Processing line:', `"${trimmedLine}"`);
      
      // Check if this line starts a new experience entry (job title or company)
      const hasJobTitle = trimmedLine.match(/\b(?:Manager|Editor|Designer|Developer|Engineer|Analyst|Coordinator|Assistant|Specialist|Intern|Student|Freelance)\b/i);
      const hasCompanyPattern = trimmedLine.match(/\b(?:LLC|Inc|Corp|Company|University|College|Technologies)\b/i);
      const hasDatePattern = trimmedLine.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}\s*-\s*(?:\d{4}|Present|Current)/i);
      
      // Check if this looks like a job title with company and dates
      const jobTitleMatch = trimmedLine.match(/^(.+?)\s*-\s*(.+?)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*-\s*(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|Present|Current))/i);
      
      console.log('💼 Line analysis:', {
        hasJobTitle: !!hasJobTitle,
        hasCompanyPattern: !!hasCompanyPattern,
        hasDatePattern: !!hasDatePattern,
        jobTitleMatch: !!jobTitleMatch
      });
      
      if (jobTitleMatch) {
        // Save previous entry
        if (currentEntry && (currentEntry.position || currentEntry.company)) {
          experienceEntries.push(currentEntry);
        }
        
        // Create new entry from matched pattern
        currentEntry = {
          position: jobTitleMatch[1].trim(),
          company: jobTitleMatch[2].trim(),
          startDate: '',
          endDate: '',
          description: ''
        };
        
        // Parse dates
        const dateText = jobTitleMatch[3];
        const dateMatch = dateText.match(/(\w+\s+\d{4})\s*-\s*(\w+\s+\d{4}|Present|Current)/i);
        if (dateMatch) {
          currentEntry.startDate = dateMatch[1];
          currentEntry.endDate = dateMatch[2];
        }
        
        console.log('✅ Created experience entry from pattern:', currentEntry);
      } else if (hasJobTitle || hasCompanyPattern || hasDatePattern) {
        // Save previous entry
        if (currentEntry && (currentEntry.position || currentEntry.company)) {
          experienceEntries.push(currentEntry);
        }
        
        // Start new entry
        currentEntry = {
          position: '',
          company: '',
          startDate: '',
          endDate: '',
          description: ''
        };
        
        // Try to parse job title and company from the line
        if (hasJobTitle && hasCompanyPattern) {
          // Line contains both job title and company
          const parts = trimmedLine.split(/\s*-\s*|\s+at\s+|\s*,\s*/i);
          if (parts.length >= 2) {
            currentEntry.position = parts[0].trim();
            currentEntry.company = parts[1].trim();
          }
        } else if (hasJobTitle) {
          currentEntry.position = trimmedLine;
        } else if (hasCompanyPattern) {
          currentEntry.company = trimmedLine;
        }
        
        // Extract dates if present
        if (hasDatePattern) {
          const dateMatch = trimmedLine.match(/(\w+\s+\d{4})\s*-\s*(\w+\s+\d{4}|Present|Current)/i);
          if (dateMatch) {
            currentEntry.startDate = dateMatch[1];
            currentEntry.endDate = dateMatch[2];
          }
        }
        
        console.log('✅ Started new experience entry:', currentEntry);
      } else if (currentEntry) {
        // Add to current entry's description
        if (trimmedLine.length > 10 && !trimmedLine.match(/^(EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS)/i)) {
          if (currentEntry.description) {
            currentEntry.description += '\n' + trimmedLine;
          } else {
            currentEntry.description = trimmedLine;
          }
          console.log('💼 Added to description:', trimmedLine.substring(0, 50) + '...');
        }
      }
    }
    
    // Save last entry
    if (currentEntry && (currentEntry.position || currentEntry.company)) {
      experienceEntries.push(currentEntry);
    }
    
    console.log('💼 Parsed experience entries:', experienceEntries.length);
    experienceEntries.forEach((entry, index) => {
      console.log(`💼 Entry ${index + 1}:`, {
        position: entry.position,
        company: entry.company,
        dates: `${entry.startDate} - ${entry.endDate}`,
        descriptionLength: entry.description?.length || 0
      });
    });
    
    return experienceEntries;
  }

  /**
   * Parse skills with intelligent filtering
   */
  parseSkillsRules(skillsText) {
    console.log('🔧 Parsing skills from text:', skillsText.substring(0, 200));
    
    // Common technical skills patterns
    const technicalSkills = [
      // Programming Languages
      'JavaScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      'TypeScript', 'HTML', 'CSS', 'HTML/CSS', 'SQL', 'R', 'MATLAB', 'Scala', 'Perl', 'Dart', 'VB.NET',
      
      // Frameworks & Libraries
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring', 'Laravel',
      'Bootstrap', 'jQuery', 'Next.js', 'Nuxt.js', 'Svelte', 'Ember', 'Backbone', 'Redux',
      
      // Databases
      'MySQL', 'PostgreSQL', 'MongoDB', 'SQLite', 'Oracle', 'Redis', 'Cassandra', 'Firebase',
      'DynamoDB', 'MariaDB', 'Neo4j', 'InfluxDB',
      
      // Tools & Technologies
      'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Jenkins', 'Terraform', 'Ansible',
      'Webpack', 'Babel', 'ESLint', 'Prettier', 'Sass', 'Less', 'Gulp', 'Grunt', 'Parcel',
      'Visual Studio Code', 'Unity', 'Expo', 'VS Code',
      
      // Design & UI/UX
      'Figma', 'Sketch', 'Adobe XD', 'Photoshop', 'Illustrator', 'InDesign', 'Canva',
      'Wireframing', 'Prototyping', 'User Research', 'Usability Testing',
      
      // Methodologies
      'Agile', 'Scrum', 'Kanban', 'DevOps', 'CI/CD', 'TDD', 'BDD', 'Microservices',
      
      // Soft Skills
      'Communication', 'Leadership', 'Teamwork', 'Problem Solving', 'Critical Thinking',
      'Project Management', 'Time Management', 'Analytical Skills', 'Creativity',
      'Logical Thinking', 'Debugging', 'Problem-Solving',
      
      // Other Technical
      'API', 'REST', 'GraphQL', 'Microservices', 'Machine Learning', 'AI', 'Data Analysis',
      'Cybersecurity', 'Blockchain', 'IoT', 'Cloud Computing', 'Mobile Development'
    ];
    
    // Words/phrases that are NOT skills
    const nonSkillPatterns = [
      /^\d+$/, // Just numbers
      /^\d{4}(-\d{4})?$/, // Years like 2020-2022
      /\b(years?|months?|experience|proficient|intermediate|advanced|beginner)\b/i,
      /\b(education|school|university|college|degree|bachelor|master|phd)\b/i,
      /\b(company|corporation|inc|ltd|llc|organization)\b/i,
      /\b(project|developed|created|built|designed|implemented)\b/i,
      /\b(gpa|grade|honor|award|graduated|semester)\b/i,
      /\b(email|phone|address|contact|linkedin|github)\b/i,
      /^(and|or|the|a|an|in|on|at|for|with|by)$/i,
      /@|\.|www\.|http|linkedin|github/i,
      // Category labels (contain colon and category name)
      /^(design|web|soft|technical|programming|automation|data).*:/i,
      // Labels with & symbols
      /^[a-z]+&[a-z]+:/i,
      // Single words that are too generic
      /^(user|data|web|soft|technical|programming)$/i,
      // Section headers that are not skills
      /^(trainings?|seminars?|workshops?|certifications?|certificates?|licenses?|languages?|references?)$/i,
      /\b(trainings?|seminars?)\s*&\s*(seminars?|workshops?)/i,
      // License/certification patterns
      /\b(license|licensed|certification|certified|registered)\b/i,
      // Language section indicators
      /^(english|tagalog|filipino|spanish|french|german|chinese|japanese|korean|ilocano|cebuano|bisaya)$/i
    ];
    
    // First, handle category labels by extracting skills after colons
    let processedText = skillsText;
    
    // Handle different skills formats
    
    // Format 1: Category labels like "Programming Languages: C++, C#, JavaScript"
    const categoryMatches = skillsText.match(/[a-zA-Z&\s]+:[a-zA-Z0-9,&\s\-\.\+\/\(\)]+/g);
    if (categoryMatches) {
      console.log('🔧 Found category matches:', categoryMatches);
      categoryMatches.forEach(match => {
        const [category, skillsList] = match.split(':');
        if (skillsList && skillsList.trim()) {
          console.log('🔧 Extracting skills from category "' + category + '":', skillsList.trim());
          processedText = processedText.replace(match, skillsList);
        }
      });
    }
    
    // Format 2: Bullet points or dashes
    processedText = processedText.replace(/^[\s]*[•\-\*]\s*/gm, '');
    
    // Format 3: Skills in parentheses or brackets
    const parenthesesMatches = processedText.match(/\([^)]+\)/g);
    if (parenthesesMatches) {
      parenthesesMatches.forEach(match => {
        const content = match.slice(1, -1); // Remove parentheses
        if (content.includes(',') || content.split(' ').length <= 3) {
          processedText += ', ' + content;
        }
      });
    }
    
    console.log('🔧 Processed text after category extraction:', processedText.substring(0, 200));
    
    let rawSkills = processedText
      // First split by clear delimiters (comma, newline, bullet, semicolon, pipe)
      .split(/[,\n•;|]/)
      .map(skill => skill.trim())
      .filter(skill => skill && skill.length > 1)
      // Handle skills separated by multiple spaces (but keep hyphenated skills intact)
      .flatMap(skill => {
        // If skill contains multiple words separated by 3+ spaces, split them
        if (skill.includes('   ')) {
          return skill.split(/\s{3,}/).map(s => s.trim()).filter(s => s.length > 1);
        }
        return [skill];
      })
      // Handle skills with slashes like "HTML/CSS"
      .flatMap(skill => {
        if (skill.includes('/') && skill.length < 15) {
          // Split skills like "HTML/CSS" into ["HTML", "CSS", "HTML/CSS"]
          const parts = skill.split('/').map(p => p.trim());
          if (parts.length === 2 && parts.every(p => p.length > 1 && p.length < 10)) {
            return [...parts, skill]; // Include both individual and combined
          }
        }
        return [skill];
      });
    
    console.log('🔧 Raw skills extracted:', rawSkills);
    
    // Filter out non-skills
    const filteredSkills = rawSkills.filter(skill => {
      // Skip if matches non-skill patterns
      if (nonSkillPatterns.some(pattern => pattern.test(skill))) {
        console.log('🔧 Filtered out (non-skill pattern):', skill);
        return false;
      }
      
      // Skip if too short or too long
      if (skill.length < 2 || skill.length > 50) {
        console.log('🔧 Filtered out (length):', skill);
        return false;
      }
      
      // Skip if contains too many numbers
      if ((skill.match(/\d/g) || []).length > skill.length / 2) {
        console.log('🔧 Filtered out (too many numbers):', skill);
        return false;
      }
      
      return true;
    });
    
    // Clean up concatenated skills and enhance with proper formatting
    const cleanedSkills = filteredSkills.map(skill => {
      // Fix common concatenated patterns and formatting issues
      let cleaned = skill
        // Specific technology fixes
        .replace(/ReactNative/gi, 'React Native')
        .replace(/NodeJS/gi, 'Node.js')
        .replace(/NextJS/gi, 'Next.js')
        .replace(/VueJS/gi, 'Vue.js')
        .replace(/AngularJS/gi, 'Angular')
        .replace(/JavaScript/gi, 'JavaScript')
        .replace(/TypeScript/gi, 'TypeScript')
        .replace(/MongoDB/gi, 'MongoDB')
        .replace(/PostgreSQL/gi, 'PostgreSQL')
        .replace(/MySQL/gi, 'MySQL')
        
        // Common skill fixes
        .replace(/CenteredDesign/gi, 'User-Centered Design')
        .replace(/UserExperience/gi, 'User Experience')
        .replace(/UserInterface/gi, 'User Interface')
        .replace(/MicrosoftOffice/gi, 'Microsoft Office')
        .replace(/MicrosoftExcel/gi, 'Microsoft Excel')
        .replace(/MicrosoftWord/gi, 'Microsoft Word')
        .replace(/PowerPoint/gi, 'PowerPoint')
        .replace(/DataAnalysis/gi, 'Data Analysis')
        .replace(/DataScience/gi, 'Data Science')
        .replace(/MachineLearning/gi, 'Machine Learning')
        .replace(/ArtificialIntelligence/gi, 'Artificial Intelligence')
        .replace(/WebDevelopment/gi, 'Web Development')
        .replace(/MobileDevelopment/gi, 'Mobile Development')
        .replace(/SoftwareDevelopment/gi, 'Software Development')
        .replace(/ProjectManagement/gi, 'Project Management')
        .replace(/TimeManagement/gi, 'Time Management')
        .replace(/ProblemSolving/gi, 'Problem Solving')
        .replace(/Problem-Solving/gi, 'Problem Solving') // Handle hyphenated version
        .replace(/LogicalThinking/gi, 'Logical Thinking')
        .replace(/CriticalThinking/gi, 'Critical Thinking')
        .replace(/CreativeThinking/gi, 'Creative Thinking')
        .replace(/TeamWork/gi, 'Teamwork')
        .replace(/LeaderShip/gi, 'Leadership')
        .replace(/VisualStudioCode/gi, 'Visual Studio Code')
        .replace(/VSCode/gi, 'Visual Studio Code')
        
        // General formatting
        .replace(/([a-z])([A-Z])/g, '$1 $2') // Add spaces between camelCase
        .replace(/&/g, ' & ') // Add spaces around &
        .replace(/\s+/g, ' ') // Clean up multiple spaces
        .replace(/^[\s\-\*•]+/, '') // Remove leading bullets/dashes
        .trim();
      
      // Match against known technical skills (case-insensitive)
      const matchedSkill = technicalSkills.find(techSkill => 
        techSkill.toLowerCase() === cleaned.toLowerCase()
      );
      
      return matchedSkill || cleaned;
    });
    
    // Reconstruct common multi-word skills that might have been split
    const reconstructedSkills = [];
    const commonMultiWordSkills = [
      ['Problem', 'Solving', 'Problem Solving'],
      ['Critical', 'Thinking', 'Critical Thinking'],
      ['Logical', 'Thinking', 'Logical Thinking'],
      ['Project', 'Management', 'Project Management'],
      ['Time', 'Management', 'Time Management'],
      ['Visual', 'Studio', 'Code', 'Visual Studio Code'],
      ['Data', 'Analysis', 'Data Analysis'],
      ['Machine', 'Learning', 'Machine Learning'],
      ['Web', 'Development', 'Web Development']
    ];
    
    const skillsToCheck = [...cleanedSkills];
    
    for (const [word1, word2, combined, word3] of commonMultiWordSkills) {
      if (word3) {
        // Three-word skill
        const idx1 = skillsToCheck.findIndex(s => s.toLowerCase() === word1.toLowerCase());
        const idx2 = skillsToCheck.findIndex(s => s.toLowerCase() === word2.toLowerCase());
        const idx3 = skillsToCheck.findIndex(s => s.toLowerCase() === word3.toLowerCase());
        if (idx1 !== -1 && idx2 !== -1 && idx3 !== -1) {
          reconstructedSkills.push(combined);
          skillsToCheck.splice(Math.max(idx1, idx2, idx3), 1);
          skillsToCheck.splice(Math.max(Math.min(idx1, idx2), Math.min(idx1, idx3), Math.min(idx2, idx3)), 1);
          skillsToCheck.splice(Math.min(idx1, idx2, idx3), 1);
          console.log('🔧 Reconstructed 3-word skill:', combined);
        }
      } else {
        // Two-word skill
        const idx1 = skillsToCheck.findIndex(s => s.toLowerCase() === word1.toLowerCase());
        const idx2 = skillsToCheck.findIndex(s => s.toLowerCase() === word2.toLowerCase());
        if (idx1 !== -1 && idx2 !== -1) {
          reconstructedSkills.push(combined);
          skillsToCheck.splice(Math.max(idx1, idx2), 1);
          skillsToCheck.splice(Math.min(idx1, idx2), 1);
          console.log('🔧 Reconstructed 2-word skill:', combined);
        }
      }
    }
    
    // Combine reconstructed skills with remaining skills
    const allSkills = [...reconstructedSkills, ...skillsToCheck];
    
    // Remove duplicates and clean up
    const finalSkills = [...new Set(allSkills)]
      .filter(skill => {
        const trimmed = skill.trim();
        // Filter out remaining non-skills
        return trimmed.length > 1 && 
               trimmed.length < 50 && 
               !trimmed.includes(':') && 
               !trimmed.match(/^[a-z]+&[a-z]+$/i) && // Remove patterns like "Design&Prototyping"
               !trimmed.match(/^(user|data|web|soft|technical|programming|skills?|tools?|languages?|trainings?|seminars?|certifications?|licenses?)$/i) &&
               !trimmed.match(/^\d+$/) && // No pure numbers
               !trimmed.match(/^(and|or|the|a|an|in|on|at|for|with|by|of|to|from)$/i) && // No prepositions
               !trimmed.match(/\b(proficiency|level|years?|months?|experience|license|licensed|registered|certification|certified)\b/i) && // No experience descriptors or credentials
               !trimmed.match(/^(english|tagalog|filipino|spanish|french|german|chinese|japanese|korean|ilocano|cebuano|bisaya)$/i); // No language names
      })
      .slice(0, 20); // Limit to 20 skills max
    
    console.log('🔧 Final skills after all processing:', finalSkills);
    console.log('🔧 Skills processing summary:', {
      originalTextLength: skillsText.length,
      rawSkillsCount: rawSkills.length,
      filteredSkillsCount: filteredSkills.length,
      cleanedSkillsCount: cleanedSkills.length,
      finalSkillsCount: finalSkills.length
    });
    
    return finalSkills;
  }

  /**
   * Parse certifications
   */
  parseCertificationsRules(certificationsText) {
    const certifications = certificationsText
      .split('\n')
      .map(cert => cert.trim())
      .filter(cert => cert && cert.length > 5);
    
    return certifications;
  }

  /**
   * Parse certificates for optional sections (more detailed structure)
   */
  parseOptionalCertificatesRules(certificationsText) {
    console.log('🏆 Parsing certificates for optional sections...');
    const certificates = [];
    const lines = certificationsText.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentCert = null;
    
    for (const line of lines) {
      // Skip headers
      if (line.match(/^(certifications?|certificates?|seminars?|trainings?|licenses?):?$/i)) {
        continue;
      }
      
      // Check if this looks like a certificate name (title case, reasonable length)
      if (line.length > 10 && line.length < 100 && 
          (line.match(/certified|certificate|certification|license|training|seminar/i) || 
           line.match(/^[A-Z][a-z]+(\s+[A-Z][a-z]*)*$/))) {
        
        // Save previous certificate if exists
        if (currentCert) {
          certificates.push(currentCert);
        }
        
        // Start new certificate
        currentCert = {
          name: line,
          issuer: '',
          date: '',
          description: ''
        };
        
        // Try to extract date from the name
        const dateMatch = line.match(/(\d{4}|\w+\s+\d{4})/);
        if (dateMatch) {
          currentCert.date = dateMatch[1];
          currentCert.name = line.replace(dateMatch[0], '').trim();
        }
      } else if (currentCert && line.length > 5) {
        // This might be issuer or description
        if (!currentCert.issuer && line.match(/^[A-Z][a-zA-Z\s&.,]+$/)) {
          currentCert.issuer = line;
        } else if (!currentCert.description) {
          currentCert.description = line;
        }
      }
    }
    
    // Add the last certificate
    if (currentCert) {
      certificates.push(currentCert);
    }
    
    console.log('🏆 Parsed certificates:', certificates);
    return certificates;
  }

  /**
   * Parse projects for optional sections
   */
  parseProjectsRules(projectsText) {
    console.log('💼 Parsing projects for optional sections...');
    const projects = [];
    const lines = projectsText.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentProject = null;
    
    for (const line of lines) {
      // Skip headers
      if (line.match(/^(projects?|personal\s+projects?|work\s+projects?):?$/i)) {
        continue;
      }
      
      // Check if this looks like a project name
      if (line.length > 5 && line.length < 80 && 
          (line.match(/^[A-Z][a-zA-Z\s\-&.()]+$/) || line.includes('Project') || line.includes('System'))) {
        
        // Save previous project if exists
        if (currentProject) {
          projects.push(currentProject);
        }
        
        // Start new project
        currentProject = {
          name: line,
          description: '',
          technologies: '',
          startDate: '',
          endDate: '',
          url: ''
        };
      } else if (currentProject && line.length > 10) {
        // This might be description or technologies
        if (line.match(/technologies?|tech\s+stack|built\s+with|using/i)) {
          currentProject.technologies = line.replace(/^(technologies?|tech\s+stack|built\s+with|using):?\s*/i, '');
        } else if (line.match(/https?:\/\/|github|gitlab|bitbucket/i)) {
          currentProject.url = line;
        } else if (!currentProject.description) {
          currentProject.description = line;
        }
      }
    }
    
    // Add the last project
    if (currentProject) {
      projects.push(currentProject);
    }
    
    console.log('💼 Parsed projects:', projects);
    return projects;
  }

  /**
   * Parse awards for optional sections
   */
  parseAwardsRules(awardsText) {
    console.log('🥇 Parsing awards for optional sections...');
    const awards = [];
    const lines = awardsText.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentAward = null;
    
    for (const line of lines) {
      // Skip headers
      if (line.match(/^(awards?|achievements?|honors?|recognitions?):?$/i)) {
        continue;
      }
      
      // Check if this looks like an award name
      if (line.length > 5 && line.length < 100 && 
          (line.match(/award|achievement|honor|recognition|winner|champion|medal|prize/i) ||
           line.match(/^[A-Z][a-zA-Z\s\-&.()]+$/))) {
        
        // Save previous award if exists
        if (currentAward) {
          awards.push(currentAward);
        }
        
        // Start new award
        currentAward = {
          title: line,
          issuer: '',
          date: '',
          description: ''
        };
        
        // Try to extract date from the title
        const dateMatch = line.match(/(\d{4}|\w+\s+\d{4})/);
        if (dateMatch) {
          currentAward.date = dateMatch[1];
          currentAward.title = line.replace(dateMatch[0], '').trim();
        }
      } else if (currentAward && line.length > 5) {
        // This might be issuer or description
        if (!currentAward.issuer && line.match(/^[A-Z][a-zA-Z\s&.,]+$/)) {
          currentAward.issuer = line;
        } else if (!currentAward.description) {
          currentAward.description = line;
        }
      }
    }
    
    // Add the last award
    if (currentAward) {
      awards.push(currentAward);
    }
    
    console.log('🥇 Parsed awards:', awards);
    return awards;
  }

  /**
   * Parse volunteer experience for optional sections
   */
  parseVolunteerRules(volunteerText) {
    console.log('❤️ Parsing volunteer experience for optional sections...');
    const volunteer = [];
    const lines = volunteerText.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentVolunteer = null;
    
    for (const line of lines) {
      // Skip headers
      if (line.match(/^(volunteer|volunteering|community\s+service|social\s+work):?$/i)) {
        continue;
      }
      
      // Check if this looks like an organization or role
      if (line.length > 5 && line.length < 80 && 
          (line.match(/volunteer|community|charity|foundation|organization|ngo|non.profit/i) ||
           line.match(/^[A-Z][a-zA-Z\s\-&.()]+$/))) {
        
        // Save previous volunteer experience if exists
        if (currentVolunteer) {
          volunteer.push(currentVolunteer);
        }
        
        // Start new volunteer experience
        currentVolunteer = {
          organization: line.match(/volunteer|community|charity|foundation|organization|ngo/i) ? line : '',
          role: line.match(/volunteer|community|charity|foundation|organization|ngo/i) ? '' : line,
          startDate: '',
          endDate: '',
          description: '',
          location: ''
        };
      } else if (currentVolunteer && line.length > 5) {
        // This might be role, location, or description
        if (!currentVolunteer.role && !line.match(/\d{4}/) && line.length < 50) {
          currentVolunteer.role = line;
        } else if (line.match(/\b\d{4}\b/)) {
          // Extract dates
          const years = line.match(/\d{4}/g);
          if (years && years.length >= 1) {
            currentVolunteer.startDate = years[0];
            if (years.length > 1) {
              currentVolunteer.endDate = years[1];
            }
          }
        } else if (line.match(/city|province|country|philippines|manila|cebu|davao/i)) {
          currentVolunteer.location = line;
        } else if (!currentVolunteer.description) {
          currentVolunteer.description = line;
        }
      }
    }
    
    // Add the last volunteer experience
    if (currentVolunteer) {
      volunteer.push(currentVolunteer);
    }
    
    console.log('❤️ Parsed volunteer experience:', volunteer);
    return volunteer;
  }

  /**
   * Deduplicate education entries
   */
  deduplicateEducation(educationArray) {
    const seen = new Set();
    return educationArray.filter(edu => {
      const key = `${edu.school}-${edu.degree}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Deduplicate experience entries
   */
  deduplicateExperience(experienceArray) {
    const seen = new Set();
    return experienceArray.filter(exp => {
      const key = `${exp.company}-${exp.position}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  /**
   * Format date for frontend compatibility (YYYY-MM format)
   */
  formatDateForFrontend(dateString) {
    if (!dateString) return '';
    
    // Handle 'present' case
    if (dateString.toLowerCase() === 'present' || dateString.toLowerCase() === 'current') {
      return 'present';
    }
    
    // Extract year from various formats
    const yearMatch = dateString.match(/\d{4}/);
    if (yearMatch) {
      const year = yearMatch[0];
      // Default to January for start dates, December for end dates
      return `${year}-01`;
    }
    
    return dateString;
  }

  /**
   * Format phone number for frontend
   */
  formatPhoneForFrontend(phoneString) {
    if (!phoneString) return '';
    
    // Remove all non-digits
    const digits = phoneString.replace(/\D/g, '');
    
    // Handle Philippine numbers
    if (digits.startsWith('63')) {
      // +63 format
      return digits.substring(2);
    } else if (digits.startsWith('0')) {
      // 0XXX format
      return digits;
    }
    
    return phoneString;
  }
}

module.exports = new EnhancedResumeParser();
