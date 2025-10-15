import React from 'react';
import { Applicant } from '@/types/dashboard';
import { FiMail, FiPhone, FiMapPin, FiCalendar, FiFileText, FiEye, FiUser, FiDownload, FiCheck, FiX } from 'react-icons/fi';
import styles from './ApplicantCard.module.css';
import { getImageSrc } from '../../../utils/imageUtils';

interface ApplicantCardProps {
  applicant: Applicant;
  onAccept?: (applicantId: string) => void;
  onReject?: (applicantId: string) => void;
  onViewResume?: (applicantId: string) => void;
}

export const ApplicantCard: React.FC<ApplicantCardProps> = ({
  applicant,
  onAccept,
  onReject,
  onViewResume,
}) => {
  // Temporary inline functions

  const getInitials = (name: string): string => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  return (
    <div className={styles.applicantCard}>
      <div className={styles.applicantHeader}>
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
          <h3 className={styles.applicantName}>{applicant.name}</h3>
          <p className={styles.applicantPosition}>{applicant.jobTitle}</p>
          <div className={styles.matchScore}>
            <div className={styles.matchBar} style={{ width: `${applicant.matchScore}%` }} />
            <span>Match: {applicant.matchScore}%</span>
          </div>
        </div>
      </div>

      <div className={styles.applicantDetails}>
        <div className={styles.detailItem}>
          <FiMail className={styles.icon} />
          <span>{applicant.email}</span>
        </div>
        <div className={styles.detailItem}>
          <FiPhone className={styles.icon} />
          <span>{applicant.phone}</span>
        </div>
        <div className={styles.detailItem}>
          <FiCalendar className={styles.icon} />
          <span>Applied on {applicant.appliedDate}</span>
        </div>
        <div className={styles.detailItem}>
          <FiUser className={styles.icon} />
          <span>{applicant.experience?.length || 0} years of experience</span>
        </div>
      </div>

      {applicant.skills && applicant.skills.length > 0 && (
        <div className={styles.skillsContainer}>
          <h4 className={styles.skillsTitle}>Skills</h4>
          <div className={styles.skillsList}>
            {applicant.skills.slice(0, 5).map((skill, index) => (
              <span key={index} className={styles.skillTag}>
                {skill}
              </span>
            ))}
            {applicant.skills.length > 5 && (
              <span className={styles.moreSkills}>+{applicant.skills.length - 5} more</span>
            )}
          </div>
        </div>
      )}

      <div className={styles.actions}>
        <button
          className={styles.viewResumeBtn}
          onClick={() => onViewResume?.(applicant.id)}
        >
          <FiDownload className={styles.icon} />
          View Resume
        </button>
        {applicant.status === 'pending' ? (
          <div className={styles.decisionButtons}>
            <button
              className={styles.acceptBtn}
              onClick={() => onAccept?.(applicant.id)}
            >
              <FiCheck className={styles.icon} />
              Accept
            </button>
            <button
              className={styles.rejectBtn}
              onClick={() => onReject?.(applicant.id)}
            >
              <FiX className={styles.icon} />
              Reject
            </button>
          </div>
        ) : (
          <div className={styles.statusDisplay}>
            <div className={`${styles.statusBadge} ${styles[applicant.status]}`}>
              {(applicant.status === 'initial_interview' || applicant.status === 'final_interview') && <FiCheck className={styles.icon} />}
              {applicant.status === 'rejected' && <FiX className={styles.icon} />}
              {applicant.status === 'hired' && <FiCheck className={styles.icon} />}
              <span>
                {applicant.status === 'initial_interview' ? 'Initial Interview' :
                 applicant.status === 'final_interview' ? 'Final Interview' :
                 applicant.status === 'rejected' ? 'Rejected' :
                 applicant.status === 'hired' ? 'Hired' :
                 applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
