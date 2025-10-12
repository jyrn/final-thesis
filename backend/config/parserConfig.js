/**
 * Parser Configuration
 * Central configuration for resume parsing system
 */

module.exports = {
  // Parser Selection
  parser: {
    // Use ML-powered modular parser (recommended)
    useMLParser: true,
    
    // Fallback to legacy parser if ML parser fails
    enableFallback: true,
    
    // Log detailed parsing steps
    verboseLogging: true
  },

  // ML Classifier Settings
  mlClassifier: {
    // Minimum confidence threshold for format classification
    minConfidenceThreshold: 0.5,
    
    // Number of alternative formats to consider
    alternativeFormatsCount: 2,
    
    // Feature extraction settings
    features: {
      // Minimum pipe count to consider pipe-separated format
      minPipeCount: 3,
      
      // Minimum bullet points to consider bullet format
      minBulletCount: 3,
      
      // Threshold for multi-column detection (% of short lines)
      multiColumnThreshold: 0.3
    }
  },

  // Section Parser Settings
  sectionParsers: {
    personalInfo: {
      enabled: true,
      // Maximum characters to scan for name
      nameScanLength: 500,
      // Confidence weight in overall score
      confidenceWeight: 0.3
    },
    
    education: {
      enabled: true,
      // Maximum description length
      maxDescriptionLength: 300,
      confidenceWeight: 0.2
    },
    
    skills: {
      enabled: true,
      // Maximum number of skills to extract
      maxSkills: 50,
      // Use skill database for keyword matching
      useSkillDatabase: true,
      confidenceWeight: 0.2
    },
    
    projects: {
      enabled: true,
      // Minimum project name length
      minNameLength: 5,
      // Maximum project name length
      maxNameLength: 150,
      // Maximum description length
      maxDescriptionLength: 500,
      confidenceWeight: 0.15
    },
    
    certifications: {
      enabled: true,
      // Parse date formats
      parseDates: true,
      confidenceWeight: 0.15
    }
  },

  // Format-Specific Settings
  formats: {
    'pipe-separated': {
      // Minimum pipe count to use this parser
      minPipeCount: 5,
      // Confidence boost for this format
      confidenceBoost: 0.1
    },
    
    'standard-bullets': {
      // Parsing strategies priority
      strategies: ['bullets', 'paragraphs', 'patterns', 'single'],
      // Default confidence
      defaultConfidence: 0.85
    },
    
    'paragraph-based': {
      // Minimum average line length
      minAvgLineLength: 60,
      defaultConfidence: 0.75
    },
    
    'infographic': {
      // Special character detection
      detectSpecialChars: true,
      defaultConfidence: 0.65
    }
  },

  // Performance Settings
  performance: {
    // Maximum parsing time (milliseconds)
    maxParsingTime: 10000,
    
    // Enable caching of parsed results
    enableCaching: false,
    
    // Cache TTL (seconds)
    cacheTTL: 3600
  },

  // Validation Settings
  validation: {
    // Require minimum fields for valid parse
    requiredFields: {
      personalInfo: ['firstName', 'lastName'],
      education: [],
      skills: []
    },
    
    // Minimum overall confidence for success
    minOverallConfidence: 0.3
  },

  // Debug Settings
  debug: {
    // Save raw text to file for debugging
    saveRawText: false,
    
    // Save parsed results to file
    saveResults: false,
    
    // Output directory for debug files
    outputDir: './debug/parser-output',
    
    // Log feature extraction details
    logFeatures: true,
    
    // Log confidence calculations
    logConfidence: true
  }
};
