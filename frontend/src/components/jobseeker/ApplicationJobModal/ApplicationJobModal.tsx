import React from 'react';
import { FiX, FiMapPin, FiClock, FiDollarSign, FiCalendar, FiFileText, FiDownload, FiCheck, FiXCircle, FiBriefcase, FiTrendingUp, FiHome, FiUsers } from 'react-icons/fi';
import styles from './ApplicationJobModal.module.css';
import { getImageSrc } from '../../../utils/imageUtils';

import { Job } from '../../../types/Job';

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  type: string;
  level?: string;
  department?: string;
  workplaceType?: string;
  salary: string;
  description?: string;
  status: 'pending' | 'interview' | 'approved' | 'rejected' | 'hired';
  appliedDate: string;
  updatedAt: string;
}

interface ApplicationJobModalProps {
  job: Job | null
  application?: Application | null
  isOpen: boolean
  onClose: () => void
  onApply?: (jobId: string | number) => void
  onViewJob?: (jobId: string) => void
  onWithdrawApplication?: (applicationId: string) => void
}

const getCompanyLogo = (company: string, companyLogo?: string) => {  if (companyLogo) {
    const imageSrc = getImageSrc(companyLogo);    return (
      <div className={styles.companyLogo}>
        <img 
          src={imageSrc} 
          alt={`${company} logo`} 
          className={styles.companyLogoImage}
          onLoad={() => console.log('ApplicationJobModal - Image loaded successfully')}
          onError={(e) => console.error('ApplicationJobModal - Image failed to load:', e)}
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

const ApplicationJobModal: React.FC<ApplicationJobModalProps> = ({ 
  job, 
  application, 
  isOpen, 
  onClose, 
  onApply,
  onViewJob,
  onWithdrawApplication 
}) => {
  const [isWithdrawing, setIsWithdrawing] = React.useState(false);
  const [showWithdrawConfirm, setShowWithdrawConfirm] = React.useState(false);
  
  if (!isOpen || !job) return null;

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <FiClock className={styles.statusIcon} />;
      case 'approved':
        return <FiCheck className={styles.statusIcon} />;
      case 'interview':
        return <FiUsers className={styles.statusIcon} />;
      case 'rejected':
        return <FiXCircle className={styles.statusIcon} />;
      case 'hired':
        return <FiCheck className={styles.statusIcon} />;
      default:
        return <FiClock className={styles.statusIcon} />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending':
        return 'Under Review';
      case 'approved':
        return 'Approved';
      case 'interview':
        return 'Interview Stage';
      case 'rejected':
        return 'Not Selected';
      case 'hired':
        return 'Hired';
      default:
        return 'Under Review';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return styles.statusPending;
      case 'approved':
        return styles.statusApproved;
      case 'interview':
        return styles.statusInterview;
      case 'rejected':
        return styles.statusRejected;
      case 'hired':
        return styles.statusHired;
      default:
        return styles.statusPending;
    }
  };

  const formatSalary = () => {
    // Handle individual salary values first
    if (job.salaryMin && job.salaryMax) {
      return `₱${job.salaryMin.toLocaleString('en-PH')} - ₱${job.salaryMax.toLocaleString('en-PH')}`;
    }
    if (job.salaryMin && !job.salaryMax) {
      return `₱${job.salaryMin.toLocaleString('en-PH')}+`;
    }
    if (!job.salaryMin && job.salaryMax) {
      return `Up to ₱${job.salaryMax.toLocaleString('en-PH')}`;
    }
    if (job.salary) {
      return job.salary;
    }
    return 'Salary not specified';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-PH', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
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

  const handleWithdrawApplication = async () => {
    if (!application || !onWithdrawApplication) return;
    
    setIsWithdrawing(true);
    try {
      await onWithdrawApplication(application.id);
      onClose(); // Close modal after successful withdrawal
    } catch (error) {      // Handle error (could show a toast notification)
    } finally {
      setIsWithdrawing(false);
      setShowWithdrawConfirm(false);
    }
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
                    <div className={styles.headerMeta}>
                      {application && (
                        <div className={`${styles.statusBadge} ${getStatusColor(application.status)}`}>
                          {getStatusIcon(application.status)}
                          <span>{getStatusText(application.status)}</span>
                        </div>
                      )}
                      <div className={styles.postedDateBadge}>
                        <FiCalendar className={styles.badgeIcon} />
                        <span>Posted {formatPostedDate()}</span>
                      </div>
                      {application && (
                        <div className={styles.appliedDateBadge}>
                          <FiCheck className={styles.badgeIcon} />
                          <span>Applied {new Date(application.appliedDate).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}</span>
                        </div>
                      )}
                    </div>
                  </h1>
                </div>
                <div className={styles.companyNameRow}>
                  <h2 className={styles.companyName}>{job.company}</h2>
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
                  <span>{job.type || 'Full-time'}</span>
                </div>
                <div className={styles.metaBadge}>
                  <FiTrendingUp className={styles.badgeIcon} />
                  <span>{job.level || 'Mid-level'}</span>
                </div>
                <div className={styles.metaBadge}>
                  <FiHome className={styles.badgeIcon} />
                  <span>{job.workplaceType || 'Hybrid'}</span>
                </div>
                {job.salary && (
                  <div className={styles.metaBadge}>
                    <FiTrendingUp className={styles.badgeIcon} />
                    <span>{job.salary}</span>
                  </div>
                )}
                {job.applicantCount && (
                  <div className={styles.metaBadge}>
                    <FiUsers className={styles.badgeIcon} />
                    <span>{job.applicantCount} applicants</span>
                  </div>
                )}
              </div>
            </div>

            {/* Job Description */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Job Description</h3>
              <div className={styles.jobDescription}>
                <p>{job.description || 'No description available for this position.'}</p>
              </div>
            </div>

            {/* Education Requirements */}
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

            {/* Requirements */}
            {job.requirements && job.requirements.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Requirements</h3>
                <ul className={styles.requirementsList}>
                  {job.requirements.map((req, index) => (
                    <li key={index}>{req}</li>
                  ))}
                </ul>
              </div>
            )}

            {/* Benefits */}
            {job.benefits && job.benefits.length > 0 && (
              <div className={styles.section}>
                <h3 className={styles.sectionTitle}>Benefits</h3>
                <ul className={styles.benefitsList}>
                  {job.benefits.map((benefit, index) => (
                    <li key={index}>{benefit}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Right Column - Company & Application Info */}
          <div className={styles.rightColumn}>
            {/* Application Status Card (if application exists) */}
            {application && (
              <div className={styles.applicationCard}>
                <h3 className={styles.cardTitle}>Application Status</h3>
                <div className={`${styles.statusDisplay} ${getStatusColor(application.status)}`}>
                  {getStatusIcon(application.status)}
                  <div className={styles.statusInfo}>
                    <span className={styles.statusLabel}>{getStatusText(application.status)}</span>
                    <span className={styles.statusDate}>
                      {application.status === 'pending' 
                        ? `Applied ${formatDate(application.appliedDate)}`
                        : `Updated ${formatDate(application.updatedAt)}`
                      }
                    </span>
                  </div>
                </div>
                {application.status === 'pending' && (
                  <p className={styles.statusMessage}>
                    Your application is currently under review. We'll notify you once there's an update.
                  </p>
                )}
                {application.status === 'interview' && (
                  <p className={styles.statusMessage}>
                    Congratulations! You've been selected for an interview. The employer will contact you soon with details.
                  </p>
                )}
                {application.status === 'hired' && (
                  <p className={styles.statusMessage}>
                    Congratulations! You've been hired for this position. Welcome to the team!
                  </p>
                )}
                {application.status === 'rejected' && (
                  <p className={styles.statusMessage}>
                    Unfortunately, your application was not selected for this position. Keep applying to other opportunities!
                  </p>
                )}
                {application.status === 'approved' && (
                  <p className={styles.statusMessage}>
                    Your application has been approved. The employer will contact you with next steps.
                  </p>
                )}
              </div>
            )}


            {/* Action Buttons */}
            <div className={styles.actionButtons}>
              {application ? (
                <>
                  {application.status === 'pending' && !showWithdrawConfirm && (
                    <button 
                      className={styles.secondaryButton}
                      onClick={() => setShowWithdrawConfirm(true)}
                    >
                      <FiX />
                      Withdraw Application
                    </button>
                  )}
                  {showWithdrawConfirm && (
                    <div className={styles.confirmationButtons}>
                      <p className={styles.confirmationText}>
                        Are you sure you want to withdraw your application? This action cannot be undone.
                      </p>
                      <div className={styles.buttonGroup}>
                        <button 
                          className={styles.dangerButton}
                          onClick={handleWithdrawApplication}
                          disabled={isWithdrawing}
                        >
                          {isWithdrawing ? 'Withdrawing...' : 'Yes, Withdraw'}
                        </button>
                        <button 
                          className={styles.secondaryButton}
                          onClick={() => setShowWithdrawConfirm(false)}
                          disabled={isWithdrawing}
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              ) : (
                <button 
                  className={styles.primaryButton}
                  onClick={() => onApply?.(job.id)}
                >
                  Apply Now
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ApplicationJobModal;
