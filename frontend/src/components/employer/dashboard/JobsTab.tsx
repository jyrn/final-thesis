import React, { useState } from 'react';
import { JobDetailsModal } from './JobDetailsModal';
import { DeleteJobModal } from './DeleteJobModal';
import { JobFormModal } from './JobFormModal';
import { FiPlus, FiBriefcase, FiMapPin, FiClock, FiTrendingUp, FiUsers, FiEdit3, FiTrash2, FiEye, FiDollarSign } from 'react-icons/fi';
import { Job } from '../../../types/Job';
import { Applicant } from '../../../types/dashboard';
import { getImageSrc } from '../../../utils/imageUtils';
import styles from './JobsTab.module.css';

interface JobsTabProps {
  jobs: Job[];
  applicants: Applicant[];
  searchTerm: string;
  filters: {
    status: string;
    department: string;
    location: string;
    dateFrom: string;
    dateTo: string;
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
      
      // Date range filter logic
      let matchesDate = true;
      if (filters.dateFrom || filters.dateTo) {
        const jobDate = new Date(job.postedDate || job.posted);
        
        if (filters.dateFrom) {
          const fromDate = new Date(filters.dateFrom);
          matchesDate = matchesDate && jobDate >= fromDate;
        }
        
        if (filters.dateTo) {
          const toDate = new Date(filters.dateTo);
          // Set to end of day for inclusive comparison
          toDate.setHours(23, 59, 59, 999);
          matchesDate = matchesDate && jobDate <= toDate;
        }
      }
      
      return matchesSearch && matchesStatus && matchesDepartment && matchesDate;
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

  const getCompanyInitials = (company: string) => {
    return company
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  };

  const formatPostedDate = (dateString: string | undefined) => {
    if (!dateString) return 'Not specified';
    
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) return 'Not specified';
      
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      
      // Format full date
      const fullDate = date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      
      // Format relative time
      let timeAgo;
      if (diffDays === 0) {
        timeAgo = 'Today';
      } else if (diffDays === 1) {
        timeAgo = 'Yesterday';
      } else if (diffDays < 7) {
        timeAgo = `${diffDays} days ago`;
      } else if (diffDays === 7) {
        timeAgo = '1 week ago';
      } else if (diffDays < 14) {
        timeAgo = `${diffDays} days ago`;
      } else if (diffDays === 14) {
        timeAgo = '2 weeks ago';
      } else if (diffDays < 30) {
        timeAgo = `${Math.floor(diffDays / 7)} weeks ago`;
      } else if (diffDays < 60) {
        timeAgo = '1 month ago';
      } else if (diffDays < 365) {
        timeAgo = `${Math.floor(diffDays / 30)} months ago`;
      } else {
        timeAgo = `${Math.floor(diffDays / 365)} years ago`;
      }
      
      return `${fullDate} — ${timeAgo}`;
    } catch (error) {
      return 'Not specified';
    }
  };

  const getCompanyAvatar = (job: Job) => {
    if (job.companyLogo) {
      return (
        <img 
          src={getImageSrc(job.companyLogo)} 
          alt={`${job.company} logo`} 
          className={styles.companyLogoImage}
        />
      );
    }
    return <span>{getCompanyInitials(job.company)}</span>;
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
            <option value="removed">Removed</option>
          </select>
          <div className={styles.dateRangeContainer}>
            <label className={styles.dateLabel}>From:</label>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.dateFrom}
              onChange={(e) => onFilterChange('dateFrom', e.target.value)}
              placeholder="From date"
            />
            <label className={styles.dateLabel}>To:</label>
            <input
              type="date"
              className={styles.dateInput}
              value={filters.dateTo}
              onChange={(e) => onFilterChange('dateTo', e.target.value)}
              placeholder="To date"
            />
          </div>
          <select 
            className={styles.filterSelect}
            value={filters.department}
            onChange={(e) => onFilterChange('department', e.target.value)}
          >
            <option value="all">All Departments</option>
            <option value="Account Management">Account Management</option>
            <option value="Accounting">Accounting</option>
            <option value="Administration">Administration</option>
            <option value="Aerospace">Aerospace</option>
            <option value="Agriculture">Agriculture</option>
            <option value="Architecture">Architecture</option>
            <option value="Artificial Intelligence">Artificial Intelligence</option>
            <option value="Automotive">Automotive</option>
            <option value="Banking">Banking</option>
            <option value="Beauty & Cosmetics">Beauty & Cosmetics</option>
            <option value="Biotechnology">Biotechnology</option>
            <option value="Blockchain">Blockchain</option>
            <option value="Broadcasting">Broadcasting</option>
            <option value="Business Development">Business Development</option>
            <option value="Chemical">Chemical</option>
            <option value="Compliance">Compliance</option>
            <option value="Construction">Construction</option>
            <option value="Consulting">Consulting</option>
            <option value="Content Marketing">Content Marketing</option>
            <option value="Customer Success">Customer Success</option>
            <option value="Customer Support">Customer Support</option>
            <option value="Cybersecurity">Cybersecurity</option>
            <option value="Data Science">Data Science</option>
            <option value="Design">Design</option>
            <option value="DevOps">DevOps</option>
            <option value="Digital Marketing">Digital Marketing</option>
            <option value="E-commerce">E-commerce</option>
            <option value="Education">Education</option>
            <option value="Energy">Energy</option>
            <option value="Engineering">Engineering</option>
            <option value="Entertainment">Entertainment</option>
            <option value="Environmental">Environmental</option>
            <option value="Executive">Executive</option>
            <option value="Fashion">Fashion</option>
            <option value="Finance">Finance</option>
            <option value="Food & Beverage">Food & Beverage</option>
            <option value="Gaming">Gaming</option>
            <option value="Government">Government</option>
            <option value="Graphic Design">Graphic Design</option>
            <option value="Healthcare">Healthcare</option>
            <option value="Hospitality">Hospitality</option>
            <option value="HR">Human Resources</option>
            <option value="Information Technology">Information Technology</option>
            <option value="Insurance">Insurance</option>
            <option value="Investment">Investment</option>
            <option value="Journalism">Journalism</option>
            <option value="Legal">Legal</option>
            <option value="Logistics">Logistics</option>
            <option value="Manufacturing">Manufacturing</option>
            <option value="Marketing">Marketing</option>
            <option value="Media & Communications">Media & Communications</option>
            <option value="Medical">Medical</option>
            <option value="Mining">Mining</option>
            <option value="Non-Profit">Non-Profit</option>
            <option value="Nursing">Nursing</option>
            <option value="Oil & Gas">Oil & Gas</option>
            <option value="Operations">Operations</option>
            <option value="Pharmaceuticals">Pharmaceuticals</option>
            <option value="Pharmacy">Pharmacy</option>
            <option value="Product">Product</option>
            <option value="Product Management">Product Management</option>
            <option value="Production">Production</option>
            <option value="Project Management">Project Management</option>
            <option value="Property Management">Property Management</option>
            <option value="Public Relations">Public Relations</option>
            <option value="Publishing">Publishing</option>
            <option value="Quality Assurance">Quality Assurance</option>
            <option value="Quality Control">Quality Control</option>
            <option value="Real Estate">Real Estate</option>
            <option value="Renewable Energy">Renewable Energy</option>
            <option value="Research & Development">Research & Development</option>
            <option value="Retail">Retail</option>
            <option value="Sales">Sales</option>
            <option value="Security">Security</option>
            <option value="Software Development">Software Development</option>
            <option value="Sports & Recreation">Sports & Recreation</option>
            <option value="Supply Chain">Supply Chain</option>
            <option value="Talent Acquisition">Talent Acquisition</option>
            <option value="Teaching">Teaching</option>
            <option value="Telecommunications">Telecommunications</option>
            <option value="Textiles">Textiles</option>
            <option value="Tourism">Tourism</option>
            <option value="Training & Development">Training & Development</option>
            <option value="Transportation">Transportation</option>
            <option value="UX/UI Design">UX/UI Design</option>
            <option value="Warehouse">Warehouse</option>
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
        <div className={styles.jobsList}>
          {filteredJobs.map((job) => (
            <div 
              key={job.id}
              className={styles.jobCard}
              onClick={() => handleJobCardClick(job)}
            >
              <div className={styles.jobCardHeader}>
                <div className={styles.jobTitleRow}>
                  <div className={styles.companyLogo}>
                    {getCompanyAvatar(job)}
                  </div>
                  <div className={styles.jobInfo}>
                    <h4 className={styles.jobTitle}>{job.title}</h4>
                    <p className={styles.companyName}>{job.company}</p>
                  </div>
                  <div className={`${styles.statusBadge} ${styles[`status${job.status.charAt(0).toUpperCase() + job.status.slice(1)}`]}`}>
                    {job.status}
                  </div>
                </div>
                
                <div className={styles.jobDetails}>
                  <div className={styles.detailItem}>
                    <FiMapPin className={styles.detailIcon} />
                    <span>{job.location}</span>
                  </div>
                  <div className={styles.detailItem}>
                    <FiClock className={styles.detailIcon} />
                    <span>{job.type}</span>
                  </div>
                  {job.level && (
                    <div className={styles.detailItem}>
                      <FiTrendingUp className={styles.detailIcon} />
                      <span>{job.level}</span>
                    </div>
                  )}
                  {job.department && (
                    <div className={styles.detailItem}>
                      <FiBriefcase className={styles.detailIcon} />
                      <span>{job.department}</span>
                    </div>
                  )}
                  <div className={styles.detailItem}>
                    <FiDollarSign className={styles.detailIcon} />
                    <span>
                      {job.salaryMin > 0 && job.salaryMax > 0 ? (
                        `₱${job.salaryMin.toLocaleString()} - ₱${job.salaryMax.toLocaleString()}`
                      ) : job.salaryMin > 0 ? (
                        `From ₱${job.salaryMin.toLocaleString()}`
                      ) : job.salaryMax > 0 ? (
                        `Up to ₱${job.salaryMax.toLocaleString()}`
                      ) : 'Salary not specified'}
                    </span>
                  </div>
                  {job.workplaceType && (
                    <div className={styles.detailItem}>
                      <span>{job.workplaceType}</span>
                    </div>
                  )}
                </div>
                
                <div className={styles.jobDescription}>
                  <p className={styles.descriptionText}>
                    {job.description && job.description.length > 180 ? 
                      `${job.description.substring(0, 180)}...` : 
                      job.description || 'No description available'
                    }
                  </p>
                </div>
                
                <div className={styles.jobFooter}>
                  <div className={styles.footerLeft}>
                    <span className={styles.postedDate}>{formatPostedDate(job.postedDate || job.posted)}</span>
                    <div className={styles.applicantCount}>
                      <FiUsers className={styles.applicantIcon} />
                      <span>{job.applicants || job.applicantCount || 0} {(job.applicants || job.applicantCount || 0) === 1 ? 'applicant' : 'applicants'}</span>
                    </div>
                  </div>
                  <div className={styles.jobActions}>
                    <button 
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteJob(job);
                      }}
                      title="Delete job"
                    >
                      <FiTrash2 className={styles.actionIcon} />
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEditJob(job);
                      }}
                      title="Edit job"
                    >
                      <FiEdit3 className={styles.actionIcon} />
                    </button>
                    <button 
                      className={styles.actionButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleJobCardClick(job);
                      }}
                      title="View details"
                    >
                      <FiEye className={styles.actionIcon} />
                    </button>
                    <button 
                      className={styles.viewApplicantsButton}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewJobApplicants(job);
                      }}
                    >
                      View Applicants ({job.applicants || job.applicantCount || 0})
                    </button>
                  </div>
                </div>
              </div>
            </div>
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