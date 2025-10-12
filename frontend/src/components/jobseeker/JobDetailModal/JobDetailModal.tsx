import React from 'react';
import { FiX, FiMapPin, FiClock, FiUsers, FiCalendar, FiBriefcase, FiTrendingUp, FiStar, FiHome, FiGlobe } from 'react-icons/fi';
import styles from './JobDetailModal.module.css';
import { getImageSrc } from '../../../utils/imageUtils';

import { Job } from '../../../types/Job';

interface JobDetailModalProps {
  job: Job | null
  isOpen: boolean
  onClose: () => void
  onApply: (jobId: string | number) => void
}

const getCompanyLogo = (company: string, companyLogo?: string) => {
  if (companyLogo) {
    return (
      <div className={styles.companyLogo}>
        <img 
          src={getImageSrc(companyLogo)} 
          alt={`${company} logo`} 
          className={styles.companyLogoImage}
        />
      </div>
    );
  }

  // Generate a consistent color based on company name
  const colors = [
    '#667eea', '#764ba2', '#f093fb', '#f5576c',
    '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
    '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
  ];
  const colorIndex = company.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
  
  return (
    <div 
      className={styles.companyLogo}
      style={{ background: `linear-gradient(135deg, ${colors[colorIndex]}, ${colors[(colorIndex + 1) % colors.length]})` }}
    >
      {company.charAt(0).toUpperCase()}
    </div>
  );
};

const JobDetailModal: React.FC<JobDetailModalProps> = ({ job, isOpen, onClose, onApply }) => {
  if (!isOpen || !job) return null;

  const formatSalary = () => {
    // Handle individual salary values first
    if (job.salaryMin && job.salaryMax) {
      return `${job.salaryMin.toLocaleString('en-PH')} - ${job.salaryMax.toLocaleString('en-PH')}`;
    }
    if (job.salaryMin && !job.salaryMax) {
      return `${job.salaryMin.toLocaleString('en-PH')}+`;
    }
    if (!job.salaryMin && job.salaryMax) {
      return `Up to ₱${job.salaryMax.toLocaleString('en-PH')}`;
    }
    if (job.salary) {
      return `${job.salary.toLocaleString('en-PH')}`;
    }
    return 'Salary not specified';
  };

  const formatPostedDate = () => {
    if (job.postedDate) {
      // Handle different date formats from backend
      let date;
      if (typeof job.postedDate === 'string') {
        // Try parsing ISO string or other common formats
        date = new Date(job.postedDate);
      } else if (job.postedDate && typeof job.postedDate === 'object') {
        date = new Date(job.postedDate);
      } else {
        return 'Recently posted';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Recently posted';
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Format full date
      const fullDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Format relative time
      let timeAgo;
      if (diffMinutes < 1) {
        timeAgo = 'Just now';
      } else if (diffMinutes < 60) {
        timeAgo = diffMinutes === 1 ? '1 minute ago' : `${diffMinutes} minutes ago`;
      } else if (diffHours < 24) {
        timeAgo = diffHours === 1 ? '1 hour ago' : `${diffHours} hours ago`;
      } else if (diffDays === 1) {
        timeAgo = '1 day ago';
      } else if (diffDays < 7) {
        timeAgo = `${diffDays} days ago`;
      } else if (diffDays < 30) {
        timeAgo = `${Math.ceil(diffDays / 7)} weeks ago`;
      } else {
        timeAgo = `${Math.ceil(diffDays / 30)} months ago`;
      }
      
      return `${fullDate} — ${timeAgo}`;
    }
    return 'Recently posted';
  };

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header with company banner */}
        <div className={styles.header}>
          <div className={styles.companyBanner}>
            <div className={styles.companyBannerContent}>
              <div className={styles.companyLogoContainer}>
                {getCompanyLogo(job.company, job.companyLogo)}
              </div>
              <div className={styles.companyHeaderInfo}>
                <div className={styles.jobTitleBanner}>
                  <h1 className={styles.jobTitleHeader}>
                    {job.title}
                    <span className={styles.postedDateInline}>{formatPostedDate()}</span>
                  </h1>
                </div>
                <div className={styles.companyNameRow}>
                  <h2 className={styles.companyName}>{job.company}</h2>
                  <button className={styles.viewAllJobs}>View all jobs</button>
                </div>
              </div>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        {/* Main content with two-column layout */}
        <div className={styles.mainContent}>
          {/* Left Column - Job Details */}
          <div className={styles.leftColumn}>
            <div className={styles.jobTitleSection}>
              <div className={styles.jobMeta}>
                <div className={styles.metaBadge}>
                  <FiMapPin className={styles.badgeIcon} />
                  <span>{job.location}</span>
                </div>
                <div className={styles.metaBadge}>
                  <FiBriefcase className={styles.badgeIcon} />
                  <span>{job.department || 'Not specified'}</span>
                </div>
                <div className={styles.metaBadge}>
                  <FiClock className={styles.badgeIcon} />
                  <span>{job.type}</span>
                </div>
                <div className={styles.metaBadge}>
                  <FiTrendingUp className={styles.badgeIcon} />
                  <span>{job.level || job.experienceLevel || 'Mid-level'}</span>
                </div>
                <div className={styles.metaBadge}>
                  <span className={styles.pesoIcon}>₱</span>
                  <span>{formatSalary()}</span>
                </div>
              </div>
              <div className={styles.postingInfo}>
                <span className={styles.applicationVolume}>Medium application volume</span>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Job Description</h3>
              <div className={styles.sectionContent}>
                <p>{job.description}</p>
              </div>
            </div>

            {(job.educationLevel || job.preferredCourse) && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Education Requirements</h3>
                <div className={styles.sectionContent}>
                  <div className={styles.educationRequirements}>
                    {job.educationLevel && (
                      <div className={styles.educationItem}>
                        <span className={styles.educationLabel}>Education Level:</span>
                        <span className={styles.educationValue}>{job.educationLevel}</span>
                      </div>
                    )}
                    {job.preferredCourse && (
                      <div className={styles.educationItem}>
                        <span className={styles.educationLabel}>Preferred Course/Field:</span>
                        <span className={styles.educationValue}>{job.preferredCourse}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Required Skills and Experience</h3>
              <div className={styles.sectionContent}>
                <ul className={styles.requirementsList}>
                  {job.requirements?.map((req, index) => (
                    <li key={index}>{req}</li>
                  )) || (
                    <li>No specific requirements listed</li>
                  )}
                </ul>
              </div>
            </div>

            {job.responsibilities && job.responsibilities.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Responsibilities</h3>
                <div className={styles.sectionContent}>
                  <ul className={styles.requirementsList}>
                    {job.responsibilities.map((resp, index) => (
                      <li key={index}>{resp}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}

            {(job.benefits && job.benefits.length > 0) && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Benefits & Perks</h3>
                <div className={styles.sectionContent}>
                  <div className={styles.benefitsList}>
                    {job.benefits.map((benefit, index) => (
                      <span key={index} className={styles.benefitTag}>
                        <FiStar className={styles.benefitIcon} />
                        {benefit}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Right Column - Company Information */}
          <div className={styles.rightColumn}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>About {job.company}</h3>
              <div className={styles.sectionContent}>
                <div className={styles.companyDescription}>
                  {job.companyDetails?.description ? (
                    <p>{job.companyDetails.description}</p>
                  ) : (
                    <p>We are {job.company}, a leading company in our industry committed to excellence and innovation. Join our team and be part of our growth story.</p>
                  )}
                </div>
                
                <div className={styles.companyStats}>
                  <div className={styles.statItem}>
                    <FiBriefcase className={styles.statIcon} />
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Industry</span>
                      <span className={styles.statValue}>{job.companyDetails?.industry || 'Technology & Services'}</span>
                    </div>
                  </div>
                  
                  <div className={styles.statItem}>
                    <FiUsers className={styles.statIcon} />
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Company Size</span>
                      <span className={styles.statValue}>{job.companyDetails?.size || '101-500'} employees</span>
                    </div>
                  </div>
                  
                  <div className={styles.statItem}>
                    <FiHome className={styles.statIcon} />
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Headquarters</span>
                      <span className={styles.statValue}>{job.companyDetails?.headquarters || 'Metro Manila, Philippines'}</span>
                    </div>
                  </div>
                  
                  <div className={styles.statItem}>
                    <FiCalendar className={styles.statIcon} />
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Founded</span>
                      <span className={styles.statValue}>{job.companyDetails?.founded || '2010'}</span>
                    </div>
                  </div>
                  
                  {job.companyDetails?.website && (
                    <div className={styles.statItem}>
                      <FiGlobe className={styles.statIcon} />
                      <div className={styles.statInfo}>
                        <span className={styles.statLabel}>Website</span>
                        <a 
                          href={job.companyDetails.website.startsWith('http') ? job.companyDetails.website : `https://${job.companyDetails.website}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.websiteLink}
                        >
                          Visit Website
                        </a>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Job Details</h3>
              <div className={styles.sectionContent}>
                <div className={styles.jobDetailsList}>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Employment Type</span>
                    <span className={styles.detailValue}>{job.type}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Experience Level</span>
                    <span className={styles.detailValue}>{job.level || job.experienceLevel || 'Mid-level'}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Work Arrangement</span>
                    <span className={styles.detailValue}>
                      {job.workplaceType || (job.isRemote ? 'Remote' : job.isHybrid ? 'Hybrid' : 'On-site')}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Department</span>
                    <span className={styles.detailValue}>{job.department || 'Not specified'}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky Footer with action buttons */}
        <div className={styles.footer}>
          <div className={styles.footerContent}>
            <button 
              className={`${styles.applyButton} ${job.applied ? styles.applied : ''}`}
              onClick={() => {
                if (!job.applied) {
                  onApply(job.id);
                }
              }}
              disabled={job.applied}
            >
              {!job.applied && <FiTrendingUp className={styles.buttonIcon} />}
              {job.applied ? 'Applied ✓' : 'Apply'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default JobDetailModal
