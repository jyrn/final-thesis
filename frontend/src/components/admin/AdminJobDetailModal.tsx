import React from 'react';
import { FiX, FiMapPin, FiClock, FiUsers, FiBriefcase, FiTrendingUp, FiStar, FiGlobe } from 'react-icons/fi';
import styles from '../jobseeker/JobDetailModal/JobDetailModal.module.css';
import { getImageSrc } from '../../utils/imageUtils';
import { Job as AdminJob } from '../../types/admin';
import { Job as JobseekerJob } from '../../types/Job';

interface AdminJobDetailModalProps {
  job: JobseekerJob | null
  isOpen: boolean
  onClose: () => void
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

const AdminJobDetailModal: React.FC<AdminJobDetailModalProps> = ({ job, isOpen, onClose }) => {
  if (!isOpen || !job) return null;

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
      return `₱${job.salary.toLocaleString('en-PH')}`;
    }
    return 'Salary not specified';
  };

  const formatPostedDate = () => {
    const dateToFormat = job.postedDate || (job as any).createdAt;
    if (dateToFormat) {
      // Handle different date formats from backend
      let date;
      if (typeof dateToFormat === 'string') {
        // Try parsing ISO string or other common formats
        date = new Date(dateToFormat);
      } else if (dateToFormat && typeof dateToFormat === 'object') {
        date = new Date(dateToFormat);
      } else {
        return 'Recently posted';
      }
      
      // Check if date is valid
      if (isNaN(date.getTime())) {
        return 'Recently posted';
      }
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const options: Intl.DateTimeFormatOptions = { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      };
      const fullDate = date.toLocaleDateString('en-US', options);
      
      let timeAgo;
      if (diffDays === 0) {
        timeAgo = 'Today';
      } else if (diffDays === 1) {
        timeAgo = 'Yesterday';
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

  const companyName = job.company || 'Unknown Company';
  const companyLogo = job.companyLogo; // Use company logo if available

  return (
    <div className={styles.overlay}>
      <div className={styles.modal}>
        {/* Header with company banner */}
        <div className={styles.header}>
          <div className={styles.companyBanner}>
            <div className={styles.companyBannerContent}>
              <div className={styles.companyLogoContainer}>
                {getCompanyLogo(companyName, companyLogo)}
              </div>
              <div className={styles.companyHeaderInfo}>
                <div className={styles.jobTitleBanner}>
                  <h1 className={styles.jobTitleHeader}>
                    {job.title}
                    <span className={styles.postedDateInline}>{formatPostedDate()}</span>
                  </h1>
                </div>
                <div className={styles.companyNameRow}>
                  <h2 className={styles.companyName}>{companyName}</h2>
                  <div className={styles.adminBadge} style={{
                    background: '#dc3545',
                    color: 'white',
                    padding: '4px 12px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600'
                  }}>
                    ADMIN VIEW
                  </div>
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
                  <span>{job.location || 'Location not specified'}</span>
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
                  <span>{job.level || job.experienceLevel || 'Mid-level'}</span>
                </div>
                <div className={styles.metaBadge}>
                  <span className={styles.pesoIcon}>₱</span>
                  <span>{formatSalary()}</span>
                </div>
              </div>
              <div className={styles.postingInfo}>
                <span className={styles.applicationVolume}>
                  Status: <strong style={{ color: job.status === 'active' ? '#28a745' : '#dc3545' }}>
                    {job.status?.toUpperCase() || 'ACTIVE'}
                  </strong>
                </span>
              </div>
            </div>

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Job Description</h3>
              <div className={styles.sectionContent}>
                <p>{job.description || 'No description provided'}</p>
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
                  {job.requirements && job.requirements.length > 0 ? (
                    job.requirements.map((req, index) => (
                      <li key={index}>{req}</li>
                    ))
                  ) : (
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

            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Administrative Information</h3>
              <div className={styles.sectionContent}>
                <ul className={styles.requirementsList}>
                  <li><strong>Job ID:</strong> {job.id || job._id}</li>
                  <li><strong>Status:</strong> <span style={{ color: job.status === 'active' ? '#28a745' : '#dc3545', fontWeight: '600' }}>{job.status?.toUpperCase() || 'ACTIVE'}</span></li>
                  <li><strong>Posted Date:</strong> {formatPostedDate()}</li>
                  <li><strong>Company:</strong> {companyName}</li>
                </ul>
              </div>
            </div>
          </div>

          {/* Right Column - Company Information */}
          <div className={styles.rightColumn}>
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>About {companyName}</h3>
              <div className={styles.sectionContent}>
                <div className={styles.companyDescription}>
                  {job.companyDetails?.description ? (
                    <p>{job.companyDetails.description}</p>
                  ) : (
                    <p style={{ color: '#666', fontStyle: 'italic' }}>
                      Company description not available. Contact the employer for more information about {companyName}.
                    </p>
                  )}
                </div>
                
                <div className={styles.companyStats}>
                  <div className={styles.statItem}>
                    <FiBriefcase className={styles.statIcon} />
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Industry</span>
                      <span className={styles.statValue}>{job.companyDetails?.industry || 'Not specified'}</span>
                    </div>
                  </div>
                  
                  <div className={styles.statItem}>
                    <FiUsers className={styles.statIcon} />
                    <div className={styles.statInfo}>
                      <span className={styles.statLabel}>Company Size</span>
                      <span className={styles.statValue}>{job.companyDetails?.size ? `${job.companyDetails.size} employees` : 'Not specified'}</span>
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
                    <span className={styles.detailValue}>{job.type || 'Full-time'}</span>
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
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Job Status</span>
                    <span className={styles.detailValue} style={{ 
                      color: job.status === 'active' ? '#28a745' : '#dc3545',
                      fontWeight: '600'
                    }}>
                      {job.status?.toUpperCase() || 'ACTIVE'}
                    </span>
                  </div>
                  <div className={styles.detailItem}>
                    <span className={styles.detailLabel}>Job ID</span>
                    <span className={styles.detailValue}>{job.id || job._id}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Admin Footer - No Apply Button */}
        <div className={styles.footer}>
          <div className={styles.footerContent} style={{ justifyContent: 'center' }}>
            <div style={{ 
              padding: '12px 24px',
              background: '#f8f9fa',
              borderRadius: '8px',
              color: '#6c757d',
              fontSize: '14px',
              fontStyle: 'italic'
            }}>
              Administrator View - Job posting details for review and management
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AdminJobDetailModal;
