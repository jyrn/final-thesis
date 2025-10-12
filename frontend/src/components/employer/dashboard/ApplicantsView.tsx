import React from 'react';
import { FiSearch, FiEye, FiDownload, FiCheck, FiXCircle } from 'react-icons/fi';
import { Applicant } from '../../../types/dashboard';
import { Job } from '../../../types/Job';
import styles from './ApplicantsView.module.css';

interface ApplicantsViewProps {
  applicants: Applicant[];
  jobs: Job[];
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filters: {
    jobId: string;
    status: string;
    sortBy: string;
  };
  onFilterChange: (filterType: string, value: string) => void;
  onViewApplicantDetails: (applicant: Applicant) => void;
  onDownloadResume: (applicantId: string) => void;
  onApproveApplicant: (applicantId: string) => void;
  onRejectApplicant: (applicantId: string) => void;
}

export const ApplicantsView: React.FC<ApplicantsViewProps> = ({
  applicants,
  jobs,
  searchQuery,
  onSearchChange,
  filters,
  onFilterChange,
  onViewApplicantDetails,
  onDownloadResume,
  onApproveApplicant,
  onRejectApplicant
}) => {
  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'hired': return styles.statusHired;
      case 'interview': return styles.statusInterview;
      case 'pending': return styles.statusPending;
      default: return styles.statusRejected;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'interview': return 'Interview';
      case 'hired': return 'Hired';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const getJobTitle = (jobId: string) => {
    return jobs.find(job => job.id.toString() === jobId)?.title || '';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>
          {filters.jobId ? 
            `Applicants for ${getJobTitle(filters.jobId)}` : 
            'All Applicants'
          }
        </h1>
        <div className={styles.controls}>
          <div className={styles.searchContainer}>
            <FiSearch className={styles.searchIcon} />
            <input
              type="text"
              placeholder="Search applicants..."
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className={styles.searchInput}
            />
          </div>
          <select 
            value={filters.jobId}
            onChange={(e) => onFilterChange('jobId', e.target.value)}
            className={styles.select}
          >
            <option value="">All Job Posts</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id.toString()}>
                {job.title}
              </option>
            ))}
          </select>
          <select 
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className={styles.select}
          >
            <option value="">All Status</option>
            <option value="pending">Pending Review</option>
            <option value="interview">Interview</option>
            <option value="hired">Hired</option>
            <option value="rejected">Rejected</option>
          </select>
          <select 
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className={styles.select}
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="match-high">Highest Match</option>
            <option value="match-low">Lowest Match</option>
          </select>
        </div>
      </div>

      <div className={styles.applicantsGrid}>
        {applicants.map((applicant) => (
          <div 
            key={applicant.id} 
            className={styles.applicantCard}
            onClick={() => onViewApplicantDetails(applicant)}
          >
            <div className={styles.applicantHeader}>
              <div className={styles.avatar}>
                {applicant.name.charAt(0)}
              </div>
              <div className={styles.applicantInfo}>
                <h3 className={styles.applicantName}>{applicant.name}</h3>
                <p className={styles.position}>
                  Applied for: <span className={styles.positionName}>{applicant.position}</span>
                </p>
                <p className={styles.appliedDate}>
                  Applied on {new Date(applicant.appliedDate).toLocaleDateString()} • {applicant.experience?.length || 0} years experience
                </p>
              </div>
              <div className={styles.matchSection}>
                <div className={styles.matchScore}>{applicant.match}%</div>
                <div className={styles.matchLabel}>Match</div>
                <span className={`${styles.statusBadge} ${getStatusBadgeClass(applicant.status)}`}>
                  {getStatusText(applicant.status)}
                </span>
              </div>
            </div>

            <div className={styles.skillsSection}>
              <div className={styles.skillsLabel}>Skills:</div>
              <div className={styles.skillsList}>
                {applicant.skills.slice(0, 4).map((skill, index) => (
                  <span key={index} className={styles.skillTag}>
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className={styles.actions}>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onViewApplicantDetails(applicant);
                }}
                title="View Details"
                className={styles.actionButton}
              >
                <FiEye size={16} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onDownloadResume(applicant.id);
                }}
                title="Download Resume"
                className={styles.actionButton}
              >
                <FiDownload size={16} />
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onApproveApplicant(applicant.id);
                }}
                title="Approve"
                className={`${styles.actionButton} ${styles.approveButton}`}
              >
                <FiCheck size={16} />
                Approve
              </button>
              <button 
                onClick={(e) => {
                  e.stopPropagation();
                  onRejectApplicant(applicant.id);
                }}
                title="Reject"
                className={`${styles.actionButton} ${styles.rejectButton}`}
              >
                <FiXCircle size={16} />
                Reject
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
