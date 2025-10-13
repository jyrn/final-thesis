/**
 * Advanced Resume Parser Configuration
 * Centralized configuration for all advanced parsing features
 */

module.exports = {
  // Feature Flags
  features: {
    useBERTNER: process.env.USE_BERT_NER === 'true',
    useLayoutAnalysis: process.env.USE_LAYOUT_ANALYSIS === 'true',
    useKnowledgeIntegration: process.env.USE_KNOWLEDGE_INTEGRATION !== 'false', // Default true
    useValidation: process.env.USE_VALIDATION !== 'false', // Default true
    useHITL: process.env.USE_HITL !== 'false' // Default true
  },

  // Service Endpoints
  endpoints: {
    bertNER: process.env.BERT_NER_ENDPOINT || 'http://localhost:5001',
    layoutAnalysis: process.env.LAYOUT_ANALYSIS_ENDPOINT || 'http://localhost:5002',
    ocr: process.env.OCR_ENDPOINT || 'http://localhost:5003'
  },

  // Confidence Thresholds
  thresholds: {
    overall: parseFloat(process.env.CONFIDENCE_THRESHOLD) || 0.75,
    field: parseFloat(process.env.FIELD_CONFIDENCE_THRESHOLD) || 0.7,
    bertNER: parseFloat(process.env.BERT_NER_THRESHOLD) || 0.7,
    formatDetection: parseFloat(process.env.FORMAT_DETECTION_THRESHOLD) || 0.6
  },

  // BERT NER Configuration
  bertNER: {
    enabled: process.env.USE_BERT_NER === 'true',
    modelPath: process.env.BERT_MODEL_PATH || null,
    useMonteCarloDropout: process.env.BERT_USE_MC_DROPOUT === 'true',
    dropoutSamples: parseInt(process.env.BERT_DROPOUT_SAMPLES) || 10,
    timeout: parseInt(process.env.BERT_TIMEOUT) || 30000
  },

  // Document Layout Analysis Configuration
  layoutAnalysis: {
    enabled: process.env.USE_LAYOUT_ANALYSIS === 'true',
    dpi: parseInt(process.env.LAYOUT_DPI) || 300,
    minColumnWidth: parseInt(process.env.MIN_COLUMN_WIDTH) || 200,
    columnGapThreshold: parseInt(process.env.COLUMN_GAP_THRESHOLD) || 50,
    timeout: parseInt(process.env.LAYOUT_TIMEOUT) || 30000
  },

  // OCR Configuration
  ocr: {
    enabled: process.env.USE_OCR === 'true',
    tesseractPath: process.env.TESSERACT_PATH || null,
    confidenceThreshold: parseFloat(process.env.OCR_CONFIDENCE_THRESHOLD) || 60.0,
    usePreprocessing: process.env.OCR_USE_PREPROCESSING !== 'false',
    dpi: parseInt(process.env.OCR_DPI) || 300,
    timeout: parseInt(process.env.OCR_TIMEOUT) || 60000
  },

  // Skills Ontology Configuration
  skillsOntology: {
    enabled: process.env.USE_SKILLS_ONTOLOGY !== 'false',
    ontologyPath: process.env.SKILLS_ONTOLOGY_PATH || './data/skills_ontology.json',
    fuzzyMatchThreshold: parseInt(process.env.SKILLS_FUZZY_THRESHOLD) || 2,
    maxSuggestions: parseInt(process.env.SKILLS_MAX_SUGGESTIONS) || 10
  },

  // Job Title Standardization Configuration
  jobTitleStandardization: {
    enabled: process.env.USE_JOB_TITLE_STANDARDIZATION !== 'false',
    taxonomyPath: process.env.JOB_TITLE_TAXONOMY_PATH || './data/job_title_taxonomy.json',
    fuzzyMatchThreshold: parseInt(process.env.JOB_TITLE_FUZZY_THRESHOLD) || 3,
    validateExperience: process.env.VALIDATE_TITLE_EXPERIENCE !== 'false'
  },

  // Validation Configuration
  validation: {
    enabled: process.env.USE_VALIDATION !== 'false',
    validateDates: process.env.VALIDATE_DATES !== 'false',
    validateLocations: process.env.VALIDATE_LOCATIONS === 'true',
    validateSkillAlignment: process.env.VALIDATE_SKILL_ALIGNMENT !== 'false',
    detectOverlaps: process.env.DETECT_OVERLAPS !== 'false',
    maxDateRangeYears: parseInt(process.env.MAX_DATE_RANGE_YEARS) || 50
  },

  // Human-in-the-Loop Configuration
  hitl: {
    enabled: process.env.USE_HITL !== 'false',
    confidenceThreshold: parseFloat(process.env.HITL_CONFIDENCE_THRESHOLD) || 0.75,
    fieldConfidenceThreshold: parseFloat(process.env.HITL_FIELD_THRESHOLD) || 0.7,
    autoApproveThreshold: parseFloat(process.env.HITL_AUTO_APPROVE_THRESHOLD) || 0.9,
    maxQueueSize: parseInt(process.env.HITL_MAX_QUEUE_SIZE) || 1000,
    priorityWeights: {
      confidence: parseFloat(process.env.HITL_PRIORITY_CONFIDENCE) || 0.4,
      errors: parseFloat(process.env.HITL_PRIORITY_ERRORS) || 0.3,
      lowConfidenceFields: parseFloat(process.env.HITL_PRIORITY_FIELDS) || 0.3
    }
  },

  // Performance Configuration
  performance: {
    enableCaching: process.env.ENABLE_CACHING !== 'false',
    cacheTTL: parseInt(process.env.CACHE_TTL) || 3600,
    maxConcurrentRequests: parseInt(process.env.MAX_CONCURRENT_REQUESTS) || 10,
    requestTimeout: parseInt(process.env.REQUEST_TIMEOUT) || 60000,
    enableBatching: process.env.ENABLE_BATCHING === 'true',
    batchSize: parseInt(process.env.BATCH_SIZE) || 5
  },

  // Logging Configuration
  logging: {
    level: process.env.LOG_LEVEL || 'info',
    enableDebug: process.env.ENABLE_DEBUG === 'true',
    logToFile: process.env.LOG_TO_FILE === 'true',
    logFilePath: process.env.LOG_FILE_PATH || './logs/advanced-parser.log',
    logMetrics: process.env.LOG_METRICS !== 'false'
  },

  // Training Configuration
  training: {
    enabled: process.env.ENABLE_TRAINING === 'true',
    autoRetrain: process.env.AUTO_RETRAIN === 'true',
    retrainInterval: parseInt(process.env.RETRAIN_INTERVAL) || 604800000, // 1 week
    minTrainingExamples: parseInt(process.env.MIN_TRAINING_EXAMPLES) || 100,
    trainingDataPath: process.env.TRAINING_DATA_PATH || './data/training',
    modelOutputPath: process.env.MODEL_OUTPUT_PATH || './models'
  },

  // Monitoring Configuration
  monitoring: {
    enabled: process.env.ENABLE_MONITORING !== 'false',
    metricsEndpoint: process.env.METRICS_ENDPOINT || '/metrics',
    healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000,
    alertOnFailure: process.env.ALERT_ON_FAILURE === 'true',
    alertEmail: process.env.ALERT_EMAIL || null
  },

  // Fallback Configuration
  fallback: {
    useMLParserOnFailure: process.env.USE_ML_FALLBACK !== 'false',
    useBasicParserOnFailure: process.env.USE_BASIC_FALLBACK === 'true',
    maxRetries: parseInt(process.env.MAX_RETRIES) || 3,
    retryDelay: parseInt(process.env.RETRY_DELAY) || 1000
  },

  // Data Storage Configuration
  storage: {
    storeRawText: process.env.STORE_RAW_TEXT !== 'false',
    storeTrainingData: process.env.STORE_TRAINING_DATA !== 'false',
    storeMetrics: process.env.STORE_METRICS !== 'false',
    retentionDays: parseInt(process.env.DATA_RETENTION_DAYS) || 90
  }
};
