/**
 * Resume Format Detector
 * Detects which format a resume uses and routes to the appropriate parser
 */

class ResumeFormatDetector {
  /**
   * Detect the format of a resume based on its content
   * @param {string} text - Raw text from the resume
   * @returns {string} - Format type: 'pipe-separated', 'standard', 'minimal'
   */
  static detectFormat(text) {    const indicators = {
      hasPipeSeparator: false,
      hasProjectsSection: false,
      hasBulletPoints: false,
      hasDateRanges: false,
      hasEmail: false,
      hasPhone: false,
      structureType: 'unknown'
    };
    
    // Check for pipe separator (|) used in projects/certifications
    const pipeCount = (text.match(/\|/g) || []).length;
    indicators.hasPipeSeparator = pipeCount >= 3; // At least 3 pipes suggests structured format
    
    // Check for projects section
    indicators.hasProjectsSection = /\b(PROJECTS?|Personal\s+Projects?)\b/i.test(text);
    
    // Check for bullet points or list markers
    indicators.hasBulletPoints = /[•\-\*]\s+[A-Z]/g.test(text);
    
    // Check for date ranges
    indicators.hasDateRanges = /\d{4}\s*-\s*(?:\d{4}|Present|Current)/i.test(text);
    
    // Check for contact info
    indicators.hasEmail = /@[a-z0-9.-]+\.[a-z]{2,}/i.test(text);
    indicators.hasPhone = /\+?\d{1,3}[\s\-]?\d{3,4}[\s\-]?\d{3,4}[\s\-]?\d{3,4}/i.test(text);
    
    // Determine format type
    let format = 'standard';
    
    if (indicators.hasPipeSeparator && indicators.hasProjectsSection) {
      format = 'pipe-separated'; // Shayla's format
      indicators.structureType = 'Structured with pipe separators';
    } else if (indicators.hasProjectsSection || indicators.hasBulletPoints) {
      format = 'standard'; // Karl's format - standard resume with sections
      indicators.structureType = 'Standard resume format';
    } else {
      format = 'minimal'; // Very basic resume
      indicators.structureType = 'Minimal format';
    }    return format;
  }
  
  /**
   * Get parser recommendations based on format
   */
  static getParserStrategy(format) {
    const strategies = {
      'pipe-separated': {
        nameExtraction: 'email-based',
        projectsExtraction: 'pipe-pattern',
        skillsExtraction: 'comma-separated',
        certificatesExtraction: 'pipe-pattern'
      },
      'standard': {
        nameExtraction: 'top-of-resume',
        projectsExtraction: 'section-based',
        skillsExtraction: 'keyword-matching',
        certificatesExtraction: 'date-pattern'
      },
      'minimal': {
        nameExtraction: 'top-of-resume',
        projectsExtraction: 'none',
        skillsExtraction: 'keyword-matching',
        certificatesExtraction: 'none'
      }
    };
    
    return strategies[format] || strategies['standard'];
  }
}

module.exports = ResumeFormatDetector;
