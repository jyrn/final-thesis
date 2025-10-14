import React, { useMemo, useCallback } from 'react';
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
  const calculateTfidfScore = useCallback((applicant: Applicant): number => {
    const applicantSkills = applicant.skills || [];
    if (!applicantSkills || applicantSkills.length === 0) return 0;
    
    // Find the job this applicant applied to
    const appliedJob = jobPostings.find(job => job.id?.toString() === applicant.jobId?.toString());
    if (!appliedJob || !appliedJob.requirements || appliedJob.requirements.length === 0) return 0;

    const lowerTarget = appliedJob.requirements.map(s => s.toLowerCase());
    const lowerSkills = applicantSkills.map(s => s.toLowerCase());

    // Skills matching (70% weight) - Improved algorithm
    const matchingSkills = lowerSkills.filter(skill => lowerTarget.includes(skill));
  
    // Calculate skill match percentage based on required skills
    const requiredSkillsMatchRate = matchingSkills.length / lowerTarget.length;
  
    // Bonus for additional relevant skills (capped to prevent over-inflation)
    const additionalSkillsBonus = Math.min(0.1, (applicantSkills.length - lowerTarget.length) * 0.005);
  
    // Full credit when all required skills match, plus bonus for additional skills
    const skillsScore = (requiredSkillsMatchRate + (requiredSkillsMatchRate === 1.0 ? additionalSkillsBonus : 0)) * 0.7; // 70% weight for skills

    // Education matching (30% weight)
    let educationScore = 0;
    if ((appliedJob.educationLevel || appliedJob.preferredCourse) && applicant.education) {
      let educationMatch = 0;
      let totalEducationFactors = 0;
      
      // Handle both string and array education data
      const educationText = Array.isArray(applicant.education) 
        ? applicant.education.map(edu => `${edu.degree || ''} ${edu.school || ''} ${edu.major || ''} ${edu.course || ''}`).join(' ')
        : String(applicant.education);
      
      const educationLower = educationText.toLowerCase();
      
      // Education level matching
      if (appliedJob.educationLevel) {
        totalEducationFactors++;
        const jobEducationLower = appliedJob.educationLevel.toLowerCase();
        
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
      if (appliedJob.preferredCourse) {
        totalEducationFactors++;
        const jobCourseLower = appliedJob.preferredCourse.toLowerCase();
        
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
  }, [jobPostings]);
 
  // Precompute TF-IDF scores based on the job each applicant applied to
  const processedApplicants = useMemo(() =>
    applicants.map(applicant => ({
      ...applicant,
      tfidfScore: calculateTfidfScore(applicant)
    }))
    .sort((a, b) => b.tfidfScore - a.tfidfScore)
  , [applicants, jobPostings, calculateTfidfScore]);


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
                  const applicantSkills = applicant.skills || [];
                  
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
                  const applicantSkills = applicant.skills || [];
                  
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
                     applicant.status === 'interview' ? 'Interview' :
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
