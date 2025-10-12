import React from 'react';
import { Job } from '@/types/Job';
import Button from '../ui/Button';
import { 
  FiMapPin, 
  FiClock, 
  FiTrendingUp, 
  FiBriefcase, 
  FiTrash2, 
  FiEdit3,
  FiEye,
  FiUsers,
  FiFileText
} from 'react-icons/fi';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
  onView?: (job: Job) => void;
  onEdit?: (job: Job) => void;
  onDelete?: (jobId: string | number) => void;
  onClick?: (job: Job) => void;
  onViewApplicants?: (job: Job) => void;
}

export const JobCard: React.FC<JobCardProps> = ({ job, onView, onEdit, onDelete, onClick, onViewApplicants }) => {
  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on action buttons
    if ((e.target as HTMLElement).closest(`.${styles.jobActions}`)) {
      return;
    }
    onClick?.(job);
  };

  const formatPostedDate = () => {
    if (job.postedDate || job.posted) {
      let date;
      const dateValue = job.postedDate || job.posted;
      
      // Handle different date formats more robustly
      if (typeof dateValue === 'string') {
        // If it's already a formatted date string like "September 22, 2024", parse it
        if (dateValue.includes(',') && !dateValue.includes('T') && !dateValue.includes('Z')) {
          date = new Date(dateValue);
        } else {
          // Handle ISO strings and other formats
          date = new Date(dateValue);
        }
      } else {
        date = new Date(dateValue);
      }
      
      if (isNaN(date.getTime())) {
        return 'Recently posted';
      }
      
      // Use current time in the same timezone
      const now = new Date();
      
      // Calculate difference in milliseconds (use absolute value for consistency)
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffMinutes = Math.floor(diffTime / (1000 * 60));
      const diffHours = Math.floor(diffTime / (1000 * 60 * 60));
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      // Format full date in local timezone
      const fullDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone
      });
      
      // Format relative time with consistent calculations
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
    <div className={styles.jobCard} onClick={handleCardClick}>
      <div className={styles.jobHeader}>
        <div className={styles.jobHeaderContent}>
          <div className={styles.jobTitleSection}>
            <h3 className={styles.jobTitle}>{job.title}</h3>
            <p className={styles.companyName}>{job.company}</p>
          </div>
          <div className={styles.statusSection}>
            <span className={`${styles.statusBadge} ${styles[job.status.toLowerCase()]}`}>
              {job.status}
            </span>
            <span className={styles.postedDate}>{formatPostedDate()}</span>
          </div>
        </div>
        
        <div className={styles.jobMeta}>
          <div className={styles.metaItem}>
            <FiMapPin className={styles.metaIcon} />
            <span>{job.location}</span>
          </div>
          <div className={styles.metaItem}>
            <FiClock className={styles.metaIcon} />
            <span>{job.type}</span>
          </div>
          {job.level && (
            <div className={styles.metaItem}>
              <FiTrendingUp className={styles.metaIcon} />
              <span>{job.level}</span>
            </div>
          )}
          {job.department && (
            <div className={styles.metaItem}>
              <FiBriefcase className={styles.metaIcon} />
              <span>{job.department}</span>
            </div>
          )}
          <div className={styles.metaItem}>
            <span>₱</span>
            <span>
              {job.salaryMin > 0 && job.salaryMax > 0 ? (
                `${job.salaryMin.toLocaleString('en-PH')} - ${job.salaryMax.toLocaleString('en-PH')}`
              ) : job.salaryMin > 0 ? (
                `From ${job.salaryMin.toLocaleString('en-PH')}`
              ) : job.salaryMax > 0 ? (
                `Up to ${job.salaryMax.toLocaleString('en-PH')}`
              ) : 'Salary not specified'}
            </span>
          </div>
          {(job.workplaceType || job.remote) && (
            <div className={styles.metaItem}>
              <span>{job.workplaceType || (job.remote ? 'Remote' : 'On-site')}</span>
            </div>
          )}
          {job.educationLevel && (
            <div className={styles.metaItem}>
              <FiFileText className={styles.metaIcon} />
              <span>{job.educationLevel}</span>
            </div>
          )}
          {job.preferredCourse && (
            <div className={styles.metaItem}>
              <FiFileText className={styles.metaIcon} />
              <span>{job.preferredCourse}</span>
            </div>
          )}
        </div>
      </div>
      
      {/* Job Description */}
      <div className={styles.jobDescription}>
        <p className={styles.descriptionText}>
          {job.description || "This is a very long test description to verify that the ellipsis functionality is working correctly. We need to see if the text gets truncated after three lines and shows the ellipsis indicator. This should be enough text to span multiple lines and test the CSS line-clamp property. Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat."}
        </p>
      </div>

      <div className={styles.jobActions}>
        <Button 
          variant="ghost" 
          size="sm"
          className={styles.deleteButton}
          onClick={(e) => {
            e.stopPropagation();
            onDelete?.(job.id);
          }}
        >
          <span className={styles.buttonContent}>
            <FiTrash2 className={styles.icon} />
            <span>Delete</span>
          </span>
        </Button>
        <div className={styles.actionGroup}>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onEdit?.(job);
            }}
          >
            <span className={styles.buttonContent}>
              <FiEdit3 className={styles.icon} />
              <span>Edit</span>
            </span>
          </Button>
          <Button 
            variant="outline" 
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onView?.(job);
            }}
          >
            <span className={styles.buttonContent}>
              <FiEye className={styles.icon} />
              <span>View</span>
            </span>
          </Button>
          <Button 
            variant="primary" 
            size="sm"
            className={styles.applicantButton}
            onClick={(e) => {
              e.stopPropagation();
              onViewApplicants?.(job);
            }}
          >
            <span className={styles.buttonContent}>
              <FiUsers className={styles.icon} />
              <span>{job.applicants || job.applicantCount || 0} {(job.applicants || job.applicantCount || 0) === 1 ? 'applicant' : 'applicants'}</span>
            </span>
          </Button>
        </div>
      </div>
    </div>
  );
};
