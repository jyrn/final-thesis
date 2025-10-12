/**
 * Base Parser Class
 * All section parsers inherit from this base class
 */

class BaseParser {
  constructor() {
    this.confidence = 0;
    this.extractedData = null;
  }

  /**
   * Parse method to be implemented by child classes
   * @param {string} text - Text to parse
   * @param {object} context - Additional context (format, sections, etc.)
   * @returns {object} - Parsed data with confidence score
   */
  parse(text, context = {}) {
    throw new Error('Parse method must be implemented by child class');
  }

  /**
   * Validate parsed data
   * @param {object} data - Data to validate
   * @returns {object} - Validation result with issues
   */
  validate(data) {
    return {
      isValid: true,
      issues: [],
      warnings: []
    };
  }

  /**
   * Clean and normalize text
   * @param {string} text - Text to clean
   * @returns {string} - Cleaned text
   */
  cleanText(text) {
    if (!text) return '';
    
    return text
      .replace(/\s+/g, ' ') // Normalize whitespace
      .replace(/\r\n/g, '\n') // Normalize line endings
      .trim();
  }

  /**
   * Extract section from text using multiple patterns
   * Enhanced for cleaned text with proper formatting
   * @param {string} text - Full text (should be cleaned)
   * @param {array} sectionNames - Possible section names
   * @param {array} endMarkers - Possible end markers
   * @returns {string} - Extracted section text
   */
  extractSection(text, sectionNames, endMarkers = []) {
    // Try multiple detection strategies with cleaned text
    
    // Strategy 1: Look for section headers with colons (cleaned text should have proper spacing)
    for (const sectionName of sectionNames) {
      const colonPattern = new RegExp(
        `^\\s*[★☆✨🎓💡🚀🎨🛠️]*\\s*(${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*[★☆✨🎓💡🚀🎨🛠️]*\\s*:\\s*$`,
        'im'
      );
      const colonMatch = text.match(colonPattern);
      if (colonMatch) {
        return this.extractSectionContent(text, colonMatch.index + colonMatch[0].length, endMarkers);
      }
    }
    
    // Strategy 2: Look for section headers on their own lines (with emojis and decorations)
    for (const sectionName of sectionNames) {
      const headerPattern = new RegExp(
        `^\\s*[★☆✨🎓💡🚀🎨🛠️]*\\s*(${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\s*[★☆✨🎓💡🚀🎨🛠️&]*\\s*$`,
        'im'
      );
      const headerMatch = text.match(headerPattern);
      if (headerMatch) {
        return this.extractSectionContent(text, headerMatch.index + headerMatch[0].length, endMarkers);
      }
    }
    
    // Strategy 3: Look for section headers followed by content (fallback)
    for (const sectionName of sectionNames) {
      const contentPattern = new RegExp(
        `\\b(${sectionName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})\\b[:\\s]*`,
        'i'
      );
      const contentMatch = text.match(contentPattern);
      if (contentMatch) {
        return this.extractSectionContent(text, contentMatch.index + contentMatch[0].length, endMarkers);
      }
    }
    
    return '';
  }

  /**
   * Extract section content from start position to end markers
   * @param {string} text - Full text
   * @param {number} startIndex - Start position
   * @param {array} endMarkers - End markers
   * @returns {string} - Section content
   */
  extractSectionContent(text, startIndex, endMarkers = []) {
    let endIndex = text.length;
    
    if (endMarkers.length > 0) {
      // Look for end markers
      const escapedEndMarkers = endMarkers.map(marker => 
        marker.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      );
      
      // Try different end marker patterns
      const patterns = [
        // Pattern 1: End marker with colon on its own line
        new RegExp(`^\\s*(${escapedEndMarkers.join('|')})\\s*:\\s*$`, 'im'),
        // Pattern 2: End marker on its own line (uppercase)
        new RegExp(`^\\s*(${escapedEndMarkers.join('|')})\\s*$`, 'im'),
        // Pattern 3: End marker anywhere (fallback)
        new RegExp(`\\b(${escapedEndMarkers.join('|')})\\b`, 'i')
      ];
      
      for (const pattern of patterns) {
        const endMatch = text.substring(startIndex).match(pattern);
        if (endMatch) {
          endIndex = startIndex + endMatch.index;
          break;
        }
      }
    }
    
    const content = text.substring(startIndex, endIndex).trim();
    
    // Clean up the extracted content
    return this.cleanSectionContent(content);
  }

  /**
   * Clean extracted section content
   * @param {string} content - Raw section content
   * @returns {string} - Cleaned content
   */
  cleanSectionContent(content) {
    return content
      // Remove excessive line breaks
      .replace(/\n{3,}/g, '\n\n')
      // Remove leading/trailing whitespace from lines
      .split('\n').map(line => line.trim()).join('\n')
      // Remove empty lines at start and end
      .replace(/^\n+/, '')
      .replace(/\n+$/, '')
      .trim();
  }

  /**
   * Calculate confidence score based on extracted data quality
   * @param {object} data - Extracted data
   * @param {object} criteria - Criteria for scoring
   * @returns {number} - Confidence score (0-1)
   */
  calculateConfidence(data, criteria) {
    let score = 0;
    let maxScore = 0;

    for (const [field, weight] of Object.entries(criteria)) {
      maxScore += weight;
      if (data[field] && data[field].toString().trim().length > 0) {
        score += weight;
      }
    }

    return maxScore > 0 ? score / maxScore : 0;
  }
}

module.exports = BaseParser;
