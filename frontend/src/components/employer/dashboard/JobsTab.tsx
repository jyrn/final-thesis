import React, { useState } from 'react';
import { JobCard } from './JobCard';
import { JobDetailsModal } from './JobDetailsModal';
import { DeleteJobModal } from './DeleteJobModal';
import { JobFormModal } from './JobFormModal';
import { FiPlus, FiBriefcase } from 'react-icons/fi';
import { Job } from '@/types/Job';
import { Applicant } from '@/types/dashboard';
import styles from './JobsTab.module.css';

interface JobsTabProps {
  jobs: Job[];
  applicants: Applicant[];
  searchTerm: string;
  filters: {
    status: string;
    department: string;
    location: string;
  };
  onSearchChange: (term: string) => void;
  onFilterChange: (filterType: string, value: string) => void;
  onViewJob: (job: Job) => void;
  onEditJob: (job: Job) => void;
  onDeleteJob: (jobId: string | number, hiredApplicantIds?: string[]) => void;
  onCreateJob: (jobData: Partial<Job>) => void;
  onUpdateJob: (jobData: Partial<Job>) => void;
  isLoading?: boolean;
  profilePicture?: string;
}

export const JobsTab: React.FC<JobsTabProps> = ({
  jobs,
  applicants,
  searchTerm,
  filters,
  onSearchChange,
  onFilterChange,
  onViewJob,
  onDeleteJob,
  onCreateJob,
  onUpdateJob,
  isLoading = false,
  profilePicture
}) => {
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<Job | null>(null);
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);

  const filteredJobs = jobs
    .filter(job => {
      const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesStatus = !filters.status || filters.status === 'all' || job.status === filters.status;
      const matchesDepartment = !filters.department || filters.department === 'all' || job.department === filters.department;
      return matchesSearch && matchesStatus && matchesDepartment;
    })
    .sort((a, b) => {
      // Sort by posted date, latest first
      const dateA = new Date(a.postedDate || a.posted || 0).getTime();
      const dateB = new Date(b.postedDate || b.posted || 0).getTime();
      return dateB - dateA; // Latest first
    });

  const handleJobCardClick = (job: Job) => {
    setSelectedJob(job);
    setIsDetailsModalOpen(true);
  };

  const handleViewJobApplicants = (job: Job) => {
    // Pass the job to the parent component to handle the tab change and filtering
    onViewJob?.(job);
  };

  const handleEditJob = (job: Job) => {
    setJobToEdit(job);
    setIsDetailsModalOpen(false);
    setIsFormModalOpen(true);
  };

  const handleDeleteJob = (job: Job) => {
    setJobToDelete(job);
    setIsDetailsModalOpen(false);
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDelete = (jobId: string | number, hiredApplicantIds: string[]) => {
    onDeleteJob(jobId, hiredApplicantIds);
    setIsDeleteModalOpen(false);
    setJobToDelete(null);
  };

  const handleCreateJob = () => {
    setJobToEdit(null);
    setIsFormModalOpen(true);
  };

  const handleSaveJob = (jobData: Partial<Job>) => {
    if (jobToEdit) {
      onUpdateJob(jobData);
    } else {
      onCreateJob(jobData);
    }
    setIsFormModalOpen(false);
    setJobToEdit(null);
  };

  const closeModals = () => {
    setIsDetailsModalOpen(false);
    setIsDeleteModalOpen(false);
    setIsFormModalOpen(false);
    setSelectedJob(null);
    setJobToDelete(null);
    setJobToEdit(null);
  };

  const renderEmptyState = () => (
    <div className={styles.emptyState}>
      <FiBriefcase className={styles.emptyStateIcon} />
      <h3 className={styles.emptyStateTitle}>
        {searchTerm || filters.status ? 'No jobs found' : 'No job postings yet'}
      </h3>
      <p className={styles.emptyStateDescription}>
        {searchTerm || filters.status 
          ? 'Try adjusting your search criteria or filters to find what you\'re looking for.'
          : 'Start building your team by creating your first job posting. Attract top talent with detailed job descriptions and competitive offers.'
        }
      </p>
      {(!searchTerm && !filters.status) && (
        <button className={styles.emptyStateButton} onClick={handleCreateJob}>
          <FiPlus />
          Create Your First Job
        </button>
      )}
    </div>
  );

  const renderLoadingState = () => (
    <div className={styles.loadingState}>
      <div className={styles.spinner}></div>
      <p className={styles.loadingText}>Loading job postings...</p>
    </div>
  );

  return (
    <div className={styles.jobsTab}>
      <div className={styles.header}>
        <h1 className={styles.title}>All Job Posts</h1>
        <div className={styles.headerControls}>
          <select 
            className={styles.filterSelect}
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
          >
            <option value="all">All Jobs</option>
            <option value="active">Active</option>
            <option value="paused">Paused</option>
            <option value="closed">Closed</option>
          </select>
          <select 
            className={styles.filterSelect}
            value={filters.department}
            onChange={(e) => onFilterChange('department', e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="Engineering">Engineering</option>
            <option value="Software Development">Software Development</option>
            <option value="Data Science">Data Science</option>
            <option value="DevOps">DevOps</option>
            <option value="Quality Assurance">Quality Assurance</option>
            <option value="Marketing">Marketing</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="Content Marketing">Content Marketing</option>
            <option value="Sales">Sales</option>
            <option value="Business Development">Business Development</option>
            <option value="Account Management">Account Management</option>
            <option value="HR">Human Resources</option>
            <option value="Talent Acquisition">Talent Acquisition</option>
            <option value="Finance">Finance</option>
            <option value="Accounting">Accounting</option>
            <option value="Operations">Operations</option>
            <option value="Supply Chain">Supply Chain</option>
            <option value="Project Management">Project Management</option>
            <option value="Design">Design</option>
            <option value="UX/UI Design">UX/UI Design</option>
            <option value="Graphic Design">Graphic Design</option>
            <option value="Product">Product</option>
            <option value="Product Management">Product Management</option>
            <option value="Customer Success">Customer Success</option>
            <option value="Customer Support">Customer Support</option>
            <option value="Legal">Legal</option>
            <option value="Compliance">Compliance</option>
            <option value="Research & Development">Research & Development</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Security">Security</option>
            <option value="Administration">Administration</option>
            <option value="Executive">Executive</option>
            <option value="Consulting">Consulting</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Medical">Medical</option>
            <option value="Nursing">Nursing</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Education">Education</option>
            <option value="Teaching">Teaching</option>
            <option value="Training & Development">Training & Development</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Production">Production</option>
            <option value="Quality Control">Quality Control</option>
            <option value="Logistics">Logistics</option>
            <option value="Transportation">Transportation</option>
            <option value="Warehouse">Warehouse</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Property Management">Property Management</option>
            <option value="Construction">Construction</option>
            <option value="Architecture">Architecture</option>
            <option value="Media & Communications">Media & Communications</option>
            <option value="Public Relations">Public Relations</option>
            <option value="Journalism">Journalism</option>
            <option value="Broadcasting">Broadcasting</option>
            <option value="Hospitality">Hospitality</option>
            <option value="Food & Beverage">Food & Beverage</option>
            <option value="Tourism">Tourism</option>
            <option value="Retail">Retail</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Banking">Banking</option>
            <option value="Insurance">Insurance</option>
            <option value="Investment">Investment</option>
            <option value="Government">Government</option>
            <option value="Non-Profit">Non-Profit</option>
            <option value="Energy">Energy</option>
            <option value="Oil & Gas">Oil & Gas</option>
            <option value="Renewable Energy">Renewable Energy</option>
            <option value="Telecommunications">Telecommunications</option>
            <option value="Automotive">Automotive</option>
            <option value="Aerospace">Aerospace</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Environmental">Environmental</option>
            <option value="Sports & Recreation">Sports & Recreation</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Fashion">Fashion</option>
            <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
            <option value="Biotechnology">Biotechnology</option>
            <option value="Pharmaceuticals">Pharmaceuticals</option>
            <option value="Mining">Mining</option>
            <option value="Chemical">Chemical</option>
            <option value="Textiles">Textiles</option>
            <option value="Publishing">Publishing</option>
            <option value="Gaming">Gaming</option>
            <option value="Cybersecurity">Cybersecurity</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
            <option value="Blockchain">Blockchain</option>
          </select>
          <button 
            className={styles.createButton}
            onClick={handleCreateJob}
          >    
            <FiPlus />
            Post New Job
          </button>
        </div>
      </div>

      {isLoading ? (
        renderLoadingState()
      ) : filteredJobs.length > 0 ? (
        <div className={styles.jobsGrid}>
          {filteredJobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={handleJobCardClick}
              onView={handleJobCardClick}
              onEdit={handleEditJob}
              onViewApplicants={onViewJob}
              onDelete={(jobId) => {
                const job = jobs.find(j => j.id === jobId);
                if (job) handleDeleteJob(job);
              }}
            />
          ))}
        </div>
      ) : (
        renderEmptyState()
      )}
      
      <JobDetailsModal
        job={selectedJob}
        isOpen={isDetailsModalOpen}
        onClose={closeModals}
        onEdit={handleEditJob}
        onDelete={handleDeleteJob}
        onViewApplicants={handleViewJobApplicants}
        profilePicture={profilePicture}
      />
      
      <DeleteJobModal
        job={jobToDelete}
        applicants={applicants}
        isOpen={isDeleteModalOpen}
        onClose={closeModals}
        onConfirmDelete={handleConfirmDelete}
      />
      
      <JobFormModal
        job={jobToEdit}
        isOpen={isFormModalOpen}
        onClose={closeModals}
        onSave={handleSaveJob}
        isEditing={!!jobToEdit}
      />
    </div>
  );
};