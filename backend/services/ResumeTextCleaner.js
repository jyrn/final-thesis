/**
 * Resume Text Cleaner Service
 * Comprehensive text cleaning and normalization before parsing
 * This service handles all text preprocessing to improve parser accuracy
 */

const GeneralizableTextCleaner = require('./GeneralizableTextCleaner');

class ResumeTextCleaner {
  constructor() {
    this.version = '1.2.0';
    this.generalizableCleaner = new GeneralizableTextCleaner();
    console.log('🧹 ResumeTextCleaner v1.2.0 initialized with PDF line-break handling');
    
    // Comprehensive list of concatenated word fixes
    this.concatenatedFixes = {
      // Common resume concatenations
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
      
      // School names
      'DeLaSalle': 'De La Salle',
      'SanPablo': 'San Pablo',
      'DeLaSalleLipa': 'De La Salle Lipa',
      'SanPabloColleges': 'San Pablo Colleges',
      
      // Skills and technologies
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
      'FrontEnd': 'Front-End',
      'BackEnd': 'Back-End',
      'FullStack': 'Full-Stack',
      
      // Certifications
      'GoogleUXDesign': 'Google UX Design',
      'StudentMobilityProgramme': 'Student Mobility Programme',
      'CiscoNetworkingAcademy': 'Cisco Networking Academy',
      'MicrosoftOffice': 'Microsoft Office',
      
      // Project names
      'NLPBased': 'NLP-Based',
      'DigitalCompanion': 'Digital Companion',
      'InventoryManagement': 'Inventory Management',
      'GradeComputation': 'Grade Computation',
      'RecruitmentSystem': 'Recruitment System',
      'EmailAutomation': 'Email Automation',
      
      // Job titles
      'UIUXDesigner': 'UI/UX Designer',
      'UXUIDesigner': 'UX/UI Designer',
      'SoftwareEngineer': 'Software Engineer',
      'WebDeveloper': 'Web Developer',
      'DataScientist': 'Data Scientist',
      'ProductManager': 'Product Manager',
      'ProjectManager': 'Project Manager',
      
      // Common phrases
      'ResponsibleFor': 'Responsible for',
      'WorkedWith': 'Worked with',
      'DevelopedUsing': 'Developed using',
      'BuiltWith': 'Built with',
      'CreatedUsing': 'Created using',
      'Graduatedwith': 'Graduated with',
      'Developedaweb': 'Developed a web',
      'Developeda': 'Developed a',
      'Createda': 'Created a',
      'Buildaweb': 'Build a web',
      'Designeda': 'Designed a',
      'Implementeda': 'Implemented a',
      'forPESOLipa': 'for PESO Lipa',
      'forPESO': 'for PESO',
      'forthe': 'for the',
      'forThe': 'for The',
      'withfeatureslike': 'with features like',
      'withfeatures': 'with features',
      'Designedaccessible': 'Designed accessible',
      'Builtaweb': 'Built a web',
      'Automatedthe': 'Automated the',
      'Thisreduced': 'This reduced',
      'improvingusability': 'improving usability',
      'enhancingday': 'enhancing day',
      'daylifefor': 'day life for',
      'lifefor': 'life for',
      'elderlyand': 'elderly and',
      'impairedusers': 'impaired users',
      'enablingefficient': 'enabling efficient',
      'itemtracking': 'item tracking',
      'trackingacross': 'tracking across',
      'acrossdifferent': 'across different',
      'differentcategories': 'different categories',
      'processusing': 'process using',
      'calculatestudent': 'calculate student',
      'studentgrades': 'student grades',
      'gradesand': 'grades and',
      'andsend': 'and send',
      'sendresults': 'send results',
      'resultsvia': 'results via',
      'viaemail': 'via email',
      'computationtime': 'computation time',
      'timeand': 'time and',
      'andeliminated': 'and eliminated',
      'eliminatedhuman': 'eliminated human',
      'humanerrors': 'human errors',
      'errorsin': 'errors in',
      'ingrade': 'in grade',
      'gradeencoding': 'grade encoding',
      
      // Additional patterns from terminal output
      'basedplatformthat': 'based platform that',
      'platformthatapplies': 'platform that applies',
      'thatapplies': 'that applies',
      'likemedicationreminders': 'like medication reminders',
      'medicationreminders': 'medication reminders',
      'usabilityandenhancing': 'usability and enhancing',
      'andenhancing': 'and enhancing',
      'forelderly': 'for elderly',
      'andimpaired': 'and impaired',
      'basedinventorysystem': 'based inventory system',
      'inventorysystemwith': 'inventory system with',
      'systemwith': 'system with',
      'withCRUDoperations': 'with CRUD operations',
      'CRUDoperations': 'CRUD operations',
      'themanualgrade': 'the manual grade',
      'manualgrade': 'manual grade',
      'gradecomputation': 'grade computation',
      'computationprocess': 'computation process',
      'reducedcomputation': 'reduced computation',
      'themanual': 'the manual',
      'manualgradecomputation': 'manual grade computation',
      'gradecomputationprocess': 'grade computation process',
      
      // Additional fixes from latest terminal output
      'TF-IDFandcosinesimilarity': 'TF-IDF and cosine similarity',
      'andcosinesimilarity': 'and cosine similarity',
      'cosinesimilarity': 'cosine similarity',
      'toanalyze': 'to analyze',
      'andmatchjobseekers': 'and match job seekers',
      'matchjobseekers': 'match job seekers',
      'jobseekers': 'job seekers',
      'jobseekerswith': 'job seekers with',
      'withrelevant': 'with relevant',
      'relevantjob': 'relevant job',
      'jobposts': 'job posts',
      'improvingthe': 'improving the',
      'theaccuracy': 'the accuracy',
      'accuracyand': 'accuracy and',
      'andefficiency': 'and efficiency',
      'efficiencyof': 'efficiency of',
      'ofthe': 'of the',
      'theemployment': 'the employment',
      'employmentprocess': 'employment process',
      'Harnessingthe': 'Harnessing the',
      'Introductionto': 'Introduction to',
      'PowerBI': 'Power BI',
      'MongoDB': 'MongoDB',
      
      // More comprehensive description fixes
      'withrelevant': 'with relevant',
      'relevantjobposts': 'relevant job posts',
      'jobpoststo': 'job posts to',
      'poststo': 'posts to',
      'improvingtheaccuracy': 'improving the accuracy',
      'theaccuracyand': 'the accuracy and',
      'accuracyandefficiency': 'accuracy and efficiency',
      'andefficiencyof': 'and efficiency of',
      'efficiencyofthe': 'efficiency of the',
      'oftheemployment': 'of the employment',
      'theemploymentprocess': 'the employment process',
      'employmentprocessto': 'employment process to',
      'processto': 'process to',
      'Designedaccessible': 'Designed accessible',
      'accessiblemobile': 'accessible mobile',
      'mobileinterfaces': 'mobile interfaces',
      'interfacesin': 'interfaces in',
      'inFigma': 'in Figma',
      'Figmawith': 'Figma with',
      'withfeatureslike': 'with features like',
      'featureslikemedicationreminders': 'features like medication reminders',
      'medicationremindersand': 'medication reminders and',
      'remindersand': 'reminders and',
      'andemergency': 'and emergency',
      'emergencyalerts': 'emergency alerts',
      'alertsto': 'alerts to',
      'toimprove': 'to improve',
      'improveusability': 'improve usability',
      'usabilityandenhance': 'usability and enhance',
      'andenhanceday': 'and enhance day',
      'enhanceday': 'enhance day',
      'dayto': 'day to',
      'todaylife': 'to day life',
      'daylifefor': 'day life for',
      'lifeforelderly': 'life for elderly',
      'forelderlyand': 'for elderly and',
      'elderlyandimpaired': 'elderly and impaired',
      'andimpairedusers': 'and impaired users',
      'impairedusersto': 'impaired users to',
      'usersto': 'users to',
      'Builtaweb': 'Built a web',
      'awebbased': 'a web based',
      'webbasedinventory': 'web based inventory',
      'basedinventorysystem': 'based inventory system',
      'inventorysystemwith': 'inventory system with',
      'systemwithCRUD': 'system with CRUD',
      'withCRUDoperations': 'with CRUD operations',
      'CRUDoperationssearch': 'CRUD operations search',
      'operationssearch': 'operations search',
      'searchsorting': 'search sorting',
      'sortingand': 'sorting and',
      'andvalidation': 'and validation',
      'validationfeatures': 'validation features',
      'featuresto': 'features to',
      'toenable': 'to enable',
      'enableefficient': 'enable efficient',
      'efficientitem': 'efficient item',
      'itemtrackingacross': 'item tracking across',
      'trackingacrossdifferent': 'tracking across different',
      'acrossdifferentcategories': 'across different categories',
      'differentcategoriesto': 'different categories to',
      'categoriesto': 'categories to',
      
      // Additional specific fixes
      'RPAtocalculate': 'RPA to calculate',
      'tocalculate': 'to calculate',
      'calculatestudent': 'calculate student',
      'studentgradesin': 'student grades in',
      'gradesin': 'grades in',
      'inExcel': 'in Excel',
      'Exceland': 'Excel and',
      'andsend': 'and send',
      'sendresults': 'send results',
      'resultsvia': 'results via',
      'viaemail': 'via email',
      'UiPath': 'UiPath',
      'PathRPA': 'Path RPA',
      
      // Comma-separated concatenations
      'operations,search': 'operations, search',
      'search,sorting': 'search, sorting',
      'sorting,and': 'sorting, and',
      'sorting,andvalidation': 'sorting, and validation',
      'andvalidationfeatures': 'and validation features',
      'features,enabling': 'features, enabling',
      'categories,improving': 'categories, improving',
      'alerts,improving': 'alerts, improving',
      'reminders,andemergency': 'reminders, and emergency',
      'emergencyalerts,improving': 'emergency alerts, improving'
    };
    
    // Unicode character replacements
    this.unicodeReplacements = {
      '\u2022': '•',     // Bullet points
      '\u2013': '-',     // En dash
      '\u2014': '-',     // Em dash
      '\u2019': "'",     // Right single quotation
      '\u201c': '"',     // Left double quotation
      '\u201d': '"',     // Right double quotation
      '\u2026': '...',   // Ellipsis
      '\u00a0': ' ',     // Non-breaking space
      '\u00b7': '•',     // Middle dot
      '\u25cf': '•',     // Black circle
      '\u25cb': '○',     // White circle
      '\u2192': '→',     // Right arrow
      '\u2190': '←',     // Left arrow
    };
  }

  /**
   * Main cleaning method - processes raw resume text
   * @param {string} rawText - Raw text from PDF extraction
   * @returns {object} - Cleaned text with metadata
   */
  cleanResumeText(rawText) {
    console.log('🧹 Starting comprehensive text cleaning...');
    console.log('🧹 Original text length:', rawText.length);
    
    let cleanedText = rawText;
    const cleaningSteps = [];
    
    // Step 1: Basic normalization
    console.log('🧹 Step 1: Basic normalization');
    cleanedText = this.normalizeBasicCharacters(cleanedText);
    cleaningSteps.push('Basic character normalization');
    
    // Step 2: Fix concatenated words
    console.log('🧹 Step 2: Fix concatenated words');
    const concatenationResult = this.fixConcatenatedWords(cleanedText);
    cleanedText = concatenationResult.text;
    cleaningSteps.push(`Fixed ${concatenationResult.fixesApplied} concatenated words`);
    
    // Step 2.5: Fix comma-separated concatenations
    console.log('🧹 Step 2.5: Fix comma-separated concatenations');
    cleanedText = this.fixCommaSeparatedConcatenations(cleanedText);
    cleaningSteps.push('Fixed comma-separated concatenations');
    
    // Step 2.7: Apply generalizable patterns (disabled - too aggressive for now)
    // console.log('🧹 Step 2.7: Apply generalizable patterns');
    // cleanedText = this.generalizableCleaner.cleanAnyResumeFormat(cleanedText);
    // cleaningSteps.push('Applied generalizable cleaning patterns');
    
    // Step 3: Normalize spacing and line breaks
    console.log('🧹 Step 3: Normalize spacing');
    cleanedText = this.normalizeSpacing(cleanedText);
    cleaningSteps.push('Normalized spacing and line breaks');
    
    // Step 4: Fix section headers
    console.log('🧹 Step 4: Fix section headers');
    cleanedText = this.normalizeSectionHeaders(cleanedText);
    cleaningSteps.push('Normalized section headers');
    
    // Step 5: Clean contact information
    console.log('🧹 Step 5: Clean contact information');
    cleanedText = this.normalizeContactInfo(cleanedText);
    cleaningSteps.push('Normalized contact information');
    
    // Step 6: Fix date formats
    console.log('🧹 Step 6: Fix date formats');
    cleanedText = this.normalizeDateFormats(cleanedText);
    cleaningSteps.push('Normalized date formats');
    
    // Step 7: Remove artifacts and noise
    console.log('🧹 Step 7: Remove artifacts');
    cleanedText = this.removeArtifacts(cleanedText);
    cleaningSteps.push('Removed PDF artifacts and noise');
    
    // Step 8: Fix technology names that got broken
    console.log('🧹 Step 8: Fix technology names');
    cleanedText = this.fixTechnologyNames(cleanedText);
    cleaningSteps.push('Fixed technology names');
    
    // Step 9: Final cleanup
    console.log('🧹 Step 9: Final cleanup');
    cleanedText = this.finalCleanup(cleanedText);
    cleaningSteps.push('Final text cleanup');
    
    const result = {
      originalText: rawText,
      cleanedText: cleanedText,
      metadata: {
        originalLength: rawText.length,
        cleanedLength: cleanedText.length,
        reductionPercentage: ((rawText.length - cleanedText.length) / rawText.length * 100).toFixed(1),
        cleaningSteps: cleaningSteps,
        processedAt: new Date().toISOString()
      }
    };
    
    console.log('🧹 Text cleaning completed');
    console.log('🧹 Length change:', rawText.length, '→', cleanedText.length);
    console.log('🧹 Reduction:', result.metadata.reductionPercentage + '%');
    
    return result;
  }

  /**
   * Step 1: Normalize basic characters and encoding issues
   */
  normalizeBasicCharacters(text) {
    let normalized = text;
    
    // Replace Unicode characters
    for (const [unicode, replacement] of Object.entries(this.unicodeReplacements)) {
      normalized = normalized.replace(new RegExp(unicode, 'g'), replacement);
    }
    
    // Normalize line endings
    normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // Fix encoding issues
    normalized = normalized
      .replace(/â€™/g, "'")     // Smart apostrophe encoding issue
      .replace(/â€œ/g, '"')     // Smart quote encoding issue
      .replace(/â€/g, '"')      // Smart quote encoding issue
      .replace(/â€¢/g, '•')     // Bullet point encoding issue
      .replace(/Â/g, '')        // Non-breaking space encoding issue
      .replace(/â/g, '')        // General encoding artifact
      .replace(/€/g, '')        // Euro symbol artifacts
      .replace(/™/g, '')        // Trademark symbol artifacts
      .replace(/®/g, '')        // Registered symbol artifacts
      .replace(/©/g, '');       // Copyright symbol artifacts
    
    return normalized;
  }

  /**
   * Step 2: Fix concatenated words using the comprehensive dictionary
   */
  fixConcatenatedWords(text) {
    let fixedText = text;
    let fixesApplied = 0;
    
    // Apply dictionary fixes
    for (const [concatenated, fixed] of Object.entries(this.concatenatedFixes)) {
      const regex = new RegExp(concatenated, 'g');
      const matches = fixedText.match(regex);
      if (matches) {
        fixedText = fixedText.replace(regex, fixed);
        fixesApplied += matches.length;
      }
    }
    
    // Smart CamelCase splitting (but preserve common abbreviations)
    const preservePatterns = [
      'iOS', 'API', 'UI', 'UX', 'HTML', 'CSS', 'SQL', 'XML', 'JSON', 'HTTP', 'HTTPS',
      'AWS', 'GCP', 'PhD', 'MBA', 'BSc', 'MSc', 'USA', 'UK', 'EU', 'AI', 'ML', 'NLP',
      'IT', 'HR', 'PR', 'QA', 'QC', 'CEO', 'CTO', 'CIO', 'VP', 'PM', 'BA', 'MA'
    ];
    
    // Create a pattern that excludes preserved abbreviations
    const preserveRegex = new RegExp(`\\b(${preservePatterns.join('|')})\\b`, 'g');
    const preservedTokens = [];
    let tokenIndex = 0;
    
    // Temporarily replace preserved patterns
    fixedText = fixedText.replace(preserveRegex, (match) => {
      const token = `__PRESERVE_${tokenIndex}__`;
      preservedTokens[tokenIndex] = match;
      tokenIndex++;
      return token;
    });
    
    // Apply CamelCase splitting (more comprehensive)
    fixedText = fixedText
      // Split camelCase words
      .replace(/([a-z])([A-Z])(?![A-Z])/g, '$1 $2')
      // Split words that are concatenated without camelCase (common in PDF extraction)
      .replace(/([a-z])([a-z]{2,}[A-Z])/g, '$1 $2')
      // Split lowercase word followed by uppercase word
      .replace(/([a-z]{3,})([A-Z][a-z]{2,})/g, '$1 $2')
      // Additional aggressive splitting for common patterns
      .replace(/([a-z]{4,})([a-z]{4,})/g, (match, p1, p2) => {
        // Only split if it looks like two real words concatenated
        const commonWords = [
          // Basic words
          'based', 'system', 'with', 'and', 'for', 'the', 'that', 'like', 'using', 'time', 'grade', 'manual', 'computation', 'process', 'platform', 'inventory', 'features', 'medication', 'reminders', 'usability', 'enhancing', 'elderly', 'impaired', 'users', 'efficient', 'tracking', 'across', 'different', 'categories', 'automated', 'reduced', 'eliminated', 'human', 'errors', 'encoding',
          // Action words
          'developed', 'designed', 'built', 'created', 'implemented', 'automated', 'improved', 'enhanced', 'enabled', 'reduced', 'eliminated', 'calculated', 'analyzed', 'matched', 'applied', 'processing',
          // Description words
          'platform', 'application', 'interface', 'mobile', 'accessible', 'relevant', 'accuracy', 'efficiency', 'employment', 'operations', 'validation', 'sorting', 'search', 'alerts', 'emergency', 'interfaces', 'figma',
          // Technical terms
          'language', 'natural', 'similarity', 'cosine', 'seekers', 'posts', 'jobseekers', 'jobposts'
        ];
        
        // Check if p1 ends with a common word or p2 starts with one
        const p1EndsWithCommon = commonWords.some(word => p1.endsWith(word));
        const p2StartsWithCommon = commonWords.some(word => p2.startsWith(word));
        
        if (p1EndsWithCommon || p2StartsWithCommon) {
          return p1 + ' ' + p2;
        }
        return match;
      });
    
    // Restore preserved patterns
    for (let i = 0; i < preservedTokens.length; i++) {
      fixedText = fixedText.replace(`__PRESERVE_${i}__`, preservedTokens[i]);
    }
    
    return { text: fixedText, fixesApplied };
  }

  /**
   * Step 2.5: Fix comma-separated concatenations and parenthesis spacing
   */
  fixCommaSeparatedConcatenations(text) {
    return text
      // Fix patterns like "word1,word2" -> "word1, word2" (case insensitive)
      .replace(/([a-zA-Z])(\,)([a-zA-Z])/g, '$1$2 $3')
      // Fix patterns like "word1,andword2" -> "word1, and word2"
      .replace(/([a-zA-Z])(\,)(and[a-zA-Z])/g, '$1$2 $3')
      // Fix patterns like "word1,word2,andword3" -> "word1, word2, and word3"
      .replace(/([a-zA-Z])(\,)([a-zA-Z]+)(\,)(and[a-zA-Z])/g, '$1$2 $3$4 $5')
      
      // Fix parenthesis spacing issues
      // Add space before opening parenthesis: "word(" -> "word ("
      .replace(/([a-zA-Z])(\()/g, '$1 $2')
      // Add space after closing parenthesis if followed by letter: ")word" -> ") word"
      .replace(/(\))([a-zA-Z])/g, '$1 $2')
      
      // Fix specific patterns we've seen
      .replace(/operations,search,sorting,and/g, 'operations, search, sorting, and')
      .replace(/search,sorting,and/g, 'search, sorting, and')
      .replace(/sorting,and/g, 'sorting, and')
      
      // Fix colon spacing issues: "word:" -> "word: " (but not URLs)
      .replace(/([a-zA-Z])(:)([a-zA-Z])/g, '$1$2 $3')
      
      // Normalize multiple spaces that might have been introduced
      .replace(/\s+/g, ' ');
  }

  /**
   * Step 3: Normalize spacing and line breaks
   * Enhanced to handle PDF extraction that comes as one long line
   */
  normalizeSpacing(text) {
    let normalized = text;
    
    // First, check if we have a single very long line (PDF extraction issue)
    const lines = text.split('\n');
    const hasVeryLongLine = lines.some(line => line.length > 1000);
    
    if (hasVeryLongLine || lines.length === 1) {
      console.log('🧹 Detected single-line PDF extraction, breaking into proper sections...');
      normalized = this.breakUpSingleLineText(text);
      console.log('🧹 After breaking: lines =', normalized.split('\n').length);
    }
    
    return normalized
      // Normalize multiple spaces to single space (but preserve line breaks)
      .replace(/[ \t]+/g, ' ')
      // Clean up line breaks (but don't collapse intentional ones)
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n')
      // Remove excessive line breaks (more than 2)
      .replace(/\n{3,}/g, '\n\n')
      // Trim each line but preserve the line structure (don't filter empty lines yet)
      .split('\n').map(line => line.trim()).join('\n')
      .trim();
  }

  /**
   * Break up single-line PDF extraction into proper sections
   */
  breakUpSingleLineText(text) {
    let broken = text;
    
    // Add line breaks before major section headers
    const sectionHeaders = [
      'OBJECTIVE', 'SUMMARY', 'PROFILE',
      'EDUCATION', 'EDUCA TION', // Handle broken words
      'WORK EXPERIENCE', 'EXPERIENCE', 'EMPLOYMENT',
      'TECHNICAL SKILLS', 'SKILLS', 'COMPETENCIES',
      'PROJECTS', 'PROJECT',
      'CERTIFICATIONS', 'CERTIFICATES',
      'ACHIEVEMENTS', 'AWARDS',
      'PERSONAL SKILLS', 'SOFT SKILLS',
      'LANGUAGES', 'VOLUNTEER', 'REFERENCES'
    ];
    
    // Add line breaks before section headers
    sectionHeaders.forEach(header => {
      const regex = new RegExp(`\\b${header}\\b`, 'gi');
      broken = broken.replace(regex, `\n${header}`);
    });
    
    // Fix broken words like "EDUCA TION" -> "EDUCATION"
    broken = broken.replace(/EDUCA\s+TION/g, '\nEDUCATION');
    
    // Fix split section headers that got broken across lines
    broken = broken.replace(/\bTECHNICAL\s+SKILLS\b/g, '\nTECHNICAL SKILLS');
    broken = broken.replace(/\bWORK\s+EXPERIENCE\b/g, '\nWORK EXPERIENCE');
    broken = broken.replace(/\bPERSONAL\s+SKILLS\b/g, '\nPERSONAL SKILLS');
    
    // Add line breaks before dates (likely to be new entries)
    broken = broken.replace(/\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})\s*-/g, '\n$1 $2 -');
    
    // Add line breaks before years that look like date ranges
    broken = broken.replace(/\b(\d{4})\s*-\s*(\d{4}|Present|Current)\b/g, '\n$1 - $2');
    
    // Add line breaks before technology lists (common pattern)
    broken = broken.replace(/\bTechnologies:\s*/g, '\nTechnologies: ');
    
    // Add line breaks before bullet points that got concatenated
    broken = broken.replace(/([a-z])\s+•\s+/g, '$1\n• ');
    
    // Add line breaks before job titles with companies (Pattern: "Title - Company")
    broken = broken.replace(/\b([A-Z][A-Za-z\s]+(?:Manager|Developer|Designer|Analyst|Engineer|Intern|Assistant|Specialist|Coordinator))\s*-\s*([A-Z][A-Za-z\s&]+(?:LLC|Inc|Corp|Company|Solutions))/g, '\n$1 - $2');
    
    // Add line breaks before degree programs
    broken = broken.replace(/\b(Bachelor|Master|Ph\.?D|Associate|Diploma)\s+of\s+/gi, '\n$1 of ');
    
    // Add line breaks before university/school names (more specific to avoid breaking mid-sentence)
    broken = broken.replace(/\b([A-Z][A-Za-z\s]+(?:University|College|School|Institute|Academy|Lipa|Polytechnic))\s*,?\s*([A-Z][A-Za-z\s]*)\s*(September|August|January|February|March|April|May|June|July|October|November|December)/g, '\n$1, $2\n$3');
    
    // Add line breaks before common school names that might be missed
    broken = broken.replace(/\b(De La Salle|Polytechnic University|Science High School|Mapa University)\b/g, '\n$1');
    
    // Add line breaks before GPA mentions (usually end of education entries)
    broken = broken.replace(/\b(GPA|General Average|Weighted Average):\s*/g, '\n$1: ');
    
    // Clean up multiple consecutive line breaks
    broken = broken.replace(/\n{3,}/g, '\n\n');
    
    // Remove line breaks at the very beginning
    broken = broken.replace(/^\n+/, '');
    
    console.log('🧹 Single-line text broken into', broken.split('\n').length, 'lines');
    
    return broken;
  }

  /**
   * Step 4: Normalize section headers
   */
  normalizeSectionHeaders(text) {
    const sectionHeaders = [
      'EDUCATION', 'EXPERIENCE', 'SKILLS', 'PROJECTS', 'CERTIFICATIONS',
      'OBJECTIVE', 'SUMMARY', 'PROFILE', 'CONTACT', 'PERSONAL INFORMATION',
      'WORK EXPERIENCE', 'PROFESSIONAL EXPERIENCE', 'TECHNICAL SKILLS',
      'CORE COMPETENCIES', 'ACHIEVEMENTS', 'AWARDS', 'LANGUAGES',
      'VOLUNTEER EXPERIENCE', 'REFERENCES', 'PUBLICATIONS', 'INTERESTS'
    ];
    
    let normalized = text;
    
    // Ensure section headers are on their own lines with proper spacing
    for (const header of sectionHeaders) {
      // Escape special regex characters in header
      const escapedHeader = header.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      
      // Match various formats of the header
      const patterns = [
        {
          regex: new RegExp(`([a-z])\\s*(${escapedHeader})\\s*([a-z])`, 'gi'),
          replacement: (match, p1, p2, p3) => `${p1}\n\n${(p2 || '').toUpperCase()}\n${p3}`
        },
        {
          regex: new RegExp(`^\\s*(${escapedHeader})\\s*:?\\s*$`, 'gim'),
          replacement: (match, p1) => `\n${(p1 || '').toUpperCase()}\n`
        },
        {
          regex: new RegExp(`([a-z])\\s*(${escapedHeader})\\s*:?\\s*$`, 'gim'),
          replacement: (match, p1, p2) => `${p1}\n\n${(p2 || '').toUpperCase()}`
        }
      ];
      
      patterns.forEach(pattern => {
        normalized = normalized.replace(pattern.regex, pattern.replacement);
      });
    }
    
    return normalized;
  }

  /**
   * Step 5: Normalize contact information
   */
  normalizeContactInfo(text) {
    return text
      // Fix email spacing issues - remove extra spaces before @
      .replace(/([a-zA-Z0-9])\s+(@[a-zA-Z0-9])/g, '$1$2')
      // Normalize LinkedIn/GitHub URLs
      .replace(/(linkedin\.com\/in\/|github\.com\/)([^\s|]+)/gi, '$1$2')
      // Clean up pipe-separated contact info (but preserve existing spacing)
      .replace(/\|\s*/g, ' | ')
      .replace(/\s*\|/g, ' |');
  }

  /**
   * Step 6: Normalize date formats
   */
  normalizeDateFormats(text) {
    return text
      // Normalize date ranges
      .replace(/(\d{4})\s*[-–—]\s*(\d{4}|Present|Current)/gi, '$1 - $2')
      // Normalize month-year formats
      .replace(/(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s*(\d{4})/gi, '$1 $2')
      // Add space before dates that are concatenated
      .replace(/([a-zA-Z])(\d{4}\s*-\s*(?:\d{4}|Present|Current))/gi, '$1 $2');
  }

  /**
   * Step 7: Remove PDF artifacts and noise
   */
  removeArtifacts(text) {
    return text
      // Remove page numbers
      .replace(/^\s*Page\s+\d+.*$/gim, '')
      .replace(/^\s*\d+\s*$/gm, '')
      // Remove common PDF artifacts
      .replace(/^\s*[|\-_=]{3,}\s*$/gm, '')
      // Remove excessive punctuation
      .replace(/[.]{3,}/g, '...')
      .replace(/[-]{3,}/g, '---')
      // Remove standalone special characters
      .replace(/^\s*[•\-\*]\s*$/gm, '')
      // Remove empty parentheses and brackets
      .replace(/\(\s*\)/g, '')
      .replace(/\[\s*\]/g, '')
      .replace(/\{\s*\}/g, '');
  }

  /**
   * Step 8: Fix technology names that got broken by spacing
   */
  fixTechnologyNames(text) {
    const technologyFixes = {
      'Mo n goDB': 'MongoDB',
      'Mon goDB': 'MongoDB',
      'Mongo DB': 'MongoDB',
      'Po w erBI': 'PowerBI',
      'Power BI': 'PowerBI',
      'Pow erBI': 'PowerBI',
      'Java Script': 'JavaScript',
      'Type Script': 'TypeScript',
      'Git Hub': 'GitHub',
      'Fire base': 'Firebase',
      'Node .js': 'Node.js',
      'React Native': 'React Native', // Keep this one as is
      'HTML CSS': 'HTML, CSS',
      'CSS React': 'CSS, React',
      'Ui Path': 'UiPath',
      'Ui Pa th': 'UiPath',
      'UiPa th': 'UiPath'
    };
    
    let fixed = text;
    for (const [broken, correct] of Object.entries(technologyFixes)) {
      fixed = fixed.replace(new RegExp(broken, 'g'), correct);
    }
    
    return fixed;
  }

  /**
   * Step 9: Final cleanup
   */
  finalCleanup(text) {
    return text
      // Final spacing normalization (preserve line breaks!)
      .replace(/[ \t]+/g, ' ')  // Only collapse spaces and tabs, NOT line breaks
      .replace(/\n\s*\n\s*\n/g, '\n\n')  // Remove excessive line breaks
      // Remove leading/trailing whitespace from each line
      .split('\n').map(line => line.trim()).join('\n')
      // Remove empty lines at start and end
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      .trim();
  }

  /**
   * Quick clean method for lighter processing
   */
  quickClean(text) {
    console.log('🧹 Quick text cleaning...');
    
    let cleaned = text;
    
    // Basic normalization only
    cleaned = this.normalizeBasicCharacters(cleaned);
    cleaned = this.normalizeSpacing(cleaned);
    
    return {
      originalText: text,
      cleanedText: cleaned,
      metadata: {
        originalLength: text.length,
        cleanedLength: cleaned.length,
        cleaningType: 'quick',
        processedAt: new Date().toISOString()
      }
    };
  }

  /**
   * Get cleaning statistics
   */
  getCleaningStats(originalText, cleanedText) {
    const originalLines = originalText.split('\n').length;
    const cleanedLines = cleanedText.split('\n').length;
    const originalWords = originalText.split(/\s+/).length;
    const cleanedWords = cleanedText.split(/\s+/).length;
    
    return {
      characters: {
        original: originalText.length,
        cleaned: cleanedText.length,
        reduction: originalText.length - cleanedText.length,
        reductionPercentage: ((originalText.length - cleanedText.length) / originalText.length * 100).toFixed(1)
      },
      lines: {
        original: originalLines,
        cleaned: cleanedLines,
        reduction: originalLines - cleanedLines
      },
      words: {
        original: originalWords,
        cleaned: cleanedWords,
        reduction: originalWords - cleanedWords
      }
    };
  }
}

module.exports = ResumeTextCleaner;
