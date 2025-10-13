# Advanced Resume Parsing - Implementation Guide

## Quick Start

### Prerequisites
- Node.js 16+ and npm
- Python 3.9+
- MongoDB
- Tesseract OCR
- (Optional) CUDA-capable GPU for BERT acceleration

### Installation

#### 1. Install Python Dependencies

```bash
cd backend
pip install -r requirements-advanced.txt
```

#### 2. Install Node.js Dependencies

```bash
npm install axios form-data moment
```

#### 3. Install Tesseract OCR

**Windows:**
```bash
# Download from: https://github.com/UB-Mannheim/tesseract/wiki
# Add to PATH: C:\Program Files\Tesseract-OCR
```

**macOS:**
```bash
brew install tesseract
```

**Linux:**
```bash
sudo apt-get install tesseract-ocr
```

### Configuration

Create `.env` file in backend directory:

```env
# Advanced Parsing Configuration
USE_BERT_NER=true
USE_LAYOUT_ANALYSIS=true
USE_KNOWLEDGE_INTEGRATION=true
USE_VALIDATION=true
USE_HITL=true

# Service Endpoints
BERT_NER_ENDPOINT=http://localhost:5001
LAYOUT_ANALYSIS_ENDPOINT=http://localhost:5002
OCR_ENDPOINT=http://localhost:5003

# Confidence Thresholds
CONFIDENCE_THRESHOLD=0.75
FIELD_CONFIDENCE_THRESHOLD=0.7

# MongoDB
MONGODB_URI=mongodb://localhost:27017/peso_db
```

## Running the Services

### 1. Start BERT NER Service

```bash
cd backend/services/ml
python bert_ner_service.py
```

Service will run on `http://localhost:5001`

### 2. Start Document Layout Analyzer

```bash
cd backend/services/ml
python document_layout_analyzer.py
```

Service will run on `http://localhost:5002`

### 3. Start Enhanced OCR Service

```bash
cd backend/services/ml
python enhanced_ocr_service.py
```

Service will run on `http://localhost:5003`

### 4. Start Main Backend

```bash
cd backend
npm start
```

## Usage

### Basic Usage

```javascript
const AdvancedResumeParser = require('./services/AdvancedResumeParser');

const parser = new AdvancedResumeParser({
  useBERTNER: true,
  useLayoutAnalysis: true,
  useKnowledgeIntegration: true,
  useValidation: true,
  useHITL: true
});

// Parse resume
const result = await parser.parse(resumeText, {
  userId: 'user123',
  resumeId: 'resume456',
  pdfPath: '/path/to/resume.pdf'
});

console.log('Parsed Data:', result.data);
console.log('Confidence:', result.metadata.overallConfidence);
console.log('Validation Score:', result.metadata.validationScore);
```

### API Integration

Update your resume routes to use the advanced parser:

```javascript
// backend/routes/resumeRoutes.js
const AdvancedResumeParser = require('../services/AdvancedResumeParser');
const parser = new AdvancedResumeParser();

router.post('/parse', async (req, res) => {
  try {
    const { text, userId, resumeId, pdfPath } = req.body;
    
    const result = await parser.parse(text, {
      userId,
      resumeId,
      pdfPath
    });
    
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

## Training BERT NER Model

### 1. Prepare Training Data

Create training data in JSON format:

```json
[
  {
    "text": "John Smith\njohn.smith@email.com\n(555) 123-4567",
    "entities": [
      {"text": "John Smith", "label": "NAME", "start": 0, "end": 10},
      {"text": "john.smith@email.com", "label": "EMAIL", "start": 11, "end": 31},
      {"text": "(555) 123-4567", "label": "PHONE", "start": 32, "end": 46}
    ]
  }
]
```

### 2. Train Model

```python
from services.ml.bert_ner_service import BERTNERService

# Initialize service
ner_service = BERTNERService()

# Load training data
train_data = load_json('training_data.json')
val_data = load_json('validation_data.json')

# Train
ner_service.train(
    train_data=train_data,
    val_data=val_data,
    epochs=3,
    batch_size=8,
    learning_rate=2e-5
)

# Save model
ner_service.save_model('models/bert_ner_resume')
```

### 3. Evaluate Model

```python
test_data = load_json('test_data.json')
metrics = ner_service.evaluate(test_data)
print(f"F1 Score: {metrics['weighted avg']['f1-score']}")
```

## Knowledge Base Management

### Skills Ontology

Add new skills to `backend/data/skills_ontology.json`:

```json
{
  "Technical Skills": {
    "Programming Languages": {
      "Rust": {
        "synonyms": ["Rust Lang"],
        "related": ["C++", "Systems Programming"],
        "level": "language",
        "category": "programming"
      }
    }
  }
}
```

### Job Title Taxonomy

Add new job titles to `backend/data/job_title_taxonomy.json`:

```json
{
  "Software Development": {
    "DevOps Engineer": {
      "soc_code": "15-1252.00",
      "variants": ["DevOps Specialist", "SRE"],
      "skills": ["Docker", "Kubernetes", "CI/CD"],
      "industry": "Technology"
    }
  }
}
```

## Human-in-the-Loop (HITL) Dashboard

### Admin Review Interface

Create admin route for reviewing low-confidence parses:

```javascript
// backend/routes/adminRoutes.js
const ReviewQueueService = require('../services/hitl/ReviewQueueService');
const reviewQueue = new ReviewQueueService();

// Get pending reviews
router.get('/review-queue', async (req, res) => {
  const { limit = 50, skip = 0 } = req.query;
  const reviews = await reviewQueue.getPendingReviews(limit, skip);
  res.json(reviews);
});

// Submit corrections
router.post('/review-queue/:id/correct', async (req, res) => {
  const { id } = req.params;
  const { corrections, feedback } = req.body;
  const reviewerId = req.user.id;
  
  const result = await reviewQueue.submitCorrections(
    id,
    reviewerId,
    corrections,
    feedback
  );
  
  res.json(result);
});
```

### Frontend Integration

```typescript
// frontend/src/services/adminService.ts
export const getReviewQueue = async (limit = 50, skip = 0) => {
  const response = await api.get('/admin/review-queue', {
    params: { limit, skip }
  });
  return response.data;
};

export const submitCorrections = async (
  reviewId: string,
  corrections: any,
  feedback: string
) => {
  const response = await api.post(
    `/admin/review-queue/${reviewId}/correct`,
    { corrections, feedback }
  );
  return response.data;
};
```

## Monitoring & Metrics

### Health Check

```bash
curl http://localhost:5001/health  # BERT NER
curl http://localhost:5002/health  # Layout Analysis
curl http://localhost:5003/health  # OCR
```

### Parser Statistics

```javascript
const stats = await parser.getStatistics();
console.log('Review Queue Stats:', stats.reviewQueue);
console.log('Skills Ontology:', stats.skillsOntology);
console.log('Job Titles:', stats.jobTitles);
```

### Performance Monitoring

```javascript
// Log parsing metrics
const result = await parser.parse(text, options);
console.log('Duration:', result.metadata.parsingDuration);
console.log('Confidence:', result.metadata.overallConfidence);
console.log('Validation Score:', result.metadata.validationScore);
```

## Troubleshooting

### BERT NER Service Not Starting

**Issue:** `ModuleNotFoundError: No module named 'transformers'`

**Solution:**
```bash
pip install transformers torch
```

### Layout Analysis Fails

**Issue:** `pdf2image.exceptions.PDFInfoNotInstalledError`

**Solution:**
```bash
# Install poppler
# Windows: Download from https://github.com/oschwartz10612/poppler-windows
# macOS: brew install poppler
# Linux: sudo apt-get install poppler-utils
```

### OCR Low Accuracy

**Issue:** Poor text extraction quality

**Solutions:**
1. Increase DPI: `dpi=300` → `dpi=600`
2. Enable preprocessing: `use_preprocessing=True`
3. Check Tesseract installation: `tesseract --version`

### High Memory Usage

**Issue:** BERT model consuming too much memory

**Solutions:**
1. Use model quantization (FP16)
2. Reduce batch size
3. Use CPU instead of GPU for inference
4. Implement request queuing

## Performance Optimization

### 1. Model Optimization

```python
# Quantize BERT model to FP16
model = model.half()  # Reduces memory by 50%

# Use ONNX Runtime
import onnxruntime
# Convert model to ONNX format for faster inference
```

### 2. Caching

```javascript
// Cache knowledge base lookups
const NodeCache = require('node-cache');
const cache = new NodeCache({ stdTTL: 3600 });

// Cache skill normalization
const normalizeSkillCached = (skill) => {
  const cached = cache.get(skill);
  if (cached) return cached;
  
  const result = skillsOntology.normalizeSkill(skill);
  cache.set(skill, result);
  return result;
};
```

### 3. Async Processing

```javascript
// Use queue for large files
const Queue = require('bull');
const parseQueue = new Queue('resume-parsing');

parseQueue.process(async (job) => {
  const { text, options } = job.data;
  return await parser.parse(text, options);
});

// Add to queue
parseQueue.add({ text, options });
```

## Testing

### Unit Tests

```javascript
// test/advanced-parser.test.js
const AdvancedResumeParser = require('../services/AdvancedResumeParser');

describe('AdvancedResumeParser', () => {
  let parser;
  
  beforeAll(() => {
    parser = new AdvancedResumeParser({
      useBERTNER: false,  // Disable for unit tests
      useLayoutAnalysis: false
    });
  });
  
  test('should parse basic resume', async () => {
    const text = 'John Smith\njohn@email.com\nSoftware Engineer';
    const result = await parser.parse(text);
    
    expect(result.success).toBe(true);
    expect(result.data.personalInfo.email).toBe('john@email.com');
  });
});
```

### Integration Tests

```bash
# Test all services
npm run test:integration
```

## Deployment

### Docker Deployment

Create `Dockerfile.ml-services`:

```dockerfile
FROM python:3.9-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    tesseract-ocr \
    poppler-utils \
    libgl1-mesa-glx \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements-advanced.txt .
RUN pip install --no-cache-dir -r requirements-advanced.txt

# Copy services
COPY services/ml/ ./services/ml/

# Expose ports
EXPOSE 5001 5002 5003

# Start services (use supervisor or similar)
CMD ["python", "services/ml/bert_ner_service.py"]
```

### Docker Compose

```yaml
version: '3.8'

services:
  bert-ner:
    build:
      context: .
      dockerfile: Dockerfile.ml-services
    ports:
      - "5001:5001"
    environment:
      - SERVICE=bert_ner
    command: python services/ml/bert_ner_service.py
  
  layout-analysis:
    build:
      context: .
      dockerfile: Dockerfile.ml-services
    ports:
      - "5002:5002"
    command: python services/ml/document_layout_analyzer.py
  
  ocr-service:
    build:
      context: .
      dockerfile: Dockerfile.ml-services
    ports:
      - "5003:5003"
    command: python services/ml/enhanced_ocr_service.py
  
  backend:
    build: .
    ports:
      - "3001:3001"
    depends_on:
      - bert-ner
      - layout-analysis
      - ocr-service
      - mongodb
    environment:
      - BERT_NER_ENDPOINT=http://bert-ner:5001
      - LAYOUT_ANALYSIS_ENDPOINT=http://layout-analysis:5002
      - OCR_ENDPOINT=http://ocr-service:5003
```

## Production Checklist

- [ ] Train BERT NER model on production data
- [ ] Populate skills ontology with domain-specific skills
- [ ] Configure confidence thresholds based on accuracy requirements
- [ ] Set up monitoring and alerting
- [ ] Implement rate limiting for ML services
- [ ] Configure auto-scaling for high load
- [ ] Set up backup and recovery for training data
- [ ] Implement A/B testing for model updates
- [ ] Configure logging and error tracking
- [ ] Set up CI/CD pipeline for model deployment

## Support

For issues or questions:
1. Check logs: `tail -f logs/advanced-parser.log`
2. Run health check: `npm run health-check`
3. Review architecture: `ADVANCED_PARSING_ARCHITECTURE.md`
4. Check service status: `docker-compose ps`

## Next Steps

1. **Collect Training Data**: Annotate 500+ diverse resumes
2. **Train BERT Model**: Fine-tune on annotated data
3. **Optimize Performance**: Profile and optimize bottlenecks
4. **Deploy Services**: Set up production infrastructure
5. **Monitor & Iterate**: Track metrics and improve continuously

---

**Version:** 2.0.0  
**Last Updated:** 2025-01-13  
**Status:** Ready for Implementation
