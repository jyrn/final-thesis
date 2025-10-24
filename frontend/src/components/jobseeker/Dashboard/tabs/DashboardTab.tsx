import React from 'react';
import styles from '../../../../pages/jobseeker/Dashboard.module.css';
import WelcomeHeader from '../WelcomeHeader';
import StatsGrid from '../StatsGrid';
import QuickActions from '../QuickActions';
import RecentActivity from '../RecentActivity';
import JobsPreview from '../JobsPreview';
import { Job } from '../../../../types/Job';

const DashboardTab: React.FC<any> = ({
  resume,
  applications,
  savedJobs,
  jobs,
  hasSkippedResume,
  userProfile,
  onNavigate,
  onShowResumeUpload,
  getJobsToDisplay,
  onSaveJob,
  onApplyJob,
  onJobClick,
}) => {
  return (
    <div className={styles.tabContent}>
      <WelcomeHeader 
        userName={userProfile?.firstName || "User"} 
        profilePicture={userProfile?.profilePicture}
      />
      <StatsGrid
        applicationsCount={applications.length}
        savedJobsCount={savedJobs.size}
        interviewsCount={applications.filter((app: any) => app.status === 'initial_interview' || app.status === 'final_interview').length}
        availableJobsCount={jobs.length}
        onNavigate={onNavigate}
      />
      <QuickActions
        onNavigate={onNavigate}
        onShowResumeUpload={onShowResumeUpload}
        userProfile={userProfile}
      />
      <RecentActivity
        applications={applications}
        jobs={jobs}
        onNavigate={onNavigate}
      />
      <JobsPreview
        matchedJobs={getJobsToDisplay()}
        latestJobs={jobs}
        hasResume={!!resume && !hasSkippedResume}
        onNavigate={onNavigate}
        onSaveJob={onSaveJob}
        onApplyJob={onApplyJob}
        onJobClick={onJobClick}
        savedJobs={savedJobs}
      />
    </div>
  );
};

export default DashboardTab;
