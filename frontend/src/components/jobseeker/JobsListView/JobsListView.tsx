import React, { useState, useEffect } from 'react';
import { FiMapPin, FiClock, FiDollarSign, FiBookmark, FiSearch, FiEye, FiBriefcase } from 'react-icons/fi';
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

  // Enhanced TF-IDF calculation including education factors
  const calculateMatchScore = (job: Job, jobseekerEducation?: string | Array<any> | { level?: string; field?: string; degrees?: Array<{degree?: string; school?: string; major?: string; course?: string}> }): number => {
    if (!jobseekerSkills || jobseekerSkills.length === 0) return 0;
    if (!job.requirements || job.requirements.length === 0) return 0;
    
    const lowerJobRequirements = job.requirements.map(s => s.toLowerCase());
    const lowerJobseekerSkills = jobseekerSkills.map(s => s.toLowerCase());
    
    // Skills matching (70% weight) - Improved algorithm
    const matchingSkills = lowerJobseekerSkills.filter(skill => lowerJobRequirements.includes(skill));
    
    // Calculate skill match percentage based on required skills
    const requiredSkillsMatchRate = matchingSkills.length / lowerJobRequirements.length;
    
    // Bonus for additional relevant skills (capped to prevent over-inflation)
    const additionalSkillsBonus = Math.min(0.1, (jobseekerSkills.length - lowerJobRequirements.length) * 0.005);
    
    // Full credit when all required skills match, plus bonus for additional skills
    const skillsScore = (requiredSkillsMatchRate + (requiredSkillsMatchRate === 1.0 ? additionalSkillsBonus : 0)) * 0.7; // 70% weight for skills

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
          .map(job => ({ ...job, matchScore: calculateMatchScore(job, jobseekerEducation) }))
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
              
              <div className={styles.skillsCell}>
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
              
              <div className={styles.skillsCell}>
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
              
              <div className={styles.matchCell}>
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
