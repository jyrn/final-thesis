# ML Resume Parser - Quick Start Guide

## 🚀 Getting Started in 5 Minutes

### Step 1: Verify Installation

The ML parser is already integrated! Just make sure the server is running:

```bash
cd backend
npm start
```

### Step 2: Test with Sample Resume

Upload any resume through the frontend, and the ML parser will automatically:
1. Detect the format
2. Parse all sections
3. Return structured data

### Step 3: Check the Logs

Watch the terminal for ML parsing logs:

```
🤖 ========================================
🤖 ML RESUME PARSER: Starting
🤖 ========================================
🤖 STEP 1: ML Format Classification
🤖 Detected format: standard-bullets
🤖 Confidence: 85.0%
🤖 Layout: single-column
🤖 Separator: bullets

🤖 STEP 2: Section Parsing
👤 Parsing Personal Information...
👤 Found email: john@email.com
👤 Found phone: +1234567890
👤 Found name: John Doe

🎓 Parsing Education...
🎓 ✅ Found education: University of Example - Bachelor of Science

💡 Parsing Skills...
💡 ✅ Found known skill: Python
💡 ✅ Found known skill: JavaScript
💡 Total skills found: 15

🚀 Parsing Projects...
🚀 ✅ Added project: E-Commerce Platform

🤖 ========================================
🤖 ML RESUME PARSER: Complete
🤖 ========================================
```

## 🎛️ Configuration

### Enable/Disable ML Parser

Edit `backend/config/parserConfig.js`:

```javascript
module.exports = {
  parser: {
    useMLParser: true,  // Set to false to use legacy parser
    enableFallback: true,
    verboseLogging: true
  }
};
```

### Adjust Confidence Thresholds

```javascript
mlClassifier: {
  minConfidenceThreshold: 0.5,  // Lower = more lenient
  alternativeFormatsCount: 2
}
```

### Configure Section Parsers

```javascript
sectionParsers: {
  skills: {
    enabled: true,
    maxSkills: 50,  // Increase to extract more skills
    useSkillDatabase: true
  },
  projects: {
    enabled: true,
    minNameLength: 5,
    maxNameLength: 150
  }
}
```

## 🧪 Testing Different Formats

### Test Pipe-Separated Format (Shayla's)

Upload a resume with this structure:
```
Project Name | Tech Stack Description
Certificate Name | Issuer Month Year
```

Expected: Format detected as `pipe-separated`

### Test Standard Bullets (Karl's)

Upload a resume with this structure:
```
PROJECTS
- Project Name
  Description here
- Another Project
  Description here
```

Expected: Format detected as `standard-bullets`

### Test Paragraph Format (Hannah's)

Upload a resume with paragraph-based projects:
```
PROJECTS
Project Name
Description in paragraph form with multiple sentences.

Another Project
More description here.
```

Expected: Format detected as `paragraph-based` or `standard-bullets`

## 📊 Understanding Results

### Check Confidence Scores

The parser returns confidence scores for each section:

```javascript
{
  metadata: {
    confidenceScores: {
      personalInfo: 0.9,  // 90% confident
      education: 0.85,    // 85% confident
      skills: 0.9,        // 90% confident
      projects: 0.85,     // 85% confident
      certifications: 0.9 // 90% confident
    },
    overallConfidence: 0.88  // 88% overall
  }
}
```

**Interpretation:**
- **> 0.8**: Excellent parsing
- **0.6-0.8**: Good parsing
- **0.4-0.6**: Fair parsing (some data may be missing)
- **< 0.4**: Poor parsing (manual review recommended)

### Check Format Classification

```javascript
{
  metadata: {
    classification: {
      format: 'standard-bullets',
      confidence: 0.85,
      reasoning: 'Bullet points indicate standard resume format',
      characteristics: {
        layout: 'single-column',
        separator: 'bullets',
        sectionStyle: 'block'
      },
      alternativeFormats: [
        { format: 'paragraph-based', confidence: 0.7 }
      ]
    }
  }
}
```

## 🔧 Troubleshooting

### Problem: Low Confidence Scores

**Solution:**
1. Check if resume has clear section headers (EDUCATION, SKILLS, etc.)
2. Verify text extraction quality (check raw text in logs)
3. Try adjusting confidence thresholds in config

### Problem: Wrong Format Detected

**Solution:**
1. Check alternative formats in classification result
2. Review feature extraction in logs
3. May need to add new format classification rules

### Problem: Missing Data

**Solution:**
1. Enable verbose logging: `verboseLogging: true`
2. Check which parser is failing in logs
3. Verify resume has the expected section
4. Check if section name is recognized (add to parser if needed)

### Problem: Parser Crashes

**Solution:**
1. Check if `enableFallback: true` in config
2. Review error logs for specific parser
3. Verify all parser files are present
4. Check if resume text is valid

## 🎯 Common Use Cases

### Use Case 1: Parse Resume and Save to Database

```javascript
// In your route handler
const result = await enhancedResumeParser.parseResume(pdfBuffer);

if (result.success) {
  // Save to database
  const resume = new Resume({
    ...result.data,
    optionalSections: result.data.optionalSections,
    sectionOrder: result.data.sectionOrder
  });
  await resume.save();
}
```

### Use Case 2: Get Format Classification Only

```javascript
const ResumeFormatClassifier = require('./services/ml/ResumeFormatClassifier');

const classifier = new ResumeFormatClassifier();
const classification = classifier.classify(resumeText);

console.log('Format:', classification.format);
console.log('Confidence:', classification.confidence);
```

### Use Case 3: Parse Specific Section Only

```javascript
const SkillsParser = require('./services/parsers/SkillsParser');

const parser = new SkillsParser();
const result = parser.parse(resumeText);

console.log('Skills:', result.data);
console.log('Confidence:', result.confidence);
```

### Use Case 4: Compare ML vs Legacy Parser

```javascript
// Parse with ML
parser.useMLParser = true;
const mlResult = await parser.parseResume(pdfBuffer);

// Parse with Legacy
parser.useMLParser = false;
const legacyResult = await parser.parseResume(pdfBuffer);

// Compare
console.log('ML Skills:', mlResult.data.skills.length);
console.log('Legacy Skills:', legacyResult.data.skills.length);
```

## 📚 Next Steps

1. **Read Full Documentation**: See `parsers/README.md`
2. **Review Configuration**: Check `config/parserConfig.js`
3. **Add Custom Parser**: Follow extension guide in README
4. **Write Tests**: Create unit tests for your use cases
5. **Monitor Performance**: Track parsing times and confidence scores

## 🆘 Need Help?

- Check logs for detailed parsing steps
- Review `ML_PARSER_SUMMARY.md` for architecture overview
- Check `parsers/README.md` for parser details
- Enable debug mode in config for more information

## ✅ Success Checklist

- [ ] Server starts without errors
- [ ] Can upload resume through frontend
- [ ] See ML parsing logs in terminal
- [ ] Resume data appears in frontend
- [ ] Confidence scores are reasonable (> 0.5)
- [ ] All sections are parsed correctly
- [ ] Optional sections (projects, certificates) are saved

If all checked, you're ready to go! 🎉
