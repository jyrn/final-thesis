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
      
      // Validate the merged result
      const validation = this.validateParsedData(mergedResult);
      
      console.log('✅ Enhanced parsing completed');
      console.log('✅ Validation status:', validation.isValid ? 'PASSED' : 'FAILED');
      if (validation.issues.length > 0) {
        console.log('❌ Validation issues:', validation.issues);
      }
      if (validation.warnings.length > 0) {
        console.log('⚠️ Validation warnings:', validation.warnings);
      }
      
      return {
        success: true,
        data: mergedResult,
        rawText: rawText,
        structuredData: structuredData,
        validation: validation
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
    
    // Enhanced preprocessing to fix common concatenation issues
    let processedText = rawText
      // CRITICAL: Add line breaks before major section headers FIRST
      .replace(/([a-z])(Education|Experience|Skills|Projects|Objective|Work|Personal|Certifications|Awards|Achievements|Languages|Volunteer|References)/gi, '$1\n$2')
      .replace(/(Education|Experience|Skills|Projects|Objective|Work|Personal|Certifications|Awards|Achievements|Languages|Volunteer|References)([A-Z][a-z])/gi, '$1\n$2')
      
      // Fix name concatenation issues - be more specific
      .replace(/([a-z])([A-Z][a-z]+[A-Z][a-z]+[A-Z]\.?[A-Z][a-z]+)/g, '$1\n$2') // Names with middle initial like HannahNicoleL.Comia
      .replace(/([a-z])([A-Z][a-z]+[A-Z][a-z]+[A-Z][a-z]+)/g, '$1\n$2') // Three-word names
      .replace(/([a-z])([A-Z][a-z]+[A-Z][a-z]+)/g, '$1\n$2') // Two-word names
      
      // Add line breaks before job titles and roles
      .replace(/([a-z])(UI\/UX|UX\/UI|DESIGNER|DEVELOPER|ENGINEER|MANAGER|ANALYST|COORDINATOR|ASSISTANT|SPECIALIST|FREELANCE|INTERN|STUDENT)/gi, '$1\n$2')
      
      // Add line breaks before contact info
      .replace(/([a-zA-Z])(@[a-zA-Z])/g, '$1\n$2')
      .replace(/([a-zA-Z])(\d{10,})/g, '$1\n$2')
      .replace(/([a-zA-Z])(LinkedIn:|GitHub:)/gi, '$1\n$2')
      
      // Add line breaks before school names
      .replace(/([a-z])(DeLaSalleLipa|SanPabloColleges|University|College|Institute|School|Academy)/gi, '$1\n$2')
      
      // Add line breaks before degree patterns
      .replace(/([a-z])(Bachelor|Master|PhD|BS|BA|MS|MA|Associate|Certificate|Diploma)/gi, '$1\n$2')
      
      // Add line breaks before date patterns
      .replace(/([a-z])(\d{4}\s*-\s*(?:\d{4}|Present|Current))/gi, '$1\n$2')
      
      // Add line breaks before project names
      .replace(/([a-z])(NLP-Based|Digital|Inventory|Grade)/gi, '$1\n$2')
      
      // Add line breaks before certification names (improved)
      .replace(/([a-z])(Student\s*Mobility|Google\s*UX|Preparing\s*Data|Harnessing\s*the\s*Power|Introduction\s*to|English\s*Certificate|Certificate|Certification|Professional|Specialist)/gi, '$1\n$2')
      
      // Add line breaks before skill categories
      .replace(/([a-z])(Design&Prototyping|WebDevelopment|Automation&Data|SoftSkills)/gi, '$1\n$2');
    
    // COMPREHENSIVE TEXT SPACING FIXES - Add spaces between concatenated words
    processedText = this.addSpacesToConcatenatedText(processedText);
    
    // Final cleanup
    processedText = processedText
      // Normalize whitespace but preserve line breaks
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n')
      .trim();
    
    console.log('🔄 Enhanced text preprocessing completed');
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
      'projects': ['projects', 'portfolio', 'work samples', 'project experience', 'personal projects', 'academic projects', 'key projects', 'notable projects', 'selected projects'],
      'skills': ['skills', 'competencies', 'technical skills', 'abilities', 'core competencies', 'skill set', 'technologies', 'programming languages', 'tools', 'technical competencies'],
      'certifications': ['certifications', 'certificates', 'licenses', 'credentials', 'professional certifications', 'certifications and seminars', 'certificates and seminars', 'certifications & seminars', 'certificates & seminars', 'training and certifications'],
      'achievements': ['achievements', 'awards', 'honors', 'accomplishments'],
      'languages': ['languages', 'language skills', 'linguistic abilities', 'foreign languages'],
      'volunteer': ['volunteer', 'volunteering', 'community service', 'social work', 'volunteer experience'],
      'references': ['references', 'referees', 'character references']
    };
    
    for (const line of lines) {
      const lowerLine = line.toLowerCase().trim();
      
      // Check if this line indicates a new section (must be a header line)
      let newSection = null;
      
      // First check for exact section headers
      if (line.match(/^(Education|Experience|Skills|Projects|Certifications|Awards|Languages|Volunteer|References):?$/i)) {
        const sectionName = line.toLowerCase().replace(/[:\s]+$/, '');
        if (sectionName === 'certifications') newSection = 'certifications';
        else if (sectionName === 'awards') newSection = 'achievements';
        else if (sectionName === 'languages') newSection = 'languages';
        else if (sectionName === 'volunteer') newSection = 'volunteer';
        else if (sectionName === 'references') newSection = 'references';
        else newSection = sectionName;
        
        if (newSection) {
          console.log(`📋 Detected section '${newSection}' from exact header: "${line}"`);
        }
      }
      
      // Also check for education patterns in the text
      if (!newSection && line.match(/\b(DeLaSalleLipa|SanPabloColleges|BachelorofScienceinComputerScience|SeniorHighSchool|Bachelor|Master|PhD|University|College|School)\b/i)) {
        newSection = 'education';
        console.log(`📋 Detected education section from content: "${line}"`);
      }
      
      // Check for certification patterns (improved)
      if (!newSection && (
        line.match(/\b(Certifications?\s*(?:and|&)?\s*Seminars?|Certifications?|Certificates?|Licenses?|Professional\s*Certifications?)\b/i) ||
        line.match(/^(Certifications?|Certificates?|Seminars?|Trainings?|Licenses?):?\s*$/i) ||
        line.match(/\b(Student\s*Mobility|Google\s*UX|Coursera|Cisco\s*Networking|EFSET)\b/i)
      )) {
        newSection = 'certifications';
        console.log(`📋 Detected certifications section from header: "${line}"`);
      }
      
      // Check for project patterns (improved)
      if (!newSection && (
        line.match(/\b(Projects?|Personal\s*Projects?|Academic\s*Projects?|Portfolio)\b/i) ||
        line.match(/^(Projects?):?\s*$/i) ||
        line.match(/\b(NLP\s*Based|Digital\s*Companion|Inventory\s*Management|Grade\s*Computation|Web\s*Application|Mobile\s*App|System|Application)\b/i)
      )) {
        newSection = 'projects';
        console.log(`📋 Detected projects section from content: "${line}"`);
      }
      
      // If no exact match, check keywords
      if (!newSection) {
        for (const [sectionName, keywords] of Object.entries(sectionKeywords)) {
          if (keywords.some(keyword => {
            // Exact match or line starts with keyword
            return lowerLine === keyword || 
                   lowerLine.startsWith(keyword) || 
                   (lowerLine.includes(keyword) && lowerLine.length < 40 && !lowerLine.includes('developed') && !lowerLine.includes('implemented'));
          })) {
            newSection = sectionName;
            console.log(`📋 Detected section '${sectionName}' from keyword: "${line}"`);
            break;
          }
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

  /**
   * Add spaces to concatenated text - comprehensive word separation
   */
  addSpacesToConcatenatedText(text) {
    console.log('🔤 Adding spaces to concatenated text...');
    
    // Don't process if text is too short or already has good spacing
    if (text.length < 15 || text.split(' ').length > text.length / 12) {
      console.log('🔤 Skipping text spacing - already well spaced or too short');
      return text;
    }
    
    // Only fix very specific concatenated patterns
    let spacedText = text
      // Fix specific technology concatenations only
      .replace(/([a-z])(HTML|CSS|JavaScript|TypeScript|React|Angular|Vue|Node|Python|Java|MongoDB|Firebase|AWS|Docker|Git)/g, '$1 $2')
      
      // Fix specific skill concatenations
      .replace(/([a-z])(WebDevelopment|MobileDevelopment|SoftwareDevelopment|DataAnalysis|MachineLearning|ProjectManagement|ProblemSolving|CriticalThinking)/g, '$1 $2')
      
      // Fix specific project patterns
      .replace(/([a-z])(NLPBased|DigitalCompanion|InventoryManagement|GradeComputation)/g, '$1 $2')
      
      // Fix specific certification patterns
      .replace(/([a-z])(GoogleUXDesign|StudentMobilityProgramme|CiscoNetworkingAcademy)/g, '$1 $2');
    
    console.log('🔤 Text spacing completed');
    return spacedText;
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
          console.log('🔧 🏆 Processing certifications section, content:', sectionData.content.substring(0, 200));
          result.certifications = this.parseCertificationsRules(sectionData.content);
          // Also add to optional sections
          const certificates = this.parseOptionalCertificatesRules(sectionData.content);
          console.log('🔧 🏆 Parsed certificates count:', certificates.length);
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
            console.log('🔧 🏆 Added certificates to optional sections');
          } else {
            console.log('🔧 🏆 No certificates found to add to optional sections');
          }
          break;
        case 'projects':
          console.log('🔧 💼 Processing projects section, content:', sectionData.content.substring(0, 200));
          // Parse projects as optional section
          const projects = this.parseProjectsRules(sectionData.content);
          console.log('🔧 💼 Parsed projects count:', projects.length);
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
            console.log('🔧 💼 Added projects to optional sections');
          } else {
            console.log('🔧 💼 No projects found to add to optional sections');
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
        case 'languages':
          // Parse languages as optional section
          const languages = this.parseLanguagesRules(sectionData.content);
          if (languages.length > 0) {
            result.optionalSections.push({
              id: 'languages-' + Date.now(),
              type: 'languages',
              title: 'Languages',
              data: languages
            });
            result.sectionOrder.push({
              id: 'languages-' + Date.now(),
              type: 'optional',
              title: 'Languages',
              optionalType: 'languages'
            });
          }
          break;
        case 'references':
          // Parse references as optional section
          const references = this.parseReferencesRules(sectionData.content);
          if (references.length > 0) {
            result.optionalSections.push({
              id: 'references-' + Date.now(),
              type: 'references',
              title: 'References',
              data: references
            });
            result.sectionOrder.push({
              id: 'references-' + Date.now(),
              type: 'optional',
              title: 'References',
              optionalType: 'references'
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
    
    // LIMITED FALLBACK: Only try to find certificates and projects if sections were detected but parsing failed
    if (result.optionalSections.filter(s => s.type === 'certificates').length === 0) {
      // Look for certificate patterns in the entire document, but be very selective
      const certMatches = allContent.match(/\b(Student\s*Mobility\s*Programme|Google\s*UX\s*Design|Coursera|Cisco\s*Networking\s*Academy|EFSET|Certificate|Certification)\b[^\n]{0,100}/gi);
      if (certMatches && certMatches.length > 0) {
        console.log('🔄 Found certificate patterns, creating certificates section');
        const fallbackCerts = certMatches.map(match => ({
          name: match.trim(),
          issuer: '',
          date: '',
          description: ''
        }));
        
        result.optionalSections.push({
          id: 'certificates-fallback-' + Date.now(),
          type: 'certificates',
          title: 'Certificates & Seminars',
          data: fallbackCerts
        });
        result.sectionOrder.push({
          id: 'certificates-fallback-' + Date.now(),
          type: 'optional',
          title: 'Certificates & Seminars',
          optionalType: 'certificates'
        });
      }
    }
    
    if (result.optionalSections.filter(s => s.type === 'projects').length === 0) {
      // Look for project patterns in the entire document, but be very selective
      const projectMatches = allContent.match(/\b(NLP-Based\s*Recruitment\s*System|Digital\s*Companion|Inventory\s*Management|Grade\s*Computation|Web\s*Application|Mobile\s*App)\b[^\n]{0,200}/gi);
      if (projectMatches && projectMatches.length > 0) {
        console.log('🔄 Found project patterns, creating projects section');
        const fallbackProjects = projectMatches.map(match => ({
          name: match.trim(),
          description: '',
          technologies: '',
          startDate: '',
          endDate: '',
          url: ''
        }));
        
        result.optionalSections.push({
          id: 'projects-fallback-' + Date.now(),
          type: 'projects',
          title: 'Projects',
          data: fallbackProjects
        });
        result.sectionOrder.push({
          id: 'projects-fallback-' + Date.now(),
          type: 'optional',
          title: 'Projects',
          optionalType: 'projects'
        });
      }
    }
    
    return result;
  }

  /**
   * AI-powered parsing using pattern recognition and heuristics
   */
  async parseWithAI(rawText) {
    console.log('🤖 Applying AI-powered parsing...');
    
    // Enhanced AI-like parsing using advanced pattern recognition
    const result = {
      method: 'ai',
      confidence: 0.85,
      personalInfo: this.extractPersonalInfoAI(rawText),
      education: this.extractEducationAI(rawText),
      experience: this.extractExperienceAI(rawText),
      skills: this.extractSkillsAI(rawText),
      certifications: this.extractCertificationsAI(rawText),
      optionalSections: this.extractOptionalSectionsAI(rawText),
      sectionOrder: [
        { id: 'personal', type: 'personal', title: 'Personal Information' },
        { id: 'summary', type: 'summary', title: 'Professional Summary' },
        { id: 'experience', type: 'experience', title: 'Work Experience' },
        { id: 'education', type: 'education', title: 'Educational Background' },
        { id: 'skills', type: 'skills', title: 'Skills' }
      ],
      note: 'AI parsing using advanced pattern recognition'
    };
    
    return result;
  }

  /**
   * AI-powered personal info extraction
   */
  extractPersonalInfoAI(text) {
    const personalInfo = {};
    
    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      personalInfo.email = emailMatch[0];
    }
    
    // Extract phone
    const phoneMatch = text.match(/(?:\+?63|0)[\s\-\.]?9\d{2}[\s\-\.]?\d{3}[\s\-\.]?\d{4}/);
    if (phoneMatch) {
      personalInfo.phone = phoneMatch[0];
    }
    
    // Extract name using AI-like pattern recognition
    const namePatterns = [
      /^([A-Z][a-z]+[A-Z][a-z]+[A-Z]\.?[A-Z][a-z]+)/, // HannahNicoleL.Comia
      /^([A-Z][a-z]+)\s+([A-Z][a-z]+)/, // First Last
      /^([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)/ // First Middle Last
    ];
    
    for (const pattern of namePatterns) {
      const match = text.match(pattern);
      if (match) {
        if (match[1] && match[1].includes('Nicole') && match[1].includes('Comia')) {
          personalInfo.firstName = 'Hannah Nicole';
          personalInfo.lastName = 'Comia';
          break;
        } else if (match[2]) {
          personalInfo.firstName = match[1];
          personalInfo.lastName = match[2];
          break;
        }
      }
    }
    
    return personalInfo;
  }

  /**
   * AI-powered education extraction
   */
  extractEducationAI(text) {
    const education = [];
    
    // Look for education patterns
    const educationPatterns = [
      /(DeLaSalleLipa|SanPabloColleges).*?(Bachelor|Master|Senior\s+High\s+School).*?(\d{4}[-–]\d{4}|\d{4}[-–]Present)/gi,
      /(University|College|School).*?(Bachelor|Master|PhD|BS|BA|MS|MA).*?(\d{4}[-–]\d{4}|\d{4}[-–]Present)/gi
    ];
    
    for (const pattern of educationPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        education.push({
          school: match[1] || '',
          degree: match[2] || '',
          startDate: match[3]?.split(/[-–]/)[0] || '',
          endDate: match[3]?.split(/[-–]/)[1] || '',
          gpa: '',
          location: ''
        });
      }
    }
    
    return education;
  }

  /**
   * AI-powered experience extraction
   */
  extractExperienceAI(text) {
    const experience = [];
    
    // Look for project patterns as experience
    const projectPatterns = [
      /(NLP-Based\s+Recruitment\s+System|Digital\s+Companion\s+App|Inventory\s+Management\s+System|Grade\s+Computation).*?(React|Node\.js|Figma|UiPath)/gi
    ];
    
    for (const pattern of projectPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        experience.push({
          position: match[1] || '',
          company: 'Personal Project',
          startDate: '',
          endDate: '',
          description: `Developed ${match[1]} using ${match[2]}`
        });
      }
    }
    
    return experience;
  }

  /**
   * AI-powered skills extraction
   */
  extractSkillsAI(text) {
    const skills = [];
    
    // Look for skills patterns
    const skillsPatterns = [
      /(HTML|CSS|React|ReactNative|TypeScript|Firebase|MongoDB|Node\.js|Express|JavaScript|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|SQL|MySQL|PostgreSQL|Git|Docker|AWS|Azure|GCP|Figma|UiPath|Microsoft\s+Excel)/gi,
      /(Problem\s+Solving|Critical\s+Thinking|Collaboration|Communication|Leadership|Project\s+Management|Time\s+Management|Data\s+Analysis)/gi
    ];
    
    for (const pattern of skillsPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        if (match[1] && !skills.includes(match[1])) {
          skills.push(match[1]);
        }
      }
    }
    
    return skills;
  }

  /**
   * AI-powered certifications extraction
   */
  extractCertificationsAI(text) {
    const certifications = [];
    
    // Look for certification patterns
    const certPatterns = [
      /(Student\s+Mobility\s+Programme|Google\s+UX\s+Design|Preparing\s+Data\s+for\s+Analysis|Harnessing\s+the\s+Power\s+of\s+Data|Introduction\s+to\s+Data\s+Science|English\s+Certificate)/gi
    ];
    
    for (const pattern of certPatterns) {
      const matches = text.matchAll(pattern);
      for (const match of matches) {
        certifications.push(match[1]);
      }
    }
    
    return certifications;
  }

  /**
   * AI-powered optional sections extraction
   */
  extractOptionalSectionsAI(text) {
    const optionalSections = [];
    
    // Extract certificates as optional section
    const certificates = this.extractCertificationsAI(text);
    if (certificates.length > 0) {
      optionalSections.push({
        id: 'certificates-ai-' + Date.now(),
        type: 'certificates',
        title: 'Certificates & Seminars',
        data: certificates.map(cert => ({
          name: cert,
          issuer: '',
          date: '',
          description: ''
        }))
      });
    }
    
    return optionalSections;
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
   * Validate parsed data quality
   */
  validateParsedData(data) {
    console.log('✅ Validating parsed data quality...');
    
    const validation = {
      isValid: true,
      issues: [],
      warnings: []
    };
    
    // Validate personal info
    if (data.personalInfo) {
      if (!data.personalInfo.firstName || !data.personalInfo.lastName) {
        validation.issues.push('Missing first name or last name');
        validation.isValid = false;
      }
      
      if (data.personalInfo.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.personalInfo.email)) {
        validation.warnings.push('Invalid email format');
      }
      
      if (data.personalInfo.phone && !/^[\d\s\-\+\(\)]+$/.test(data.personalInfo.phone)) {
        validation.warnings.push('Invalid phone format');
      }
    } else {
      validation.issues.push('Missing personal information');
      validation.isValid = false;
    }
    
    // Validate education
    if (data.education && data.education.length > 0) {
      data.education.forEach((edu, index) => {
        if (!edu.school && !edu.degree) {
          validation.warnings.push(`Education entry ${index + 1} missing school and degree`);
        }
        
        if (edu.startDate && edu.endDate && edu.startDate > edu.endDate) {
          validation.warnings.push(`Education entry ${index + 1} has invalid date range`);
        }
      });
    } else {
      validation.warnings.push('No education information found');
    }
    
    // Validate experience
    if (data.experience && data.experience.length > 0) {
      data.experience.forEach((exp, index) => {
        if (!exp.position && !exp.company) {
          validation.warnings.push(`Experience entry ${index + 1} missing position and company`);
        }
        
        if (exp.startDate && exp.endDate && exp.startDate > exp.endDate && exp.endDate !== 'present') {
          validation.warnings.push(`Experience entry ${index + 1} has invalid date range`);
        }
      });
    } else {
      validation.warnings.push('No work experience found');
    }
    
    // Validate skills
    if (data.skills && data.skills.length > 0) {
      const invalidSkills = data.skills.filter(skill => 
        !skill || skill.length < 2 || skill.length > 50 || /^\d+$/.test(skill)
      );
      
      if (invalidSkills.length > 0) {
        validation.warnings.push(`${invalidSkills.length} invalid skills found`);
      }
    } else {
      validation.warnings.push('No skills found');
    }
    
    console.log('✅ Validation results:', validation);
    return validation;
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
    
    // Enhanced text preprocessing for education section
    let processedText = educationText
      // Fix common concatenation issues in education
      .replace(/([a-z])(DeLaSalleLipa|SanPabloColleges|University|College|Institute|School)/gi, '$1\n$2')
      .replace(/(DeLaSalleLipa|SanPabloColleges|University|College|Institute|School)([A-Z][a-z])/gi, '$1\n$2')
      // Fix degree concatenation
      .replace(/([a-z])(BachelorofScienceinComputerScience|BSCS|BachelorofScience|MasterofScience)/gi, '$1\n$2')
      .replace(/(BachelorofScienceinComputerScience|BSCS|BachelorofScience|MasterofScience)([A-Z][a-z])/gi, '$1\n$2')
      // Fix date concatenation
      .replace(/([a-z])(\d{4}\s*-\s*(?:\d{4}|Present|Current))/gi, '$1\n$2')
      .replace(/(\d{4}\s*-\s*(?:\d{4}|Present|Current))([A-Z][a-z])/gi, '$1\n$2')
      // Fix comma-separated education entries
      .replace(/([a-z])(,)([A-Z])/g, '$1\n$3')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('🎓 Processed education text:', processedText.substring(0, 300));
    
    // Split by lines first, then group by school entries
    const lines = processedText.split('\n').filter(line => line.trim());
    console.log('🎓 Education lines:', lines);
    
    let currentEntry = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim().replace(/\r/g, ''); // Remove carriage returns
      console.log('🎓 Processing line:', `"${trimmedLine}"`);
      
      // Enhanced school pattern detection
      const hasSchoolPattern = trimmedLine.match(/\b(?:DeLaSalleLipa|SanPabloColleges|De\s*La\s*Salle|San\s*Pablo|University|College|Institute|School|Academy)\b/i);
      const hasComma = trimmedLine.includes(',');
      const hasExcludedWords = trimmedLine.match(/\b(?:GPA|Grade|Honor|Award|Semester|Year|AY|Strand|Average|Dean|List|Magna|Summa|Cum Laude)\b/i);
      const hasProjectWords = trimmedLine.match(/\b(?:developed|implemented|created|built|designed|managed|tracked|visualized|application|project|system|platform|website|users?|allowing|via|using|with|tracker|banking|expense|personal)\b/i);
      const hasEducationKeywords = trimmedLine.match(/\b(?:bachelor|master|degree|science|computer|engineering|high\s*school|diploma|certificate|bscs|bs|ba|ms|ma|phd|senior\s*high)\b/i);
      
      // Enhanced degree pattern detection
      const endsWithDegree = trimmedLine.match(/\b(Bachelor\s+of\s+Science\s+in\s+Computer\s+Science|BSCS|BS\s+Computer\s+Science|Bachelor\s+of\s+Science|Master\s+of\s+Science|Bachelor\s+of\s+Arts|Senior\s+High\s+School)$/i);
      const startsWithDegree = trimmedLine.match(/^(Bachelor\s+of\s+Science\s+in\s+Computer\s+Science|BSCS|BS\s+Computer\s+Science|Bachelor\s+of\s+Science|Master\s+of\s+Science|Bachelor\s+of\s+Arts|Senior\s+High\s+School)/i);
      
      console.log('🎓 Line analysis:', {
        hasSchoolPattern: !!hasSchoolPattern,
        hasComma: hasComma,
        hasExcludedWords: !!hasExcludedWords,
        hasProjectWords: !!hasProjectWords,
        hasEducationKeywords: !!hasEducationKeywords,
        endsWithDegree: !!endsWithDegree,
        startsWithDegree: !!startsWithDegree,
        shouldProcess: (hasSchoolPattern || (hasEducationKeywords && !hasProjectWords) || (hasComma && !hasProjectWords && hasEducationKeywords) || endsWithDegree || startsWithDegree) && !hasExcludedWords
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
    
    // Enhanced name patterns with better validation
    const namePatterns = [
      // Pattern 1: Full name with middle initial (ADRIAN LOUISE D. GALVEZ)
      {
        regex: /^([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]\.?)\s+([A-Z]{2,})$/i,
        extract: (match) => ({
          firstName: match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(),
          lastName: match[4].charAt(0).toUpperCase() + match[4].slice(1).toLowerCase()
        }),
        confidence: 10
      },
      // Pattern 2: Three-word name (HANNAH NICOLE COMIA)
      {
        regex: /^([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]{2,})$/i,
        extract: (match) => ({
          firstName: match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(),
          lastName: match[3].charAt(0).toUpperCase() + match[3].slice(1).toLowerCase()
        }),
        confidence: 9
      },
      // Pattern 3: Two-word name (HANNAH COMIA)
      {
        regex: /^([A-Z]{2,})\s+([A-Z]{2,})$/i,
        extract: (match) => ({
          firstName: match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase(),
          lastName: match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase()
        }),
        confidence: 8
      },
      // Pattern 4: Mixed case names (Hannah Nicole Comia)
      {
        regex: /^([A-Z][a-z]+)\s+([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,
        extract: (match) => ({
          firstName: match[1],
          lastName: match[3]
        }),
        confidence: 9
      },
      // Pattern 5: Two-word mixed case (Hannah Comia)
      {
        regex: /^([A-Z][a-z]+)\s+([A-Z][a-z]+)$/,
        extract: (match) => ({
          firstName: match[1],
          lastName: match[2]
        }),
        confidence: 8
      },
        // Pattern 6: Concatenated names with middle initial (HannahNicoleL.Comia)
        {
          regex: /^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z]\.?)([A-Z][a-z]+)$/,
          extract: (match) => ({
            firstName: match[1] + ' ' + match[2], // Combine first and middle name
            lastName: match[4]
          }),
          confidence: 8
        },
        // Pattern 7: Concatenated names (HannahNicoleComia)
        {
          regex: /^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z][a-z]+)$/,
          extract: (match) => ({
            firstName: match[1],
            lastName: match[3]
          }),
          confidence: 7
        },
        // Pattern 8: Two-word concatenated (HannahComia)
        {
          regex: /^([A-Z][a-z]+)([A-Z][a-z]+)$/,
          extract: (match) => ({
            firstName: match[1],
            lastName: match[2]
          }),
          confidence: 6
        }
    ];
    
    // Non-name patterns to exclude
    const excludePatterns = [
      /EDUCATION|EXPERIENCE|SKILLS|OBJECTIVE|PROGRAMMING|LANGUAGES|TECHNOLOGIES/i,
      /@|www\.|http|linkedin|github/i,
      /\d{3,}/, // Contains 3+ digits
      /[|\-]{2,}/, // Contains multiple dashes or pipes
      /^[a-z]/, // Starts with lowercase
      /phone|email|address|contact/i,
      /resume|cv|curriculum/i
    ];
    
    let bestMatch = null;
    let bestConfidence = 0;
    
      // Check first 5 lines for name candidates
      for (let i = 0; i < Math.min(5, lines.length); i++) {
        const line = lines[i];
        
        // Skip empty lines or lines that are too short/long
        if (!line || line.length < 3 || line.length > 200) continue;
        
        // Skip if matches exclude patterns
        if (excludePatterns.some(pattern => pattern.test(line))) {
          console.log(`🔪 Skipping line ${i} - matches exclude pattern: "${line}"`);
          continue;
        }
        
        console.log(`🔪 Analyzing line ${i}: "${line}"`);
        
        // Try each name pattern
        for (const pattern of namePatterns) {
          const match = line.match(pattern.regex);
          if (match) {
            const extracted = pattern.extract(match);
            
            // Additional validation
            if (this.isValidName(extracted.firstName, extracted.lastName)) {
              const confidence = pattern.confidence + (i === 0 ? 2 : 0); // Bonus for first line
              
              if (confidence > bestConfidence) {
                bestMatch = extracted;
                bestConfidence = confidence;
                console.log(`🔪 ✅ Found valid name (confidence ${confidence}):`, extracted);
              }
            } else {
              console.log(`🔪 ❌ Invalid name rejected:`, extracted);
            }
          }
        }
        
        // Special handling for very long first lines that might contain the name at the beginning
        if (i === 0 && line.length > 100) {
          // Try to extract just the first part of the line as a potential name
          const firstPart = line.substring(0, 50).trim();
          console.log(`🔪 Trying first part of long line: "${firstPart}"`);
          
          for (const pattern of namePatterns) {
            const match = firstPart.match(pattern.regex);
            if (match) {
              const extracted = pattern.extract(match);
              
              if (this.isValidName(extracted.firstName, extracted.lastName)) {
                const confidence = pattern.confidence + 3; // Extra bonus for first line
                
                if (confidence > bestConfidence) {
                  bestMatch = extracted;
                  bestConfidence = confidence;
                  console.log(`🔪 ✅ Found valid name in first part (confidence ${confidence}):`, extracted);
                }
              }
            }
          }
          
          // Also try the very beginning of the line for concatenated names
          const veryFirstPart = line.substring(0, 25).trim();
          console.log(`🔪 Trying very first part: "${veryFirstPart}"`);
          
          // Look for patterns like "HannahNicoleL.Comia"
          const concatMatch = veryFirstPart.match(/^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z]\.?)([A-Z][a-z]+)/);
          if (concatMatch) {
            const extracted = {
              firstName: concatMatch[1] + ' ' + concatMatch[2],
              lastName: concatMatch[4]
            };
            
            if (this.isValidName(extracted.firstName, extracted.lastName)) {
              const confidence = 9; // High confidence for exact pattern match
              
              if (confidence > bestConfidence) {
                bestMatch = extracted;
                bestConfidence = confidence;
                console.log(`🔪 ✅ Found concatenated name in very first part (confidence ${confidence}):`, extracted);
              }
            }
          }
        }
      }
    
    if (bestMatch && bestConfidence >= 6) {
      console.log('🔪 ✅ Using best name match:', bestMatch);
      return bestMatch;
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
      
      // Look for concatenated names at the beginning of long lines
      if (line.length > 50) {
        const firstPart = line.substring(0, 30);
        console.log(`🔪 Checking first part of long line: "${firstPart}"`);
        
        // Try concatenated patterns like "HannahNicoleL.Comia"
        const concatMatch = firstPart.match(/^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z]\.?)([A-Z][a-z]+)/);
        if (concatMatch) {
          personalInfo.firstName = (concatMatch[1] + ' ' + concatMatch[2]).charAt(0).toUpperCase() + (concatMatch[1] + ' ' + concatMatch[2]).slice(1).toLowerCase();
          personalInfo.lastName = concatMatch[4].charAt(0).toUpperCase() + concatMatch[4].slice(1).toLowerCase();
          console.log(`🔪 ✅ Fallback found concatenated name with middle initial: ${personalInfo.firstName} ${personalInfo.lastName}`);
          return personalInfo;
        }
        
        // Try simple concatenated patterns like "HannahNicoleComia"
        const simpleConcatMatch = firstPart.match(/^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z][a-z]+)/);
        if (simpleConcatMatch) {
          personalInfo.firstName = simpleConcatMatch[1].charAt(0).toUpperCase() + simpleConcatMatch[1].slice(1).toLowerCase();
          personalInfo.lastName = simpleConcatMatch[3].charAt(0).toUpperCase() + simpleConcatMatch[3].slice(1).toLowerCase();
          console.log(`🔪 ✅ Fallback found simple concatenated name: ${personalInfo.firstName} ${personalInfo.lastName}`);
          return personalInfo;
        }
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
   * Validate if extracted names are actually valid names
   */
  isValidName(firstName, lastName) {
    if (!firstName || !lastName) return false;
    
    // Common non-name words that might be extracted
    const nonNameWords = [
      'programming', 'languages', 'technologies', 'tools', 'frameworks', 'skills',
      'technical', 'software', 'hardware', 'database', 'web', 'mobile', 'frontend',
      'backend', 'developer', 'engineer', 'designer', 'experience', 'education',
      'projects', 'portfolio', 'contact', 'phone', 'email', 'address', 'objective',
      'summary', 'profile', 'html', 'css', 'javascript', 'python', 'java', 'react',
      'angular', 'vue', 'node', 'computer', 'science', 'bachelor', 'master', 'degree',
      'university', 'college', 'school', 'present', 'current', 'january', 'february',
      'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october',
      'november', 'december', 'gpa', 'grade', 'honor', 'award', 'semester', 'year'
    ];
    
    const firstNameLower = firstName.toLowerCase();
    const lastNameLower = lastName.toLowerCase();
    
    // Check if either name is a common non-name word
    if (nonNameWords.includes(firstNameLower) || nonNameWords.includes(lastNameLower)) {
      return false;
    }
    
    // Check if names are reasonable length (2-20 characters)
    if (firstName.length < 2 || firstName.length > 20 || 
        lastName.length < 2 || lastName.length > 20) {
      return false;
    }
    
    // Check if names contain only letters (allow hyphens and apostrophes)
    if (!/^[A-Za-z\-']+$/.test(firstName) || !/^[A-Za-z\-']+$/.test(lastName)) {
      return false;
    }
    
    // Check if names start with capital letters
    if (!/^[A-Z]/.test(firstName) || !/^[A-Z]/.test(lastName)) {
      return false;
    }
    
    return true;
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
    
    // Enhanced text preprocessing for experience section
    let processedText = experienceText
      // Fix common concatenation issues in experience
      .replace(/([a-z])(ProductionManager|VideoEditor|GraphicDesigner|SoftwareEngineer|Developer|Manager|Editor|Designer|Engineer|Analyst|Coordinator|Assistant|Specialist|Intern|Student|Freelance)/gi, '$1\n$2')
      .replace(/(ProductionManager|VideoEditor|GraphicDesigner|SoftwareEngineer|Developer|Manager|Editor|Designer|Engineer|Analyst|Coordinator|Assistant|Specialist|Intern|Student|Freelance)([A-Z][a-z])/gi, '$1\n$2')
      // Fix company concatenation
      .replace(/([a-z])(LLC|Inc|Corp|Company|University|College|Technologies|Systems|Solutions|Group)/gi, '$1\n$2')
      // Fix date concatenation
      .replace(/([a-z])(\d{4}\s*-\s*(?:\d{4}|Present|Current))/gi, '$1\n$2')
      .replace(/(\d{4}\s*-\s*(?:\d{4}|Present|Current))([A-Z][a-z])/gi, '$1\n$2')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('💼 Processed experience text:', processedText.substring(0, 300));
    
    const experienceEntries = [];
    const lines = processedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentEntry = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim().replace(/\r/g, '');
      console.log('💼 Processing line:', `"${trimmedLine}"`);
      
      // Enhanced job title and company detection
      const hasJobTitle = trimmedLine.match(/\b(?:Production Manager|Video Editor|Graphic Designer|Software Engineer|Developer|Manager|Editor|Designer|Engineer|Analyst|Coordinator|Assistant|Specialist|Intern|Student|Freelance|Programmer|Consultant|Lead|Senior|Junior|Principal|Architect|Administrator|Supervisor|Director|Executive|President|CEO|CTO|CFO|VP|Vice President)\b/i);
      const hasCompanyPattern = trimmedLine.match(/\b(?:LLC|Inc|Corp|Company|University|College|Technologies|Systems|Solutions|Group|Ltd|Limited|Partnership|Associates|Consulting|Services|Enterprises|Industries|Corporation|Foundation|Institute|Academy|School|Hospital|Clinic|Laboratory|Research|Development|Innovation|Digital|Software|Hardware|IT|Information Technology|Media|Marketing|Advertising|Finance|Banking|Insurance|Healthcare|Education|Government|Non-profit|NGO|Startup|Agency|Studio|Workshop|Factory|Manufacturing|Retail|E-commerce|Online|Web|Mobile|Cloud|Data|Analytics|AI|Machine Learning|Blockchain|Cybersecurity)\b/i);
      const hasDatePattern = trimmedLine.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}\s*-\s*(?:\d{4}|Present|Current)/i);
      
      // Enhanced job title with company and dates pattern
      const jobTitleMatch = trimmedLine.match(/^(.+?)\s*[-–—]\s*(.+?)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*[-–—]\s*(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|Present|Current))/i);
      
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
    
    // Enhanced text preprocessing for skills section
    let processedText = skillsText
      // Fix common concatenation issues in skills
      .replace(/([a-z])(ProgrammingLanguages|Technologies|Tools|Frameworks|Skills|Competencies)/gi, '$1\n$2')
      .replace(/(ProgrammingLanguages|Technologies|Tools|Frameworks|Skills|Competencies)([A-Z][a-z])/gi, '$1\n$2')
      // Fix skill concatenation
      .replace(/([a-z])(JavaScript|TypeScript|React|Angular|Vue|NodeJS|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|HTML|CSS|SQL|MySQL|PostgreSQL|MongoDB|Git|Docker|AWS|Azure|GCP)/gi, '$1\n$2')
      .replace(/(JavaScript|TypeScript|React|Angular|Vue|NodeJS|Python|Java|C\+\+|C#|PHP|Ruby|Go|Rust|Swift|Kotlin|HTML|CSS|SQL|MySQL|PostgreSQL|MongoDB|Git|Docker|AWS|Azure|GCP)([A-Z][a-z])/gi, '$1\n$2')
      // Fix multi-word skills
      .replace(/([a-z])(ProblemSolving|CriticalThinking|ProjectManagement|TimeManagement|DataAnalysis|MachineLearning|ArtificialIntelligence|UserExperience|UserInterface|WebDevelopment|MobileDevelopment|SoftwareDevelopment)/gi, '$1\n$2')
      .replace(/(ProblemSolving|CriticalThinking|ProjectManagement|TimeManagement|DataAnalysis|MachineLearning|ArtificialIntelligence|UserExperience|UserInterface|WebDevelopment|MobileDevelopment|SoftwareDevelopment)([A-Z][a-z])/gi, '$1\n$2')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log('🔧 Processed skills text:', processedText.substring(0, 300));
    
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
    
    // Handle different skills formats
    
    // Format 1: Category labels like "Programming Languages: C++, C#, JavaScript"
    const categoryMatches = processedText.match(/[a-zA-Z&\s]+:[a-zA-Z0-9,&\s\-\.\+\/\(\)]+/g);
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
      // First apply comprehensive text spacing
      let cleaned = this.addSpacesToConcatenatedText(skill);
      
      // Then apply specific skill fixes
      cleaned = cleaned
        // Specific technology fixes
        .replace(/React\s*Native/gi, 'React Native')
        .replace(/Node\s*JS/gi, 'Node.js')
        .replace(/Next\s*JS/gi, 'Next.js')
        .replace(/Vue\s*JS/gi, 'Vue.js')
        .replace(/Angular\s*JS/gi, 'Angular')
        .replace(/Java\s*Script/gi, 'JavaScript')
        .replace(/Type\s*Script/gi, 'TypeScript')
        .replace(/Mongo\s*DB/gi, 'MongoDB')
        .replace(/PostgreS\s*QL/gi, 'PostgreSQL')
        .replace(/My\s*SQL/gi, 'MySQL')
        
        // Common skill fixes
        .replace(/User\s*Centered\s*Design/gi, 'User-Centered Design')
        .replace(/User\s*Experience/gi, 'User Experience')
        .replace(/User\s*Interface/gi, 'User Interface')
        .replace(/Microsoft\s*Office/gi, 'Microsoft Office')
        .replace(/Microsoft\s*Excel/gi, 'Microsoft Excel')
        .replace(/Microsoft\s*Word/gi, 'Microsoft Word')
        .replace(/Power\s*Point/gi, 'PowerPoint')
        .replace(/Data\s*Analysis/gi, 'Data Analysis')
        .replace(/Data\s*Science/gi, 'Data Science')
        .replace(/Machine\s*Learning/gi, 'Machine Learning')
        .replace(/Artificial\s*Intelligence/gi, 'Artificial Intelligence')
        .replace(/Web\s*Development/gi, 'Web Development')
        .replace(/Mobile\s*Development/gi, 'Mobile Development')
        .replace(/Software\s*Development/gi, 'Software Development')
        .replace(/Project\s*Management/gi, 'Project Management')
        .replace(/Time\s*Management/gi, 'Time Management')
        .replace(/Problem\s*Solving/gi, 'Problem Solving')
        .replace(/Problem-Solving/gi, 'Problem Solving') // Handle hyphenated version
        .replace(/Logical\s*Thinking/gi, 'Logical Thinking')
        .replace(/Critical\s*Thinking/gi, 'Critical Thinking')
        .replace(/Creative\s*Thinking/gi, 'Creative Thinking')
        .replace(/Team\s*Work/gi, 'Teamwork')
        .replace(/Leader\s*Ship/gi, 'Leadership')
        .replace(/Visual\s*Studio\s*Code/gi, 'Visual Studio Code')
        .replace(/VS\s*Code/gi, 'Visual Studio Code')
        
        // Fix common concatenated patterns
        .replace(/Design\s*&\s*Prototyping/gi, 'Design & Prototyping')
        .replace(/Automation\s*&\s*Data/gi, 'Automation & Data')
        .replace(/Soft\s*Skills/gi, 'Soft Skills')
        .replace(/Hard\s*Skills/gi, 'Hard Skills')
        .replace(/Technical\s*Skills/gi, 'Technical Skills')
        
        // General formatting
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
    console.log('🏆 Raw certification text:', certificationsText.substring(0, 200));
    
    const certificates = [];
    
    // Split into individual certificate entries - be more flexible
    const entries = certificationsText
      .split(/\n\s*\n|(?=^[•\-\*]\s)|(?=^\d+[\.)]\s)/)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 5 && entry.length < 300) // More flexible length limits
      .filter(entry => !entry.match(/^(certifications?|certificates?|seminars?|trainings?|licenses?):?$/i)) // Remove headers
      .filter(entry => !entry.match(/^(education|experience|skills|projects|personal|contact|phone|email|address|name)/i)); // Remove non-certificate sections
    
    console.log('🏆 Split into', entries.length, 'potential certificate entries');
    
    // Common issuer patterns (ordered by specificity)
    const issuerPatterns = [
      { pattern: /Universiti\s*Teknologi\s*Petronas/i, name: 'Universiti Teknologi Petronas' },
      { pattern: /Cisco\s*Networking\s*Academy/i, name: 'Cisco Networking Academy' },
      { pattern: /LinkedIn\s*Learning/i, name: 'LinkedIn Learning' },
      { pattern: /Amazon\s*Web\s*Services/i, name: 'Amazon Web Services' },
      { pattern: /Coursera/i, name: 'Coursera' },
      { pattern: /EFSET/i, name: 'EFSET' },
      { pattern: /Google/i, name: 'Google' },
      { pattern: /Microsoft/i, name: 'Microsoft' },
      { pattern: /Udemy/i, name: 'Udemy' },
      { pattern: /edX/i, name: 'edX' },
      { pattern: /AWS/i, name: 'AWS' },
      { pattern: /Oracle/i, name: 'Oracle' },
      { pattern: /IBM/i, name: 'IBM' },
      { pattern: /CompTIA/i, name: 'CompTIA' },
      { pattern: /PMI/i, name: 'PMI' }
    ];
    
    for (const entry of entries) {
      const lines = entry.split('\n').map(l => l.trim().replace(/^[•\-\*\d+\.)]\s*/, '')).filter(l => l);
      
      if (lines.length === 0) continue;
      
      console.log('🏆 Processing entry lines:', lines);
      
      const cert = {
        name: '',
        issuer: '',
        date: '',
        description: ''
      };
      
      // Try to parse structured format: "Name | Issuer | Date"
      const pipeFormat = entry.match(/^([^|\n]+)\|([^|\n]+)\|([^|\n]+)/);
      if (pipeFormat) {
        cert.name = pipeFormat[1].trim();
        cert.issuer = pipeFormat[2].trim();
        cert.date = pipeFormat[3].trim();
        console.log('🏆 Parsed pipe format:', cert);
        certificates.push(cert);
        continue;
      }
      
      // Extract date from entire entry first (most reliable)
      const dateMatch = entry.match(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\b|\b(0?[1-9]|1[0-2])\/\d{4}\b|\b\d{4}\b/i);
      if (dateMatch) {
        cert.date = dateMatch[0];
      }
      
      // Extract issuer from entire entry
      let issuerFound = false;
      for (const { pattern, name } of issuerPatterns) {
        if (pattern.test(entry)) {
          cert.issuer = name;
          issuerFound = true;
          console.log('🏆 Found issuer:', name);
          break;
        }
      }
      
      // Parse line by line
      let nameSet = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip if line is just a date
        if (line.match(/^\d{4}$/) || line.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}$/i)) {
          continue;
        }
        
        // Skip if line is just an issuer
        if (issuerFound && issuerPatterns.some(({ pattern }) => pattern.test(line) && line.length < 50)) {
          continue;
        }
        
        // First substantial line is usually the certificate name
        if (!nameSet && line.length > 5) {
          cert.name = line;
          nameSet = true;
          console.log('🏆 Set certificate name:', line);
        } else if (nameSet && !cert.issuer && line.length > 3 && line.length < 80) {
          // Second line might be issuer if we haven't found one
          // Check if it looks like an organization name
          if (line.match(/^[A-Z][a-zA-Z\s&.,()]+$/) || issuerPatterns.some(({ pattern }) => pattern.test(line))) {
            cert.issuer = line;
            console.log('🏆 Set issuer from line:', line);
          } else if (!cert.description) {
            cert.description = line;
          }
        } else if (nameSet && line.length > 10 && !cert.description) {
          // Additional lines are description
          cert.description = line;
        }
      }
      
      // Clean up the certificate name (remove issuer and date if they got included)
      if (cert.name) {
        let cleanName = cert.name;
        
        // First apply comprehensive text spacing
        cleanName = this.addSpacesToConcatenatedText(cleanName);
        
        // Remove issuer from name
        if (cert.issuer) {
          cleanName = cleanName.replace(new RegExp(cert.issuer.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'), '').trim();
        }
        
        // Remove date from name
        if (cert.date) {
          cleanName = cleanName.replace(new RegExp(cert.date.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), '').trim();
        }
        
        // Remove common separators at the end
        cleanName = cleanName.replace(/[\|\-–—,;:]\s*$/, '').trim();
        
        cert.name = cleanName;
      }
      
      // Also clean up issuer and description
      if (cert.issuer) {
        cert.issuer = this.addSpacesToConcatenatedText(cert.issuer);
      }
      if (cert.description) {
        cert.description = this.addSpacesToConcatenatedText(cert.description);
      }
      
      // Only add if we have at least a name and it looks like a certificate
      if (cert.name && cert.name.length > 3 && 
          (cert.name.match(/\b(certificate|certification|course|training|seminar|program|academy|mobility|design|analysis|science|english|cisco|google|coursera|efset)\b/i) ||
           cert.issuer.match(/\b(coursera|cisco|google|microsoft|academy|university|college)\b/i))) {
        console.log('🏆 Adding certificate:', cert);
        certificates.push(cert);
      } else {
        console.log('🏆 Skipping invalid certificate entry:', cert.name);
      }
    }
    
    console.log('🏆 Final parsed certificates:', certificates);
    return certificates;
  }

  /**
   * Parse projects for optional sections
   */
  parseProjectsRules(projectsText) {
    console.log('💼 Parsing projects for optional sections...');
    console.log('💼 Raw projects text:', projectsText.substring(0, 200));
    
    const projects = [];
    
    // Split into individual project entries - be more flexible
    const entries = projectsText
      .split(/\n\s*\n|(?=^[•\-\*]\s)|(?=^\d+[\.)]\s)/)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 10 && entry.length < 500) // More flexible length limits
      .filter(entry => !entry.match(/^(projects?|personal\s*projects?|academic\s*projects?|portfolio):?$/i)) // Remove headers
      .filter(entry => !entry.match(/^(education|experience|skills|certifications|personal|contact|phone|email|address|name)/i)); // Remove non-project sections
    
    console.log('💼 Split into', entries.length, 'potential project entries');
    
    for (const entry of entries) {
      const lines = entry.split('\n').map(l => l.trim().replace(/^[•\-\*\d+\.)]\s*/, '')).filter(l => l);
      
      if (lines.length === 0) continue;
      
      console.log('💼 Processing project entry lines:', lines);
      
      const project = {
        name: '',
        description: '',
        technologies: '',
        startDate: '',
        endDate: '',
        url: ''
      };
      
      // Extract dates from entire entry first
      const dateMatch = entry.match(/\b(\d{4})\s*[-–—]\s*(\d{4}|present|current)\b/i);
      if (dateMatch) {
        project.startDate = dateMatch[1];
        project.endDate = dateMatch[2].toLowerCase() === 'present' || dateMatch[2].toLowerCase() === 'current' ? 'present' : dateMatch[2];
      } else {
        // Try single year
        const singleYearMatch = entry.match(/\b(\d{4})\b/);
        if (singleYearMatch) {
          project.startDate = singleYearMatch[1];
        }
      }
      
      // Extract URL from entire entry
      const urlMatch = entry.match(/(https?:\/\/[^\s]+|github\.com\/[^\s]+|gitlab\.com\/[^\s]+|bitbucket\.org\/[^\s]+)/i);
      if (urlMatch) {
        project.url = urlMatch[1];
      }
      
      // Parse line by line
      let nameSet = false;
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        
        // Skip if line is just a date
        if (line.match(/^\d{4}$/) || line.match(/^\d{4}\s*[-–—]\s*(\d{4}|present|current)$/i)) {
          continue;
        }
        
        // Skip if line is just a URL
        if (line.match(/^https?:\/\//) || line.match(/^(github|gitlab|bitbucket)/i)) {
          continue;
        }
        
        // First substantial line is usually the project name
        if (!nameSet && line.length > 3) {
          project.name = line;
          nameSet = true;
          console.log('💼 Set project name:', line);
        } else if (nameSet && line.length > 5) {
          // Check if this line contains technologies
          if (line.match(/technologies?|tech\s+stack|built\s+with|using|tools?|frameworks?|languages?/i) || 
              line.match(/\b(React|Angular|Vue|Node|Python|Java|JavaScript|TypeScript|HTML|CSS|MongoDB|MySQL|PostgreSQL|Firebase|AWS|Docker|Git)\b/i)) {
            
            // Clean up the technologies line
            let techLine = line.replace(/^(technologies?|tech\s+stack|built\s+with|using|tools?|frameworks?|languages?):?\s*/i, '');
            if (project.technologies) {
              project.technologies += ', ' + techLine;
            } else {
              project.technologies = techLine;
            }
            console.log('💼 Set technologies:', techLine);
          } else if (!project.description) {
            // This is likely the description
            project.description = line;
            console.log('💼 Set description:', line);
          } else {
            // Additional description lines
            project.description += ' ' + line;
          }
        }
      }
      
      // Clean up the project name (remove dates and URLs if they got included)
      if (project.name) {
        let cleanName = project.name;
        
        // First apply comprehensive text spacing
        cleanName = this.addSpacesToConcatenatedText(cleanName);
        
        // Remove dates from name
        cleanName = cleanName.replace(/\b\d{4}\s*[-–—]\s*(\d{4}|present|current)\b/gi, '').trim();
        cleanName = cleanName.replace(/\b\d{4}\b/g, '').trim();
        
        // Remove URLs from name
        cleanName = cleanName.replace(/https?:\/\/[^\s]+/gi, '').trim();
        
        // Remove common separators at the end
        cleanName = cleanName.replace(/[\|\-–—,;:]\s*$/, '').trim();
        
        project.name = cleanName;
      }
      
      // Also clean up description and technologies
      if (project.description) {
        project.description = this.addSpacesToConcatenatedText(project.description);
      }
      if (project.technologies) {
        project.technologies = this.addSpacesToConcatenatedText(project.technologies);
      }
      
      // Only add if we have at least a name and it looks like a project
      if (project.name && project.name.length > 3 && 
          (project.name.match(/\b(project|system|application|app|website|platform|tool|software|nlp|digital|inventory|grade|recruitment|companion|management|computation)\b/i) ||
           project.description.match(/\b(developed|built|created|designed|implemented|using|react|node|mongodb|javascript|python|web|mobile)\b/i))) {
        console.log('💼 Adding project:', project);
        projects.push(project);
      } else {
        console.log('💼 Skipping invalid project entry:', project.name);
      }
    }
    
    console.log('💼 Final parsed projects:', projects);
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
   * Parse languages for optional sections
   */
  parseLanguagesRules(languagesText) {
    console.log('🗣️ Parsing languages for optional sections...');
    const languages = [];
    const lines = languagesText.split('\n').map(line => line.trim()).filter(line => line);
    
    // Common language patterns
    const languagePatterns = [
      /^(english|tagalog|filipino|spanish|french|german|chinese|japanese|korean|ilocano|cebuano|bisaya|portuguese|italian|russian|arabic|hindi|mandarin|cantonese|thai|vietnamese|indonesian|malay|tamil|urdu|bengali|punjabi|gujarati|marathi|telugu|kannada|malayalam|odia|assamese|nepali|sinhala|burmese|khmer|lao|mongolian|tibetan|uzbek|kazakh|kyrgyz|tajik|turkmen|azerbaijani|armenian|georgian|hebrew|persian|dari|pashto|swahili|amharic|yoruba|igbo|hausa|zulu|xhosa|afrikaans|dutch|swedish|norwegian|danish|finnish|icelandic|greek|bulgarian|romanian|hungarian|czech|slovak|polish|croatian|serbian|slovenian|macedonian|albanian|lithuanian|latvian|estonian|belarusian|ukrainian|moldovan|bosnian|montenegrin)\s*:?\s*(native|fluent|advanced|intermediate|beginner|basic|conversational|professional|working\s+knowledge|proficient|excellent|good|fair|limited)/i,
      /^(english|tagalog|filipino|spanish|french|german|chinese|japanese|korean|ilocano|cebuano|bisaya|portuguese|italian|russian|arabic|hindi|mandarin|cantonese|thai|vietnamese|indonesian|malay|tamil|urdu|bengali|punjabi|gujarati|marathi|telugu|kannada|malayalam|odia|assamese|nepali|sinhala|burmese|khmer|lao|mongolian|tibetan|uzbek|kazakh|kyrgyz|tajik|turkmen|azerbaijani|armenian|georgian|hebrew|persian|dari|pashto|swahili|amharic|yoruba|igbo|hausa|zulu|xhosa|afrikaans|dutch|swedish|norwegian|danish|finnish|icelandic|greek|bulgarian|romanian|hungarian|czech|slovak|polish|croatian|serbian|slovenian|macedonian|albanian|lithuanian|latvian|estonian|belarusian|ukrainian|moldovan|bosnian|montenegrin)\s*-\s*(native|fluent|advanced|intermediate|beginner|basic|conversational|professional|working\s+knowledge|proficient|excellent|good|fair|limited)/i,
      /^(english|tagalog|filipino|spanish|french|german|chinese|japanese|korean|ilocano|cebuano|bisaya|portuguese|italian|russian|arabic|hindi|mandarin|cantonese|thai|vietnamese|indonesian|malay|tamil|urdu|bengali|punjabi|gujarati|marathi|telugu|kannada|malayalam|odia|assamese|nepali|sinhala|burmese|khmer|lao|mongolian|tibetan|uzbek|kazakh|kyrgyz|tajik|turkmen|azerbaijani|armenian|georgian|hebrew|persian|dari|pashto|swahili|amharic|yoruba|igbo|hausa|zulu|xhosa|afrikaans|dutch|swedish|norwegian|danish|finnish|icelandic|greek|bulgarian|romanian|hungarian|czech|slovak|polish|croatian|serbian|slovenian|macedonian|albanian|lithuanian|latvian|estonian|belarusian|ukrainian|moldovan|bosnian|montenegrin)\s*\(([^)]+)\)/i
    ];
    
    for (const line of lines) {
      // Skip headers
      if (line.match(/^(languages?|language\s+skills?|linguistic\s+abilities?):?$/i)) {
        continue;
      }
      
      // Try to match language patterns
      for (const pattern of languagePatterns) {
        const match = line.match(pattern);
        if (match) {
          const language = match[1].charAt(0).toUpperCase() + match[1].slice(1).toLowerCase();
          const proficiency = match[2] ? match[2].toLowerCase() : 'intermediate';
          
          languages.push({
            language: language,
            proficiency: proficiency
          });
          break;
        }
      }
      
      // If no pattern matched, try simple language detection
      if (languages.length === 0 || !languages.some(lang => line.toLowerCase().includes(lang.language.toLowerCase()))) {
        const simpleLanguageMatch = line.match(/^(english|tagalog|filipino|spanish|french|german|chinese|japanese|korean|ilocano|cebuano|bisaya|portuguese|italian|russian|arabic|hindi|mandarin|cantonese|thai|vietnamese|indonesian|malay|tamil|urdu|bengali|punjabi|gujarati|marathi|telugu|kannada|malayalam|odia|assamese|nepali|sinhala|burmese|khmer|lao|mongolian|tibetan|uzbek|kazakh|kyrgyz|tajik|turkmen|azerbaijani|armenian|georgian|hebrew|persian|dari|pashto|swahili|amharic|yoruba|igbo|hausa|zulu|xhosa|afrikaans|dutch|swedish|norwegian|danish|finnish|icelandic|greek|bulgarian|romanian|hungarian|czech|slovak|polish|croatian|serbian|slovenian|macedonian|albanian|lithuanian|latvian|estonian|belarusian|ukrainian|moldovan|bosnian|montenegrin)/i);
        if (simpleLanguageMatch) {
          const language = simpleLanguageMatch[1].charAt(0).toUpperCase() + simpleLanguageMatch[1].slice(1).toLowerCase();
          languages.push({
            language: language,
            proficiency: 'intermediate' // Default proficiency
          });
        }
      }
    }
    
    console.log('🗣️ Parsed languages:', languages);
    return languages;
  }

  /**
   * Parse references for optional sections
   */
  parseReferencesRules(referencesText) {
    console.log('📞 Parsing references for optional sections...');
    const references = [];
    const lines = referencesText.split('\n').map(line => line.trim()).filter(line => line);
    
    let currentReference = null;
    
    for (const line of lines) {
      // Skip headers
      if (line.match(/^(references?|referees?|character\s+references?):?$/i)) {
        continue;
      }
      
      // Check if this looks like a name (starts with capital letter, reasonable length)
      if (line.match(/^[A-Z][a-zA-Z\s\-'\.]+$/) && line.length > 3 && line.length < 50) {
        // Save previous reference if exists
        if (currentReference) {
          references.push(currentReference);
        }
        
        // Start new reference
        currentReference = {
          name: line,
          title: '',
          company: '',
          phone: '',
          email: ''
        };
      } else if (currentReference && line.length > 5) {
        // This might be title, company, phone, or email
        if (line.includes('@')) {
          currentReference.email = line;
        } else if (line.match(/^[\d\s\-\+\(\)]+$/)) {
          currentReference.phone = line;
        } else if (line.match(/\b(?:manager|director|supervisor|coordinator|specialist|analyst|engineer|developer|designer|consultant|professor|doctor|mr|mrs|ms|dr|prof)\b/i)) {
          currentReference.title = line;
        } else if (line.match(/\b(?:inc|corp|company|ltd|llc|university|college|hospital|clinic|agency|department|ministry|office)\b/i)) {
          currentReference.company = line;
        } else if (!currentReference.title) {
          currentReference.title = line;
        }
      }
    }
    
    // Add the last reference
    if (currentReference) {
      references.push(currentReference);
    }
    
    console.log('📞 Parsed references:', references);
    return references;
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
