/**
 * ML-Powered Resume Parser
 * Orchestrates ML format detection and modular section parsing
 */

const ResumeFormatClassifier = require('./ml/ResumeFormatClassifier');
const PersonalInfoParser = require('./parsers/EnhancedPersonalInfoParser');
const EducationParser = require('./parsers/EducationParser');
const ExperienceParser = require('./parsers/ExperienceParser');
const SkillsParser = require('./parsers/SkillsParser');
const ProjectsParser = require('./parsers/ProjectsParser');
const CertificationsParser = require('./parsers/CertificationsParser');
const OptionalSectionsParser = require('./parsers/OptionalSectionsParser');
const ResumeTextCleaner = require('./ResumeTextCleaner');
const parserConfig = require('../config/parserConfig');

class MLResumeParser {
  constructor(config = parserConfig) {
    this.config = config;
    this.classifier = new ResumeFormatClassifier();
    this.textCleaner = new ResumeTextCleaner();
    this.version = '2.1.0'; // Updated version with text cleaning

    // Initialize modular parsers
    this.parsers = {
      personalInfo: new PersonalInfoParser(),
      education: new EducationParser(),
      experience: new ExperienceParser(),
      skills: new SkillsParser(),
      projects: new ProjectsParser(),
      certifications: new CertificationsParser(),
      optionalSections: new OptionalSectionsParser()
    };  }

  /**
   * Main parsing method with ML-based format detection
   * @param {string} text - Raw resume text
   * @returns {object} - Parsed resume data with metadata
   */
  async parse(text) {    const startTime = Date.now();
    
    // Step 0: Clean the text before processing    const cleaningResult = this.textCleaner.cleanResumeText(text);
    const cleanedText = cleaningResult.cleanedText;    // Step 1: ML Format Classification (using cleaned text)    const classification = this.classifier.classifyFormat(cleanedText);
    let format = classification.format;
    const confidence = classification.confidence;
    
    // Improved format detection: Check if this is actually a standard format (using cleaned text)
    if (format === 'pipe-separated') {
      const lines = cleanedText.split('\n').filter(l => l.trim().length > 0);
      const hasProperSections = cleanedText.match(/\b(Education|Projects|Skills|Certifications)\b/gi);
      
      if (lines.length > 10 && hasProperSections) {        format = 'standard';
      }
    }    console.log(' Confidence:', (confidence * 100).toFixed(1) + '%');    // Step 2: Parse each section using modular parsers    const context = {
      format: format, // Use the potentially overridden format
      characteristics: classification.characteristics
    };
    
    const results = {
      personalInfo: {},
      education: [],
      skills: [],
      projects: [],
      certifications: []
    };
    
    const confidenceScores = {};
    
    // Parse Personal Info (using cleaned text)    try {
      const personalResult = this.parsers.personalInfo.parse(cleanedText, context);
      results.personalInfo = personalResult.data;
      confidenceScores.personalInfo = personalResult.confidence;
    } catch (error) {      confidenceScores.personalInfo = 0;
    }
    
    // Parse Education (using cleaned text)    try {
      const educationResult = this.parsers.education.parse(cleanedText, context);
      results.education = educationResult.data;
      confidenceScores.education = educationResult.confidence;
    } catch (error) {      confidenceScores.education = 0;
    }
    
    // Parse Work Experience (using cleaned text)    try {
      const experienceResult = this.parsers.experience.parse(cleanedText, context);
      results.experience = experienceResult.data;
      confidenceScores.experience = experienceResult.confidence;
    } catch (error) {      confidenceScores.experience = 0;
    }
    
    // Parse Skills (using cleaned text)    try {
      const skillsResult = this.parsers.skills.parse(cleanedText, context);
      results.skills = skillsResult.data;
      confidenceScores.skills = skillsResult.confidence;
    } catch (error) {      confidenceScores.skills = 0;
    }
    
    // Parse Projects (using cleaned text)    try {
      const projectsResult = this.parsers.projects.parse(cleanedText, context);
      results.projects = projectsResult.data;
      confidenceScores.projects = projectsResult.confidence;
    } catch (error) {      confidenceScores.projects = 0;
    }
    
    // Parse Certifications (using cleaned text)    try {
      // Use cleaned text for certifications parsing
      const textToUse = cleanedText;
      // Ensure format is passed in context
      const certContext = { ...context, format: format };      const certsResult = this.parsers.certifications.parse(textToUse, certContext);
      results.certifications = certsResult.data;
      confidenceScores.certifications = certsResult.confidence;
    } catch (error) {      confidenceScores.certifications = 0;
    }
    
    // Parse Optional Sections (organizations, awards & achievements combined)    try {
      const optionalResult = this.parsers.optionalSections.parse(cleanedText, context);
      results.organizations = optionalResult.organizations || [];
      results.awards = optionalResult.awards || []; // Awards includes achievements
    } catch (error) {      results.organizations = [];
      results.awards = [];
    }
    
    // Step 3: Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(confidenceScores);
    
    // Step 4: Format results for frontend
    const formattedResults = this.formatResults(results);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);    console.log(' Overall Confidence:', (overallConfidence * 100).toFixed(1) + '%');    return {
      success: true,
      data: formattedResults,
      metadata: {
        classification: classification,
        confidenceScores: confidenceScores,
        overallConfidence: overallConfidence,
        parsingDuration: duration,
        parsedAt: new Date().toISOString(),
        textCleaning: cleaningResult.metadata
      }
    };
  }

  /**
   * Calculate overall confidence score
   */
  calculateOverallConfidence(scores) {
    const weights = {
      personalInfo: 0.3,
      education: 0.2,
      skills: 0.2,
      projects: 0.15,
      certifications: 0.15
    };
    
    let totalScore = 0;
    let totalWeight = 0;
    
    for (const [section, weight] of Object.entries(weights)) {
      if (scores[section] !== undefined) {
        totalScore += scores[section] * weight;
        totalWeight += weight;
      }
    }
    
    return totalWeight > 0 ? totalScore / totalWeight : 0;
  }

  /**
   * Format results for frontend compatibility
   */
  formatResults(results) {
    // Convert projects to optional sections format
    const optionalSections = [];
    
    if (results.projects && results.projects.length > 0) {
      optionalSections.push({
        id: 'projects-ml-' + Date.now(),
        type: 'projects',
        title: 'Projects',
        data: results.projects
      });
    }
    
    if (results.certifications && results.certifications.length > 0) {
      optionalSections.push({
        id: 'certificates-ml-' + Date.now(),
        type: 'certificates',
        title: 'Certificates & Seminars',
        data: results.certifications
      });
    }
    
    if (results.organizations && results.organizations.length > 0) {
      optionalSections.push({
        id: 'organizations-ml-' + Date.now(),
        type: 'organizations',
        title: 'Organizations & Volunteer Experience',
        data: results.organizations
      });
    }
    
    if (results.awards && results.awards.length > 0) {
      optionalSections.push({
        id: 'awards-ml-' + Date.now(),
        type: 'awards',
        title: 'Awards & Achievements',
        data: results.awards
      });
    }
    
    // Helper function to convert date to YYYY-MM format
    const convertToYYYYMM = (dateStr) => {
      if (!dateStr) return '';
      
      // Clean up the date string
      const cleaned = dateStr.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
      
      // If already in YYYY-MM format, return as-is
      if (/^\d{4}-\d{2}$/.test(cleaned)) {
        return cleaned;
      }
      
      // Handle "Present" or "Current"
      if (/^(present|current)$/i.test(cleaned)) {
        return 'present';
      }
      
      // Parse "Month YYYY" format (e.g., "June 2024", "January 2018")
      const monthYearMatch = cleaned.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
      if (monthYearMatch) {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthYearMatch[1].toLowerCase());
        if (monthIndex !== -1) {
          const month = String(monthIndex + 1).padStart(2, '0');
          return `${monthYearMatch[2]}-${month}`;
        }
      }
      
      // If we can't parse it, return the cleaned string
      return cleaned;
    };
    
    // Transform experience data to match frontend format
    const transformedExperience = (results.experience || []).map(exp => {
      const startDate = convertToYYYYMM(exp.startDate);
      const endDate = convertToYYYYMM(exp.endDate);
      
      // Create human-readable duration for display
      const formatDateForDisplay = (yyyymm) => {
        if (!yyyymm) return '';
        if (yyyymm === 'present') return 'Present';
        
        const match = yyyymm.match(/^(\d{4})-(\d{2})$/);
        if (match) {
          const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
          return `${monthNames[parseInt(match[2]) - 1]} ${match[1]}`;
        }
        return yyyymm;
      };
      
      const displayStart = formatDateForDisplay(startDate);
      const displayEnd = formatDateForDisplay(endDate);
      
      return {
        company: exp.company || '',
        position: exp.title || '', // Backend uses 'title', frontend expects 'position'
        duration: displayStart && displayEnd ? `${displayStart} - ${displayEnd}` : '',
        description: exp.description || '',
        location: exp.location || '',
        startDate: startDate, // YYYY-MM format for validation
        endDate: endDate // YYYY-MM format or 'present'
      };
    });
    
    // Transform education data to match frontend format (YYYY-MM dates)
    const transformedEducation = (results.education || []).map(edu => {
      // Convert year-only dates to YYYY-MM format (assume September for start, June for end)
      const convertYearToYYYYMM = (yearStr, isStart = true) => {
        if (!yearStr) return '';
        
        const cleaned = yearStr.replace(/\n/g, ' ').replace(/\s+/g, ' ').trim();
        
        // Handle "Present" or "Current"
        if (/^(present|current)$/i.test(cleaned)) {
          return 'present';
        }
        
        // If already in YYYY-MM format, return as-is
        if (/^\d{4}-\d{2}$/.test(cleaned)) {
          return cleaned;
        }
        
        // If it's just a year (YYYY), add month
        if (/^\d{4}$/.test(cleaned)) {
          // Start dates default to September (09), end dates default to June (06)
          const month = isStart ? '09' : '06';
          return `${cleaned}-${month}`;
        }
        
        // Parse "Month YYYY" format if present
        const monthYearMatch = cleaned.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s+(\d{4})$/i);
        if (monthYearMatch) {
          const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
          const monthIndex = monthNames.findIndex(m => m.toLowerCase() === monthYearMatch[1].toLowerCase());
          if (monthIndex !== -1) {
            const month = String(monthIndex + 1).padStart(2, '0');
            return `${monthYearMatch[2]}-${month}`;
          }
        }
        
        return cleaned;
      };
      
      const startDate = convertYearToYYYYMM(edu.startDate, true);
      const endDate = convertYearToYYYYMM(edu.endDate, false);
      
      return {
        school: edu.school || '',
        degree: edu.degree || '',
        location: edu.location || '',
        startDate: startDate,
        endDate: endDate,
        description: edu.description || '',
        gpa: edu.gpa || ''
      };
    });
    
    return {
      method: 'ml',
      confidence: 0.9,
      personalInfo: results.personalInfo,
      education: transformedEducation,
      experience: transformedExperience,
      skills: results.skills,
      certifications: results.certifications || [],
      projects: results.projects || [],
      optionalSections: optionalSections,
      sectionOrder: [
        { id: 'personal', type: 'personal', title: 'Personal Information' },
        { id: 'education', type: 'education', title: 'Educational Background' },
        { id: 'experience', type: 'experience', title: 'Work Experience' },
        { id: 'skills', type: 'skills', title: 'Skills' },
        { id: 'projects', type: 'projects', title: 'Projects' },
        { id: 'certifications', type: 'certifications', title: 'Certifications' }
      ].concat(
        optionalSections.map(section => ({
          id: section.id,
          type: 'optional',
          title: section.title,
          optionalType: section.type
        }))
      )
    };
  }

  /**
   * Get parser statistics and performance metrics
   */
  getStatistics() {
    return {
      availableParsers: Object.keys(this.parsers),
      classifierVersion: '1.0.0',
      supportedFormats: [
        'pipe-separated',
        'standard-bullets',
        'paragraph-based',
        'infographic',
        'minimal',
        'academic-cv'
      ]
    };
  }
}

module.exports = MLResumeParser;
