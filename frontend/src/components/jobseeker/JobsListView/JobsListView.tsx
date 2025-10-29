import React, { useState, useEffect } from 'react';
import { FiMapPin, FiClock, FiDollarSign, FiBookmark, FiSearch, FiEye, FiBriefcase, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import styles from './JobsListView.module.css';
import { getImageSrc } from '../../../utils/imageUtils';
import { Job } from '../../../types/Job';

interface JobsListViewProps {
  jobs: Job[];
  onJobClick: (job: Job) => void;
  onSaveJob?: (jobId: string | number) => void;
  onApplyJob?: (jobId: string | number) => void;
  savedJobs?: Set<string | number>;
  appliedJobs?: Set<string | number>;
  jobseekerSkills?: string[]; // Skills from jobseeker's resume
  jobseekerEducation?: string; // Education from jobseeker's resume
}

export const JobsListView: React.FC<JobsListViewProps> = ({
  jobs,
  onJobClick,
  onSaveJob,
  onApplyJob,
  savedJobs = new Set(),
  appliedJobs = new Set(),
  jobseekerSkills = [],
  jobseekerEducation,
}) => {
  const [showMatchingInfo, setShowMatchingInfo] = useState(false);
  // Levenshtein distance for fuzzy matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        const indicator = str1[j - 1] === str2[i - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1,     // deletion
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  // Enhanced TF-IDF calculation with cosine similarity and keyword extraction
  const calculateMatchScore = (job: Job, jobseekerEducation?: string | Array<any> | { level?: string; field?: string; degrees?: Array<{degree?: string; school?: string; major?: string; course?: string}> }, debug: boolean = false): number => {
    if (!jobseekerSkills || jobseekerSkills.length === 0) return 0;
    if (!job.requirements || job.requirements.length === 0) return 0;
    
    if (debug) console.log('=== MATCH SCORE DEBUG ===');
    if (debug) console.log('Job Requirements:', job.requirements);
    if (debug) console.log('Jobseeker Skills:', jobseekerSkills);
    
    // Extract keywords from job requirements (handles natural language descriptions)
    const extractKeywords = (requirements: string[]): string[] => {
      const allSkills = [
        // Technical Skills
        'javascript', 'java', 'python', 'react', 'angular', 'vue', 'node', 'nodejs', 'express',
        'typescript', 'html', 'css', 'sass', 'scss', 'bootstrap', 'tailwind', 'jquery',
        'php', 'laravel', 'symfony', 'ruby', 'rails', 'go', 'rust', 'swift', 'kotlin',
        'c++', 'c#', 'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
        'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'git', 'github', 'gitlab',
        'jenkins', 'ci/cd', 'devops', 'linux', 'unix', 'bash', 'shell', 'powershell',
        'machine learning', 'ml', 'ai', 'tensorflow', 'pytorch', 'pandas', 'numpy',
        'data science', 'analytics', 'tableau', 'powerbi', 'excel', 'stata',
        'ui/ux', 'figma', 'sketch', 'adobe', 'photoshop', 'illustrator', 'xd',
        'agile', 'scrum', 'kanban', 'jira', 'confluence', 'slack', 'teams',
        'testing', 'jest', 'cypress', 'selenium', 'junit', 'mocha', 'chai',
        'frontend', 'backend', 'fullstack', 'web development', 'api', 'rest', 'graphql',
        
        // Soft Skills & Communication
        'communication', 'leadership', 'teamwork', 'collaboration', 'problem solving',
        'critical thinking', 'analytical thinking', 'creativity', 'innovation', 'adaptability',
        'time management', 'organization', 'multitasking', 'attention to detail', 'reliability',
        'initiative', 'self-motivated', 'proactive', 'flexibility', 'stress management',
        'emotional intelligence', 'interpersonal skills', 'public speaking', 'presentation',
        'negotiation', 'conflict resolution', 'mentoring', 'coaching', 'training',
        
        // Business & Management
        'project management', 'product management', 'business analysis', 'strategic planning',
        'budget management', 'financial analysis', 'risk management', 'quality assurance',
        'process improvement', 'change management', 'stakeholder management', 'vendor management',
        'customer service', 'client relations', 'sales', 'marketing', 'business development',
        'market research', 'competitive analysis', 'roi analysis', 'kpi tracking',
        
        // Industry-Specific Skills
        'healthcare', 'nursing', 'medical', 'patient care', 'clinical', 'pharmaceutical',
        'accounting', 'bookkeeping', 'auditing', 'tax preparation', 'payroll', 'invoicing',
        'legal', 'compliance', 'regulatory', 'contracts', 'litigation', 'intellectual property',
        'education', 'teaching', 'curriculum development', 'lesson planning', 'assessment',
        'engineering', 'mechanical', 'electrical', 'civil', 'chemical', 'manufacturing',
        'construction', 'architecture', 'design', 'cad', 'autocad', 'solidworks',
        'logistics', 'supply chain', 'inventory management', 'procurement', 'warehousing',
        'retail', 'merchandising', 'pos systems', 'inventory control', 'customer relations',
        
        // Digital & Marketing Skills
        'digital marketing', 'social media', 'content marketing', 'seo', 'sem', 'ppc',
        'email marketing', 'copywriting', 'content creation', 'brand management',
        'graphic design', 'video editing', 'photography', 'wordpress', 'cms',
        'google analytics', 'facebook ads', 'linkedin', 'instagram', 'tiktok',
        
        // Languages & Certifications
        'english', 'spanish', 'french', 'mandarin', 'japanese', 'german', 'korean',
        'bilingual', 'multilingual', 'translation', 'interpretation',
        'pmp', 'cissp', 'cpa', 'cfa', 'six sigma', 'lean', 'itil', 'prince2',
        'microsoft office', 'word', 'powerpoint', 'outlook', 'google workspace',
        
        // Research & Analysis
        'research', 'data analysis', 'statistical analysis', 'survey design',
        'qualitative research', 'quantitative research', 'market analysis',
        'competitive intelligence', 'trend analysis', 'forecasting', 'modeling'
      ];
      
      const extractedSkills = new Set<string>();
      
      requirements.forEach(req => {
        const lowerReq = req.toLowerCase();
        
        // Extract exact skill matches with word boundaries
        allSkills.forEach(skill => {
          // Create regex with word boundaries to avoid substring matches
          const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
          if (regex.test(lowerReq)) {
            extractedSkills.add(skill);
          }
        });
        
        // Extract skills from common patterns
        const patterns = [
          /(?:experience with|proficient in|knowledge of|familiar with|skilled in)\s+([\w\s,/+-]+?)(?:\.|,|;|$)/gi,
          /(?:must have|required|need)\s+([\w\s,/+-]+?)(?:\s+(?:experience|skills?|knowledge))/gi,
          /([\w+#-]{3,})\s+(?:programming|development|framework|library|database|tool)/gi,
          /\b([a-z]{3,})(?:\.js|\.py|\.php|\.rb|\.go)\b/gi
        ];
        
        patterns.forEach(pattern => {
          let match;
          while ((match = pattern.exec(lowerReq)) !== null) {
            const extracted = match[1].trim();
            if (extracted.length > 1 && extracted.length < 30) {
              // Split by common separators and clean
              extracted.split(/[,/&+\s]+/).forEach(skill => {
                const cleanSkill = skill.trim().replace(/[^a-z0-9+#-]/g, '');
                if (cleanSkill.length > 1 && allSkills.includes(cleanSkill)) {
                  extractedSkills.add(cleanSkill);
                }
              });
            }
          }
        });
      });
      
      return Array.from(extractedSkills);
    };
    
    // Create TF-IDF vectors
    const createTFIDFVector = (skills: string[], allSkills: string[]): number[] => {
      const vector = new Array(allSkills.length).fill(0);
      const skillCounts = new Map<string, number>();
      
      // Count term frequencies
      skills.forEach(skill => {
        skillCounts.set(skill, (skillCounts.get(skill) || 0) + 1);
      });
      
      // Calculate TF for each skill (simplified - just presence/absence)
      allSkills.forEach((skill, index) => {
        const tf = skillCounts.has(skill) ? 1 : 0; // Binary presence
        vector[index] = tf;
      });
      
      return vector;
    };
    
    // Calculate cosine similarity
    const cosineSimilarity = (vecA: number[], vecB: number[]): number => {
      let dotProduct = 0;
      let normA = 0;
      let normB = 0;
      
      for (let i = 0; i < vecA.length; i++) {
        dotProduct += vecA[i] * vecB[i];
        normA += vecA[i] * vecA[i];
        normB += vecB[i] * vecB[i];
      }
      
      if (normA === 0 || normB === 0) return 0;
      return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
    };
    
    // Extract keywords from job requirements
    const jobKeywords = extractKeywords(job.requirements);
    const lowerJobseekerSkills = jobseekerSkills.map(s => s.toLowerCase());
    
    if (debug) console.log('Extracted Job Keywords:', jobKeywords);
    if (debug) console.log('Normalized Jobseeker Skills:', lowerJobseekerSkills);
    
    // Create unified skill vocabulary
    const allSkills = Array.from(new Set([...jobKeywords, ...lowerJobseekerSkills]));
    
    if (debug) console.log('All Skills Vocabulary:', allSkills);
    
    // Create TF-IDF vectors
    const jobVector = createTFIDFVector(jobKeywords, allSkills);
    const candidateVector = createTFIDFVector(lowerJobseekerSkills, allSkills);
    
    if (debug) console.log('Job Vector:', jobVector);
    if (debug) console.log('Candidate Vector:', candidateVector);
    
    // Calculate cosine similarity score
    const cosineSim = cosineSimilarity(jobVector, candidateVector);
    
    // Enhanced exact matching for bonus
    const exactMatches = lowerJobseekerSkills.filter(skill => jobKeywords.includes(skill));
    const exactMatchRate = jobKeywords.length > 0 ? exactMatches.length / jobKeywords.length : 0;
    
    if (debug) console.log('Cosine Similarity:', cosineSim);
    if (debug) console.log('Exact Matches:', exactMatches);
    if (debug) console.log('Exact Match Rate:', exactMatchRate);
    
    // Combine cosine similarity with exact matching bonus
    const skillsScore = (cosineSim * 0.6 + exactMatchRate * 0.4) * 0.7; // 70% weight for skills
    
    if (debug) console.log('Skills Score (70%):', skillsScore);

    // Skills matching calculation complete
    
    // Education matching (30% weight)
    let educationScore = 0;
    if (jobseekerEducation && (job.educationLevel || job.preferredCourse)) {
      let educationMatch = 0;
      let totalEducationFactors = 0;
      
      // Handle string, object, or array education data
      let educationText = '';
      if (typeof jobseekerEducation === 'string') {
        educationText = jobseekerEducation;
      } else if (Array.isArray(jobseekerEducation)) {
        // Handle array of education objects
        educationText = jobseekerEducation.map(edu => 
          `${edu.degree || ''} ${edu.school || ''} ${edu.major || ''} ${edu.course || ''} ${edu.field || ''}`
        ).join(' ');
      } else if (jobseekerEducation && typeof jobseekerEducation === 'object') {
        // Handle single education object
        if (jobseekerEducation.degrees && Array.isArray(jobseekerEducation.degrees)) {
          educationText = jobseekerEducation.degrees.map(edu => `${edu.degree || ''} ${edu.school || ''} ${edu.major || ''} ${edu.course || ''}`).join(' ');
        } else {
          educationText = `${jobseekerEducation.level || ''} ${jobseekerEducation.field || ''}`;
        }
      }
      
      const educationLower = educationText.toLowerCase();
      
      // Education data processing complete
      
      // Education level matching with enhanced equivalence recognition
      if (job.educationLevel) {
        totalEducationFactors++;
        const requiredLevel = job.educationLevel.toLowerCase();
        
        // Check if education level matches
        let hasMatchingLevel = false;
        
        // Bachelor's degree variations
        if (requiredLevel.includes('bachelor') && 
            (educationLower.includes('bachelor') || educationLower.includes('bs ') || 
             educationLower.includes('ba ') || educationLower.includes('undergraduate') ||
             educationLower.includes('bsc') || educationLower.includes('b.s'))) {
          hasMatchingLevel = true;
        }
        
        // Master's degree variations
        if (requiredLevel.includes('master') && 
            (educationLower.includes('master') || educationLower.includes('ms ') || 
             educationLower.includes('ma ') || educationLower.includes('graduate'))) {
          hasMatchingLevel = true;
        }
        
        // Doctorate variations
        if (requiredLevel.includes('doctorate') && 
            (educationLower.includes('doctorate') || educationLower.includes('phd') || 
             educationLower.includes('ph.d'))) {
          hasMatchingLevel = true;
        }
        
        // Associate degree variations
        if (requiredLevel.includes('associate') && 
            (educationLower.includes('associate') || educationLower.includes('aa ') || 
             educationLower.includes('as '))) {
          hasMatchingLevel = true;
        }
        
        // High school variations
        if (requiredLevel.includes('high school') && 
            (educationLower.includes('high school') || educationLower.includes('secondary'))) {
          hasMatchingLevel = true;
        }
        
        if (hasMatchingLevel) {
          educationMatch += 1.0;
        }
      }
      
      // Course/field matching
      if (job.preferredCourse) {
        totalEducationFactors++;
        const jobCourseLower = job.preferredCourse.toLowerCase();
        
        // Simple keyword matching for course/field
        const jobKeywords = jobCourseLower.split(/[,\s]+/).filter(word => word.length > 2);
        const educationKeywords = educationLower.split(/[,\s]+/).filter(word => word.length > 2);
        
        // Count matching keywords with fuzzy matching for typos
        const matchingKeywords = jobKeywords.filter(jobWord => 
          educationKeywords.some(eduWord => {
            // Exact and partial matches
            if (eduWord.includes(jobWord) || jobWord.includes(eduWord)) return true;
            
            // Handle common abbreviations and variations
            if (jobWord === 'it' && (eduWord.includes('information') || eduWord.includes('technology'))) return true;
            if (jobWord === 'cs' && (eduWord.includes('computer') || eduWord.includes('science'))) return true;
            if (eduWord === 'it' && (jobWord.includes('information') || jobWord.includes('technology'))) return true;
            if (eduWord === 'cs' && (jobWord.includes('computer') || jobWord.includes('science'))) return true;
            
            // Common typo mappings
            const typoMappings: { [key: string]: string } = {
              'pyschology': 'psychology',
              'buisness': 'business',
              'managment': 'management',
              'enginnering': 'engineering',
              'compuer': 'computer',
              'scince': 'science',
              'mathemtics': 'mathematics',
              'litterature': 'literature'
            };
            
            const normalizedJobWord = typoMappings[jobWord] || jobWord;
            const normalizedEduWord = typoMappings[eduWord] || eduWord;
            
            if (normalizedJobWord !== jobWord && (eduWord.includes(normalizedJobWord) || normalizedJobWord.includes(eduWord))) return true;
            if (normalizedEduWord !== eduWord && (jobWord.includes(normalizedEduWord) || normalizedEduWord.includes(jobWord))) return true;
            
            // Fuzzy matching for close spellings (allow 1-2 character differences for words > 4 chars)
            if (jobWord.length > 4 && eduWord.length > 4) {
              const distance = levenshteinDistance(jobWord, eduWord);
              const maxDistance = Math.floor(Math.min(jobWord.length, eduWord.length) * 0.25); // Allow 25% character differences
              return distance <= maxDistance;
            }
            
            return false;
          })
        );
        
        if (matchingKeywords.length > 0) {
          // Simple percentage match: matching keywords / total job keywords
          const courseMatch = matchingKeywords.length / jobKeywords.length;
          educationMatch += courseMatch;
        }
      }
      
      if (totalEducationFactors > 0) {
        educationScore = (educationMatch / totalEducationFactors) * 0.3; // 30% weight for education
      }
    }
    
    const totalScore = (skillsScore + educationScore) * 100;
    
    if (debug) console.log('Education Score (30%):', educationScore);
    if (debug) console.log('Total Score:', totalScore);
    if (debug) console.log('Final Score (capped at 100):', Math.min(100, Math.round(totalScore)));
    if (debug) console.log('=== END DEBUG ===');
    
    // Final score calculation complete
    
    return Math.min(100, Math.round(totalScore));
  };

  const formatSalary = (salary: string | number | undefined) => {
    if (!salary) return 'Salary not specified';
    return String(salary);
  };

  const formatLocation = (location: string | undefined) => {
    if (!location) return 'Location not specified';
    return location;
  };

  const formatJobType = (type: string | undefined) => {
    if (!type) return 'Full-time';
    return type;
  };

  const getCompanyInitials = (company: string) => {
    return company
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatPostedDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Not specified';
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 0) return 'Today';
      if (diffDays === 1) return 'Yesterday';
      if (diffDays < 7) return `${diffDays} days ago`;
      if (diffDays < 14) return '1 week ago';
      if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
      if (diffDays < 60) return '1 month ago';
      if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
      
      return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
      });
    } catch (error) {
      return 'Not specified';
    }
  };

  const getCompanyAvatar = (job: Job) => {
    if (job.companyLogo) {
      return (
        <img 
          src={getImageSrc(job.companyLogo)} 
          alt={`${job.company} logo`} 
          className={styles.companyLogoImage}
        />
      );
    }
    return <span>{getCompanyInitials(job.company)}</span>;
  };


  if (jobs.length === 0) {
    return (
      <div className={styles.emptyState}>
        <p>No jobs found matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className={styles.listContainer}>
      {/* Job Matching Info Toggle */}
      <div style={{ 
        marginBottom: '16px'
      }}>
        <button
          onClick={() => setShowMatchingInfo(!showMatchingInfo)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            width: '100%',
            padding: '12px 16px',
            backgroundColor: showMatchingInfo ? '#e3f2fd' : '#ffffff',
            border: `2px solid ${showMatchingInfo ? '#2196f3' : '#e0e0e0'}`,
            borderRadius: '10px',
            cursor: 'pointer',
            fontSize: '15px',
            fontWeight: '600',
            color: showMatchingInfo ? '#1565c0' : '#424242',
            transition: 'all 0.3s ease',
            boxShadow: showMatchingInfo ? '0 2px 8px rgba(33, 150, 243, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)',
            outline: 'none'
          }}
          onMouseEnter={(e) => {
            if (!showMatchingInfo) {
              e.currentTarget.style.backgroundColor = '#f5f5f5';
              e.currentTarget.style.borderColor = '#bdbdbd';
              e.currentTarget.style.boxShadow = '0 2px 6px rgba(0, 0, 0, 0.15)';
            }
          }}
          onMouseLeave={(e) => {
            if (!showMatchingInfo) {
              e.currentTarget.style.backgroundColor = '#ffffff';
              e.currentTarget.style.borderColor = '#e0e0e0';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
            }
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: '24px',
              height: '24px',
              backgroundColor: showMatchingInfo ? '#2196f3' : '#9e9e9e',
              borderRadius: '50%',
              color: 'white',
              fontSize: '12px',
              fontWeight: 'bold',
              transition: 'all 0.3s ease'
            }}>
              ?
            </span>
            <span>How does job matching work?</span>
          </div>
          <span style={{
            transform: showMatchingInfo ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease',
            color: showMatchingInfo ? '#2196f3' : '#757575'
          }}>
            <FiChevronDown size={20} />
          </span>
        </button>
        
        {showMatchingInfo && (
          <div style={{ 
            padding: '16px', 
            backgroundColor: '#e8f4fd', 
            border: '1px solid #b3d9ff', 
            borderRadius: '6px', 
            marginTop: '8px',
            color: '#0c5460',
            animation: 'fadeIn 0.2s ease-in'
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
              <span style={{ 
                fontSize: '16px', 
                fontWeight: 'bold', 
                color: '#0066cc',
                minWidth: '20px'
              }}></span>
              <div>
                <strong>How Job Matching Works:</strong>
                <p style={{ margin: '8px 0 0 0', fontSize: '14px', lineHeight: '1.5' }}>
                  Our matching system compares your profile with job requirements to calculate a compatibility score. 
                  The algorithm analyzes various aspects of your background and matches them with what employers are looking for. 
                  Jobs are automatically sorted by match score, with the most compatible opportunities appearing first. 
                  This helps you quickly identify positions that best align with your qualifications and experience.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {(!jobseekerSkills || jobseekerSkills.length === 0) && (
        <div style={{ 
          padding: '12px', 
          backgroundColor: '#fff3cd', 
          border: '1px solid #ffeaa7', 
          borderRadius: '4px', 
          marginBottom: '16px',
          color: '#856404'
        }}>
          <strong>💡 Tip:</strong> Add skills to your resume to see accurate job matching scores based on your qualifications.
        </div>
      )}
      
      <div className={styles.listHeader}>
        <div className={styles.headerCell}>#</div>
        <div className={styles.headerCell}>Top Jobs</div>
        <div className={styles.headerCell}>Required Skills</div>
        <div className={styles.headerCell}>My Skills</div>
        <div className={styles.headerCell}>
          Match Score
          {(!jobseekerSkills || jobseekerSkills.length === 0) && (
            <span style={{ fontSize: '0.7em', color: '#666', fontWeight: 'normal' }}>
              (No skills in resume)
            </span>
          )}
        </div>
        <div className={styles.headerCell}>Action</div>
      </div>
      
      <div className={styles.listBody}>
        {jobs
                .map(job => ({ ...job, matchScore: calculateMatchScore(job, jobseekerEducation, job.title?.toLowerCase().includes('debug') || false) }))
                .sort((a, b) => b.matchScore - a.matchScore)
                .map((job, index) => {
                  const matchScore = job.matchScore;
                  // Use the original job.id for consistency with savedJobs Set
                  const isSaved = savedJobs.has(job.id);
                  const isApplied = appliedJobs.has(job.id);

                  return (
                    <div key={job.id} className={styles.listRow}>
              <div className={styles.numberCell}>
                <span className={styles.rowNumber}>{index + 1}</span>
              </div>
              
              <div className={styles.companyCell}>
                <div className={styles.avatar}>
                  {getCompanyAvatar(job)}
                </div>
                <div className={styles.companyInfo}>
                  <div className={styles.companyName}>{job.title}</div>
                  <div className={styles.jobTitle}>{job.company}</div>
                  <div className={styles.postedDate}>
                    <FiClock className={styles.clockIcon} />
                    {formatPostedDate(job.postedDate || job.posted)}
                  </div>
                </div>
              </div>
              
              <div className={styles.skillsCell} data-label="Required Skills">
                {job.requirements && job.requirements.length > 0 ? (
                  <div className={styles.skillsList}>
                    {job.requirements.slice(0, 3).map((skill, i) => (
                      <span key={i} className={styles.skillTag}>
                        {skill}
                      </span>
                    ))}
                    {job.requirements.length > 3 && (
                      <span className={styles.moreSkills}>+{job.requirements.length - 3} more</span>
                    )}
                  </div>
                ) : (
                  <span className={styles.noSkills}>No requirements listed</span>
                )}
              </div>
              
              <div className={styles.skillsCell} data-label="My Skills">
                {jobseekerSkills && jobseekerSkills.length > 0 ? (
                  <div className={styles.skillsList}>
                    {jobseekerSkills.slice(0, 3).map((skill, i) => (
                      <span key={i} className={styles.skillTag}>
                        {skill}
                      </span>
                    ))}
                    {jobseekerSkills.length > 3 && (
                      <span className={styles.moreSkills}>+{jobseekerSkills.length - 3} more</span>
                    )}
                  </div>
                ) : (
                  <span className={styles.noSkills}>No skills in resume</span>
                )}
              </div>
              
              <div className={styles.matchCell} data-label="Match Score">
                <div className={styles.matchScore}>
                  <div className={styles.matchBar}>
                    <div 
                      className={styles.matchFill} 
                      style={{ width: `${matchScore}%` }}
                    />
                  </div>
                  <span className={styles.matchText}>{matchScore}%</span>
                </div>
              </div>
              
              <div className={styles.actionsCell}>
              {onSaveJob && (
                  <button
                    onClick={() => onSaveJob(job.id)}
                    className={`${styles.saveButton} ${isSaved ? styles.saved : ''}`}
                    title={isSaved ? "Remove from saved" : "Save job"}
                  >
                    <FiBookmark className={`${styles.icon} ${isSaved ? styles.iconFilled : ''}`} />
                  </button>
                )}
                
                <button
                  className={styles.viewButton}
                  onClick={() => onJobClick(job)}
                  title="View job details"
                >
                  <FiEye className={styles.icon} />
                </button>
               
                {onApplyJob && (
                  <button
                    onClick={() => !isApplied && onApplyJob(job.id)}
                    className={`${styles.applyButton} ${isApplied ? styles.applied : ''}`}
                    title={isApplied ? "Already applied" : "Apply to this job"}
                    disabled={isApplied}
                  >
                    <FiBriefcase className={styles.icon} />
                    {isApplied ? 'Applied' : 'Apply'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
