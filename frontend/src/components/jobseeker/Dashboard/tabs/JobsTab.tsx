import React from 'react';
import styles from '../../../../pages/jobseeker/Dashboard.module.css';
import { JobsListView } from '../../JobsListView/JobsListView';
import { Job } from '../../../../types/Job';

const JobsTab: React.FC<any> = ({
  resume,
  hasSkippedResume,
  getJobsToDisplay,
  onSaveJob,
  onApplyJob,
  onJobClick,
  savedJobs,
  appliedJobs,
  onOpenFilters,
}) => {

  return (
    <div className={styles.tabContent}>
      <JobsListView
        jobs={getJobsToDisplay()}
        onJobClick={onJobClick}
        onSaveJob={onSaveJob}
        onApplyJob={onApplyJob}
        savedJobs={savedJobs}
        appliedJobs={appliedJobs}
        jobseekerSkills={resume?.skills || []}
        jobseekerEducation={resume?.education}
      />
    </div>
  );
};

export default JobsTab;
