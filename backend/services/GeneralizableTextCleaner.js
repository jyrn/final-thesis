/**
 * Generalizable Text Cleaner
 * This module contains patterns that should work across different resume styles
 */

class GeneralizableTextCleaner {
  constructor() {
    // Common English words that often get concatenated in PDFs
    this.commonWords = [
      // Articles and prepositions
      'the', 'and', 'for', 'with', 'from', 'that', 'this', 'which', 'where', 'when', 'how', 'why',
      'in', 'on', 'at', 'by', 'to', 'of', 'as', 'an', 'a',
      
      // Action verbs (common in resumes)
      'developed', 'designed', 'built', 'created', 'implemented', 'managed', 'led', 'coordinated',
      'analyzed', 'improved', 'enhanced', 'optimized', 'automated', 'streamlined', 'collaborated',
      'achieved', 'delivered', 'executed', 'maintained', 'supported', 'trained', 'mentored',
      
      // Common resume nouns
      'system', 'application', 'platform', 'interface', 'database', 'website', 'software',
      'project', 'team', 'client', 'customer', 'user', 'process', 'solution', 'product',
      'service', 'feature', 'functionality', 'performance', 'quality', 'efficiency',
      
      // Technical terms
      'data', 'analysis', 'development', 'design', 'testing', 'deployment', 'integration',
      'security', 'network', 'cloud', 'mobile', 'web', 'api', 'framework', 'library',
      
      // Business terms
      'business', 'management', 'strategy', 'planning', 'operations', 'marketing', 'sales',
      'finance', 'accounting', 'human', 'resources', 'customer', 'service', 'support',
      
      // Education terms
      'university', 'college', 'school', 'degree', 'bachelor', 'master', 'doctorate', 'phd',
      'certificate', 'certification', 'course', 'training', 'education', 'academic',
      
      // Time-related
      'experience', 'years', 'months', 'present', 'current', 'previous', 'former', 'recent'
    ];
    
    // Common word endings that indicate word boundaries
    this.wordEndings = ['ed', 'ing', 'ion', 'tion', 'sion', 'ness', 'ment', 'able', 'ible', 'ful', 'less', 'ly'];
    
    // Common word beginnings
    this.wordBeginnings = ['pre', 'post', 'anti', 'pro', 'sub', 'super', 'inter', 'intra', 'multi', 'uni', 'bi', 'tri'];
  }

  /**
   * Intelligent word splitting based on common English patterns
   */
  intelligentWordSplit(text) {
    let result = text;
    
    // Split based on common word patterns
    result = this.splitByCommonWords(result);
    result = this.splitByWordPatterns(result);
    result = this.splitByContextualClues(result);
    
    return result;
  }

  /**
   * Split text when common words are detected
   */
  splitByCommonWords(text) {
    let result = text;
    
    // Look for common words that are concatenated
    for (const word of this.commonWords) {
      // Pattern: someword + commonword -> someword + space + commonword
      const pattern1 = new RegExp(`([a-z]{3,})(${word})`, 'gi');
      result = result.replace(pattern1, (match, p1, p2) => {
        // Don't split if it's already a valid compound word
        if (this.isValidCompound(p1 + p2)) return match;
        return p1 + ' ' + p2;
      });
      
      // Pattern: commonword + someword -> commonword + space + someword
      const pattern2 = new RegExp(`(${word})([a-z]{3,})`, 'gi');
      result = result.replace(pattern2, (match, p1, p2) => {
        // Don't split if it's already a valid compound word
        if (this.isValidCompound(p1 + p2)) return match;
        return p1 + ' ' + p2;
      });
    }
    
    return result;
  }

  /**
   * Split based on word formation patterns
   */
  splitByWordPatterns(text) {
    let result = text;
    
    // Split when a word ending is followed by a word beginning (disabled - too aggressive)
    // for (const ending of this.wordEndings) {
    //   for (const beginning of this.wordBeginnings) {
    //     const pattern = new RegExp(`(${ending})(${beginning})`, 'gi');
    //     result = result.replace(pattern, '$1 $2');
    //   }
    // }
    
    // Split when lowercase is followed by uppercase (CamelCase)
    result = result.replace(/([a-z])([A-Z])/g, '$1 $2');
    
    // Split when a word ends and another starts (more conservative heuristic)
    result = result.replace(/([a-z]{4,})([a-z]{4,})/g, (match, p1, p2) => {
      // Only split if both parts look like real words AND one is a common word
      const p1IsCommon = this.commonWords.includes(p1.toLowerCase());
      const p2IsCommon = this.commonWords.includes(p2.toLowerCase());
      
      if ((p1IsCommon || p2IsCommon) && this.looksLikeWord(p1) && this.looksLikeWord(p2)) {
        return p1 + ' ' + p2;
      }
      return match;
    });
    
    return result;
  }

  /**
   * Split based on contextual clues (punctuation, numbers, etc.)
   */
  splitByContextualClues(text) {
    return text
      // Add space after periods if followed by letter
      .replace(/(\.)([A-Za-z])/g, '$1 $2')
      // Add space before numbers if preceded by letter
      .replace(/([a-zA-Z])(\d)/g, '$1 $2')
      // Add space after numbers if followed by letter
      .replace(/(\d)([a-zA-Z])/g, '$1 $2')
      // Fix comma spacing
      .replace(/([a-z])(\,)([a-z])/g, '$1$2 $3');
  }

  /**
   * Check if a word looks like a real English word
   */
  looksLikeWord(word) {
    if (word.length < 3) return false;
    
    // Check if it's in our common words list
    if (this.commonWords.includes(word.toLowerCase())) return true;
    
    // Check if it has common word patterns
    const hasVowels = /[aeiou]/i.test(word);
    const hasConsonants = /[bcdfghjklmnpqrstvwxyz]/i.test(word);
    const reasonableLength = word.length >= 3 && word.length <= 15;
    
    return hasVowels && hasConsonants && reasonableLength;
  }

  /**
   * Check if a compound word is valid (shouldn't be split)
   */
  isValidCompound(word) {
    const validCompounds = [
      'javascript', 'typescript', 'mongodb', 'github', 'linkedin', 'facebook',
      'powerbi', 'firebase', 'nodejs', 'reactjs', 'angularjs', 'vuejs',
      'frontend', 'backend', 'fullstack', 'database', 'website', 'software',
      'hardware', 'network', 'internet', 'intranet', 'extranet',
      'workflow', 'framework', 'codebase', 'username', 'password'
    ];
    
    return validCompounds.includes(word.toLowerCase());
  }

  /**
   * Clean text for any resume format
   */
  cleanAnyResumeFormat(text) {
    console.log('🌐 Applying generalizable cleaning patterns...');
    
    let cleaned = text;
    
    // Apply intelligent word splitting
    cleaned = this.intelligentWordSplit(cleaned);
    
    // Fix common formatting issues
    cleaned = this.fixCommonFormattingIssues(cleaned);
    
    // Normalize spacing
    cleaned = this.normalizeSpacing(cleaned);
    
    return cleaned;
  }

  /**
   * Fix common formatting issues across all resume types
   */
  fixCommonFormattingIssues(text) {
    return text
      // Fix email spacing
      .replace(/([a-zA-Z0-9])\s+(@[a-zA-Z0-9])/g, '$1$2')
      // Fix phone number patterns
      .replace(/(\d{3})\s*(\d{3})\s*(\d{4})/g, '$1-$2-$3')
      // Fix URL spacing
      .replace(/(https?:\/\/)\s+/g, '$1')
      .replace(/\s+(\.com|\.org|\.net|\.edu)/g, '$1')
      // Fix date ranges
      .replace(/(\d{4})\s*-\s*(\d{4}|Present|Current)/gi, '$1 - $2')
      // Fix degree abbreviations
      .replace(/\b(B\.?S\.?|M\.?S\.?|Ph\.?D\.?|M\.?B\.?A\.?|B\.?A\.?)\s+/gi, '$1 ')
      // Fix common abbreviations
      .replace(/\b(Jr|Sr|II|III|IV|V)\s*\./gi, '$1.');
  }

  /**
   * Normalize spacing consistently
   */
  normalizeSpacing(text) {
    return text
      .replace(/\s+/g, ' ')
      .replace(/\n\s+/g, '\n')
      .replace(/\s+\n/g, '\n')
      .trim();
  }
}

module.exports = GeneralizableTextCleaner;
