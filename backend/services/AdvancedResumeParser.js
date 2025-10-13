/**
 * Advanced Resume Parser - Integration Orchestrator
 * Combines BERT NER, Document Layout Analysis, Knowledge Integration, and HITL
 */

const axios = require('axios');
const SkillsOntologyService = require('./knowledge/SkillsOntologyService');
const JobTitleStandardizer = require('./knowledge/JobTitleStandardizer');
const ConsistencyValidator = require('./validation/ConsistencyValidator');
const ReviewQueueService = require('./hitl/ReviewQueueService');
const MLResumeParser = require('./MLResumeParser');

class AdvancedResumeParser {
  constructor(config = {}) {
    this.config = {
      useBERTNER: config.useBERTNER !== false,
      useLayoutAnalysis: config.useLayoutAnalysis !== false,
      useKnowledgeIntegration: config.useKnowledgeIntegration !== false,
      useValidation: config.useValidation !== false,
      useHITL: config.useHITL !== false,
      bertNEREndpoint: config.bertNEREndpoint || 'http://localhost:5001',
      layoutAnalysisEndpoint: config.layoutAnalysisEndpoint || 'http://localhost:5002',
      ocrEndpoint: config.ocrEndpoint || 'http://localhost:5003',
      ...config
    };

    // Initialize services
    this.skillsOntology = new SkillsOntologyService();
    this.jobTitleStandardizer = new JobTitleStandardizer();
    this.consistencyValidator = new ConsistencyValidator();
    this.reviewQueueService = new ReviewQueueService();
    this.mlParser = new MLResumeParser();

    console.log('🚀 Advanced Resume Parser initialized');
    console.log('   Configuration:', {
      BERT_NER: this.config.useBERTNER,
      Layout_Analysis: this.config.useLayoutAnalysis,
      Knowledge_Integration: this.config.useKnowledgeIntegration,
      Validation: this.config.useValidation,
      HITL: this.config.useHITL
    });
  }

  /**
   * Parse resume with advanced techniques
   */
  async parse(text, options = {}) {
    const startTime = Date.now();
    console.log('\n🚀 ========================================');
    console.log('🚀 ADVANCED RESUME PARSER: Starting');
    console.log('🚀 ========================================');

    try {
      // Step 1: Document Layout Analysis (if PDF path provided)
      let processedText = text;
      let layoutMetadata = {};

      if (options.pdfPath && this.config.useLayoutAnalysis) {
        console.log('\n📐 STEP 1: Document Layout Analysis');
        const layoutResult = await this.analyzeLayout(options.pdfPath);
        if (layoutResult.success) {
          processedText = layoutResult.text;
          layoutMetadata = layoutResult.metadata;
          console.log('   ✅ Layout analysis complete');
          console.log(`   - Detected ${layoutMetadata.num_pages} pages`);
          console.log(`   - Layout type: ${layoutMetadata.layout_type}`);
        }
      }

      // Step 2: Base ML Parsing
      console.log('\n🤖 STEP 2: Base ML Parsing');
      const mlResult = await this.mlParser.parse(processedText);
      let parsedData = mlResult.data;
      let metadata = mlResult.metadata;

      // Step 3: BERT NER Enhancement (if enabled)
      if (this.config.useBERTNER) {
        console.log('\n🧠 STEP 3: BERT NER Enhancement');
        const nerResult = await this.enhanceWithBERTNER(processedText, parsedData);
        if (nerResult.success) {
          parsedData = this.mergeBERTResults(parsedData, nerResult.entities);
          metadata.bertNER = {
            entityCount: nerResult.entity_count,
            confidence: nerResult.overall_confidence
          };
          console.log('   ✅ BERT NER enhancement complete');
          console.log(`   - Extracted ${nerResult.entity_count} entities`);
        }
      }

      // Step 4: Knowledge Integration
      if (this.config.useKnowledgeIntegration) {
        console.log('\n📚 STEP 4: Knowledge Integration');
        parsedData = this.integrateKnowledge(parsedData);
        console.log('   ✅ Knowledge integration complete');
      }

      // Step 5: Consistency Validation
      let validationResult = { valid: true, errors: [], warnings: [] };
      if (this.config.useValidation) {
        console.log('\n✅ STEP 5: Consistency Validation');
        validationResult = this.consistencyValidator.validateResume(parsedData);
        parsedData.validationErrors = validationResult.errors;
        parsedData.validationWarnings = validationResult.warnings;
        metadata.validationScore = validationResult.score;
        console.log(`   - Validation score: ${validationResult.score}/100`);
        console.log(`   - Errors: ${validationResult.errors.length}`);
        console.log(`   - Warnings: ${validationResult.warnings.length}`);
      }

      // Step 6: Human-in-the-Loop Queue (if needed)
      let hitlResult = { addedToQueue: false };
      if (this.config.useHITL && options.userId) {
        console.log('\n👤 STEP 6: HITL Review Check');
        hitlResult = await this.reviewQueueService.addToQueueIfNeeded(
          options.userId,
          options.resumeId,
          processedText,
          parsedData,
          metadata
        );
        if (hitlResult.addedToQueue) {
          console.log(`   ⚠️  Added to review queue (priority: ${hitlResult.priority})`);
          console.log(`   - Reason: ${hitlResult.reason}`);
        } else {
          console.log('   ✅ No review needed');
        }
      }

      const duration = ((Date.now() - startTime) / 1000).toFixed(2);

      console.log('\n🚀 ========================================');
      console.log('🚀 ADVANCED RESUME PARSER: Complete');
      console.log('🚀 ========================================');
      console.log(`🚀 Duration: ${duration}s`);
      console.log(`🚀 Overall Confidence: ${(metadata.overallConfidence * 100).toFixed(1)}%`);
      console.log(`🚀 Validation Score: ${metadata.validationScore || 'N/A'}/100`);
      console.log('🚀 ========================================\n');

      return {
        success: true,
        data: parsedData,
        metadata: {
          ...metadata,
          layoutAnalysis: layoutMetadata,
          validation: validationResult.summary,
          hitl: hitlResult,
          parsingDuration: duration,
          method: 'advanced',
          version: '2.0.0'
        }
      };

    } catch (error) {
      console.error('❌ Error in advanced parsing:', error);
      
      // Fallback to basic ML parsing
      console.log('⚠️  Falling back to basic ML parsing...');
      const fallbackResult = await this.mlParser.parse(text);
      
      return {
        success: true,
        data: fallbackResult.data,
        metadata: {
          ...fallbackResult.metadata,
          fallback: true,
          error: error.message
        }
      };
    }
  }

  /**
   * Analyze document layout
   */
  async analyzeLayout(pdfPath) {
    try {
      const FormData = require('form-data');
      const fs = require('fs');
      
      // Check if file exists
      if (!fs.existsSync(pdfPath)) {
        console.warn('⚠️  PDF file not found:', pdfPath);
        return { success: false };
      }

      const form = new FormData();
      form.append('file', fs.createReadStream(pdfPath));

      const response = await axios.post(
        `${this.config.layoutAnalysisEndpoint}/analyze-layout`,
        form,
        {
          headers: form.getHeaders(),
          timeout: 30000
        }
      );

      return {
        success: true,
        text: response.data.text,
        metadata: {
          num_pages: response.data.num_pages,
          layout_type: response.data.layout_type,
          has_multi_column: response.data.has_multi_column,
          elements: response.data.elements?.length || 0
        }
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.warn('⚠️  Layout analysis service not available (service not started)');
      } else {
        console.error('⚠️  Layout analysis failed:', error.message);
      }
      return { success: false };
    }
  }

  /**
   * Enhance with BERT NER
   */
  async enhanceWithBERTNER(text, parsedData) {
    try {
      const response = await axios.post(
        `${this.config.bertNEREndpoint}/extract-entities`,
        { text },
        { timeout: 30000 }
      );

      return {
        success: true,
        entities: response.data.entities,
        overall_confidence: response.data.overall_confidence,
        entity_count: response.data.entity_count
      };
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        console.warn('⚠️  BERT NER service not available (service not started)');
      } else {
        console.error('⚠️  BERT NER failed:', error.message);
      }
      return { success: false };
    }
  }

  /**
   * Merge BERT NER results with ML parsing results
   */
  mergeBERTResults(parsedData, bertEntities) {
    // Enhance personal info with BERT entities
    if (bertEntities.name && bertEntities.name.length > 0) {
      const nameEntity = bertEntities.name[0];
      // Lower confidence threshold from 0.8 to 0.6 for better recall
      // BERT is usually very good at name detection
      if (nameEntity.confidence > 0.6) {
        const nameText = nameEntity.text.trim();
        
        // Validate that it's not an institution name
        if (this.isInstitutionName(nameText)) {
          console.log(`   ⚠️  Rejected institution name from BERT: ${nameText}`);
        } else {
          const nameParts = nameText.split(/\s+/);
          
          // Always use BERT name if it has higher confidence than existing
          const shouldUseBERT = !parsedData.personalInfo.firstName || 
                                !parsedData.personalInfo.lastName ||
                                nameEntity.confidence > 0.85;
          
          if (shouldUseBERT && nameParts.length > 0) {
            parsedData.personalInfo.firstName = nameParts[0];
            parsedData.personalInfo.lastName = nameParts.length > 1 ? 
              nameParts.slice(1).join(' ') : '';
            console.log(`   ✅ Name from BERT: ${nameText} (confidence: ${nameEntity.confidence.toFixed(2)})`);
          }
        }
      }
    }

    // Enhance email
    if (bertEntities.email && bertEntities.email.length > 0) {
      const emailEntity = bertEntities.email[0];
      if (emailEntity.confidence > 0.9 && !parsedData.personalInfo.email) {
        parsedData.personalInfo.email = emailEntity.text;
      }
    }

    // Enhance phone
    if (bertEntities.phone && bertEntities.phone.length > 0) {
      const phoneEntity = bertEntities.phone[0];
      if (phoneEntity.confidence > 0.9 && !parsedData.personalInfo.phone) {
        parsedData.personalInfo.phone = phoneEntity.text;
      }
    }

    // Enhance skills with BERT-detected skills
    if (bertEntities.skills && bertEntities.skills.length > 0) {
      const bertSkills = bertEntities.skills
        .filter(s => s.confidence > 0.7)
        .map(s => s.text);
      
      // Merge with existing skills (deduplicate)
      const existingSkills = new Set(parsedData.skills.map(s => s.toLowerCase()));
      for (const skill of bertSkills) {
        if (!existingSkills.has(skill.toLowerCase())) {
          parsedData.skills.push(skill);
        }
      }
    }

    return parsedData;
  }

  /**
   * Integrate knowledge bases
   */
  integrateKnowledge(parsedData) {
    // Normalize and categorize skills
    if (parsedData.skills && parsedData.skills.length > 0) {
      parsedData.skills = this.skillsOntology.normalizeSkillList(parsedData.skills);
      parsedData.skillCategories = this.skillsOntology.categorizeSkills(parsedData.skills);
      
      // Infer related skills
      const relatedSkills = this.skillsOntology.inferRelatedSkills(parsedData.skills);
      parsedData.suggestedSkills = relatedSkills.slice(0, 10); // Top 10 suggestions
    }

    // Standardize job titles
    if (parsedData.experience && parsedData.experience.length > 0) {
      for (const exp of parsedData.experience) {
        const title = exp.position || exp.title;
        if (title) {
          const standardized = this.jobTitleStandardizer.standardize(title);
          exp.standardizedTitle = standardized.standard;
          exp.seniority = standardized.seniority;
          exp.socCode = standardized.soc_code;
          exp.titleConfidence = standardized.confidence;
          
          // Get suggested skills for this job title
          exp.suggestedSkills = this.jobTitleStandardizer.getSuggestedSkills(title);
        }
      }
    }

    // Normalize education degrees
    if (parsedData.education && parsedData.education.length > 0) {
      for (const edu of parsedData.education) {
        if (edu.degree) {
          // Already normalized by EducationParser, but ensure consistency
          edu.degree = edu.degree.trim();
        }
      }
    }

    return parsedData;
  }

  /**
   * Get parser statistics
   */
  async getStatistics() {
    const reviewStats = await this.reviewQueueService.getStatistics();
    
    return {
      parser: {
        version: '2.0.0',
        features: {
          bertNER: this.config.useBERTNER,
          layoutAnalysis: this.config.useLayoutAnalysis,
          knowledgeIntegration: this.config.useKnowledgeIntegration,
          validation: this.config.useValidation,
          hitl: this.config.useHITL
        }
      },
      reviewQueue: reviewStats,
      skillsOntology: {
        totalSkills: Object.keys(this.skillsOntology.skillIndex).length,
        synonyms: Object.keys(this.skillsOntology.synonymMap).length
      },
      jobTitles: {
        totalTitles: Object.keys(this.jobTitleStandardizer.titleIndex).length
      }
    };
  }

  /**
   * Health check for all services
   */
  async healthCheck() {
    const health = {
      parser: 'healthy',
      services: {}
    };

    // Check BERT NER service
    if (this.config.useBERTNER) {
      try {
        await axios.get(`${this.config.bertNEREndpoint}/health`, { timeout: 5000 });
        health.services.bertNER = 'healthy';
      } catch (error) {
        health.services.bertNER = 'unavailable';
        health.parser = 'degraded';
      }
    }

    // Check Layout Analysis service
    if (this.config.useLayoutAnalysis) {
      try {
        await axios.get(`${this.config.layoutAnalysisEndpoint}/health`, { timeout: 5000 });
        health.services.layoutAnalysis = 'healthy';
      } catch (error) {
        health.services.layoutAnalysis = 'unavailable';
        health.parser = 'degraded';
      }
    }

    // Check OCR service
    try {
      await axios.get(`${this.config.ocrEndpoint}/health`, { timeout: 5000 });
      health.services.ocr = 'healthy';
    } catch (error) {
      health.services.ocr = 'unavailable';
    }

    return health;
  }

  /**
   * Check if a name is actually an institution/university name
   */
  isInstitutionName(name) {
    const lowerName = name.toLowerCase().trim();
    
    // Reject names that start with "De La" or "De Las" (likely university fragments)
    if (/^de\s+la\s*/i.test(name) || /^de\s+las\s*/i.test(name)) {
      return true;
    }
    
    // Common institution keywords
    const institutionKeywords = [
      'university', 'college', 'institute', 'school', 'academy',
      'polytechnic', 'tech', 'state', 'national', 'centro',
      'de la salle', 'de las', 'ateneo', 'santo tomas', 'far eastern',
      'mapua', 'lyceum', 'adamson', 'letran', 'san beda',
      'technological', 'sciences', 'medical', 'law school',
      'business school', 'engineering', 'arts', 'education'
    ];
    
    // Check if name contains institution keywords
    for (const keyword of institutionKeywords) {
      if (lowerName.includes(keyword)) {
        return true;
      }
    }
    
    // Check for common Philippine university patterns
    const philippineUniversities = [
      /de\s+la\s+salle/i,
      /de\s+las/i,
      /santo\s+tomas/i,
      /far\s+eastern/i,
      /san\s+beda/i
    ];
    
    for (const pattern of philippineUniversities) {
      if (pattern.test(name)) {
        return true;
      }
    }
    
    return false;
  }
}

module.exports = AdvancedResumeParser;
