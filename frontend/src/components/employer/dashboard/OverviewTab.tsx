import React from 'react';
import { JobCard } from './JobCard';
import { ApplicantCard } from './ApplicantCard';
import StatsCard from './StatsCard';
import Button from '../ui/Button';
import { FiBriefcase, FiUsers, FiDollarSign, FiClock } from 'react-icons/fi';
import { Job } from '@/types/Job';
import { Applicant } from '@/types/dashboard';

interface OverviewTabProps {
  jobs: Job[];
  applicants: Applicant[];
  stats: {
    activeJobs: number;
    totalApplicants: number;
    interviewsScheduled: number;
    positionsFilled: number;
    jobsChange: string;
    applicantsChange: string;
    interviewsChange: string;
    filledChange: string;
  };
  onTabChange: (tab: string) => void;
  onViewJob: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: number | string) => void;
  onAcceptApplicant: (applicantId: string) => void;
  onRejectApplicant: (applicantId: string) => void;
  onViewResume: (applicantId: string) => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  jobs,
  applicants,
  stats,
  onTabChange,
  onViewJob,
  onEditJob,
  onDeleteJob,
  onAcceptApplicant,
  onRejectApplicant,
  onViewResume,
}) => {
  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          title="Active Jobs"
          value={stats.activeJobs}
          change={parseInt(stats.jobsChange.replace(/[^0-9-]/g, ''))}
          icon={<FiBriefcase />}
          trend={stats.jobsChange.startsWith('+') ? 'up' : 'down'}
        />
        <StatsCard
          title="Total Applicants"
          value={stats.totalApplicants}
          change={parseInt(stats.applicantsChange.replace(/[^0-9-]/g, ''))}
          icon={<FiUsers />}
          trend={stats.applicantsChange.startsWith('+') ? 'up' : 'down'}
        />
        <StatsCard
          title="Interviews"
          value={stats.interviewsScheduled}
          change={parseInt(stats.interviewsChange.replace(/[^0-9-]/g, ''))}
          icon={<FiClock />}
          trend={stats.interviewsChange.startsWith('+') ? 'up' : 'down'}
        />
        <StatsCard
          title="Positions Filled"
          value={stats.positionsFilled}
          change={parseInt(stats.filledChange.replace(/[^0-9-]/g, ''))}
          icon={<FiDollarSign />}
          trend={stats.filledChange.startsWith('+') ? 'up' : 'down'}
        />
      </div>

      {/* Recent Jobs */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Job Postings</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onTabChange('jobs')}
          >
            View All
          </Button>
        </div>
        
        <div className="space-y-4">
          {jobs.slice(0, 3).map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onView={onViewJob}
              onEdit={onEditJob}
              onDelete={onDeleteJob}
              onViewApplicants={onViewJob}
            />
          ))}
        </div>
      </div>

      {/* Recent Applicants */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-lg font-semibold text-gray-900">Recent Applicants</h2>
          <Button 
            variant="outline" 
            size="sm"
            onClick={() => onTabChange('applicants')}
          >
            View All
          </Button>
        </div>
        
        <div className="space-y-4">
          {applicants.slice(0, 3).map((applicant) => (
            <ApplicantCard
              key={applicant.id}
              applicant={applicant}
              onAccept={onAcceptApplicant}
              onReject={onRejectApplicant}
              onViewResume={onViewResume}
            />
          ))}
        </div>
      </div>
    </div>
  );
};