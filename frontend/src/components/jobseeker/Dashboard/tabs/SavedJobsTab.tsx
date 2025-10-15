import React from 'react';
import styles from '../../../../pages/jobseeker/Dashboard.module.css';
import JobsList from '../../JobsList/JobsList';
import { FiBookmark } from 'react-icons/fi';
import { Job } from '../../../../types/Job';

const SavedJobsTab: React.FC<any> = ({
  jobs,
  savedJobs,
  onSaveJob,
  onApplyJob,
  onJobClick,
}) => {
  const savedJobsList = jobs.filter((job: Job) => {
    return savedJobs.has(job.id);
  });

  return (
    <div className={styles.tabContent}>
      {savedJobsList.length > 0 ? (
        <JobsList
          jobs={savedJobsList}
          title=""
          onSaveJob={onSaveJob}
          onApplyJob={onApplyJob}
          onJobClick={onJobClick}
          savedJobs={savedJobs}
        />
      ) : (
        <div className={styles.emptyState}>
          <FiBookmark size={48} className={styles.emptyIcon} />
          <h3>No saved jobs</h3>
          <p>Jobs you save will appear here</p>
        </div>
      )}
    </div>
  );
};

export default SavedJobsTab;
