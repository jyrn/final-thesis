import React from 'react';
import { ApplicantListView } from './ApplicantListView';
import { SearchAndFilter } from './SearchAndFilter';
import Button from '../ui/Button';
import { FiDownload } from 'react-icons/fi';
import { Applicant } from '@/types/dashboard';
import { Job } from '@/types/Job';

interface ApplicantsTabProps {
  applicants: Applicant[];
  searchTerm: string;
  filters: {
    status: string;
    jobId?: string;
  };
  onSearchChange: (term: string) => void;
  onFilterChange: (filterType: string, value: string) => void;
  onAcceptApplicant: (applicantId: string) => void;
  onRejectApplicant: (applicantId: string) => void;
  onViewResume: (applicantId: string) => void;
  onViewDetails: (applicant: Applicant) => void;
  onExport?: () => void;
  jobPostings?: Job[];
}

export const ApplicantsTab: React.FC<ApplicantsTabProps> = ({
  applicants,
  searchTerm,
  filters,
  onSearchChange,
  onFilterChange,
  onAcceptApplicant,
  onRejectApplicant,
  onViewResume,
  onViewDetails,
  onExport,
  jobPostings = [],
}) => {
  // Pass job postings to ApplicantListView so it can match each applicant to their specific job
  // No need to pre-calculate target skills here since each applicant applied to different jobs
  return (
    <div className="p-8">
      <div className="max-w-full">
        {/* Search and Filter Section */}
        <div className="bg-white border border-gray-200 rounded-lg p-6 mb-12">
          <SearchAndFilter
            searchTerm={searchTerm}
            onSearchChange={onSearchChange}
            onFilterChange={onFilterChange}
            filters={filters}
            jobPostings={jobPostings}
          />
        </div>

        {/* Applicants List */}
        <ApplicantListView
          applicants={applicants}
          onViewDetails={onViewDetails}
          jobPostings={jobPostings}
          selectedJobId={filters.jobId}
        />
      </div>
    </div>
  );
};