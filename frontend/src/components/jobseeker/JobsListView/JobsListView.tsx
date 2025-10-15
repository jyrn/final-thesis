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
      
      // Education level matching
      if (job.educationLevel) {
        totalEducationFactors++;
        const jobEducationLower = job.educationLevel.toLowerCase();
        
        // Check if education level matches
        let hasMatchingLevel = false;
        if (jobEducationLower.includes('bachelor') && educationLower.includes('bachelor')) hasMatchingLevel = true;
        if (jobEducationLower.includes('master') && educationLower.includes('master')) hasMatchingLevel = true;
        if (jobEducationLower.includes('doctorate') && (educationLower.includes('doctorate') || educationLower.includes('phd'))) hasMatchingLevel = true;
        if (jobEducationLower.includes('associate') && educationLower.includes('associate')) hasMatchingLevel = true;
        if (jobEducationLower.includes('high school') && educationLower.includes('high school')) hasMatchingLevel = true;
        
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
        
        // Count matching keywords
        const matchingKeywords = jobKeywords.filter(jobWord => 
          educationKeywords.some(eduWord => 
            eduWord.includes(jobWord) || jobWord.includes(eduWord) ||
            // Handle common abbreviations and variations
            (jobWord === 'it' && (eduWord.includes('information') || eduWord.includes('technology'))) ||
            (jobWord === 'cs' && (eduWord.includes('computer') || eduWord.includes('science'))) ||
            (eduWord === 'it' && (jobWord.includes('information') || jobWord.includes('technology'))) ||
            (eduWord === 'cs' && (jobWord.includes('computer') || jobWord.includes('science')))
          )
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
