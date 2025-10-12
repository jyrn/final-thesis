/**
 * ML-Based Resume Format Classifier
 * Uses heuristics and pattern recognition to classify resume formats
 * Future: Can be enhanced with actual ML models (TensorFlow.js, brain.js)
 */

class ResumeFormatClassifier {
  constructor() {
    this.features = {};
    this.classification = null;
  }

  /**
   * Classify resume format using ML-like feature extraction
   * @param {string} text - Raw resume text
   * @returns {object} - Classification result with confidence
   */
  classifyFormat(text) {
    console.log('🤖 ML Classifier: Extracting features...');
    console.log('🤖 ML Classifier: Text sample for analysis:', text.substring(0, 300));
    
    const features = this.extractFeatures(text);
    console.log('🤖 ML Classifier: Features extracted:', features);
    
    // Store features
    this.features = features;
    
    // Classify based on features
    this.classification = this.classifyByFeatures(this.features, text);
    
    console.log('🤖 ML Classifier: Classification result:', this.classification);
    
    return this.classification;
  }

  /**
   * Extract features from resume text
   * @param {string} text - Resume text
   * @returns {object} - Feature vector
   */
  extractFeatures(text) {
    const lines = text.split('\n').filter(l => l.trim().length > 0);
    const totalChars = text.length;
    
    return {
      // Basic metrics
      lineCount: lines.length,
      charCount: totalChars,
      avgLineLength: totalChars / lines.length,
      
      // Structural features
      hasPipeSeparators: (text.match(/\|/g) || []).length >= 3,
      pipeSeparatorCount: (text.match(/\|/g) || []).length,
      hasBulletPoints: /[•\-\*]\s+[A-Z]/g.test(text),
      bulletPointCount: (text.match(/^[\s]*[•\-\*]\s+/gm) || []).length,
      hasNumberedLists: /^\s*\d+\.\s+/gm.test(text),
      
      // Column detection (heuristic)
      hasMultipleColumns: this.detectMultipleColumns(text),
      
      // Section header style
      sectionHeaderStyle: this.detectSectionHeaderStyle(text),
      
      // Content density
      whitespaceRatio: (text.match(/\s/g) || []).length / totalChars,
      
      // Special characters
      hasSpecialFormatting: /[│║╔╗╚╝═─┌┐└┘├┤┬┴┼]/g.test(text),
      
      // Date patterns
      datePatternCount: (text.match(/\d{4}\s*-\s*(?:\d{4}|Present|Current)/gi) || []).length,
      
      // Email and contact info
      hasEmail: /@[a-z0-9.-]+\.[a-z]{2,}/i.test(text),
      hasPhone: /\+?\d{1,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}/i.test(text),
      
      // Section presence
      hasEducationSection: /\b(EDUCATION|Educational\s+Background)\b/i.test(text),
      hasExperienceSection: /\b(EXPERIENCE|Work\s+Experience)\b/i.test(text),
      hasProjectsSection: /\b(PROJECTS?|Personal\s+Projects?)\b/i.test(text),
      hasSkillsSection: /\b(SKILLS?|Technical\s+Skills?)\b/i.test(text),
      hasCertificationsSection: /\b(CERTIFICATIONS?|Certificates?)\b/i.test(text),
      
      // Text case patterns
      hasAllCapsHeaders: /^[A-Z\s]{10,}$/m.test(text),
      hasMixedCaseHeaders: /^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\s*$/m.test(text)
    };
  }

  /**
   * Detect if resume has multiple columns (heuristic)
   * @param {string} text - Resume text
   * @returns {boolean}
   */
  detectMultipleColumns(text) {
    const lines = text.split('\n');
    let suspiciouslyShortLines = 0;
    
    for (const line of lines) {
      // If many lines are very short but not empty, might be multi-column
      if (line.trim().length > 0 && line.trim().length < 30) {
        suspiciouslyShortLines++;
      }
    }
    
    // If more than 30% of lines are suspiciously short, likely multi-column
    return suspiciouslyShortLines / lines.length > 0.3;
  }

  /**
   * Detect section header style
   * @param {string} text - Resume text
   * @returns {string} - Header style (ALL_CAPS, Title_Case, mixed)
   */
  detectSectionHeaderStyle(text) {
    const allCapsCount = (text.match(/^[A-Z\s]{5,}$/gm) || []).length;
    const titleCaseCount = (text.match(/^[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*$/gm) || []).length;
    
    if (allCapsCount > titleCaseCount) return 'ALL_CAPS';
    if (titleCaseCount > allCapsCount) return 'Title_Case';
    return 'mixed';
  }

  /**
   * Classify resume format based on extracted features
   * @param {object} features - Feature vector
   * @returns {object} - Classification result
   */
  classifyByFeatures(features, text = '') {
    const classifications = [];
    
    // Classification 1: Pipe-separated format (very specific criteria)
    if (features.hasPipeSeparators && features.avgLineLength > 1500 && features.lineCount < 5) {
      return {
        format: 'pipe-separated',
        confidence: 0.9,
        reasoning: 'High pipe separator count with very long lines indicates structured format',
        characteristics: {
          layout: 'single-column',
          separator: 'pipe',
          sectionStyle: 'inline'
        },
        alternativeFormats: []
      };
    }
    
    // Classification 2: Standard Bullet-Point Format (like Shayla's resume)
    if (features.hasBulletPoints && features.bulletPointCount >= 3) {
      const confidence = features.hasMultipleColumns ? 0.7 : 0.85;
      classifications.push({
        format: 'standard-bullets',
        confidence: confidence,
        reasoning: 'Multiple bullet points indicate structured resume format',
        characteristics: {
          layout: features.hasMultipleColumns ? 'two-column' : 'single-column',
          separator: 'bullets',
          sectionStyle: 'block'
        }
      });
    }
    
    // Classification 3: Contact-Heavy Format (like Jiro's resume with icons)
    const hasContactSymbols = text.match(/[📧📱🌐💼]/g) || text.match(/[•▪▫]/g);
    if (hasContactSymbols && features.lineCount > 15) {
      classifications.push({
        format: 'contact-heavy',
        confidence: 0.8,
        reasoning: 'Contact symbols and structured layout detected',
        characteristics: {
          layout: 'single-column',
          separator: 'symbols',
          sectionStyle: 'mixed'
        }
      });
    }
    
    // Classification 4: Paragraph-Based Format
    if (!features.hasBulletPoints && !features.hasPipeSeparators && 
        features.avgLineLength > 100 && features.lineCount > 20) {
      classifications.push({
        format: 'paragraph',
        confidence: 0.75,
        reasoning: 'Long paragraphs without bullets suggest paragraph format',
        characteristics: {
          layout: 'single-column',
          separator: 'none',
          sectionStyle: 'paragraph'
        }
      });
    }
    
    // Classification 5: Infographic/Creative Format
    if (features.hasSpecialFormatting || features.hasMultipleColumns) {
      classifications.push({
        format: 'infographic',
        confidence: 0.65,
        reasoning: 'Special formatting or multiple columns detected',
        characteristics: {
          layout: 'multi-column',
          separator: 'visual',
          sectionStyle: 'creative'
        }
      });
    }
    
    // Classification 5: Minimal/Simple Format
    if (features.lineCount < 50 && !features.hasBulletPoints && 
        !features.hasPipeSeparators && !features.hasSpecialFormatting) {
      classifications.push({
        format: 'minimal',
        confidence: 0.7,
        reasoning: 'Short, simple structure indicates minimal format',
        characteristics: {
          layout: 'single-column',
          separator: 'none',
          sectionStyle: 'simple'
        }
      });
    }
    
    // Classification 6: Academic CV Format
    if (features.datePatternCount >= 5 && features.lineCount > 100) {
      classifications.push({
        format: 'academic-cv',
        confidence: 0.8,
        reasoning: 'Many date patterns and long document suggest academic CV',
        characteristics: {
          layout: 'single-column',
          separator: 'dates',
          sectionStyle: 'detailed'
        }
      });
    }
    
    // Sort by confidence and return best match
    classifications.sort((a, b) => b.confidence - a.confidence);
    
    if (classifications.length === 0) {
      // Default fallback
      return {
        format: 'standard-bullets',
        confidence: 0.5,
        reasoning: 'No strong indicators, using default format',
        characteristics: {
          layout: 'single-column',
          separator: 'mixed',
          sectionStyle: 'standard'
        },
        alternativeFormats: []
      };
    }
    
    return {
      ...classifications[0],
      alternativeFormats: classifications.slice(1, 3) // Include top 2 alternatives
    };
  }

  /**
   * Get recommended parsers for detected format
   * @returns {object} - Parser recommendations
   */
  getParserRecommendations() {
    if (!this.classification) {
      throw new Error('Must classify resume before getting parser recommendations');
    }
    
    const format = this.classification.format;
    
    const parserMap = {
      'pipe-separated': {
        personalInfo: ['PipePersonalInfoParser', 'StandardPersonalInfoParser'],
        education: ['PipeEducationParser', 'StandardEducationParser'],
        experience: ['PipeExperienceParser'],
        skills: ['CommaSkillsParser', 'KeywordSkillsParser'],
        projects: ['PipeProjectsParser'],
        certifications: ['PipeCertificationsParser']
      },
      'standard-bullets': {
        personalInfo: ['StandardPersonalInfoParser'],
        education: ['StandardEducationParser', 'BulletEducationParser'],
        experience: ['BulletExperienceParser'],
        skills: ['KeywordSkillsParser', 'BulletSkillsParser'],
        projects: ['BulletProjectsParser', 'ParagraphProjectsParser'],
        certifications: ['StandardCertificationsParser']
      },
      'paragraph-based': {
        personalInfo: ['StandardPersonalInfoParser'],
        education: ['ParagraphEducationParser', 'StandardEducationParser'],
        experience: ['ParagraphExperienceParser'],
        skills: ['KeywordSkillsParser'],
        projects: ['ParagraphProjectsParser'],
        certifications: ['ParagraphCertificationsParser']
      },
      'infographic': {
        personalInfo: ['VisualPersonalInfoParser', 'StandardPersonalInfoParser'],
        education: ['CompactEducationParser'],
        experience: ['CompactExperienceParser'],
        skills: ['VisualSkillsParser', 'KeywordSkillsParser'],
        projects: ['CompactProjectsParser'],
        certifications: ['CompactCertificationsParser']
      },
      'minimal': {
        personalInfo: ['StandardPersonalInfoParser'],
        education: ['StandardEducationParser'],
        experience: ['StandardExperienceParser'],
        skills: ['KeywordSkillsParser'],
        projects: ['StandardProjectsParser'],
        certifications: ['StandardCertificationsParser']
      },
      'academic-cv': {
        personalInfo: ['AcademicPersonalInfoParser'],
        education: ['DetailedEducationParser'],
        experience: ['AcademicExperienceParser'],
        skills: ['KeywordSkillsParser'],
        projects: ['AcademicProjectsParser'],
        certifications: ['AcademicCertificationsParser']
      }
    };
    
    return parserMap[format] || parserMap['standard-bullets'];
  }
}

module.exports = ResumeFormatClassifier;
