/**
 * Cross-Field Consistency Validator
 * Validates logical consistency across resume fields (dates, locations, skills, etc.)
 */

const moment = require('moment');

class ConsistencyValidator {
  constructor() {
    this.validationRules = this.initializeValidationRules();
    console.log('✅ Consistency Validator initialized');
  }

  /**
   * Initialize validation rules
   */
  initializeValidationRules() {
    return {
      dateValidation: true,
      locationConsistency: true,
      skillExperienceAlignment: true,
      educationValidation: true,
      experienceOverlapDetection: true
    };
  }

  /**
   * Validate entire resume for consistency
   */
  validateResume(resumeData) {
    const errors = [];
    const warnings = [];
    const info = [];

    // Date validations
    const dateResults = this.validateDates(resumeData);
    errors.push(...dateResults.errors);
    warnings.push(...dateResults.warnings);

    // Education validations
    const educationResults = this.validateEducation(resumeData.education || []);
    errors.push(...educationResults.errors);
    warnings.push(...educationResults.warnings);

    // Experience validations
    const experienceResults = this.validateExperience(resumeData.experience || []);
    errors.push(...experienceResults.errors);
    warnings.push(...experienceResults.warnings);

    // Cross-field validations
    const crossFieldResults = this.validateCrossField(resumeData);
    errors.push(...crossFieldResults.errors);
    warnings.push(...crossFieldResults.warnings);
    info.push(...crossFieldResults.info);

    // Skill-experience alignment
    const skillResults = this.validateSkillExperienceAlignment(
      resumeData.skills || [],
      resumeData.experience || []
    );
    warnings.push(...skillResults.warnings);
    info.push(...skillResults.info);

    // Calculate overall validation score
    const score = this.calculateValidationScore(errors, warnings);

    return {
      valid: errors.length === 0,
      score,
      errors,
      warnings,
      info,
      summary: {
        totalErrors: errors.length,
        totalWarnings: warnings.length,
        totalInfo: info.length
      }
    };
  }

  /**
   * Validate date fields
   */
  validateDates(resumeData) {
    const errors = [];
    const warnings = [];

    // Validate education dates
    if (resumeData.education) {
      for (const edu of resumeData.education) {
        const dateValidation = this.validateDateRange(
          edu.startDate,
          edu.endDate,
          `Education at ${edu.school}`
        );
        errors.push(...dateValidation.errors);
        warnings.push(...dateValidation.warnings);

        // Check degree duration
        if (edu.startDate && edu.endDate && edu.endDate !== 'present') {
          const duration = this.calculateDuration(edu.startDate, edu.endDate);
          const expectedDuration = this.getExpectedDegreeDuration(edu.degree);

          if (expectedDuration && Math.abs(duration - expectedDuration) > 2) {
            warnings.push({
              field: 'education',
              item: edu.school,
              message: `Degree duration (${duration} years) differs from typical ${edu.degree} duration (${expectedDuration} years)`
            });
          }
        }
      }
    }

    // Validate experience dates
    if (resumeData.experience) {
      for (const exp of resumeData.experience) {
        const dateValidation = this.validateDateRange(
          exp.startDate,
          exp.endDate,
          `Experience at ${exp.company}`
        );
        errors.push(...dateValidation.errors);
        warnings.push(...dateValidation.warnings);
      }

      // Check for overlapping positions
      const overlaps = this.detectOverlappingExperience(resumeData.experience);
      for (const overlap of overlaps) {
        warnings.push({
          field: 'experience',
          message: `Overlapping positions detected: ${overlap.job1} and ${overlap.job2}`,
          details: overlap
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate date range
   */
  validateDateRange(startDate, endDate, context) {
    const errors = [];
    const warnings = [];

    if (!startDate) {
      warnings.push({
        field: 'date',
        context,
        message: 'Missing start date'
      });
      return { errors, warnings };
    }

    // Parse dates
    const start = this.parseDate(startDate);
    const end = endDate && endDate !== 'present' ? this.parseDate(endDate) : moment();

    if (!start.isValid()) {
      errors.push({
        field: 'date',
        context,
        message: `Invalid start date: ${startDate}`
      });
      return { errors, warnings };
    }

    if (endDate && endDate !== 'present' && !end.isValid()) {
      errors.push({
        field: 'date',
        context,
        message: `Invalid end date: ${endDate}`
      });
      return { errors, warnings };
    }

    // Check if start date is after end date
    if (start.isAfter(end)) {
      errors.push({
        field: 'date',
        context,
        message: 'Start date is after end date'
      });
    }

    // Check if dates are in the future
    const now = moment();
    if (start.isAfter(now)) {
      errors.push({
        field: 'date',
        context,
        message: 'Start date is in the future'
      });
    }

    // Check if dates are too far in the past (> 50 years)
    if (start.isBefore(moment().subtract(50, 'years'))) {
      warnings.push({
        field: 'date',
        context,
        message: 'Start date is more than 50 years ago'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate education entries
   */
  validateEducation(education) {
    const errors = [];
    const warnings = [];

    for (const edu of education) {
      // Check required fields
      if (!edu.school) {
        errors.push({
          field: 'education',
          message: 'Missing school name'
        });
      }

      if (!edu.degree) {
        warnings.push({
          field: 'education',
          item: edu.school,
          message: 'Missing degree information'
        });
      }

      // Validate GPA if present
      if (edu.gpa) {
        const gpaValidation = this.validateGPA(edu.gpa);
        if (!gpaValidation.valid) {
          warnings.push({
            field: 'education',
            item: edu.school,
            message: gpaValidation.message
          });
        }
      }
    }

    // Check chronological order
    const sortedEducation = [...education].sort((a, b) => {
      const dateA = this.parseDate(a.startDate);
      const dateB = this.parseDate(b.startDate);
      return dateA.valueOf() - dateB.valueOf();
    });

    if (JSON.stringify(sortedEducation) !== JSON.stringify(education)) {
      warnings.push({
        field: 'education',
        message: 'Education entries are not in chronological order'
      });
    }

    return { errors, warnings };
  }

  /**
   * Validate experience entries
   */
  validateExperience(experience) {
    const errors = [];
    const warnings = [];

    for (const exp of experience) {
      // Check required fields
      if (!exp.company) {
        errors.push({
          field: 'experience',
          message: 'Missing company name'
        });
      }

      if (!exp.position && !exp.title) {
        errors.push({
          field: 'experience',
          item: exp.company,
          message: 'Missing position/title'
        });
      }

      // Check description length
      if (exp.description && exp.description.length < 20) {
        warnings.push({
          field: 'experience',
          item: exp.company,
          message: 'Job description is very short (< 20 characters)'
        });
      }
    }

    return { errors, warnings };
  }

  /**
   * Validate cross-field consistency
   */
  validateCrossField(resumeData) {
    const errors = [];
    const warnings = [];
    const info = [];

    const education = resumeData.education || [];
    const experience = resumeData.experience || [];

    // Check if education dates align with experience dates
    if (education.length > 0 && experience.length > 0) {
      const latestEducation = this.getLatestEducation(education);
      const earliestExperience = this.getEarliestExperience(experience);

      if (latestEducation && earliestExperience) {
        const eduEnd = this.parseDate(latestEducation.endDate);
        const expStart = this.parseDate(earliestExperience.startDate);

        if (eduEnd.isValid() && expStart.isValid()) {
          // Check if experience started before education ended
          if (expStart.isBefore(eduEnd)) {
            info.push({
              field: 'cross-field',
              message: 'Work experience overlaps with education (possible part-time work or internship)'
            });
          }

          // Check gap between education and first job
          const gap = expStart.diff(eduEnd, 'months');
          if (gap > 12) {
            warnings.push({
              field: 'cross-field',
              message: `${gap} month gap between graduation and first job`
            });
          }
        }
      }
    }

    // Check age consistency (if birth year is available)
    if (resumeData.personalInfo && resumeData.personalInfo.birthYear) {
      const ageValidation = this.validateAgeConsistency(
        resumeData.personalInfo.birthYear,
        education,
        experience
      );
      warnings.push(...ageValidation.warnings);
    }

    return { errors, warnings, info };
  }

  /**
   * Validate skill-experience alignment
   */
  validateSkillExperienceAlignment(skills, experience) {
    const warnings = [];
    const info = [];

    if (skills.length === 0) {
      warnings.push({
        field: 'skills',
        message: 'No skills listed'
      });
      return { warnings, info };
    }

    // Extract technologies mentioned in experience descriptions
    const experienceTechnologies = new Set();
    for (const exp of experience) {
      const description = exp.description || '';
      const technologies = this.extractTechnologies(description);
      technologies.forEach(tech => experienceTechnologies.add(tech.toLowerCase()));
    }

    // Check if skills are mentioned in experience
    const skillsNotInExperience = [];
    for (const skill of skills) {
      const skillLower = skill.toLowerCase();
      if (!experienceTechnologies.has(skillLower)) {
        skillsNotInExperience.push(skill);
      }
    }

    if (skillsNotInExperience.length > 0 && skillsNotInExperience.length < skills.length) {
      info.push({
        field: 'skills',
        message: `${skillsNotInExperience.length} skills not explicitly mentioned in experience descriptions`,
        details: skillsNotInExperience.slice(0, 5) // Show first 5
      });
    }

    return { warnings, info };
  }

  /**
   * Detect overlapping experience
   */
  detectOverlappingExperience(experience) {
    const overlaps = [];

    for (let i = 0; i < experience.length; i++) {
      for (let j = i + 1; j < experience.length; j++) {
        const exp1 = experience[i];
        const exp2 = experience[j];

        const start1 = this.parseDate(exp1.startDate);
        const end1 = exp1.endDate === 'present' ? moment() : this.parseDate(exp1.endDate);
        const start2 = this.parseDate(exp2.startDate);
        const end2 = exp2.endDate === 'present' ? moment() : this.parseDate(exp2.endDate);

        if (!start1.isValid() || !end1.isValid() || !start2.isValid() || !end2.isValid()) {
          continue;
        }

        // Check for overlap
        if (start1.isBefore(end2) && start2.isBefore(end1)) {
          overlaps.push({
            job1: `${exp1.position || exp1.title} at ${exp1.company}`,
            job2: `${exp2.position || exp2.title} at ${exp2.company}`,
            overlapMonths: this.calculateOverlapMonths(start1, end1, start2, end2)
          });
        }
      }
    }

    return overlaps;
  }

  /**
   * Calculate overlap in months
   */
  calculateOverlapMonths(start1, end1, start2, end2) {
    const overlapStart = moment.max(start1, start2);
    const overlapEnd = moment.min(end1, end2);
    return overlapEnd.diff(overlapStart, 'months');
  }

  /**
   * Validate GPA
   */
  validateGPA(gpa) {
    const gpaNum = parseFloat(gpa);
    
    if (isNaN(gpaNum)) {
      return { valid: false, message: 'GPA must be a number' };
    }

    if (gpaNum < 0 || gpaNum > 4.0) {
      return { valid: false, message: 'GPA should be between 0.0 and 4.0' };
    }

    return { valid: true };
  }

  /**
   * Get expected degree duration
   */
  getExpectedDegreeDuration(degree) {
    const durations = {
      'Associate': 2,
      'Bachelor': 4,
      'Master': 2,
      'PhD': 5,
      'Doctorate': 5
    };

    for (const [key, duration] of Object.entries(durations)) {
      if (degree && degree.includes(key)) {
        return duration;
      }
    }

    return null;
  }

  /**
   * Validate age consistency
   */
  validateAgeConsistency(birthYear, education, experience) {
    const warnings = [];
    const currentYear = new Date().getFullYear();
    const age = currentYear - birthYear;

    // Check if graduation age is reasonable (typically 20-25 for Bachelor's)
    for (const edu of education) {
      if (edu.endDate && edu.endDate !== 'present') {
        const gradYear = this.parseDate(edu.endDate).year();
        const gradAge = gradYear - birthYear;

        if (edu.degree && edu.degree.includes('Bachelor')) {
          if (gradAge < 18) {
            warnings.push({
              field: 'age',
              message: `Graduation age (${gradAge}) seems too young for Bachelor's degree`
            });
          } else if (gradAge > 30) {
            warnings.push({
              field: 'age',
              message: `Graduation age (${gradAge}) is older than typical for Bachelor's degree`
            });
          }
        }
      }
    }

    return { warnings };
  }

  /**
   * Parse date string to moment object
   */
  parseDate(dateStr) {
    if (!dateStr || dateStr === 'present') {
      return moment();
    }

    // Try multiple formats
    const formats = [
      'YYYY-MM',
      'YYYY-MM-DD',
      'YYYY',
      'MMM YYYY',
      'MMMM YYYY',
      'MM/YYYY',
      'MM/DD/YYYY'
    ];

    for (const format of formats) {
      const parsed = moment(dateStr, format, true);
      if (parsed.isValid()) {
        return parsed;
      }
    }

    return moment.invalid();
  }

  /**
   * Calculate duration in years
   */
  calculateDuration(startDate, endDate) {
    const start = this.parseDate(startDate);
    const end = endDate === 'present' ? moment() : this.parseDate(endDate);
    return end.diff(start, 'years', true);
  }

  /**
   * Get latest education entry
   */
  getLatestEducation(education) {
    return education.reduce((latest, current) => {
      const latestEnd = this.parseDate(latest.endDate);
      const currentEnd = this.parseDate(current.endDate);
      return currentEnd.isAfter(latestEnd) ? current : latest;
    }, education[0]);
  }

  /**
   * Get earliest experience entry
   */
  getEarliestExperience(experience) {
    return experience.reduce((earliest, current) => {
      const earliestStart = this.parseDate(earliest.startDate);
      const currentStart = this.parseDate(current.startDate);
      return currentStart.isBefore(earliestStart) ? current : earliest;
    }, experience[0]);
  }

  /**
   * Extract technologies from text
   */
  extractTechnologies(text) {
    const techKeywords = [
      'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'PHP', 'Ruby', 'Go', 'Rust',
      'React', 'Angular', 'Vue', 'Node.js', 'Express', 'Django', 'Flask', 'Spring',
      'HTML', 'CSS', 'SQL', 'MongoDB', 'PostgreSQL', 'MySQL', 'Redis', 'Firebase',
      'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'GitHub',
      'Machine Learning', 'TensorFlow', 'PyTorch', 'NLP', 'Computer Vision'
    ];

    const found = [];
    const textLower = text.toLowerCase();

    for (const tech of techKeywords) {
      if (textLower.includes(tech.toLowerCase())) {
        found.push(tech);
      }
    }

    return found;
  }

  /**
   * Calculate validation score (0-100)
   */
  calculateValidationScore(errors, warnings) {
    let score = 100;
    
    // Deduct points for errors (10 points each)
    score -= errors.length * 10;
    
    // Deduct points for warnings (3 points each)
    score -= warnings.length * 3;
    
    return Math.max(0, Math.min(100, score));
  }
}

module.exports = ConsistencyValidator;
