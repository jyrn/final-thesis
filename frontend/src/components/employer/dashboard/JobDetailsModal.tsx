import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { Job } from '../../../types/Job';
import { FiX, FiMapPin, FiClock, FiUsers, FiBriefcase, FiTag, FiEdit3, FiTrash2 } from 'react-icons/fi';
import { getImageSrc } from '../../../utils/imageUtils';
import styles from './JobDetailsModal.module.css';

interface JobDetailsModalProps {
  job: Job | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (job: Job) => void;
  onDelete: (job: Job) => void;
  onUpdateJob?: (jobData: Partial<Job>) => void;
  onViewApplicants?: (job: Job) => void;
  profilePicture?: string;
}

export const JobDetailsModal: React.FC<JobDetailsModalProps> = (props) => {
  
  const {
    job,
    isOpen,
    onClose,
    onEdit,
    onDelete,
    onViewApplicants,
    profilePicture
  } = props;

  // Debug logging for profilePicture prop
  React.useEffect(() => {
    if (isOpen) {    }
  }, [isOpen, profilePicture]);
  
  // Create a stable reference to the onViewApplicants function
  const handleViewApplicantsClick = React.useCallback((e: React.MouseEvent, job: Job) => {
    e.stopPropagation();
    
    if (onViewApplicants) {
      onViewApplicants(job);
      onClose(); // Close the modal after navigating to applicants
    }
  }, [onViewApplicants, onClose]);
  
  
  if (!isOpen || !job) return null;

  const formatPostedDate = () => {
    if (job.postedDate || job.posted) {
      // Handle different date formats from backend
      let date;
      if (typeof (job.postedDate || job.posted) === 'string') {
        date = new Date(job.postedDate || job.posted);
      } else {
        date = new Date(job.postedDate || job.posted);
      }
      
      if (isNaN(date.getTime())) {
        return 'Recently posted';
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
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
      } else if (diffDays === 0) {
        timeAgo = 'Today';
      } else if (diffDays === 1) {
        timeAgo = 'Yesterday';
      } else if (diffDays < 7) {
        timeAgo = `${diffDays} days ago`;
      } else if (diffDays === 7) {
        timeAgo = '1 week ago';
      } else if (diffDays < 14) {
        timeAgo = `${diffDays} days ago`;
      } else if (diffDays === 14) {
        timeAgo = '2 weeks ago';
      } else if (diffDays < 30) {
        timeAgo = `${Math.floor(diffDays / 7)} weeks ago`;
      } else if (diffDays < 60) {
        timeAgo = '1 month ago';
      } else if (diffDays < 365) {
        timeAgo = `${Math.floor(diffDays / 30)} months ago`;
      } else {
        timeAgo = `${Math.floor(diffDays / 365)} years ago`;
      }
      
      return `${fullDate} — ${timeAgo}`;
    }
    return 'Recently posted';
  };

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return { backgroundColor: '#dcfce7', color: '#166534' };
      case 'paused':
        return { backgroundColor: '#fef3c7', color: '#92400e' };
      case 'closed':
        return { backgroundColor: '#fee2e2', color: '#991b1b' };
      default:
        return { backgroundColor: '#f1f5f9', color: '#475569' };
    }
  };

  const getCompanyLogo = (company: string) => {
    // Use job's company logo first, then fallback to profilePicture prop
    const logoUrl = job?.companyLogo || profilePicture;
    
    if (logoUrl) {
      return (
        <div className={styles.companyLogo}>
          <img 
            src={getImageSrc(logoUrl)} 
            alt={`${company} logo`} 
            className={styles.companyLogoImage}
          />
        </div>
      );
    }

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

  const modalContent = (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Header with company banner */}
        <div className={styles.header}>
          <div className={styles.companyBanner}>
            <div className={styles.companyBannerContent}>
              <div className={styles.companyLogoContainer}>
                {getCompanyLogo(job.company || 'Company')}
              </div>
              <div className={styles.companyHeaderInfo}>
                <div className={styles.jobTitleBanner}>
                  <h1 className={styles.jobTitleHeader}>
                    {job.title}
                    <span className={styles.postedDateInline}>{formatPostedDate()}</span>
                  </h1>
                </div>
                <div className={styles.companyNameRow}>
                  <h2 className={styles.companyName}>{job.company || 'Company Name'}</h2>
                  <span 
                    className={styles.statusBadge} 
                    style={getStatusColor(job.status)}
                  >
                    {job.status}
                  </span>
                </div>
              </div>
            </div>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.metaSection}>
          <div className={styles.metaItem}>
            <FiMapPin className={styles.metaIcon} />
            <span>{job.location}</span>
          </div>
          <div className={styles.metaItem}>
            <FiBriefcase className={styles.metaIcon} />
            <span>{job.department || 'Not specified'}</span>
          </div>
          <div className={styles.metaItem}>
            <FiClock className={styles.metaIcon} />
            <span>{job.type}</span>
          </div>
          <div className={styles.metaItem}>
            <FiTag className={styles.metaIcon} />
            <span>{job.level || job.experienceLevel || 'Mid-level'}</span>
          </div>
          <div className={styles.metaItem}>
            <span className={styles.pesoIcon}>₱</span>
            <span>
              {(job.salaryMin > 0 && job.salaryMax > 0) ? (
                `${job.salaryMin.toLocaleString('en-PH')} - ${job.salaryMax.toLocaleString('en-PH')}`
              ) : job.salaryMin > 0 ? (
                `${job.salaryMin.toLocaleString('en-PH')}+`
              ) : job.salaryMax > 0 ? (
                `Up to ${job.salaryMax.toLocaleString('en-PH')}`
              ) : job.salary && typeof job.salary === 'string' && job.salary !== 'Salary not specified' ? (
                job.salary
              ) : (
                'Salary not specified'
              )}
            </span>
          </div>
          <div 
            className={`${styles.metaItem} ${styles.clickable}`}
            onClick={(e) => handleViewApplicantsClick(e, job)}
          >
            <FiUsers className={styles.metaIcon} />
            <span>{job.applicants || job.applicantCount || 0} applicants</span>
          </div>
          {(job.workplaceType || job.remote) && (
            <div className={styles.metaItem}>
              <FiMapPin className={styles.metaIcon} />
              <span>{job.workplaceType || (job.remote ? 'Remote' : 'On-site')}</span>
            </div>
          )}
        </div>

        <div className={styles.scrollableContent}>
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Job Description</h3>
            <div className={styles.description}>
              <div className={styles.descriptionContent}>
                <p>{job.description || 'No description available.'}</p>
              </div>
            </div>
          </div>

        {(job.educationLevel || job.preferredCourse) && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Education Requirements</h3>
            <div className={styles.educationRequirements}>
              {job.educationLevel && (
                <div className={styles.educationItem}>
                  <strong>Education Level:</strong> {job.educationLevel}
                </div>
              )}
              {job.preferredCourse && (
                <div className={styles.educationItem}>
                  <strong>Preferred Course/Field:</strong> {job.preferredCourse}
                </div>
              )}
            </div>
          </div>
        )}

        {job.requirements && job.requirements.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Required Skills and Experience</h3>
            <div className={styles.requirements}>
              {job.requirements.map((req, index) => (
                <span key={index} className={styles.requirementTag}>
                  {req}
                </span>
              ))}
            </div>
          </div>
        )}

        {job.responsibilities && job.responsibilities.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>Key Responsibilities</h3>
            <ul className={styles.responsibilities}>
              {job.responsibilities.map((resp, index) => (
                <li key={index}>{resp}</li>
              ))}
            </ul>
          </div>
        )}

        {job.benefits && job.benefits.length > 0 && (
          <div className={styles.section}>
            <h3 className={styles.sectionTitle}>What We Offer</h3>
            <ul className={styles.benefits}>
              {job.benefits.map((benefit, index) => (
                <li key={index}>{benefit}</li>
              ))}
            </ul>
          </div>
        )}
        </div>

        <div className={styles.modalActions}>
          <button 
            className={styles.deleteButton}
            onClick={() => onDelete(job)}
          >
            <FiTrash2 />
            Delete Job
          </button>
          <div className={styles.actionGroup}>
            <button 
              className={styles.editButton}
              onClick={() => onEdit(job)}
            >
              <FiEdit3 />
              Edit Job
            </button>
            <button 
              className={styles.viewApplicantsButton}
              onClick={() => onViewApplicants?.(job)}
            >
              <FiUsers />
              View Applicants ({job.applicants || job.applicantCount || 0})
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return isOpen ? createPortal(modalContent, document.body) : null;
};
