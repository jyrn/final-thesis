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
      certifications: new CertificationsParser()
    };

    console.log('🤖 MLResumeParser v2.0.1 initialized with config:', {
      useMLParser: config.parser.useMLParser,
      verboseLogging: config.parser.verboseLogging,
      enabledParsers: Object.keys(this.parsers).filter(k => config.sectionParsers[k]?.enabled),
      version: this.version
    });
  }

  /**
   * Main parsing method with ML-based format detection
   * @param {string} text - Raw resume text
   * @returns {object} - Parsed resume data with metadata
   */
  async parse(text) {
    console.log('🤖 ========================================');
    console.log('🤖 ML RESUME PARSER: Starting v2.1.0');
    console.log('🤖 ========================================');
    console.log('🤖 Original text length:', text.length, 'characters');
    
    const startTime = Date.now();
    
    // Step 0: Clean the text before processing
    console.log('\n🤖 STEP 0: Text Cleaning');
    const cleaningResult = this.textCleaner.cleanResumeText(text);
    const cleanedText = cleaningResult.cleanedText;
    
    console.log('🤖 Text cleaning completed:');
    console.log('🤖   Original length:', cleaningResult.metadata.originalLength);
    console.log('🤖   Cleaned length:', cleaningResult.metadata.cleanedLength);
    console.log('🤖   Reduction:', cleaningResult.metadata.reductionPercentage + '%');
    console.log('🤖   Steps applied:', cleaningResult.metadata.cleaningSteps.length);
    
    // Step 1: ML Format Classification (using cleaned text)
    console.log('\n🤖 STEP 1: ML Format Classification');
    const classification = this.classifier.classifyFormat(cleanedText);
    let format = classification.format;
    const confidence = classification.confidence;
    
    // Improved format detection: Check if this is actually a standard format (using cleaned text)
    if (format === 'pipe-separated') {
      const lines = cleanedText.split('\n').filter(l => l.trim().length > 0);
      const hasProperSections = cleanedText.match(/\b(Education|Projects|Skills|Certifications)\b/gi);
      
      if (lines.length > 10 && hasProperSections) {
        console.log('🤖 Override: Detected standard format with clear sections, not pipe-separated');
        format = 'standard';
      }
    }
    
    console.log('🤖 Detected format:', format);
    console.log('🤖 Confidence:', (confidence * 100).toFixed(1) + '%');
    console.log('🤖 Layout:', classification.characteristics.layout);
    console.log('🤖 Separator:', classification.characteristics.separator);
    
    // Step 2: Parse each section using modular parsers
    console.log('\n🤖 STEP 2: Section Parsing');
    
    const context = {
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
    
    // Parse Personal Info (using cleaned text)
    console.log('\n👤 Parsing Personal Information...');
    try {
      const personalResult = this.parsers.personalInfo.parse(cleanedText, context);
      results.personalInfo = personalResult.data;
      confidenceScores.personalInfo = personalResult.confidence;
    } catch (error) {
      console.error('❌ Personal Info parsing error:', error.message);
      confidenceScores.personalInfo = 0;
    }
    
    // Parse Education (using cleaned text)
    console.log('\n🎓 Parsing Education...');
    try {
      const educationResult = this.parsers.education.parse(cleanedText, context);
      results.education = educationResult.data;
      confidenceScores.education = educationResult.confidence;
    } catch (error) {
      console.error('❌ Education parsing error:', error.message);
      confidenceScores.education = 0;
    }
    
    // Parse Work Experience (using cleaned text)
    console.log('\n💼 Parsing Work Experience...');
    try {
      const experienceResult = this.parsers.experience.parse(cleanedText, context);
      results.experience = experienceResult.data;
      confidenceScores.experience = experienceResult.confidence;
    } catch (error) {
      console.error('❌ Experience parsing error:', error.message);
      confidenceScores.experience = 0;
    }
    
    // Parse Skills (using cleaned text)
    console.log('\n💡 Parsing Skills...');
    try {
      const skillsResult = this.parsers.skills.parse(cleanedText, context);
      results.skills = skillsResult.data;
      confidenceScores.skills = skillsResult.confidence;
    } catch (error) {
      console.error('❌ Skills parsing error:', error.message);
      confidenceScores.skills = 0;
    }
    
    // Parse Projects (using cleaned text)
    console.log('\n🚀 Parsing Projects...');
    try {
      const projectsResult = this.parsers.projects.parse(cleanedText, context);
      results.projects = projectsResult.data;
      confidenceScores.projects = projectsResult.confidence;
    } catch (error) {
      console.error('❌ Projects parsing error:', error.message);
      confidenceScores.projects = 0;
    }
    
    // Parse Certifications (using cleaned text)
    console.log('\n🎓 Parsing Certifications...');
    try {
      // Use cleaned text for certifications parsing
      const textToUse = cleanedText;
      // Ensure format is passed in context
      const certContext = { ...context, format: format };
      console.log('🎓 Passing context to certifications parser:', { format: certContext.format });
      const certsResult = this.parsers.certifications.parse(textToUse, certContext);
      results.certifications = certsResult.data;
      confidenceScores.certifications = certsResult.confidence;
    } catch (error) {
      console.error('❌ Certifications parsing error:', error.message);
      console.error('❌ Error details:', error);
      confidenceScores.certifications = 0;
    }
    
    // Step 3: Calculate overall confidence
    const overallConfidence = this.calculateOverallConfidence(confidenceScores);
    
    // Step 4: Format results for frontend
    const formattedResults = this.formatResults(results);
    
    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);
    
    console.log('\n🤖 ========================================');
    console.log('🤖 ML RESUME PARSER: Complete');
    console.log('🤖 ========================================');
    console.log('🤖 Duration:', duration, 'seconds');
    console.log('🤖 Overall Confidence:', (overallConfidence * 100).toFixed(1) + '%');
    console.log('🤖 Results Summary:');
    console.log('🤖   - Personal Info:', results.personalInfo.firstName, results.personalInfo.lastName);
    console.log('🤖   - Education:', results.education.length, 'entries');
    console.log('🤖   - Skills:', results.skills.length, 'skills');
    console.log('🤖   - Projects:', results.projects.length, 'projects');
    console.log('🤖   - Certifications:', results.certifications.length, 'certifications');
    console.log('🤖 ========================================\n');
    
    return {
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
    
    return {
      method: 'ml',
      confidence: 0.9,
      personalInfo: results.personalInfo,
      education: results.education,
      experience: results.experience || [],
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
