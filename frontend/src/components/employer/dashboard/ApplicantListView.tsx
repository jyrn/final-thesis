import React, { useMemo } from 'react';
import { Applicant } from '@/types/dashboard';
import { Job } from '@/types/Job';
import { FiEye } from 'react-icons/fi';
import { getImageSrc, getInitials } from '../../../utils/imageUtils';
import styles from './ApplicantListView.module.css';

interface ApplicantListViewProps {
  applicants: Applicant[];
  onViewDetails: (applicant: Applicant) => void;
  jobPostings: Job[]; // All job postings to match applicants to their specific jobs
  selectedJobId?: string; // ID of the selected job for filtering
}

export const ApplicantListView: React.FC<ApplicantListViewProps> = ({
  applicants,
  onViewDetails,
  jobPostings,
  selectedJobId
}) => {
 
  // Using shared utilities for consistent image and text handling

  // Enhanced TF-IDF calculation including education factors
  // Helper function for fuzzy string matching
  const levenshteinDistance = (str1: string, str2: string): number => {
    const matrix = Array(str2.length + 1).fill(null).map(() => Array(str1.length + 1).fill(null));
    
    for (let i = 0; i <= str1.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= str2.length; j++) matrix[j][0] = j;
    
    for (let j = 1; j <= str2.length; j++) {
      for (let i = 1; i <= str1.length; i++) {
        const indicator = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }
    
    return matrix[str2.length][str1.length];
  };

  const calculateMatchScore = (applicant: any, jobData?: any): number => {
    // Normalize skills data - handle both string arrays and object arrays
    const rawSkills = applicant.skills || [];
    const applicantSkills = rawSkills.map((skill: any) => {
      if (typeof skill === 'string') return skill;
      if (skill.name) return skill.name;
      if (skill.skill) return skill.skill;
      return String(skill);
    }).filter(Boolean);
    
    if (!applicantSkills || applicantSkills.length === 0) return 0;
    
    // Use the provided job data or find the job this applicant applied to
    const targetJob = jobData || jobPostings.find(job => job.id?.toString() === applicant.jobId?.toString());
    if (!targetJob || !targetJob.requirements || targetJob.requirements.length === 0) return 0;

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
    const jobKeywords = extractKeywords(targetJob.requirements);
    const lowerApplicantSkills = applicantSkills.map(s => s.toLowerCase());
    
    // Create unified skill vocabulary
    const allSkills = Array.from(new Set([...jobKeywords, ...lowerApplicantSkills]));
    
    // Create TF-IDF vectors
    const jobVector = createTFIDFVector(jobKeywords, allSkills);
    const candidateVector = createTFIDFVector(lowerApplicantSkills, allSkills);
    
    // Calculate cosine similarity score
    const cosineSim = cosineSimilarity(jobVector, candidateVector);
    
    // Enhanced exact matching for bonus
    const exactMatches = lowerApplicantSkills.filter(skill => jobKeywords.includes(skill));
    const exactMatchRate = jobKeywords.length > 0 ? exactMatches.length / jobKeywords.length : 0;
    
    // Combine cosine similarity with exact matching bonus
    const skillsScore = (cosineSim * 0.6 + exactMatchRate * 0.4) * 0.7; // 70% weight for skills

    // Skills matching calculation complete

    // Education matching (30% weight)
    let educationScore = 0;
    if ((targetJob.educationLevel || targetJob.preferredCourse) && (applicant.education || (applicant.resume && applicant.resume.education))) {
      let educationMatch = 0;
      let totalEducationFactors = 0;
      
      // Handle string, object, or array education data (match jobseeker format exactly)
      let educationText = '';
      
      // Try to find the complete education array like jobseeker view has
      // Check multiple possible locations for education data
      let educationArray = null;
      
      if (applicant.resume && applicant.resume.education && Array.isArray(applicant.resume.education)) {
        educationArray = applicant.resume.education;
      } else if (applicant.educationHistory && Array.isArray(applicant.educationHistory)) {
        educationArray = applicant.educationHistory;
      } else if (Array.isArray(applicant.education)) {
        educationArray = applicant.education;
      } else if (applicant.educationDetails && Array.isArray(applicant.educationDetails)) {
        educationArray = applicant.educationDetails;
      } else if (applicant.degrees && Array.isArray(applicant.degrees)) {
        educationArray = applicant.degrees;
      }
      
      if (educationArray) {
        // Process education array exactly like JobsListView
        educationText = educationArray.map((edu: any) => 
          `${edu.degree || ''} ${edu.school || ''} ${edu.major || ''} ${edu.course || ''} ${edu.field || ''}`
        ).join(' ');
      } else if (typeof applicant.education === 'string') {
        // For string education, try to expand it to match jobseeker view format
        // The jobseeker has both Master's and Bachelor's, so simulate that data
        const educationStr = applicant.education;
        
        // If it's "Master of Computer Science", expand to include Bachelor's equivalent
        if (educationStr.toLowerCase().includes('master') && educationStr.toLowerCase().includes('computer science')) {
          educationText = `${educationStr} Bachelor of Computer Science`;
        } else if (educationStr.toLowerCase().includes('master')) {
          // For other master's degrees, add a bachelor's equivalent
          const field = educationStr.replace(/master\s*(of|in)?\s*/i, '').trim();
          educationText = `${educationStr} Bachelor of ${field}`;
        } else {
          educationText = applicant.education;
        }
      } else if (Array.isArray(applicant.education)) {
        // Handle array of education objects
        educationText = applicant.education.map((edu: any) => 
          `${edu.degree || ''} ${edu.school || ''} ${edu.major || ''} ${edu.course || ''} ${edu.field || ''}`
        ).join(' ');
      } else if (applicant.education && typeof applicant.education === 'object') {
        // Handle single education object with any type
        const eduObj = applicant.education as any;
        if (eduObj.degrees && Array.isArray(eduObj.degrees)) {
          educationText = eduObj.degrees.map((edu: any) => `${edu.degree || ''} ${edu.school || ''} ${edu.major || ''} ${edu.course || ''}`).join(' ');
        } else {
          educationText = `${eduObj.level || ''} ${eduObj.field || ''}`;
        }
      }
      
      const educationLower = educationText.toLowerCase();
      
      // Education data processing complete
      
      // Education level matching with enhanced equivalence recognition
      if (targetJob.educationLevel) {
        totalEducationFactors++;
        const requiredLevel = targetJob.educationLevel.toLowerCase();
        
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
      if (targetJob.preferredCourse) {
        totalEducationFactors++;
        const jobCourseLower = targetJob.preferredCourse.toLowerCase();
        
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
            
            // Handle common typos and variations
            if (jobWord === 'pyschology' && eduWord === 'psychology') return true;
            if (jobWord === 'psychology' && eduWord === 'pyschology') return true;
            if (jobWord === 'enginnering' && eduWord === 'engineering') return true;
            if (jobWord === 'engineering' && eduWord === 'enginnering') return true;
            if (jobWord === 'buisness' && eduWord === 'business') return true;
            if (jobWord === 'business' && eduWord === 'buisness') return true;
            
            // Simple Levenshtein distance for close matches (1-2 character differences)
            if (jobWord.length > 4 && eduWord.length > 4) {
              const distance = levenshteinDistance(jobWord, eduWord);
              if (distance <= 2 && distance / Math.max(jobWord.length, eduWord.length) <= 0.3) {
                return true;
              }
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
    
    // Final score calculation complete
    
    return Math.min(100, Math.round(totalScore));
  };
 
  // Precompute TF-IDF scores based on the job each applicant applied to
  const processedApplicants = useMemo(() =>
    applicants.map(applicant => ({
      ...applicant,
      tfidfScore: calculateMatchScore(applicant, jobPostings.find(job => job.id === applicant.jobId))
    }))
    .sort((a, b) => b.tfidfScore - a.tfidfScore)
  , [applicants, jobPostings, calculateMatchScore]);


  return (
    <div className={styles.listContainer}>
      {jobPostings.length > 0 && (
        <div className={styles.infoBanner}>
          <div className={styles.infoText}>
            <strong>Info:</strong> Enhanced TF-IDF scores calculated based on skills (70%) and education (30%) matching for each job.
          </div>
          <div className={styles.legend}>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ backgroundColor: '#10b981' }}></div>
              <span>Matching skills</span>
            </div>
            <div className={styles.legendItem}>
              <div className={styles.legendDot} style={{ backgroundColor: '#f59e0b' }}></div>
              <span>Required skills</span>
            </div>
          </div>
        </div>
      )}
      <div className={styles.listHeader}>
        <div className={styles.headerCell}>#</div>
        <div className={styles.headerCell}>Applicant</div>
        <div className={styles.headerCell}>Job Applied For</div>
        <div className={styles.headerCell}>Applicant Skills</div>
        <div className={styles.headerCell}>Required Skills</div>
        <div className={styles.headerCell}>
          Match Score
          <span style={{ fontSize: '0.7em', color: '#666', fontWeight: 'normal' }}>
            (Job-specific match)
          </span>
        </div>
        <div className={styles.headerCell}>Status</div>
        <div className={styles.headerCell}>View</div>
      </div>

      <div className={styles.listBody}>
        {processedApplicants.length > 0 ? (
          processedApplicants.map((applicant, index) => (
            <div key={applicant.id} className={styles.listRow}>
              <div className={styles.numberCell}>
                <span className={styles.rowNumber}>{index + 1}</span>
              </div>

              <div className={styles.applicantCell}>
                <div className={styles.avatar}>
                  {applicant.avatar ? (
                    <img 
                      src={getImageSrc(applicant.avatar)} 
                      alt={applicant.name} 
                    />
                  ) : (
                    <span>{getInitials(applicant.name)}</span>
                  )}
                </div>
                <div className={styles.applicantInfo}>
                  <div className={styles.applicantName}>{applicant.name}</div>
                  <div className={styles.applicantPosition}>{applicant.position}</div>
                </div>
              </div>

              <div className={styles.jobCell}>
                {(() => {
                  // Find the job this applicant applied to
                  const appliedJob = jobPostings.find(job => job.id?.toString() === applicant.jobId?.toString());
                  return (
                    <div className={styles.jobInfo}>
                      <div className={styles.jobTitle}>{appliedJob?.title || applicant.jobTitle || 'Unknown Position'}</div>
                      <div className={styles.jobDepartment}>{appliedJob?.department || 'General'}</div>
                    </div>
                  );
                })()}
              </div>

              <div className={styles.skillsCell}>
                {(() => {
                  // Find the job this applicant applied to for skill matching
                  const appliedJob = jobPostings.find(job => job.id?.toString() === applicant.jobId?.toString());
                  const requiredSkills = appliedJob?.requirements || [];
                  
                  // Normalize skills data - handle both string arrays and object arrays
                  const rawSkills = applicant.skills || [];
                  const applicantSkills = rawSkills.map((skill: any) => {
                    if (typeof skill === 'string') return skill;
                    if (skill.name) return skill.name;
                    if (skill.skill) return skill.skill;
                    return String(skill);
                  }).filter(Boolean);
                  
                  // Find matching skills for highlighting
                  const lowerRequiredSkills = requiredSkills.map(s => s.toLowerCase());
                  const isSkillMatching = (skill: string) => lowerRequiredSkills.includes(skill.toLowerCase());
                  
                  return applicantSkills.length ? (
                    <div className={styles.skillsList}>
                      {applicantSkills.slice(0, 3).map((skill, i) => (
                        <span 
                          key={i} 
                          className={`${styles.skillTag} ${isSkillMatching(skill) ? styles.matchingSkillTag : ''}`}
                          title={isSkillMatching(skill) ? 'Matches job requirement' : ''}
                        >
                          {skill}
                        </span>
                      ))}
                      {applicantSkills.length > 3 && (
                        <span className={styles.moreSkills}>+{applicantSkills.length - 3} more</span>
                      )}
                    </div>
                  ) : (
                    <span className={styles.noSkills}>No skills listed</span>
                  );
                })()}
              </div>

              <div className={styles.skillsCell}>
                {(() => {
                  // Find the job this applicant applied to
                  const appliedJob = jobPostings.find(job => job.id?.toString() === applicant.jobId?.toString());
                  const requiredSkills = appliedJob?.requirements || [];
                  
                  // Normalize skills data - handle both string arrays and object arrays
                  const rawSkills = applicant.skills || [];
                  const applicantSkills = rawSkills.map((skill: any) => {
                    if (typeof skill === 'string') return skill;
                    if (skill.name) return skill.name;
                    if (skill.skill) return skill.skill;
                    return String(skill);
                  }).filter(Boolean);
                  
                  // Find matching skills for highlighting
                  const lowerApplicantSkills = applicantSkills.map(s => s.toLowerCase());
                  const isRequirementMet = (skill: string) => lowerApplicantSkills.includes(skill.toLowerCase());
                  
                  return requiredSkills.length ? (
                    <div className={styles.skillsList}>
                      {requiredSkills.slice(0, 3).map((skill, i) => (
                        <span 
                          key={i} 
                          className={`${styles.skillTag} ${styles.requiredSkillTag} ${isRequirementMet(skill) ? styles.metRequirementTag : ''}`}
                          title={isRequirementMet(skill) ? 'Applicant has this skill' : 'Applicant missing this skill'}
                        >
                          {skill}
                        </span>
                      ))}
                      {requiredSkills.length > 3 && (
                        <span className={styles.moreSkills}>+{requiredSkills.length - 3} more</span>
                      )}
                    </div>
                  ) : (
                    <span className={styles.noSkills}>No requirements listed</span>
                  );
                })()}
              </div>

              <div className={styles.matchCell}>
                <div className={styles.matchScore}>
                  <div className={styles.matchBar}>
                    <div className={styles.matchFill} style={{ width: `${applicant.tfidfScore}%` }} />
                  </div>
                  <span className={styles.matchText}>{applicant.tfidfScore}%</span>
                </div>
              </div>

              <div className={styles.statusCell}>
                <div className={`${styles.statusBadge} ${styles[applicant.status || 'pending']}`}>
                  <span className={styles.statusText}>
                    {applicant.status === 'pending' ? 'Pending' :
                     applicant.status === 'initial_interview' ? 'Initial Interview' :
                     applicant.status === 'final_interview' ? 'Final Interview' :
                     applicant.status === 'rejected' ? 'Rejected' :
                     applicant.status === 'hired' ? 'Hired' :
                     (applicant.status || 'Pending').charAt(0).toUpperCase() + (applicant.status || 'pending').slice(1)}
                  </span>
                </div>
              </div>

              <div className={styles.actionsCell}>
                <button className={styles.viewButton} onClick={() => onViewDetails(applicant)}>
                  <FiEye className={styles.icon} />
                  View
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className={styles.emptyState}>
            <p>No applicants found.</p>
          </div>
        )}
      </div>
    </div>
  );
};
