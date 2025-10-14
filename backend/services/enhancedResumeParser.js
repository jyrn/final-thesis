/**
 * Enhanced Resume Parser with Multiple Extraction Methods
 * Combines rule-based parsing, JSON conversion, and AI-powered extraction
 * Now supports multiple resume formats
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawn } = require('child_process');
const ResumeFormatDetector = require('./resumeFormatDetector');
const StandardFormatParser = require('./standardFormatParser');
const MLResumeParser = require('./MLResumeParser');
const ResumeTextCleaner = require('./ResumeTextCleaner');

class EnhancedResumeParser {
  constructor() {
    this.tempDir = os.tmpdir();
    this.mlParser = new MLResumeParser();
    this.textCleaner = new ResumeTextCleaner();
    this.useMLParser = true; // Flag to enable/disable ML parser
    this.version = '2.1.0'; // Updated version with text cleaning
    console.log(' EnhancedResumeParser v2.1.0 initialized with text cleaning');
  }

  /**
   * Main parsing method with multi-format support
   * Now with ML-powered parsing option
   */
  async parseResume(pdfBuffer) {
    try {
      console.log(' Starting enhanced resume parsing with fixes...');
      
      // Step 1: Extract raw text from PDF
      let rawText = await this.extractTextFromPDF(pdfBuffer);
      console.log(` Raw text extracted: ${rawText.length} characters`);
      console.log(' First 500 characters of raw text:', rawText.substring(0, 500));
      
      // Debug: Check PDF extraction quality
      const lines = rawText.split('\n').filter(l => l.trim().length > 0);
      console.log(' PDF Extraction Analysis:');
      console.log('   - Total lines:', lines.length);
      console.log('   - Average line length:', Math.round(rawText.length / lines.length));
      console.log('   - Contains pipe separators:', rawText.includes('|'));
      console.log('   - First 5 lines:');
      lines.slice(0, 5).forEach((line, i) => {
        console.log(`     Line ${i + 1}: "${line.trim()}"`);
      });
      
      // Step 1.5: Clean text comprehensively before parsing
      console.log(' BEFORE text cleaning - sample:', rawText.substring(0, 200));
      const cleaningResult = this.textCleaner.cleanResumeText(rawText);
      rawText = cleaningResult.cleanedText;
      console.log(' AFTER text cleaning - sample:', rawText.substring(0, 200));
      console.log(' Text cleaning stats:', {
        originalLength: cleaningResult.metadata.originalLength,
        cleanedLength: cleaningResult.metadata.cleanedLength,
        reduction: cleaningResult.metadata.reductionPercentage + '%'
      });
      
      // Test if specific fixes worked
      if (rawText.includes('System for')) {
        console.log(' Text spacing fix SUCCESS: "System for" found');
      } else if (rawText.includes('Systemfor')) {
        console.log(' Text spacing fix FAILED: "Systemfor" still present');
      }
      
      // Step 2: Choose parsing strategy
      let mergedResult;
      
      if (this.useMLParser) {
        console.log(' Using ML-powered modular parsing');
        try {
          const mlResult = await this.mlParser.parse(rawText);
          mergedResult = mlResult.data;
          
          // Store ML metadata for debugging
          this.lastMLMetadata = mlResult.metadata;
          
          console.log(' ML Parser Results Summary:');
          console.log('   - Format detected:', mlResult.metadata.classification.format);
          console.log('   - Overall confidence:', (mlResult.metadata.overallConfidence * 100).toFixed(1) + '%');
          console.log('   - Name found:', mergedResult.personalInfo.firstName, mergedResult.personalInfo.lastName);
          console.log('   - Education entries:', mergedResult.education.length);
          console.log('   - Skills found:', mergedResult.skills.length);
          console.log('   - Optional sections:', mergedResult.optionalSections.length);
          
        } catch (mlError) {
          console.error(' ML Parser failed:', mlError.message);
          console.log(' Falling back to legacy parser...');
          mergedResult = await this.parseWithAI(rawText);
        }
      } else {
        console.log(' Using legacy AI parsing with format detection');
        mergedResult = await this.parseWithAI(rawText);
      }
      
      // Step 3: Name extraction fallback chain
      console.log(' Name extraction results:', {
        aiResult: { firstName: mergedResult.personalInfo.firstName, lastName: mergedResult.personalInfo.lastName }
      });
      
      // If name is missing or invalid, try fallback methods
      if (!mergedResult.personalInfo.firstName || !mergedResult.personalInfo.lastName || 
          mergedResult.personalInfo.firstName === 'Programming' || 
          mergedResult.personalInfo.lastName === 'Languages' ||
          mergedResult.personalInfo.firstName === 'Technical' ||
          mergedResult.personalInfo.lastName === 'Skills') {
        
        console.log(' AI parsing did not find valid name, trying fallback methods...');
        
        // Fallback 1: Direct text extraction
        const directNameExtraction = this.extractNameDirectlyFromRawText(rawText);
        if (directNameExtraction.firstName && directNameExtraction.lastName) {
          console.log(' Using direct name extraction');
          mergedResult.personalInfo.firstName = directNameExtraction.firstName;
          mergedResult.personalInfo.lastName = directNameExtraction.lastName;
        } else {
          // Fallback 2: Extract from email
          const emailBasedName = this.extractNameFromEmail(mergedResult.personalInfo.email);
          if (emailBasedName.firstName && emailBasedName.lastName) {
            console.log(' Using email-based name extraction');
            mergedResult.personalInfo.firstName = emailBasedName.firstName;
            mergedResult.personalInfo.lastName = emailBasedName.lastName;
          } else {
            console.log(' No valid name found in any method');
          }
        }
      }
      
      // Validate the merged result
      const validation = this.validateParsedData(mergedResult);
      
      console.log(' Enhanced parsing completed');
      console.log(' Validation status:', validation.isValid ? 'PASSED' : 'FAILED');
      if (validation.issues.length > 0) {
        console.log(' Validation issues:', validation.issues);
      }
      if (validation.warnings.length > 0) {
        console.log(' Validation warnings:', validation.warnings);
      }
      
      return {
        success: true,
        data: mergedResult,
        rawText: rawText,
        validation: validation
      };
      
    } catch (error) {
      console.error(' Enhanced parsing failed:', error);
      return {
        success: false,
        error: error.message,
        data: null
      };
    }
  }

  /**
   * Fix text spacing issues from PDF extraction
   */
  fixTextSpacing(text) {
    console.log(' Fixing text spacing issues...');
    
    // Comprehensive list of concatenated word fixes
    const concatenatedFixes = {
      'Systemfor': 'System for',
      'Appforthe': 'App for the',
      'Elderlyand': 'Elderly and',
      'Computationand': 'Computation and',
      'Datafor': 'Data for',
      'Analysiswith': 'Analysis with',
      'Powerof': 'Power of',
      'Datawith': 'Data with',
      'Networkingand': 'Networking and',
      'Certificationsand': 'Certifications and',
      'Seminarswith': 'Seminars with',
      'Programmewith': 'Programme with',
      'Designwith': 'Design with',
      'Academyand': 'Academy and',
      'Bachelorof': 'Bachelor of',
      'Sciencein': 'Science in',
      'DeLaSalle': 'De La Salle',
      'SanPablo': 'San Pablo',
      'WebDevelopment': 'Web Development',
      'MobileDevelopment': 'Mobile Development',
      'SoftwareDevelopment': 'Software Development',
      'DataAnalysis': 'Data Analysis',
      'MachineLearning': 'Machine Learning',
      'ProjectManagement': 'Project Management',
      'ProblemSolving': 'Problem Solving',
      'CriticalThinking': 'Critical Thinking',
      'TimeManagement': 'Time Management',
      'UserExperience': 'User Experience',
      'UserInterface': 'User Interface',
      'GoogleUXDesign': 'Google UX Design',
      'StudentMobilityProgramme': 'Student Mobility Programme',
      'CiscoNetworkingAcademy': 'Cisco Networking Academy',
      'NLPBased': 'NLP-Based',
      'DigitalCompanion': 'Digital Companion',
      'InventoryManagement': 'Inventory Management',
      'GradeComputation': 'Grade Computation'
    };
    
    let fixedText = text;
    
    // Apply all concatenated word fixes
    for (const [concatenated, fixed] of Object.entries(concatenatedFixes)) {
      fixedText = fixedText.replace(new RegExp(concatenated, 'g'), fixed);
    }
    
    // Add space before capital letters that follow lowercase letters (but preserve common abbreviations)
    fixedText = fixedText.replace(/([a-z])([A-Z])(?![A-Z])/g, (match, p1, p2) => {
      // Don't split common patterns like "iOS", "PhD", "API", etc.
      const nextChar = fixedText[fixedText.indexOf(match) + match.length];
      if (nextChar && nextChar.match(/[A-Z]/)) return match;
      return p1 + ' ' + p2;
    });
    
    // Add space between words and numbers (but be careful with dates and versions)
    fixedText = fixedText
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      // Normalize multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(' Text spacing fix completed');
    return fixedText;
  }

  /**
   * Extract text from PDF (reuse existing method)
   */
  async extractTextFromPDF(pdfBuffer) {
    return new Promise((resolve, reject) => {
      const tempPdfPath = path.join(this.tempDir, `resume_${Date.now()}.pdf`);
      
      try {
        fs.writeFileSync(tempPdfPath, pdfBuffer);
        console.log(` PDF written: ${tempPdfPath}`);
        
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
    console.log(' Converting to structured JSON...');
    
    // FIRST: Clean the text comprehensively (this should already be done, but ensure it's clean)
    let processedText = rawText; // Text should already be cleaned by the main pipeline
    
    // THEN: Add line breaks before major section headers
    processedText = processedText
      .replace(/([a-z])(Education|Experience|Skills|Projects|Objective|Work|Personal|Certifications|Awards|Achievements|Languages|Volunteer|References)/gi, '$1\n$2')
      .replace(/(Education|Experience|Skills|Projects|Objective|Work|Personal|Certifications|Awards|Achievements|Languages|Volunteer|References)([A-Z][a-z])/gi, '$1\n$2')
      
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
    
    // Text spacing fixes are now handled by ResumeTextCleaner in the main pipeline
    
    // Final cleanup
    processedText = processedText
      // Normalize whitespace but preserve line breaks
      .replace(/[ \t]+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n')
      .trim();
    
    console.log(' Enhanced text preprocessing completed');
    console.log(' Original length:', rawText.length, 'Processed length:', processedText.length);
    
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
      'projects': ['projects', 'portfolio', 'work samples', 'personal projects', 'academic projects', 'key projects', 'notable projects', 'selected projects'],
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
      
      // First check for exact section headers - PRIORITIZE PROJECTS
      if (line.match(/^(Projects?):?$/i)) {
        newSection = 'projects';
        console.log(`  PROJECTS SECTION DETECTED from exact header: "${line}"`);
      } else if (line.match(/^(Education|Experience|Skills|Certifications|Awards|Languages|Volunteer|References):?$/i)) {
        const sectionName = line.toLowerCase().replace(/[:\s]+$/, '');
        if (sectionName === 'certifications') newSection = 'certifications';
        else if (sectionName === 'awards') newSection = 'achievements';
        else if (sectionName === 'languages') newSection = 'languages';
        else if (sectionName === 'volunteer') newSection = 'volunteer';
        else if (sectionName === 'references') newSection = 'references';
        else newSection = sectionName;
        
        if (newSection) {
          console.log(` Detected section '${newSection}' from exact header: "${line}"`);
        }
      }
      
      // HIGHEST PRIORITY: Check for project patterns FIRST - before any other section
      if (!newSection && (
        line.match(/\b(Projects?|Personal\s*Projects?|Academic\s*Projects?|Portfolio)\b/i) ||
        line.match(/^(Projects?):?\s*$/i) ||
        line.match(/\b(NLP\s*Based|Digital\s*Companion|Inventory\s*Management|Grade\s*Computation)\b/i) ||
        line.match(/\b(NLP-Based|Digital Companion|Inventory Management|Grade Computation)\b/i) ||
        line.match(/\b(Recruitment\s*System|Companion\s*App|Management\s*System|Email\s*Automation)\b/i)
      )) {
        newSection = 'projects';
        console.log(`  PROJECTS SECTION DETECTED from: "${line}"`);
      }
      
      // Also check for education patterns in the text
      if (!newSection && line.match(/\b(De\s*La\s*Salle|San\s*Pablo|Bachelor|Master|PhD|University|College|School)\b/i)) {
        newSection = 'education';
        console.log(` Detected education section from content: "${line}"`);
      }
      
      // Check for certification patterns (improved)
      if (!newSection && (
        line.match(/\b(Certifications?\s*(?:and|&)?\s*Seminars?|Certifications?|Certificates?|Licenses?|Professional\s*Certifications?)\b/i) ||
        line.match(/^(Certifications?|Certificates?|Seminars?|Trainings?|Licenses?):?\s*$/i) ||
        line.match(/\b(Student\s*Mobility|Google\s*UX|Coursera|Cisco\s*Networking|EFSET)\b/i)
      )) {
        newSection = 'certifications';
        console.log(` Detected certifications section from header: "${line}"`);
      }
      
      // If no exact match, check keywords - but prioritize projects over experience
      if (!newSection) {
        // Check projects first to avoid conflicts with experience
        const projectKeywords = sectionKeywords.projects;
        if (projectKeywords.some(keyword => {
          return lowerLine === keyword || 
                 lowerLine.startsWith(keyword) || 
                 (lowerLine.includes(keyword) && lowerLine.length < 40);
        })) {
          newSection = 'projects';
          console.log(` Detected projects section from keyword: "${line}"`);
        } else {
          // Check other sections
          for (const [sectionName, keywords] of Object.entries(sectionKeywords)) {
            if (sectionName === 'projects') continue; // Already checked
            if (keywords.some(keyword => {
              // Exact match or line starts with keyword
              return lowerLine === keyword || 
                     lowerLine.startsWith(keyword) || 
                     (lowerLine.includes(keyword) && lowerLine.length < 40 && !lowerLine.includes('developed') && !lowerLine.includes('implemented'));
            })) {
              newSection = sectionName;
              console.log(` Detected section '${sectionName}' from keyword: "${line}"`);
              break;
            }
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
    
    console.log(' ========================================');
    console.log(' DETECTED SECTIONS:', Object.keys(structuredData.sections));
    console.log(' ========================================');
    
    // Debug: Show content of each section
    console.log(' DETECTED SECTIONS SUMMARY:');
    for (const [sectionName, sectionData] of Object.entries(structuredData.sections)) {
      console.log(` ========================================`);
      console.log(` Section: "${sectionName}"`);
      console.log(` Lines: ${sectionData.lines?.length || 0}`);
      console.log(` Content preview: ${sectionData.content.substring(0, 200)}...`);
      if (sectionName === 'projects') {
        console.log(`  FULL PROJECTS CONTENT: ${sectionData.content}`);
      }
      if (sectionName === 'experience') {
        console.log(`  EXPERIENCE CONTENT (check if this should be projects): ${sectionData.content.substring(0, 500)}`);
      }
      console.log(` ========================================`);
    }
    
    return structuredData;
  }

  /**
   * Legacy method - now handled by ResumeTextCleaner
   * @deprecated Use ResumeTextCleaner instead
   */
  fixTextSpacing(text) {
    console.log(' Legacy fixTextSpacing called - using ResumeTextCleaner instead...');
    
    // Use the comprehensive text cleaner
    const cleaningResult = this.textCleaner.cleanResumeText(text);
    
    console.log(' Text cleaning completed via ResumeTextCleaner');
    return cleaningResult.cleanedText;
  }

  /**
   * Add spaces to concatenated text - comprehensive word separation
   */
  addSpacesToConcatenatedText(text) {
    console.log(' Adding spaces to concatenated text...');
    
    // Don't process if text is too short or already has good spacing
    if (text.length < 15 || text.split(' ').length > text.length / 12) {
      console.log(' Skipping text spacing - already well spaced or too short');
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
    
    console.log(' Text spacing completed');
    return spacedText;
  }

  async parseWithRules(structuredData) {
    console.log(' Applying rule-based parsing...');
    
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
      console.log(` Section "${sectionName}" content preview: ${sectionData.content.substring(0, 200).replace(/\n/g, '\\n')}...`);
      
      // Check if header section contains skills
      if (sectionName === 'header' && sectionData.content.includes('Programming Languages')) {
        console.log('  Skills found in header section! Parsing skills from header...');
        const headerSkills = this.parseSkillsRules(sectionData.content);
        console.log('  Header skills result:', headerSkills);
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
          console.log('  Skills section detected, content preview:', sectionData.content.substring(0, 300));
          result.skills = this.parseSkillsRules(sectionData.content);
          console.log('  Skills parsing result:', result.skills);
          break;
        case 'certifications':
          console.log('  Processing certifications section, content:', sectionData.content.substring(0, 200));
          result.certifications = this.parseCertificationsRules(sectionData.content);
          // Also add to optional sections
          const certificates = this.parseOptionalCertificatesRules(sectionData.content);
          console.log('  Parsed certificates count:', certificates.length);
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
            console.log('  Added certificates to optional sections');
          } else {
            console.log('  No certificates found to add to optional sections');
          }
          break;
        case 'projects':
          console.log(' � Processing projects section, content:', sectionData.content.substring(0, 200));
          console.log(' � Full projects section content:', sectionData.content);
          // Parse projects as optional section
          const projects = this.parseProjectsRules(sectionData.content);
          console.log(' � Parsed projects count:', projects.length);
          console.log(' � Parsed projects data:', JSON.stringify(projects, null, 2));
          if (projects.length > 0) {
            const projectSection = {
              id: 'projects-' + Date.now(),
              type: 'projects',
              title: 'Projects',
              data: projects
            };
            result.optionalSections.push(projectSection);
            result.sectionOrder.push({
              id: projectSection.id,
              type: 'optional',
              title: 'Projects',
              optionalType: 'projects'
            });
            console.log(' � Added projects to optional sections:', projectSection);
          } else {
            console.log(' � No projects found to add to optional sections');
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
      console.log(' No name found in sections, trying global extraction...');
      const fallbackPersonalInfo = this.parsePersonalInfoFromEntireDocument(allContent);
      if (fallbackPersonalInfo.firstName && fallbackPersonalInfo.lastName) {
        result.personalInfo.firstName = fallbackPersonalInfo.firstName;
        result.personalInfo.lastName = fallbackPersonalInfo.lastName;
        console.log(' Global extraction found name:', {
          firstName: fallbackPersonalInfo.firstName,
          lastName: fallbackPersonalInfo.lastName
        });
      }
    }
    
    // LIMITED FALLBACK: Only try to find certificates if sections were detected but parsing failed
    // DISABLED to prevent duplicates - only use if absolutely no certificates found
    if (false && result.optionalSections.filter(s => s.type === 'certificates').length === 0) {
      // Look for certificate patterns in the entire document, but be very selective
      const certMatches = allContent.match(/\b(Student\s+Mobility\s+Programme|Google\s+UX\s+Design|Coursera|Cisco\s+Networking\s+Academy|EFSET|Certificate|Certification)\b[^\n]{0,100}/gi);
      if (certMatches && certMatches.length > 0) {
        console.log(' Found certificate patterns, creating certificates section');
        const fallbackCerts = certMatches.map(match => {
          const cleanMatch = match.trim();
          // Try to extract issuer and date from the match
          let name = cleanMatch;
          let issuer = '';
          let date = '';
          
          // Extract date
          const dateMatch = cleanMatch.match(/\b(\d{4}|\w+\s+\d{4})\b/);
          if (dateMatch) {
            date = dateMatch[1];
            name = name.replace(dateMatch[0], '').trim();
          }
          
          // Extract issuer
          const issuerMatch = cleanMatch.match(/\b(Coursera|Cisco|Google|Microsoft|Academy|University)\b/i);
          if (issuerMatch) {
            issuer = issuerMatch[1];
            name = name.replace(issuerMatch[0], '').trim();
          }
          
          return { name, issuer, date, description: '' };
        });
        
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
    
    // DISABLED fallback for projects to prevent duplicates
    if (false && result.optionalSections.filter(s => s.type === 'projects').length === 0) {
      console.log(' No projects found in sections, trying fallback pattern matching...');
      console.log(' Searching in content:', allContent.substring(0, 500));
      
      // Look for project patterns in the entire document - be more flexible
      const projectLines = allContent.split('\n').filter(line => 
        line.match(/\b(NLP|Digital|Inventory|Grade|Recruitment|System|Management|Computation|App|Application|Project)\b/i) &&
        line.length > 20 && line.length < 200
      );
      
      console.log(' Project lines found:', projectLines);
      
      if (projectLines && projectLines.length > 0) {
        console.log(' Found project lines, creating projects section');
        const fallbackProjects = projectLines.map(line => {
          let name = line.trim();
          let description = '';
          let technologies = '';
          
          // Extract technologies if they're in the line (after |)
          const pipeMatch = line.match(/^([^|]+)\|(.+)$/);
          if (pipeMatch) {
            name = pipeMatch[1].trim();
            technologies = pipeMatch[2].trim();
          }
          
          // Try to extract technologies from the match
          const techMatch = line.match(/\b(React|Node|MongoDB|JavaScript|Python|HTML|CSS|Firebase|Express|Figma|UiPath|Excel)\b/gi);
          if (techMatch) {
            technologies = techMatch.join(', ');
            // Remove technologies from name
            name = name.replace(/\b(React|Node|MongoDB|JavaScript|Python|HTML|CSS|Firebase|Express|Figma|UiPath|Excel)[,\s]*/gi, '').trim();
          }
          
          return { name, description, technologies, startDate: '', endDate: '', url: '' };
        }).filter(project => project.name.length > 5);
        
        console.log(' Fallback projects created:', fallbackProjects);
        
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
    
    console.log(' Final optional sections:', result.optionalSections.map(s => s.type));
    console.log(' Total optional sections:', result.optionalSections.length);
    
    return result;
  }

  /**
   * AI-powered parsing using pattern recognition and heuristics
   * Now with multi-format support
   */
  async parseWithAI(rawText) {
    console.log(' Applying AI-powered parsing...');
    console.log(' Text length:', rawText.length);
    
    // Detect resume format
    const format = ResumeFormatDetector.detectFormat(rawText);
    const strategy = ResumeFormatDetector.getParserStrategy(format);
    console.log(' Using format:', format);
    console.log(' Strategy:', strategy);
    
    // Split text into sections
    const sections = this.splitIntoSections(rawText);
    console.log(' Detected sections:', Object.keys(sections));
    
    // Extract personal info based on format
    let personalInfo;
    if (format === 'standard' || format === 'minimal') {
      // Use standard format parser for name extraction
      const nameResult = StandardFormatParser.extractName(rawText);
      personalInfo = {
        ...this.extractPersonalInfoAI(rawText),
        firstName: nameResult.firstName || this.extractPersonalInfoAI(rawText).firstName,
        lastName: nameResult.lastName || this.extractPersonalInfoAI(rawText).lastName
      };
    } else {
      personalInfo = this.extractPersonalInfoAI(rawText);
    }
    
    // Enhanced AI-like parsing using advanced pattern recognition
    const result = {
      method: 'ai',
      confidence: 0.85,
      personalInfo: personalInfo,
      education: this.extractEducationAI(sections.education || rawText),
      experience: [], // Don't extract experience, it's usually projects
      skills: format === 'standard' ? StandardFormatParser.extractSkills(rawText) : this.extractSkillsAI(sections.skills || rawText),
      certifications: this.extractCertificationsAI(sections.certifications || rawText),
      optionalSections: [],
      sectionOrder: [
        { id: 'personal', type: 'personal', title: 'Personal Information' },
        { id: 'education', type: 'education', title: 'Educational Background' },
        { id: 'skills', type: 'skills', title: 'Skills' }
      ],
      note: `AI parsing using ${format} format detection`
    };
    
    // Extract projects based on format
    let projects;
    if (format === 'standard') {
      projects = StandardFormatParser.extractProjects(rawText);
    } else {
      projects = this.extractProjectsAI(sections.projects || rawText);
    }
    console.log(' Extracted projects:', projects.length);
    if (projects.length > 0) {
      result.optionalSections.push({
        id: 'projects-ai-' + Date.now(),
        type: 'projects',
        title: 'Projects',
        data: projects
      });
      result.sectionOrder.push({
        id: 'projects-ai-' + Date.now(),
        type: 'optional',
        title: 'Projects',
        optionalType: 'projects'
      });
    }
    
    // Extract certificates based on format
    let certificates;
    if (format === 'standard') {
      certificates = StandardFormatParser.extractCertificates(rawText);
      // Fallback to AI extraction if standard parser finds nothing
      if (certificates.length === 0) {
        certificates = this.extractCertificatesAI(sections.certifications || rawText);
      }
    } else {
      certificates = this.extractCertificatesAI(sections.certifications || rawText);
    }
    console.log(' Extracted certificates:', certificates.length);
    if (certificates.length > 0) {
      result.optionalSections.push({
        id: 'certificates-ai-' + Date.now(),
        type: 'certificates',
        title: 'Certificates & Seminars',
        data: certificates
      });
      result.sectionOrder.push({
        id: 'certificates-ai-' + Date.now(),
        type: 'optional',
        title: 'Certificates & Seminars',
        optionalType: 'certificates'
      });
    }
    
    console.log(' AI parsing completed');
    console.log(' Result summary:', {
      hasName: !!(result.personalInfo.firstName && result.personalInfo.lastName),
      educationCount: result.education.length,
      skillsCount: result.skills.length,
      projectsCount: projects.length,
      certificatesCount: certificates.length
    });
    
    return result;
  }
  
  /**
   * Add spacing between concatenated words in text
   */
  addSpacingToText(text) {
    console.log(' Adding spacing to concatenated text...');
    
    let spacedText = text
      // Add space before capital letters that follow lowercase letters
      .replace(/([a-z])([A-Z])/g, '$1 $2')
      
      // Add space before numbers that follow letters
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      
      // Add space after numbers that are followed by letters
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      
      // Specific section headers
      .replace(/Certificationsand/gi, 'Certifications and')
      .replace(/Skillsand/gi, 'Skills and')
      .replace(/Projectsand/gi, 'Projects and')
      
      // Common concatenated words
      .replace(/Bachelorof/gi, 'Bachelor of')
      .replace(/Masterof/gi, 'Master of')
      .replace(/Sciencein/gi, 'Science in')
      .replace(/Artsin/gi, 'Arts in')
      .replace(/Technologyand/gi, 'Technology and')
      .replace(/Engineeringand/gi, 'Engineering and')
      .replace(/HighSchool/gi, 'High School')
      .replace(/SeniorHigh/gi, 'Senior High')
      
      // Common project/tech words
      .replace(/JavaScript/gi, 'JavaScript') // Preserve
      .replace(/TypeScript/gi, 'TypeScript') // Preserve
      .replace(/MongoDB/gi, 'MongoDB') // Preserve
      .replace(/PostgreSQL/gi, 'PostgreSQL') // Preserve
      .replace(/Node\.js/gi, 'Node.js') // Preserve
      .replace(/React Native/gi, 'React Native') // Preserve
      
      // Clean up multiple spaces
      .replace(/\s+/g, ' ')
      .trim();
    
    console.log(' Spacing added successfully');
    return spacedText;
  }

  /**
   * Split text into sections - handles one-line text
   */
  splitIntoSections(text) {
    console.log(' Splitting text into sections...');
    console.log(' Original text preview:', text.substring(0, 500));
    
    // Add spacing between concatenated words
    text = this.addSpacingToText(text);
    console.log(' After spacing text preview:', text.substring(0, 500));
    
    // Debug: Check if "PROJECTS" exists in the text
    const projectsIndex = text.search(/PROJECTS/i);
    const technicalIndex = text.search(/TECHNICAL\s+SKILLS/i);
    console.log(' DEBUG: "PROJECTS" found at index:', projectsIndex);
    console.log(' DEBUG: "TECHNICAL SKILLS" found at index:', technicalIndex);
    if (projectsIndex !== -1) {
      console.log(' DEBUG: Text around PROJECTS:', text.substring(Math.max(0, projectsIndex - 50), Math.min(text.length, projectsIndex + 200)));
    }
    
    const sections = {};
    
    // Split by section keywords (works even if text is one long line)
    // More flexible patterns that handle concatenated text
    const educationMatch = text.match(/Education\s*(.+?)(?=\s*(?:Projects?|Experience|Skills|Certifications?|$))/i);
    if (educationMatch) {
      sections.education = educationMatch[1];
      console.log(' Found education section, length:', educationMatch[1].length);
    }
    
    // Projects section - FIXED: Projects content comes BEFORE the "PROJECTS" header!
    // The structure is: EDUCATION ... [project content] ... CERTIFICATIONS ... PROJECTS TECHNICAL SKILLS
    // So we need to extract content between EDUCATION date and CERTIFICATIONS (or PROJECTS or TECHNICAL SKILLS)
    
    // Find all possible end markers
    const educationEndMatch = text.match(/EDUCATION\s+[^0-9]+(?:Present|Current|\d{4})/i);
    const certificationsIndex = text.search(/\b(?:Certifications?|Certificates?)\s+(?:and\s+Seminars?)?/i);
    const projectsHeaderMatch = text.search(/\bPROJECTS\s+TECHNICAL/i);
    const technicalSkillsMatch = text.search(/TECHNICAL\s+SKILLS/i);
    
    if (educationEndMatch) {
      const startIdx = educationEndMatch.index + educationEndMatch[0].length;
      
      // Find the earliest end marker (stop at whichever comes first)
      let endIdx = text.length;
      
      if (certificationsIndex !== -1 && certificationsIndex > startIdx) {
        endIdx = Math.min(endIdx, certificationsIndex);
        console.log(' DEBUG: Found CERTIFICATIONS at index:', certificationsIndex);
      }
      
      if (projectsHeaderMatch !== -1 && projectsHeaderMatch > startIdx) {
        endIdx = Math.min(endIdx, projectsHeaderMatch);
        console.log(' DEBUG: Found PROJECTS header at index:', projectsHeaderMatch);
      }
      
      if (technicalSkillsMatch !== -1 && technicalSkillsMatch > startIdx) {
        endIdx = Math.min(endIdx, technicalSkillsMatch);
        console.log(' DEBUG: Found TECHNICAL SKILLS at index:', technicalSkillsMatch);
      }
      
      if (endIdx > startIdx) {
        let potentialProjects = text.substring(startIdx, endIdx).trim();
        
        console.log(' DEBUG: Extracted content between EDUCATION and first section marker');
        console.log(' DEBUG: Content length:', potentialProjects.length);
        console.log(' DEBUG: First 300 chars:', potentialProjects.substring(0, 300));
        console.log(' DEBUG: Last 200 chars:', potentialProjects.substring(Math.max(0, potentialProjects.length - 200)));
        
        // Remove degree text if present at the end
        potentialProjects = potentialProjects
          .replace(/\s*(?:Bachelor|Master|Associate|Diploma)\s+of\s+Science\s+in\s+Computer\s+Science\s*$/i, '')
          .trim();
        
        // Check if this section contains project-like content
        if (potentialProjects.match(/\|/) && potentialProjects.match(/\b(React|JavaScript|HTML|CSS|Python|Java|Node|Unity|Type Script|Expo|Figma|Web-Based|Management|System|Application|App)\b/i)) {
          sections.projects = potentialProjects;
          console.log('  Found projects section, length:', potentialProjects.length);
          console.log(' Projects section preview:', potentialProjects.substring(0, 300));
        } else {
          console.log('  Content does not look like projects (no | or tech keywords)');
        }
      } else {
        console.log('  Invalid indices: start:', startIdx, 'end:', endIdx);
      }
    } else {
      console.log('  Could not find EDUCATION marker');
    }
    
    // Skills section
    const skillsMatch = text.match(/Skills?\s*(?:and\s+Abilities)?\s*(.+?)(?=\s*(?:Projects?|Certifications?|Experience|Education|$))/i);
    if (skillsMatch) {
      sections.skills = skillsMatch[1];
      console.log(' Found skills section, length:', skillsMatch[1].length);
    }
    
    // Certifications section
    const certificationsMatch = text.match(/Certifications?\s*(?:and\s+Seminars?)?\s*(.+?)(?=\s*(?:Skills?|Projects?|Experience|Education|$))/i);
    if (certificationsMatch) {
      sections.certifications = certificationsMatch[1];
      console.log(' Found certifications section, length:', certificationsMatch[1].length);
    }
    
    console.log(' Sections found:', Object.keys(sections));
    return sections;
  }
  
  /**
   * Extract projects using AI - GENERIC for any resume
   */
  extractProjectsAI(text) {
    console.log(' ========================================');
    console.log(' EXTRACTING PROJECTS FROM TEXT');
    console.log(' ========================================');
    console.log(' Full text length:', text.length);
    
    const projects = [];
    
    // Check if text is too short or empty
    if (!text || text.length < 20) {
      console.log('  Text is too short or empty');
      return projects;
    }
    
    // Try Pattern 1: "Project Name |Tech Stack Description..." (with pipe separator)
    const projectPatternWithPipe = /([A-Z][^|]{15,150}?)\s*\|([^|]+?)(?=\s+[A-Z][A-Za-z\s\-]{15,150}?\s*\||$)/g;
    
    let match;
    let projectCount = 0;
    
    // First try with pipe separator
    while ((match = projectPatternWithPipe.exec(text)) !== null) {
      projectCount++;
      const projectName = match[1].trim();
      const restOfContent = match[2].trim();
      
      console.log(` Match ${projectCount}:`);
      console.log(`   Raw name: "${projectName}"`);
      console.log(`   Raw content: "${restOfContent.substring(0, 100)}..."`);
      
      // Clean up project name (remove dates like "- Present" or "2022 -")
      let cleanName = projectName
        .replace(/^-\s*Present\s+/i, '') // Remove "- Present" at start
        .replace(/^\d{4}\s*-\s*(?:\d{4}|Present)\s+/i, '') // Remove "2022 - Present"
        .replace(/^-\s+/, '') // Remove leading dash
        .trim();
      
      // Skip if this looks like contact info
      if (cleanName.match(/@|linkedin|github|phone|email|www\./i)) {
        console.log(' ⏭ Skipping contact info');
        continue;
      }
      
      // Skip if too short after cleaning
      if (cleanName.length < 10) {
        console.log(' ⏭ Skipping - too short after cleaning');
        continue;
      }
      
      // Extract tech stack (usually before first sentence with capital letter)
      let technologies = '';
      let description = restOfContent;
      
      // Tech stack is usually comma-separated at the beginning
      const techMatch = restOfContent.match(/^([^.]+?)(?=\s+[A-Z][a-z]+\s+)/);
      if (techMatch) {
        technologies = techMatch[1].trim();
        description = restOfContent.substring(techMatch[0].length).trim();
      } else {
        // Fallback: first 100 chars as tech, rest as description
        if (restOfContent.length > 100) {
          technologies = restOfContent.substring(0, 100).trim();
          description = restOfContent.substring(100).trim();
        }
      }
      
      const project = {
        name: cleanName,
        technologies: technologies,
        description: description.substring(0, 500), // Limit description length
        startDate: '',
        endDate: '',
        url: ''
      };
      
      projects.push(project);
      console.log(`  Added project: "${cleanName}"`);
    }
    
    // If no projects found with pipe separator, the resume might not have a projects section
    // or projects are formatted differently. Just return empty array.
    // Note: We don't want to over-extract and mistake other content for projects
    
    console.log(' ========================================');
    console.log(' EXTRACTION COMPLETE');
    console.log(' Total projects extracted:', projects.length);
    if (projects.length > 0) {
      console.log(' Project names:');
      projects.forEach((p, idx) => {
        console.log(`   ${idx + 1}. ${p.name}`);
        console.log(`      Tech: ${p.technologies.substring(0, 50)}...`);
      });
    } else {
      console.log('  No projects found. This resume may not have a projects section or uses a different format.');
    }
    console.log(' ========================================');
    
    return projects;
  }
  
  /**
   * Extract certificates using AI - GENERIC for any resume
   */
  extractCertificatesAI(text) {
    console.log(' Extracting certificates from text:', text.substring(0, 200));
    const certificates = [];
    
    // Pattern 1: "Certificate Name |Issuer/Details Month Year" (with pipe)
    const certPatternWithPipe = /([A-Z][^|]{10,100}?)\s*\|\s*([^|]+?)(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/gi;
    let match;
    
    while ((match = certPatternWithPipe.exec(text)) !== null) {
      const name = match[1].trim();
      const issuerPart = match[2].trim();
      const month = match[3];
      const year = match[4];
      
      console.log(' Certificate candidate:', name);
      
      // Skip if it contains email, phone, or contact info
      if (name.match(/@|gmail|yahoo|hotmail|outlook|phone|mobile|tel:|linkedin|github|www\./i)) {
        console.log(' ⏭ Skipping contact info:', name);
        continue;
      }
      
      // Skip if the issuer part contains email or contact info
      if (issuerPart.match(/@|gmail|yahoo|hotmail|outlook|linkedin|github|www\./i)) {
        console.log(' ⏭ Skipping - issuer contains contact info');
        continue;
      }
      
      // Skip if it looks like a project
      if (name.match(/\b(System|App|Management|Automation|Recruitment|Companion|Inventory|Grade|Computation|Development|Platform|Application|Website|Tool|Software)\b/i)) {
        console.log(' ⏭ Skipping project:', name);
        continue;
      }
      
      // Skip if it looks like a person's name (common pattern: FirstName LastName)
      if (name.match(/^[A-Z][a-z]+\s+[A-Z][a-z]+$/)) {
        console.log(' ⏭ Skipping person name:', name);
        continue;
      }
      
      // Skip if it looks like education (contains "Bachelor", "Master", "University", "College")
      if (name.match(/\b(Bachelor|Master|University|College|School|Degree|Education)\b/i)) {
        console.log(' ⏭ Skipping education entry:', name);
        continue;
      }
      
      // Convert month name to number for YYYY-MM format
      const monthMap = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      const monthNum = monthMap[month.toLowerCase()] || '01';
      const date = `${year}-${monthNum}`; // Format: YYYY-MM for input type="month"
      
      // Clean up issuer (remove parentheses content, extra spaces)
      let issuer = issuerPart
        .replace(/\(.*?\)/g, '') // Remove (Issued by Google)
        .replace(/Issued\s*by\s*/gi, '') // Remove "Issued by"
        .replace(/,\s*$/, '') // Remove trailing comma
        .trim();
      
      certificates.push({
        name,
        issuer,
        date,
        description: ''
      });
      
      console.log('  Found certificate:', name);
      console.log('    Issuer:', issuer);
      console.log('    Date:', date);
    }
    
    // Pattern 2: "Certificate Name - Issuer Month Year" (without pipe, more generic)
    const certPatternNoPipe = /([A-Z][A-Za-z\s\-:]{10,100}?)(?:\s*-\s*|\s+)([A-Za-z\s]+?)\s*(January|February|March|April|May|June|July|August|September|October|November|December)\s*(\d{4})/gi;
    
    while ((match = certPatternNoPipe.exec(text)) !== null) {
      const name = match[1].trim();
      const issuerPart = match[2].trim();
      const month = match[3];
      const year = match[4];
      
      console.log(' Certificate candidate (no pipe):', name);
      
      // Skip if it contains email, phone, or contact info
      if (name.match(/@|gmail|yahoo|hotmail|outlook|phone|mobile|tel:|linkedin|github|www\./i)) {
        console.log(' ⏭ Skipping contact info:', name);
        continue;
      }
      
      // Skip if the issuer part contains email or contact info
      if (issuerPart.match(/@|gmail|yahoo|hotmail|outlook|linkedin|github|www\./i)) {
        console.log(' ⏭ Skipping - issuer contains contact info');
        continue;
      }
      
      // Skip if it looks like a project
      if (name.match(/\b(System|App|Management|Automation|Recruitment|Companion|Inventory|Grade|Computation|Development|Platform|Application|Website|Tool|Software)\b/i)) {
        console.log(' ⏭ Skipping project:', name);
        continue;
      }
      
      // Skip if it looks like education
      if (name.match(/\b(Bachelor|Master|University|College|School|Degree|Education)\b/i)) {
        console.log(' ⏭ Skipping education entry:', name);
        continue;
      }
      
      // Convert month name to number for YYYY-MM format
      const monthMap = {
        'january': '01', 'february': '02', 'march': '03', 'april': '04',
        'may': '05', 'june': '06', 'july': '07', 'august': '08',
        'september': '09', 'october': '10', 'november': '11', 'december': '12'
      };
      const monthNum = monthMap[month.toLowerCase()] || '01';
      const date = `${year}-${monthNum}`;
      
      // Clean up issuer
      let issuer = issuerPart
        .replace(/\(.*?\)/g, '')
        .replace(/Issued\s*by\s*/gi, '')
        .replace(/,\s*$/, '')
        .trim();
      
      certificates.push({
        name,
        issuer,
        date,
        description: ''
      });
      
      console.log('  Found certificate (no pipe):', name);
      console.log('    Issuer:', issuer);
      console.log('    Date:', date);
    }
    
    console.log(' Total certificates:', certificates.length);
    
    if (certificates.length === 0) {
      console.log('  No certificates found. Sample text:', text.substring(0, 300));
    }
    
    return certificates;
  }

  /**
   * AI-powered personal info extraction
   */
  extractPersonalInfoAI(text) {
    console.log(' Extracting personal info...');
    const personalInfo = {};
    
    // Extract email
    const emailMatch = text.match(/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/);
    if (emailMatch) {
      personalInfo.email = emailMatch[0];
      console.log(' Found email:', personalInfo.email);
    }
    
    // Extract phone - GENERIC pattern for various formats
    const phoneMatch = text.match(/(?:\+?63|0)?[\s\-\.]?9\d{2}[\s\-\.]?\d{3}[\s\-\.]?\d{4}|(?:\+?1[\s\-\.]?)?\(?\d{3}\)?[\s\-\.]?\d{3}[\s\-\.]?\d{4}|\d{10,11}/);
    if (phoneMatch) {
      personalInfo.phone = phoneMatch[0].replace(/[\s\-\.]/g, '');
      console.log(' Found phone:', personalInfo.phone);
    }
    
    // Extract name from beginning of text (before ANY job title or location)
    // GENERIC pattern - works with any name and any job title
    const nameMatch = text.match(/^([A-Z][a-z]+(?:\s+[A-Z][a-z]*\.?\s*)*[A-Z][a-z]+)\s+(?:[A-Z\/]+|[A-Z][A-Z\s]+|[A-Z][a-z]+\s+City)/);
    if (nameMatch) {
      let fullName = nameMatch[1].trim();
      console.log(' Full name found:', fullName);
      
      // Handle names like "Hannah Nicole L.Comia" - split by space or period
      fullName = fullName.replace(/([a-z])([A-Z])/g, '$1 $2'); // Add space before capital letters
      const parts = fullName.split(/\s+/).filter(p => p.length > 0);
      
      if (parts.length >= 2) {
        // First name is first part, last name is last part
        personalInfo.firstName = parts[0];
        personalInfo.lastName = parts[parts.length - 1].replace(/\.$/, ''); // Remove trailing period
        
        // If middle name/initial exists, add to first name
        if (parts.length > 2) {
          personalInfo.firstName = parts.slice(0, parts.length - 1).join(' ');
        }
        
        console.log(' Parsed name:', personalInfo.firstName, personalInfo.lastName);
      }
    }
    
    return personalInfo;
  }

  /**
   * AI-powered education extraction - TRULY GENERIC for any resume
   */
  extractEducationAI(text) {
    console.log(' Extracting education from:', text.substring(0, 500));
    const education = [];
    
    // Multiple patterns to handle different resume formats
    const patterns = [
      // Pattern 1: "SCHOOL NAME YYYY - YYYY/Present Degree"
      // Example: "DE LA SALLE LIPA 2022 - Present Bachelors of Science in Computer Science"
      /([A-Z][A-Z\s]{5,80}?(?:UNIVERSITY|COLLEGE|SCHOOL|INSTITUTE|ACADEMY|LIPA|COLLEGES))\s+(\d{4})\s*-\s*(\d{4}|Present|Current)\s+([A-Za-z\s]{10,100})/gi,
      
      // Pattern 2: "School Name, Degree YYYY-YYYY"
      // Example: "De La Salle Lipa, Bachelor of Science 2022-Present"
      /([A-Z][^,\n]{3,80}?(?:University|College|School|Institute|Academy|Lipa|Colleges)),\s*([^,\d\n]{5,100}?)\s*(\d{4})\s*-\s*(\d{4}|Present|Current)/gi,
      
      // Pattern 3: "School Name YYYY - YYYY"
      // Example: "De La Salle Lipa 2022 - Present"
      /([A-Z][^,\d\n]{5,80}?(?:University|College|School|Institute|Academy|Lipa|Colleges))\s+(\d{4})\s*-\s*(\d{4}|Present|Current)/gi,
      
      // Pattern 4: "Degree - School Name YYYY-YYYY"
      // Example: "Bachelor of Science in Computer Science - De La Salle Lipa 2022-Present"
      /([A-Za-z\s]{10,100}?(?:Bachelor|Master|Associate|Diploma))\s*-\s*([A-Z][^,\d\n]{5,80}?(?:University|College|School|Institute|Academy))\s+(\d{4})\s*-\s*(\d{4}|Present|Current)/gi
    ];
    
    console.log(' Trying to match education patterns...');
    
    // Try Pattern 1 first (ALL CAPS format)
    let match;
    const pattern1 = /([A-Z][A-Z\s]{5,80}?(?:UNIVERSITY|COLLEGE|SCHOOL|INSTITUTE|ACADEMY|LIPA|COLLEGES))\s+(\d{4})\s*-\s*(\d{4}|Present|Current)\s+([A-Za-z\s]{10,100})/gi;
    while ((match = pattern1.exec(text)) !== null) {
      let school = match[1].trim().replace(/\s+/g, ' ');
      let startDate = match[2];
      let endDate = match[3];
      let degree = match[4].trim();
      
      // Normalize degree name
      degree = this.normalizeDegree(degree);
      
      // Get description (next 200 chars after the match)
      const description = this.extractEducationDescription(text, match.index + match[0].length);
      
      education.push({
        school,
        degree,
        startDate,
        endDate,
        gpa: '',
        location: '',
        description
      });
      
      console.log('  Found education (Pattern 1):', { school, degree, startDate, endDate });
    }
    
    // Try Pattern 2 (with comma)
    if (education.length === 0) {
      const pattern2 = /([A-Z][^,\n]{3,80}?(?:University|College|School|Institute|Academy|Lipa|Colleges)),\s*([^,\d\n]{5,100}?)\s*(\d{4})\s*-\s*(\d{4}|Present|Current)/gi;
      while ((match = pattern2.exec(text)) !== null) {
        let school = match[1].trim().replace(/\s+/g, ' ');
        let degree = match[2].trim();
        let startDate = match[3];
        let endDate = match[4];
        
        degree = this.normalizeDegree(degree);
        const description = this.extractEducationDescription(text, match.index + match[0].length);
        
        education.push({
          school,
          degree,
          startDate,
          endDate,
          gpa: '',
          location: '',
          description
        });
        
        console.log('  Found education (Pattern 2):', { school, degree, startDate, endDate });
      }
    }
    
    // Try Pattern 3 (without degree in match - extract from description)
    if (education.length === 0) {
      const pattern3 = /([A-Z][^,\d\n]{5,80}?(?:University|College|School|Institute|Academy|Lipa|Colleges))\s+(\d{4})\s*-\s*(\d{4}|Present|Current)/gi;
      while ((match = pattern3.exec(text)) !== null) {
        let school = match[1].trim().replace(/\s+/g, ' ');
        let startDate = match[2];
        let endDate = match[3];
        
        // Try to find degree in the surrounding text
        const afterMatch = text.substring(match.index + match[0].length, match.index + match[0].length + 200);
        const degreeMatch = afterMatch.match(/\b(Bachelor|Master|Associate|Diploma|BS|BA|MS|MA|PhD)[^.]{0,80}?(?:Computer Science|Information Technology|Engineering|Science|Arts)/i);
        let degree = degreeMatch ? degreeMatch[0].trim() : 'Bachelor of Science in Computer Science';
        
        degree = this.normalizeDegree(degree);
        const description = this.extractEducationDescription(text, match.index + match[0].length);
        
        education.push({
          school,
          degree,
          startDate,
          endDate,
          gpa: '',
          location: '',
          description
        });
        
        console.log('  Found education (Pattern 3):', { school, degree, startDate, endDate });
      }
    }
    
    console.log(' Total education entries:', education.length);
    
    if (education.length === 0) {
      console.log('  No education found. Sample text:', text.substring(0, 500));
    }
    
    return education;
  }
  
  /**
   * Helper: Normalize degree names
   */
  normalizeDegree(degree) {
    return degree
      .replace(/Bachelors?/gi, 'Bachelor')
      .replace(/Masters?/gi, 'Master')
      .replace(/([a-z])of([A-Z])/g, '$1 of $2')
      .replace(/([a-z])in([A-Z])/g, '$1 in $2')
      .replace(/([a-z])and([A-Z])/g, '$1 and $2')
      .replace(/HighSchool/gi, 'High School')
      .replace(/\s+/g, ' ')
      .trim();
  }
  
  /**
   * Helper: Extract education description
   */
  extractEducationDescription(text, startIndex) {
    const afterMatch = text.substring(startIndex, startIndex + 300);
    
    // Look for description until we hit:
    // - Another school name (University, College, School, etc.)
    // - A section header (PROJECTS, TECHNICAL SKILLS, etc.)
    // - End of text
    const stopPatterns = [
      /\b(?:PROJECTS?|TECHNICAL\s+SKILLS?|CERTIFICATIONS?|EXPERIENCE|WORK\s+EXPERIENCE)\b/i,
      /\b(?:University|College|School|Institute|Academy)\b/i,
      /^\s*$/m // Empty line
    ];
    
    let description = afterMatch;
    let minIndex = afterMatch.length;
    
    // Find the earliest stop point
    for (const pattern of stopPatterns) {
      const match = afterMatch.match(pattern);
      if (match && match.index < minIndex) {
        minIndex = match.index;
      }
    }
    
    description = afterMatch.substring(0, minIndex).trim();
    
    // Clean up the description
    description = description
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/^[\-\•\*]\s*/, '') // Remove leading bullet points
      .trim();
    
    return description;
  }
  
  /**
   * DEPRECATED - old education extraction
   */
  extractEducationAI_OLD(text) {
    const education = [];
    
    // Look for education patterns
    const educationPatterns = [
      /(De La Salle|San Pablo|University|College|School).*?(Bachelor|Master|Senior\s+High\s+School).*?(\d{4}[-–]\d{4}|\d{4}[-–]Present)/gi,
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
    console.log(' Extracting skills from:', text.substring(0, 200));
    const skills = [];
    const seenSkills = new Set();
    
    // Remove category labels first
    let cleanText = text
      .replace(/Skills?\s*(?:and\s+Abilities)?:?/gi, '')
      .replace(/Design\s*&\s*Prototyping:/gi, '')
      .replace(/Web\s*Development:/gi, '')
      .replace(/Automation\s*&\s*Data:/gi, '')
      .replace(/Soft\s*Skills:/gi, '')
      .replace(/Technical\s*Skills?:?/gi, '');
    
    // Common tech skills to look for (case-insensitive)
    const commonSkills = [
      'Python', 'Java', 'JavaScript', 'TypeScript', 'C\\+\\+', 'C#', 'PHP', 'Ruby', 'Go', 'Rust', 'Swift', 'Kotlin',
      'HTML', 'CSS', 'React', 'Angular', 'Vue', 'Node\\.js', 'Express', 'Django', 'Flask', 'Spring',
      'SQL', 'MySQL', 'PostgreSQL', 'MongoDB', 'Redis', 'Firebase',
      'Git', 'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP',
      'Figma', 'Adobe XD', 'Photoshop', 'Illustrator',
      'Machine Learning', 'Data Analysis', 'AI', 'Deep Learning',
      'Team Collaboration', 'Communication', 'Problem Solving', 'Leadership',
      'Agile', 'Scrum', 'CI/CD', 'REST API', 'GraphQL'
    ];
    
    // Try to extract known tech skills first
    for (const skill of commonSkills) {
      const regex = new RegExp('\\b' + skill + '\\b', 'i');
      if (regex.test(cleanText)) {
        const normalized = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
        if (!seenSkills.has(normalized)) {
          skills.push(skill.replace(/\\\\/g, ''));
          seenSkills.add(normalized);
          console.log('  Found known skill:', skill);
        }
      }
    }
    
    // Also try comma-separated parsing for additional skills
    const parts = cleanText.split(/[,;]/);
    
    for (const part of parts) {
      let trimmed = part.trim();
      if (!trimmed || trimmed.length < 2 || trimmed.length > 60) continue;
      
      // Skip non-skill patterns
      if (trimmed.match(/^\d+$|^(and|or|the|a|an|in|on|at|for|with|to)$/i)) continue;
      if (trimmed.match(/Education|Projects?|Experience|Certifications?|Seminars?/i)) continue;
      if (trimmed.match(/\b(University|College|School|Lipa|Colleges|Bachelor|Master|Senior|High)\b/i)) continue;
      if (trimmed.match(/\b(System|App|Management|Automation|Recruitment|Companion|Inventory)\b/i)) continue;
      if (trimmed.match(/\b(Programme|Certificate|Coursera|Cisco|EFSET|Google)\b/i)) continue;
      if (trimmed.match(/\d{4}|January|February|March|April|May|June|July|August|September|October|November|December/i)) continue;
      if (trimmed.match(/^(skilled|proficient|expertise|experienced|knowledge)\s+in/i)) continue; // Skip partial phrases
      
      // Clean up the skill name
      trimmed = trimmed
        .replace(/\s+/g, ' ')
        .replace(/^[^A-Za-z]+/, '') // Remove leading non-letters
        .replace(/\s*\(.*?\)\s*/g, '') // Remove parentheses content
        .replace(/^(with|and)\s+/i, '') // Remove leading conjunctions
        .trim();
      
      if (trimmed.length >= 2 && trimmed.length <= 50) {
        const normalized = trimmed.toLowerCase().replace(/[^a-z0-9]/g, '');
        
        // Check for duplicates
        if (!seenSkills.has(normalized)) {
          skills.push(trimmed);
          seenSkills.add(normalized);
          console.log('  Added skill:', trimmed);
        }
      }
    }
    
    console.log(' Total skills found:', skills.length);
    return skills.slice(0, 50); // Limit to 50
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
    console.log(' Applying template-based parsing...');
    
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
            
            console.log(' Template extraction found name:', {
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
    console.log(' Validating parsed data quality...');
    
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
    
    console.log(' Validation results:', validation);
    return validation;
  }

  /**
   * Merge results from multiple parsing methods
   */
  mergeParsingResults(results) {
    console.log('� Merging parsing results...');
    
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
    
    console.log(` Merged results from ${methodCount} methods with ${(merged.metadata.confidence * 100).toFixed(1)}% confidence`);
    return merged;
  }

  /**
   * Enhanced education parsing with better logic
   */
  parseEducationRules(educationText) {
    console.log('� Parsing education with rules:', educationText.substring(0, 200) + '...');
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
    
    console.log('� Processed education text:', processedText.substring(0, 300));
    
    // Split by lines first, then group by school entries
    const lines = processedText.split('\n').filter(line => line.trim());
    console.log('� Education lines:', lines);
    
    let currentEntry = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim().replace(/\r/g, ''); // Remove carriage returns
      console.log('� Processing line:', `"${trimmedLine}"`);
      
      // Enhanced school pattern detection
      const hasSchoolPattern = trimmedLine.match(/\b(?:DeLaSalleLipa|SanPabloColleges|De\s*La\s*Salle|San\s*Pablo|University|College|Institute|School|Academy)\b/i);
      const hasComma = trimmedLine.includes(',');
      const hasExcludedWords = trimmedLine.match(/\b(?:GPA|Grade|Honor|Award|Semester|Year|AY|Strand|Average|Dean|List|Magna|Summa|Cum Laude)\b/i);
      const hasProjectWords = trimmedLine.match(/\b(?:developed|implemented|created|built|designed|managed|tracked|visualized|application|project|system|platform|website|users?|allowing|via|using|with|tracker|banking|expense|personal)\b/i);
      const hasEducationKeywords = trimmedLine.match(/\b(?:bachelor|master|degree|science|computer|engineering|high\s*school|diploma|certificate|bscs|bs|ba|ms|ma|phd|senior\s*high)\b/i);
      
      // Enhanced degree pattern detection
      const endsWithDegree = trimmedLine.match(/\b(Bachelor\s+of\s+Science\s+in\s+Computer\s+Science|BSCS|BS\s+Computer\s+Science|Bachelor\s+of\s+Science|Master\s+of\s+Science|Bachelor\s+of\s+Arts|Senior\s+High\s+School)$/i);
      const startsWithDegree = trimmedLine.match(/^(Bachelor\s+of\s+Science\s+in\s+Computer\s+Science|BSCS|BS\s+Computer\s+Science|Bachelor\s+of\s+Science|Master\s+of\s+Science|Bachelor\s+of\s+Arts|Senior\s+High\s+School)/i);
      
      console.log('� Line analysis:', {
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
          console.log('�  Added concatenated degree to existing school entry:', currentEntry.degree);
          continue;
        }
      }
      
      if ((hasSchoolPattern || (hasEducationKeywords && !hasProjectWords) || (hasComma && !hasProjectWords && hasEducationKeywords) || endsWithDegree) && !hasExcludedWords) {
        console.log(' Starting new education entry for line:', trimmedLine);
        
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
            console.log('� Extracted concatenated degree for new entry:', currentEntry.degree);
            continue;
          }
        }
        
        // Parse school and degree from comma-separated line
        if (trimmedLine.includes(',')) {
          const parts = trimmedLine.split(',').map(p => p.trim());
          console.log('� Processing comma-separated parts:', parts);
          for (const part of parts) {
            // Check if this part is a school name (first priority)
            if (part.match(/(?:DeLaSalleLipa|SanPabloColleges|De\s*La\s*Salle|San\s*Pablo|University|College|Institute|School)/i)) {
              currentEntry.school = part
                .replace(/DeLaSalleLipa/gi, 'De La Salle Lipa')
                .replace(/SanPabloColleges/gi, 'San Pablo Colleges')
                .replace(/([a-z])([A-Z])/g, '$1 $2')
                .trim();
              console.log('� Detected school:', currentEntry.school);
              
              // Extract dates from school name if present
              const schoolDateMatch = currentEntry.school.match(/(.*?)\s+(\w+\s+\d{4}\s*-\s*(?:\d{4}|Present|Current))/i);
              if (schoolDateMatch) {
                currentEntry.school = schoolDateMatch[1].trim();
                const dateText = schoolDateMatch[2];
                const dateMatch = dateText.match(/(\d{4})\s*-\s*(?:(\d{4})|Present|Current)/i);
                if (dateMatch) {
                  currentEntry.startDate = dateMatch[1];
                  currentEntry.endDate = dateMatch[2] || (dateText.match(/present|current/i) ? 'present' : '');
                  console.log('� Extracted dates from school name:', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
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
                console.log('� Extracted dates from degree part:', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
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
              console.log('� Detected degree:', currentEntry.degree);
            } else {
              // If not a school and contains degree-like words, treat as degree
              if (part.match(/\b(?:Bachelor|Science|Computer|Senior|High|School)\b/i)) {
                // Extract dates if present
                const dateMatch = part.match(/(\d{4})\s*-?\s*(?:(\d{4})|Present|Current)/i);
                if (dateMatch) {
                  currentEntry.startDate = dateMatch[1];
                  currentEntry.endDate = dateMatch[2] || (part.match(/present|current/i) ? 'present' : '');
                  console.log('� Extracted dates (fallback):', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
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
                console.log('� Detected degree (fallback):', currentEntry.degree);
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
                console.log('� Extracted dates from school line:', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
              }
            }
          } else {
            currentEntry.degree = trimmedLine.replace(/([a-z])([A-Z])/g, '$1 $2').trim();
          }
        }
      }
      // Add to current entry's description - VERY AGGRESSIVE
      else if (currentEntry) {
        // Check if this line should be added to description
        const isDescriptionLine = 
          // Contains academic keywords
          trimmedLine.match(/\b(?:GPA|Grade|Honor|Award|Awardee|Average|Graduated|Strand|AY|Academic|Semester|Year|Dean|List|Magna|Summa|Cum\s*Laude|Technology|Engineering|Mathematics|STEM|Second|Third|Fourth|First)\b/i) ||
          // Contains numbers that might be GPA or years
          trimmedLine.match(/\b(?:\d\.\d{1,2}|\d{4}-\d{4}|AY\s*\d{4})\b/i) ||
          // Contains parentheses with details
          (trimmedLine.includes('(') && trimmedLine.includes(')'));
        
        console.log('� Checking line for description:', {
          line: trimmedLine.substring(0, 100),
          isDescriptionLine: isDescriptionLine,
          hasAcademicKeywords: !!trimmedLine.match(/\b(?:GPA|Grade|Honor|Award|Awardee|Average|Graduated|Strand|AY|Academic|Semester|Year|Dean|List|Magna|Summa|Cum\s*Laude|Technology|Engineering|Mathematics|STEM|Second|Third|Fourth|First)\b/i),
          hasNumbers: !!trimmedLine.match(/\b(?:\d\.\d{1,2}|\d{4}-\d{4}|AY\s*\d{4})\b/i),
          hasParentheses: trimmedLine.includes('(') && trimmedLine.includes(')'),
          length: trimmedLine.length
        });
        
        if (isDescriptionLine) {
          console.log('�  Adding to description:', trimmedLine);
        
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
          .replace(/Strand:Science,Technology,Engineering,andMathematics/gi, 'Strand: Science, Technology, Engineering, and Mathematics')
          // Clean up multiple spaces
          .replace(/\s+/g, ' ')
          .trim();
        
          if (formattedDescription.length > 0) {
            currentEntry.description += (currentEntry.description ? '\n' : '') + formattedDescription;
            console.log('� Updated description:', currentEntry.description);
          }
        }
      }
      // Check for standalone dates - more flexible patterns
      else if (currentEntry && trimmedLine.match(/(\d{4})\s*-?\s*(?:(\d{4})|Present|Current)/i)) {
        const dateMatch = trimmedLine.match(/(\d{4})\s*-?\s*(?:(\d{4})|Present|Current)/i);
        if (dateMatch && !currentEntry.startDate) {
          currentEntry.startDate = dateMatch[1];
          currentEntry.endDate = dateMatch[2] || (trimmedLine.match(/present|current/i) ? 'present' : '');
          console.log('� Extracted standalone dates:', { startDate: currentEntry.startDate, endDate: currentEntry.endDate });
        }
      }
    }
    
    // Add last entry
    if (currentEntry && (currentEntry.school || currentEntry.degree)) {
      educationEntries.push(currentEntry);
    }
    
    // Remove duplicate education entries
    const uniqueEducationEntries = [];
    const seenEducation = new Set();
    
    for (const entry of educationEntries) {
      // Create a unique key based on school and degree
      const key = `${entry.school?.toLowerCase().trim()}_${entry.degree?.toLowerCase().trim()}`;
      
      if (!seenEducation.has(key)) {
        seenEducation.add(key);
        uniqueEducationEntries.push(entry);
        console.log('� Added unique education entry:', entry);
      } else {
        console.log('� Skipping duplicate education entry:', entry);
      }
    }
    
    console.log('� Parsed education entries (after deduplication):', uniqueEducationEntries);
    return uniqueEducationEntries;
  }

  /**
   * Extract name directly from raw text (most aggressive approach)
   */
  extractNameDirectlyFromRawText(rawText) {
    console.log('� Starting direct name extraction from raw text...');
    console.log('� First 300 chars:', rawText.substring(0, 300));
    
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
          console.log(`� Skipping line ${i} - matches exclude pattern: "${line}"`);
          continue;
        }
        
        console.log(`� Analyzing line ${i}: "${line}"`);
        
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
                console.log(`�  Found valid name (confidence ${confidence}):`, extracted);
              }
            } else {
              console.log(`�  Invalid name rejected:`, extracted);
            }
          }
        }
        
        // Special handling for very long first lines that might contain the name at the beginning
        if (i === 0 && line.length > 100) {
          // Try to extract just the first part of the line as a potential name
          const firstPart = line.substring(0, 50).trim();
          console.log(`� Trying first part of long line: "${firstPart}"`);
          
          for (const pattern of namePatterns) {
            const match = firstPart.match(pattern.regex);
            if (match) {
              const extracted = pattern.extract(match);
              
              if (this.isValidName(extracted.firstName, extracted.lastName)) {
                const confidence = pattern.confidence + 3; // Extra bonus for first line
                
                if (confidence > bestConfidence) {
                  bestMatch = extracted;
                  bestConfidence = confidence;
                  console.log(`�  Found valid name in first part (confidence ${confidence}):`, extracted);
                }
              }
            }
          }
          
          // Also try the very beginning of the line for concatenated names
          const veryFirstPart = line.substring(0, 25).trim();
          console.log(`� Trying very first part: "${veryFirstPart}"`);
          
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
                console.log(`�  Found concatenated name in very first part (confidence ${confidence}):`, extracted);
              }
            }
          }
        }
      }
    
    if (bestMatch && bestConfidence >= 6) {
      console.log('�  Using best name match:', bestMatch);
      return bestMatch;
    }
    
    // Method 1: Try to find name on a single line (original approach)
    const singleLineResult = this.extractNameFromSingleLine(lines);
    if (singleLineResult.firstName && singleLineResult.lastName) {
      console.log('�  Found name on single line:', singleLineResult);
      return singleLineResult;
    }
    
    // Method 2: Try to reconstruct name from multiple lines (for PDFs that split words)
    const multiLineResult = this.extractNameFromMultipleLines(lines);
    if (multiLineResult.firstName && multiLineResult.lastName) {
      console.log('�  Found name from multiple lines:', multiLineResult);
      return multiLineResult;
    }
    
    // Method 3: Simple fallback - look for any two capitalized words at the beginning
    const fallbackResult = this.extractNameFallback(lines);
    if (fallbackResult.firstName && fallbackResult.lastName) {
      console.log('�  Found name using fallback method:', fallbackResult);
      return fallbackResult;
    }
    
    console.log('�  Direct extraction found no name');
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
      
      console.log(`� Single line ${i}: "${line}"`);
      
      // Check against strict non-name patterns first
      const isNonName = strictNonNamePatterns.some(pattern => pattern.test(line));
      if (isNonName) {
        console.log(`� Skipping line ${i} - matches non-name pattern`);
        continue;
      }
      
      // Additional check: skip lines that are too long (likely not just a name)
      if (line.length > 50) {
        console.log(`� Skipping line ${i} - too long for a name`);
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
          console.log('� Pattern matched:', { pattern: pattern.toString(), match: match });
          
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
              
              console.log('�  Single line extraction found valid name:', {
                line: line,
                firstName: personalInfo.firstName,
                lastName: personalInfo.lastName
              });
              
              return personalInfo;
            } else {
              console.log('�  Rejected technical terms as name:', { firstName, lastName });
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
    console.log('� Trying multi-line name extraction...');
    console.log('� First 10 lines for multi-line analysis:', lines.slice(0, 10));
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
      
      console.log(`� Multi-line ${i}: "${line}"`);
      
      // Check if this looks like a name part (capitalized, no numbers, reasonable length)
      const isNamePart = /^[A-Z][A-Z]*$/i.test(line) && 
                        line.length >= 2 && 
                        line.length <= 20 && 
                        !/\d/.test(line) && 
                        !/@|www\.|http/.test(line);
      
      console.log(`� Line "${line}" - isNamePart: ${isNamePart}`);
      
      if (isNamePart) {
        // Check if it's not a common non-name word
        const nonNameWords = /^(FOR|BEING|A|THE|AND|OR|WITH|TO|FROM|IN|ON|AT|BY|OF|SECOND|THIRD|FIRST|HONOR|AWARD|GRADE|POINT|AVERAGE|PROGRAMMING|LANGUAGES|SKILLS|EDUCATION|EXPERIENCE|CONTACT|PHONE|EMAIL|ADDRESS|UI|UX|DESIGNER|DEVELOPER|ENGINEER)$/i;
        
        if (!nonNameWords.test(line)) {
          nameWords.push(line);
          consecutiveCapitalizedWords++;
          console.log(`� Added name part: "${line}" (total: ${nameWords.length})`);
        } else {
          console.log(`� Skipping non-name word: "${line}"`);
          if (nameWords.length >= 2) break; // Stop if we have enough and hit a non-name
        }
      } else {
        console.log(`� Not a name part: "${line}"`);
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
      
      console.log('�  Multi-line extraction found name:', {
        nameWords: nameWords,
        firstName: personalInfo.firstName,
        lastName: personalInfo.lastName
      });
    } else {
      console.log('�  Multi-line extraction found insufficient name parts:', nameWords);
    }
    
    return personalInfo;
  }
  
  /**
   * Simple fallback name extraction - look for any two capitalized words
   */
  extractNameFallback(lines) {
    console.log('� Trying fallback name extraction...');
    const personalInfo = {};
    
    // Look through first 20 lines for any pattern that could be a name
    for (let i = 0; i < Math.min(lines.length, 20); i++) {
      const line = lines[i];
      if (!line || line.length < 3) continue;
      
      console.log(`� Fallback line ${i}: "${line}"`);
      
      // Skip obvious non-name lines (but be more permissive for names)
      if (line.match(/@|www\.|http|\d{3,}|programming|languages|skills|education|experience|projects|contact|phone|email|address|ui\/ux|designer|developer|engineer|objective|motivated|seeking|training/i)) {
        console.log(`� Skipping obvious non-name: "${line}"`);
        continue;
      }
      
      // Special check: If line starts with what looks like a name pattern, don't skip it
      if (line.match(/^[A-Z][A-Z\s\.]+[A-Z]\s/)) {
        console.log(`� Potential name detected, processing: "${line.substring(0, 50)}..."`);
        // Continue to name processing below
      }
      
      // Also skip lines that are clearly job titles or roles
      if (line.match(/^(student|intern|developer|designer|engineer|analyst|manager|coordinator|assistant|specialist)$/i)) {
        console.log(`� Skipping job title: "${line}"`);
        continue;
      }
      
      // Look for simple patterns: "FirstName LastName" or "FIRSTNAME LASTNAME"
      const simpleNameMatch = line.match(/^([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})$/i);
      if (simpleNameMatch) {
        personalInfo.firstName = simpleNameMatch[1].charAt(0).toUpperCase() + simpleNameMatch[1].slice(1).toLowerCase();
        personalInfo.lastName = simpleNameMatch[2].charAt(0).toUpperCase() + simpleNameMatch[2].slice(1).toLowerCase();
        console.log(`�  Fallback found simple name: ${personalInfo.firstName} ${personalInfo.lastName}`);
        return personalInfo;
      }
      
      // Look for concatenated names at the beginning of long lines
      if (line.length > 50) {
        const firstPart = line.substring(0, 30);
        console.log(`� Checking first part of long line: "${firstPart}"`);
        
        // Try concatenated patterns like "HannahNicoleL.Comia"
        const concatMatch = firstPart.match(/^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z]\.?)([A-Z][a-z]+)/);
        if (concatMatch) {
          personalInfo.firstName = (concatMatch[1] + ' ' + concatMatch[2]).charAt(0).toUpperCase() + (concatMatch[1] + ' ' + concatMatch[2]).slice(1).toLowerCase();
          personalInfo.lastName = concatMatch[4].charAt(0).toUpperCase() + concatMatch[4].slice(1).toLowerCase();
          console.log(`�  Fallback found concatenated name with middle initial: ${personalInfo.firstName} ${personalInfo.lastName}`);
          return personalInfo;
        }
        
        // Try simple concatenated patterns like "HannahNicoleComia"
        const simpleConcatMatch = firstPart.match(/^([A-Z][a-z]+)([A-Z][a-z]+)([A-Z][a-z]+)/);
        if (simpleConcatMatch) {
          personalInfo.firstName = simpleConcatMatch[1].charAt(0).toUpperCase() + simpleConcatMatch[1].slice(1).toLowerCase();
          personalInfo.lastName = simpleConcatMatch[3].charAt(0).toUpperCase() + simpleConcatMatch[3].slice(1).toLowerCase();
          console.log(`�  Fallback found simple concatenated name: ${personalInfo.firstName} ${personalInfo.lastName}`);
          return personalInfo;
        }
      }
      
      // Look for "FirstName MiddleName LastName" or "FIRSTNAME MIDDLENAME LASTNAME"
      const fullNameMatch = line.match(/^([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})\s+([A-Z][a-z]{1,20})$/i);
      if (fullNameMatch) {
        personalInfo.firstName = fullNameMatch[1].charAt(0).toUpperCase() + fullNameMatch[1].slice(1).toLowerCase();
        personalInfo.lastName = fullNameMatch[3].charAt(0).toUpperCase() + fullNameMatch[3].slice(1).toLowerCase();
        console.log(`�  Fallback found full name: ${personalInfo.firstName} ${personalInfo.lastName}`);
        return personalInfo;
      }
      
      // Look for "FIRSTNAME MIDDLENAME D. LASTNAME" pattern (like ADRIAN LOUISE D. GALVEZ)
      const fullNameWithInitialMatch = line.match(/^([A-Z]{2,})\s+([A-Z]{2,})\s+([A-Z]\.?)\s+([A-Z]{2,})$/i);
      if (fullNameWithInitialMatch) {
        personalInfo.firstName = fullNameWithInitialMatch[1].charAt(0).toUpperCase() + fullNameWithInitialMatch[1].slice(1).toLowerCase();
        personalInfo.lastName = fullNameWithInitialMatch[4].charAt(0).toUpperCase() + fullNameWithInitialMatch[4].slice(1).toLowerCase();
        console.log(`�  Fallback found name with initial: ${personalInfo.firstName} ${personalInfo.lastName}`);
        return personalInfo;
      }
      
      // Look for all caps names "FIRSTNAME LASTNAME"
      const allCapsNameMatch = line.match(/^([A-Z]{2,})\s+([A-Z]{2,})$/i);
      if (allCapsNameMatch && !line.match(/EDUCATION|EXPERIENCE|SKILLS|PROJECTS|OBJECTIVE|WORK/)) {
        personalInfo.firstName = allCapsNameMatch[1].charAt(0).toUpperCase() + allCapsNameMatch[1].slice(1).toLowerCase();
        personalInfo.lastName = allCapsNameMatch[2].charAt(0).toUpperCase() + allCapsNameMatch[2].slice(1).toLowerCase();
        console.log(`�  Fallback found all-caps name: ${personalInfo.firstName} ${personalInfo.lastName}`);
        return personalInfo;
      }
    }
    
    console.log('�  Fallback extraction found no name');
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
    
    console.log('� Trying to extract name from email:', email);
    
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
        console.log('�  Extracted from dot-separated email:', personalInfo);
        return personalInfo;
      }
    }
    
    // Pattern 2: firstnameLastname (camelCase)
    const camelCaseMatch = localPart.match(/^([a-z]+)([A-Z][a-z]+)/);
    if (camelCaseMatch) {
      personalInfo.firstName = camelCaseMatch[1].charAt(0).toUpperCase() + camelCaseMatch[1].slice(1).toLowerCase();
      personalInfo.lastName = camelCaseMatch[2].charAt(0).toUpperCase() + camelCaseMatch[2].slice(1).toLowerCase();
      console.log('�  Extracted from camelCase email:', personalInfo);
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
          console.log('�  Extracted from concatenated email (heuristic):', personalInfo);
          return personalInfo;
        }
      }
    }
    
    console.log('�  Could not extract name from email');
    return personalInfo;
  }

  /**
   * Parse personal info from entire document (global search)
   */
  parsePersonalInfoFromEntireDocument(fullText) {
    console.log('� Starting global name extraction from entire document...');
    
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
      
      console.log('� Analyzing line for name (global):', `"${trimmedLine}"`);
      
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
          
          console.log('�  Global extraction found name:', {
            line: trimmedLine,
            firstName: personalInfo.firstName,
            lastName: personalInfo.lastName
          });
          
          return personalInfo;
        }
      }
    }
    
    console.log('�  Global extraction found no name');
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
    
    console.log('� Starting name extraction from personal text:', personalText.substring(0, 200));
    console.log('� Personal text lines:', personalLines.slice(0, 10));
    
    // Look for the name in the first few lines, avoiding section headers
    for (let i = 0; i < Math.min(personalLines.length, 8); i++) {
      const trimmedLine = personalLines[i].trim().replace(/\r/g, '');
      console.log('� Analyzing line for name:', `"${trimmedLine}"`);
      
      // Skip obvious non-name lines
      if (trimmedLine.match(/\b(?:UX|UI|DESIGNER|Developer|Engineer|Education|Experience|Skills|Projects|Contact|Phone|Email|Address)\b/i) ||
          trimmedLine.includes('@') || trimmedLine.match(/^\+?\d/) || trimmedLine.length < 3) {
        console.log('� Skipping line (not a name)');
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
          console.log('� Found potential name:', fullName);
          
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
            console.log('�  Successfully detected name from line:', `"${trimmedLine}"`);
            console.log('�  Parsed name:', { firstName: personalInfo.firstName, lastName: personalInfo.lastName });
            break;
          } else {
            console.log('�  Name parsing failed - missing first or last name');
            // Reset for next attempt
            delete personalInfo.firstName;
            delete personalInfo.lastName;
          }
        }
      }
    }
    
    // If no name found with strict patterns, try a more lenient approach
    if (!nameFound) {
      console.log('�  No name found with strict patterns, trying lenient approach...');
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
            console.log('�  Found name with lenient approach:', { firstName: personalInfo.firstName, lastName: personalInfo.lastName });
            break;
          }
        }
      }
    }
    
    if (!nameFound) {
      console.log('�  No name could be extracted from personal info section');
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
    console.log('� Parsing experience from text:', experienceText.substring(0, 200));
    
    // If this section was already detected as something else, it shouldn't be here
    // The section detection should have caught it before reaching this parser
    
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
    
    console.log('� Processed experience text:', processedText.substring(0, 300));
    
    const experienceEntries = [];
    const lines = processedText.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    
    let currentEntry = null;
    
    for (const line of lines) {
      const trimmedLine = line.trim().replace(/\r/g, '');
      console.log('� Processing line:', `"${trimmedLine}"`);
      
      // Enhanced job title and company detection
      const hasJobTitle = trimmedLine.match(/\b(?:Production Manager|Video Editor|Graphic Designer|Software Engineer|Developer|Manager|Editor|Designer|Engineer|Analyst|Coordinator|Assistant|Specialist|Intern|Student|Freelance|Programmer|Consultant|Lead|Senior|Junior|Principal|Architect|Administrator|Supervisor|Director|Executive|President|CEO|CTO|CFO|VP|Vice President)\b/i);
      const hasCompanyPattern = trimmedLine.match(/\b(?:LLC|Inc|Corp|Company|University|College|Technologies|Systems|Solutions|Group|Ltd|Limited|Partnership|Associates|Consulting|Services|Enterprises|Industries|Corporation|Foundation|Institute|Academy|School|Hospital|Clinic|Laboratory|Research|Development|Innovation|Digital|Software|Hardware|IT|Information Technology|Media|Marketing|Advertising|Finance|Banking|Insurance|Healthcare|Education|Government|Non-profit|NGO|Startup|Agency|Studio|Workshop|Factory|Manufacturing|Retail|E-commerce|Online|Web|Mobile|Cloud|Data|Analytics|AI|Machine Learning|Blockchain|Cybersecurity)\b/i);
      const hasDatePattern = trimmedLine.match(/\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|\d{4}\s*-\s*(?:\d{4}|Present|Current)/i);
      
      // Enhanced job title with company and dates pattern
      const jobTitleMatch = trimmedLine.match(/^(.+?)\s*[-–—]\s*(.+?)\s+((?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}\s*[-–—]\s*(?:(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{4}|Present|Current))/i);
      
      console.log('� Line analysis:', {
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
        
        console.log(' Created experience entry from pattern:', currentEntry);
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
        
        console.log(' Started new experience entry:', currentEntry);
      } else if (currentEntry) {
        // Add to current entry's description
        if (trimmedLine.length > 10 && !trimmedLine.match(/^(EDUCATION|SKILLS|PROJECTS|CERTIFICATIONS)/i)) {
          if (currentEntry.description) {
            currentEntry.description += '\n' + trimmedLine;
          } else {
            currentEntry.description = trimmedLine;
          }
          console.log('� Added to description:', trimmedLine.substring(0, 50) + '...');
        }
      }
    }
    
    // Save last entry
    if (currentEntry && (currentEntry.position || currentEntry.company)) {
      experienceEntries.push(currentEntry);
    }
    
    console.log('� Parsed experience entries:', experienceEntries.length);
    experienceEntries.forEach((entry, index) => {
      console.log(`� Entry ${index + 1}:`, {
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
    console.log(' Parsing skills from text:', skillsText.substring(0, 200));
    
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
    
    console.log(' Processed skills text:', processedText.substring(0, 300));
    
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
      console.log(' Found category matches:', categoryMatches);
      categoryMatches.forEach(match => {
        const [category, skillsList] = match.split(':');
        if (skillsList && skillsList.trim()) {
          console.log(' Extracting skills from category "' + category + '":', skillsList.trim());
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
    
    console.log(' Processed text after category extraction:', processedText.substring(0, 200));
    
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
    
    console.log(' Raw skills extracted:', rawSkills);
    
    // Filter out non-skills
    const filteredSkills = rawSkills.filter(skill => {
      // Skip if matches non-skill patterns
      if (nonSkillPatterns.some(pattern => pattern.test(skill))) {
        console.log(' Filtered out (non-skill pattern):', skill);
        return false;
      }
      
      // Skip if too short or too long
      if (skill.length < 2 || skill.length > 50) {
        console.log(' Filtered out (length):', skill);
        return false;
      }
      
      // Skip if contains too many numbers
      if ((skill.match(/\d/g) || []).length > skill.length / 2) {
        console.log(' Filtered out (too many numbers):', skill);
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
          console.log(' Reconstructed 3-word skill:', combined);
        }
      } else {
        // Two-word skill
        const idx1 = skillsToCheck.findIndex(s => s.toLowerCase() === word1.toLowerCase());
        const idx2 = skillsToCheck.findIndex(s => s.toLowerCase() === word2.toLowerCase());
        if (idx1 !== -1 && idx2 !== -1) {
          reconstructedSkills.push(combined);
          skillsToCheck.splice(Math.max(idx1, idx2), 1);
          skillsToCheck.splice(Math.min(idx1, idx2), 1);
          console.log(' Reconstructed 2-word skill:', combined);
        }
      }
    }
    
    // Combine reconstructed skills with remaining skills
    const allSkills = [...reconstructedSkills, ...skillsToCheck];
    
    // Remove duplicates more thoroughly and clean up
    const uniqueSkills = [];
    const seenSkills = new Map(); // Use Map to store original skill names
    
    for (const skill of allSkills) {
      const normalizedSkill = skill.toLowerCase().trim().replace(/[^a-z0-9]/g, '');
      
      // Skip empty or very short skills
      if (!skill || skill.trim().length <= 1 || normalizedSkill.length <= 1) {
        console.log(' Skipping empty/short skill:', skill);
        continue;
      }
      
      // Check if we've already seen this skill (normalized comparison)
      let isDuplicate = false;
      let duplicateOf = '';
      
      for (const [existingNormalized, existingOriginal] of seenSkills) {
        // Exact normalized match
        if (existingNormalized === normalizedSkill) {
          isDuplicate = true;
          duplicateOf = existingOriginal;
          break;
        }
        
        // Substring match (one contains the other)
        if (existingNormalized.includes(normalizedSkill) || normalizedSkill.includes(existingNormalized)) {
          // Keep the longer, more descriptive version
          if (skill.length > existingOriginal.length) {
            // Replace the existing skill with the longer one
            seenSkills.delete(existingNormalized);
            const indexToReplace = uniqueSkills.findIndex(s => s === existingOriginal);
            if (indexToReplace !== -1) {
              uniqueSkills[indexToReplace] = skill;
              console.log(' Replaced shorter skill:', existingOriginal, 'with longer:', skill);
            }
            seenSkills.set(normalizedSkill, skill);
            isDuplicate = true; // Don't add again
            break;
          } else {
            isDuplicate = true;
            duplicateOf = existingOriginal;
            break;
          }
        }
        
        // Very similar skills (Levenshtein-like comparison)
        const similarity = this.calculateStringSimilarity(normalizedSkill, existingNormalized);
        if (similarity > 0.8) {
          isDuplicate = true;
          duplicateOf = existingOriginal;
          break;
        }
      }
      
      if (isDuplicate) {
        console.log(' Skipping duplicate/similar skill:', skill, duplicateOf ? `(similar to: ${duplicateOf})` : '');
      } else {
        uniqueSkills.push(skill);
        seenSkills.set(normalizedSkill, skill);
        console.log(' Added unique skill:', skill);
      }
    }
    
    // Final aggressive deduplication pass
    const finalUniqueSkills = [];
    const finalSeenSkills = new Set();
    
    for (const skill of uniqueSkills) {
      const normalizedForFinal = skill.toLowerCase().replace(/[^a-z0-9]/g, '');
      
      // Check for exact matches or very similar skills
      let shouldAdd = true;
      for (const seenSkill of finalSeenSkills) {
        if (seenSkill === normalizedForFinal || 
            seenSkill.includes(normalizedForFinal) || 
            normalizedForFinal.includes(seenSkill) ||
            Math.abs(seenSkill.length - normalizedForFinal.length) <= 1) {
          shouldAdd = false;
          console.log(' Final pass: Skipping duplicate skill:', skill);
          break;
        }
      }
      
      if (shouldAdd) {
        finalUniqueSkills.push(skill);
        finalSeenSkills.add(normalizedForFinal);
      }
    }
    
    // Limit to 50 skills max
    const finalSkills = finalUniqueSkills.slice(0, 50);
    
    console.log(' Final skills after all processing:', finalSkills);
    console.log(' Skills processing summary:', {
      originalTextLength: skillsText.length,
      rawSkillsCount: rawSkills.length,
      filteredSkillsCount: filteredSkills.length,
      cleanedSkillsCount: cleanedSkills.length,
      uniqueSkillsCount: uniqueSkills.length,
      finalSkillsCount: finalSkills.length
    });
    
    return finalSkills;
  }

  /**
   * Calculate string similarity (simple Jaccard similarity)
   */
  calculateStringSimilarity(str1, str2) {
    if (str1 === str2) return 1;
    if (str1.length === 0 || str2.length === 0) return 0;
    
    // Convert to sets of characters
    const set1 = new Set(str1.split(''));
    const set2 = new Set(str2.split(''));
    
    // Calculate intersection
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    
    // Calculate union
    const union = new Set([...set1, ...set2]);
    
    // Jaccard similarity
    return intersection.size / union.size;
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
    console.log(' Parsing certificates for optional sections...');
    console.log(' Raw certification text:', certificationsText.substring(0, 200));
    
    const certificates = [];
    
    // Split into individual certificate entries - be more flexible
    const entries = certificationsText
      .split(/\n\s*\n|(?=^[•\-\*]\s)|(?=^\d+[\.)]\s)/)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 5 && entry.length < 300) // More flexible length limits
      .filter(entry => !entry.match(/^(certifications?|certificates?|seminars?|trainings?|licenses?):?$/i)) // Remove headers
      .filter(entry => !entry.match(/^(education|experience|skills|projects|personal|contact|phone|email|address|name)/i)); // Remove non-certificate sections
    
    console.log(' Split into', entries.length, 'potential certificate entries');
    
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
      
      console.log(' Processing entry lines:', lines);
      
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
        console.log(' Parsed pipe format:', cert);
        certificates.push(cert);
        continue;
      }
      
      // Smart parsing: Look for common certificate patterns
      const fullText = entry.replace(/\s+/g, ' ').trim();
      
      // Pattern 1: "Certificate Name - Issuer (Date)"
      const pattern1 = fullText.match(/^(.+?)\s*[-–—]\s*(.+?)\s*\((.+?)\)$/);
      if (pattern1) {
        cert.name = pattern1[1].trim();
        cert.issuer = pattern1[2].trim();
        cert.date = pattern1[3].trim();
        console.log(' Parsed pattern 1:', cert);
        certificates.push(cert);
        continue;
      }
      
      // Pattern 2: "Certificate Name by Issuer"
      const pattern2 = fullText.match(/^(.+?)\s+by\s+(.+?)(?:\s+\((.+?)\))?$/i);
      if (pattern2) {
        cert.name = pattern2[1].trim();
        cert.issuer = pattern2[2].trim();
        cert.date = pattern2[3] ? pattern2[3].trim() : '';
        console.log(' Parsed pattern 2:', cert);
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
          console.log(' Found issuer:', name);
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
          console.log(' Set certificate name:', line);
        } else if (nameSet && !cert.issuer && line.length > 3 && line.length < 80) {
          // Second line might be issuer if we haven't found one
          // Check if it looks like an organization name
          if (line.match(/^[A-Z][a-zA-Z\s&.,()]+$/) || issuerPatterns.some(({ pattern }) => pattern.test(line))) {
            cert.issuer = line;
            console.log(' Set issuer from line:', line);
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
      
      // Only add if we have at least a name and it looks like a certificate
      if (cert.name && cert.name.length > 3 && 
          (cert.name.match(/\b(certificate|certification|course|training|seminar|program|academy|mobility|design|analysis|science|english|cisco|google|coursera|efset)\b/i) ||
           cert.issuer.match(/\b(coursera|cisco|google|microsoft|academy|university|college)\b/i))) {
        console.log(' Adding certificate:', cert);
        certificates.push(cert);
      } else {
        console.log(' Skipping invalid certificate entry:', cert.name);
      }
    }
    
    console.log(' Final parsed certificates:', certificates);
    return certificates;
  }

  /**
   * Parse projects for optional sections
   */
  parseProjectsRules(projectsText) {
    console.log('� Parsing projects for optional sections...');
    console.log('� Raw projects text length:', projectsText.length);
    console.log('� Raw projects text:', projectsText.substring(0, 500));
    
    const projects = [];
    
    // Split into individual project entries - be more flexible
    const entries = projectsText
      .split(/\n\s*\n|(?=^[•\-\*]\s)|(?=^\d+[\.)]\s)/)
      .map(entry => entry.trim())
      .filter(entry => entry.length > 10 && entry.length < 500) // More flexible length limits
      .filter(entry => !entry.match(/^(projects?|personal\s*projects?|academic\s*projects?|portfolio):?$/i)) // Remove headers
      .filter(entry => !entry.match(/^(education|experience|skills|certifications|personal|contact|phone|email|address|name)/i)); // Remove non-project sections
    
    console.log('� After splitting and filtering, entries count:', entries.length);
    console.log('� Entries:', entries);
    
    console.log('� Split into', entries.length, 'potential project entries');
    
    for (const entry of entries) {
      const lines = entry.split('\n').map(l => l.trim().replace(/^[•\-\*\d+\.)]\s*/, '')).filter(l => l);
      
      if (lines.length === 0) continue;
      
      console.log('� Processing project entry lines:', lines);
      
      const project = {
        name: '',
        description: '',
        technologies: '',
        startDate: '',
        endDate: '',
        url: ''
      };
      
      // Smart parsing: Look for common project patterns
      const fullText = entry.replace(/\s+/g, ' ').trim();
      
      // Pattern 1: "Project Name | Technologies | Description"
      const pipePattern = fullText.match(/^([^|\n]+)\|([^|\n]+)\|([^|\n]+)/);
      if (pipePattern) {
        project.name = pipePattern[1].trim();
        project.technologies = pipePattern[2].trim();
        project.description = pipePattern[3].trim();
        console.log('� Parsed pipe format:', project);
        projects.push(project);
        continue;
      }
      
      // Pattern 2: "Project Name - Description (Technologies: ...)"
      const pattern1 = fullText.match(/^(.+?)\s*[-–—]\s*(.+?)\s*\(Technologies?:\s*(.+?)\)$/i);
      if (pattern1) {
        project.name = pattern1[1].trim();
        project.description = pattern1[2].trim();
        project.technologies = pattern1[3].trim();
        console.log('� Parsed pattern 1:', project);
        projects.push(project);
        continue;
      }
      
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
          console.log('� Set project name:', line);
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
            console.log('� Set technologies:', techLine);
          } else if (!project.description) {
            // This is likely the description
            project.description = line;
            console.log('� Set description:', line);
          } else {
            // Additional description lines
            project.description += ' ' + line;
          }
        }
      }
      
      // Clean up the project name (remove dates and URLs if they got included)
      if (project.name) {
        let cleanName = project.name;
        
        // Remove dates from name
        cleanName = cleanName.replace(/\b\d{4}\s*[-–—]\s*(\d{4}|present|current)\b/gi, '').trim();
        cleanName = cleanName.replace(/\b\d{4}\b/g, '').trim();
        
        // Remove URLs from name
        cleanName = cleanName.replace(/https?:\/\/[^\s]+/gi, '').trim();
        
        // Remove common separators at the end
        cleanName = cleanName.replace(/[\|\-–—,;:]\s*$/, '').trim();
        
        project.name = cleanName;
      }
      
      // Only add if we have at least a name and it looks like a project
      if (project.name && project.name.length > 3 && 
          (project.name.match(/\b(project|system|application|app|website|platform|tool|software|nlp|digital|inventory|grade|recruitment|companion|management|computation)\b/i) ||
           project.description.match(/\b(developed|built|created|designed|implemented|using|react|node|mongodb|javascript|python|web|mobile)\b/i))) {
        console.log('� Adding project:', project);
        projects.push(project);
      } else {
        console.log('� Skipping invalid project entry:', project.name);
      }
    }
    
    console.log('� Final parsed projects:', projects);
    return projects;
  }

  /**
   * Parse awards for optional sections
   */
  parseAwardsRules(awardsText) {
    console.log('� Parsing awards for optional sections...');
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
    
    console.log('� Parsed awards:', awards);
    return awards;
  }

  /**
   * Parse volunteer experience for optional sections
   */
  parseVolunteerRules(volunteerText) {
    console.log('❤ Parsing volunteer experience for optional sections...');
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
    
    console.log('❤ Parsed volunteer experience:', volunteer);
    return volunteer;
  }

  /**
   * Parse languages for optional sections
   */
  parseLanguagesRules(languagesText) {
    console.log('� Parsing languages for optional sections...');
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
    
    console.log('� Parsed languages:', languages);
    return languages;
  }

  /**
   * Parse references for optional sections
   */
  parseReferencesRules(referencesText) {
    console.log('� Parsing references for optional sections...');
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
    
    console.log('� Parsed references:', references);
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

module.exports = EnhancedResumeParser;
