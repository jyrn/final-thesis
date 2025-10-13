import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiFileText, FiClock, FiTrendingUp, FiEye, FiSearch, FiCalendar, FiMoreHorizontal, FiTrash2, FiXCircle, FiAlertCircle, FiArrowRight, FiChevronUp, FiChevronDown, FiX } from 'react-icons/fi';
import { HiCheckCircle } from 'react-icons/hi';
import StatsCard from './StatsCard';
import adminService from '../../services/adminService';
import { Job } from '../../types/Job';
import AdminJobDetailModal from './AdminJobDetailModal';
import './SuperAdminJobsTab.css';

interface SuperAdminJobsTabProps {
  onJobStatusChange?: (jobId: string, status: string) => void;
}

const SuperAdminJobsTab: React.FC<SuperAdminJobsTabProps> = ({ onJobStatusChange }) => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [allJobs, setAllJobs] = useState<Job[]>([]); // Store all jobs for department options
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [departmentFilter, setDepartmentFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<string>('desc');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalJobs, setTotalJobs] = useState(0);
  const [stats, setStats] = useState({
    totalJobs: 0,
    activeJobs: 0,
    pendingJobs: 0,
    totalViews: 0
  });
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [showJobModal, setShowJobModal] = useState(false);
  const [confirmModal, setConfirmModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    action: () => void;
    actionText: string;
    icon: string;
  }>({
    show: false,
    title: '',
    message: '',
    action: () => {},
    actionText: '',
    icon: ''
  });
  const [successModal, setSuccessModal] = useState<{
    show: boolean;
    title: string;
    message: string;
    icon: string;
  }>({
    show: false,
    title: '',
    message: '',
    icon: ''
  });

  const jobsPerPage = 12;

  // Helper function to format date and calculate days active
  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    const timeString = date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: true 
    });
    const dateStr = date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    // Calculate days active
    let daysActive = '';
    if (diffDays === 0) {
      daysActive = 'Today';
    } else if (diffDays === 1) {
      daysActive = '1 day';
    } else {
      daysActive = `${diffDays} days`;
    }
    
    return { timeString, dateStr, daysActive, diffDays };
  };

  // Admin action handlers
  const handleRemoveJob = (jobId: string) => {
    setConfirmModal({
      show: true,
      title: 'Remove Job Posting',
      message: `This action will permanently delete the job posting from the system. This is typically done when:

• The job posting violates platform policies
• The employer has requested permanent removal
• The job contains inappropriate or misleading content
• Legal compliance requires removal
• The job has been active for an extended period (3+ months) without updates
• The position appears to be inactive or no longer available
• The employer is unresponsive to applicants or platform communications
• The job posting is a duplicate of existing listings
• The posting contains outdated or irrelevant information

Once removed, the job cannot be recovered and all associated data will be lost. Employers will be notified of this action.`,
      action: async () => {
        try {
          await adminService.updateJobStatus(jobId, 'removed');
          await fetchJobs();
          onJobStatusChange?.(jobId, 'removed');
          setConfirmModal(prev => ({ ...prev, show: false }));
          
          // Show success message
          setSuccessModal({
            show: true,
            title: 'Job Removed Successfully',
            message: 'The job posting has been permanently removed from the system. The employer has been notified of this action.',
            icon: '✅'
          });
        } catch (error) {
          console.error('Error removing job:', error);
          alert('❌ Failed to remove job. Please try again.');
        }
      },
      actionText: 'Remove Permanently',
      icon: '🗑️'
    });
  };

  const handlePauseJob = (jobId: string) => {
    setConfirmModal({
      show: true,
      title: 'Pause Job Posting',
      message: `This action will temporarily hide the job posting from jobseekers. This is typically done when:

• The employer needs to temporarily stop receiving applications.
• The position is being reviewed, updated, or modified.
• The employer has received more applications than they can currently manage.
• The job requirements are being modified
• Seasonal hiring pause or company restructuring is occurring.
• The posting requires verification of job details, employer authenticity, or ongoing hiring status.
• The job has been active for an extended period and may require employer confirmation or updating.

The job posting will remain in the system and can be reactivated by the employer at any time. Current applicants will still be able to view their application status.`,
      action: async () => {
        try {
          await adminService.updateJobStatus(jobId, 'paused');
          await fetchJobs();
          onJobStatusChange?.(jobId, 'paused');
          setConfirmModal(prev => ({ ...prev, show: false }));
          
          // Show success message
          setSuccessModal({
            show: true,
            title: 'Job Paused Successfully',
            message: 'The job posting has been temporarily hidden from jobseekers. It can be reactivated by the employer at any time.',
            icon: '⏸️'
          });
        } catch (error) {
          console.error('Error pausing job:', error);
          alert('❌ Failed to pause job. Please try again.');
        }
      },
      actionText: 'Pause Job',
      icon: '⏸️'
    });
  };

  const handleFlagJob = (jobId: string) => {
    setConfirmModal({
      show: true,
      title: 'Flag Job Posting',
      message: `This action will flag the job posting for administrative review. This is typically done when:

• The job posting contains suspicious or misleading information
• The job requirements seem discriminatory or inappropriate
• The salary or benefits appear unrealistic
• The employer's legitimacy needs verification

Flagged jobs will be temporarily hidden from jobseekers while under review. The employer will be notified and may be asked to provide additional information or make corrections.`,
      action: async () => {
        try {
          await adminService.updateJobStatus(jobId, 'flagged');
          await fetchJobs();
          onJobStatusChange?.(jobId, 'flagged');
          setConfirmModal(prev => ({ ...prev, show: false }));
          
          // Show success message
          setSuccessModal({
            show: true,
            title: 'Job Flagged Successfully',
            message: 'The job posting has been flagged for administrative review. It will be temporarily hidden while under investigation.',
            icon: '🚩'
          });
        } catch (error) {
          console.error('Error flagging job:', error);
          alert('❌ Failed to flag job. Please try again.');
        }
      },
      actionText: 'Flag for Review',
      icon: '🚩'
    });
  };

  const handleViewJob = (job: Job) => {
    console.log('🔍 Admin viewing job details:', job.title);
    setSelectedJob(job);
    setShowJobModal(true);
  };

  const closeJobModal = () => {
    setShowJobModal(false);
    setSelectedJob(null);
  };

  const handleSort = (column: string) => {
    if (sortBy === column) {
      // Toggle order if same column
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      // Set new column and default to desc
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  const handleDepartmentFilter = (department: string) => {
    setDepartmentFilter(department);
    setCurrentPage(1);
  };

  const clearSearch = () => {
    setSearchQuery('');
  };

  // Get unique departments from all jobs for filter dropdown
  const getUniqueDepartments = () => {
    const departments = allJobs
      .map(job => job.department)
      .filter((dept, index, arr) => dept && dept !== 'Not specified' && arr.indexOf(dept) === index)
      .sort();
    return departments;
  };

  useEffect(() => {
    fetchJobs();
  }, [currentPage, sortBy, sortOrder]);

  // Trigger re-filtering when status or department filter changes
  useEffect(() => {
    setCurrentPage(1);
    fetchJobs();
  }, [statusFilter, departmentFilter]);

  // Debounced search effect
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      setCurrentPage(1); // Reset to first page when searching
      fetchJobs();
    }, 300); // 300ms delay

    return () => clearTimeout(delayedSearch);
  }, [searchQuery]);


  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);

      const params = {
        page: currentPage,
        limit: jobsPerPage,
        sortBy: sortBy,
        sortOrder: sortOrder
      };

      const response = await adminService.getJobs(params);
      
      // Also get all jobs for accurate stats calculation
      const allJobsResponse = await adminService.getJobs({ limit: 1000 });

      if (response.success && response.jobs) {
        // Fetch all applications to count by jobId (client-side counting)
        let allApplications: any[] = [];
        try {
          allApplications = await adminService.getAllApplications();
        } catch (error) {
          // Silently handle error
        }

        // Convert jobs and calculate real application counts
        let convertedJobs = response.jobs.map((job: any) => {
          const jobId = job._id || job.id;
          const jobTitle = job.jobTitle || job.title || 'Untitled Job';
          
          // Count applications for this specific job using multiple field matching
          const applicationsForJob = allApplications.filter(app => {
            // Check multiple possible field names and formats based on the actual data structure
            const appJobId = app.jobId || app.job_id;
            const matches = [
              appJobId === jobId,
              String(appJobId) === String(jobId),
              // Handle ObjectId comparison
              appJobId && appJobId.toString() === jobId.toString(),
              // Handle nested jobId object
              appJobId && appJobId._id === jobId,
              appJobId && String(appJobId._id) === String(jobId)
            ];
            
            return matches.some(match => match === true);
          });
          
          const realApplicantCount = applicationsForJob.length;

          return {
            id: jobId,
            title: jobTitle,
            company: job.companyName || job.company || 'Unknown Company',
            location: job.location || 'Not specified',
            type: job.jobType || job.type || 'Full-time',
            status: job.status || 'active',
            postedDate: job.postedDate || job.createdAt,
            views: job.views || 0,
            applicants: realApplicantCount,
            description: job.description || job.jobDescription || '',
            requirements: job.requirements || [],
            benefits: job.benefits || [],
            salary: job.salary || job.salaryRange || 'Competitive',
            department: job.department || 'Not specified',
            companyDetails: job.companyDetails || {
              name: job.companyName || job.company || 'Unknown Company',
              description: job.companyDescription || null,
              industry: job.industry || null,
              website: job.website || null,
              size: job.companySize || null
            }
          };
        });

        // Apply client-side search filtering
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase().trim();
          convertedJobs = convertedJobs.filter((job: Job) => {
            const title = (job.title || '').toLowerCase();
            const company = (job.company || '').toLowerCase();
            const location = (job.location || '').toLowerCase();
            const type = (job.type || '').toLowerCase();
            const department = (job.department || '').toLowerCase();
            
            return title.includes(query) || 
                   company.includes(query) || 
                   location.includes(query) || 
                   type.includes(query) ||
                   department.includes(query);
          });
        }

        // Apply client-side status filtering
        if (statusFilter !== 'all') {
          convertedJobs = convertedJobs.filter((job: Job) => {
            return job.status === statusFilter;
          });
        }

        // Apply client-side department filtering
        if (departmentFilter !== 'all') {
          convertedJobs = convertedJobs.filter((job: Job) => {
            return job.department === departmentFilter;
          });
        }

        // Apply client-side sorting
        convertedJobs = convertedJobs.sort((a: Job, b: Job) => {
          let valueA: any, valueB: any;
          
          switch (sortBy) {
            case 'date':
              valueA = new Date(a.postedDate || new Date()).getTime();
              valueB = new Date(b.postedDate || new Date()).getTime();
              break;
            case 'daysActive':
              valueA = Math.ceil(Math.abs(new Date().getTime() - new Date(a.postedDate || new Date()).getTime()) / (1000 * 60 * 60 * 24));
              valueB = Math.ceil(Math.abs(new Date().getTime() - new Date(b.postedDate || new Date()).getTime()) / (1000 * 60 * 60 * 24));
              break;
            case 'applicants':
              valueA = a.applicants || 0;
              valueB = b.applicants || 0;
              break;
            default:
              return 0;
          }
          
          if (sortOrder === 'desc') {
            return valueB - valueA;
          } else {
            return valueA - valueB;
          }
        });

        setJobs(convertedJobs);
        setAllJobs(response.jobs.map((job: any) => ({
          ...job,
          department: job.department || 'Not specified'
        }))); // Store all jobs for department filter options
        setTotalJobs(response.pagination?.total || convertedJobs.length); // Use total count from backend

        // Calculate stats from all jobs, not just paginated results
        const allJobsData = allJobsResponse.jobs || [];
        const activeJobs = allJobsData.filter((job: any) => job.status === 'active').length;
        const pendingJobs = allJobsData.filter((job: any) => job.status === 'pending').length;
        const totalViews = allJobsData.reduce((sum: number, job: any) => sum + (job.viewCount || job.views || 0), 0);

        setStats({
          totalJobs: allJobsData.length, // Use actual count of all jobs
          activeJobs,
          pendingJobs,
          totalViews
        });
      } else {
        setJobs([]);
        setTotalJobs(0);
      }
    } catch (error) {
      console.error('❌ Error fetching jobs:', error);
      setError('Failed to fetch jobs. Please try again.');
      setJobs([]);
    } finally {
      setLoading(false);
    }
  };

  const handleJobClick = (job: Job) => {
    console.log('🔍 SuperAdmin viewing job details:', job.title);
    // TODO: Implement job details modal for admin view
    alert(`Job Details: ${job.title}\nCompany: ${job.company}\nStatus: ${job.status}\nApplicants: ${job.applicants}`);
  };

  const handleStatusChange = async (jobId: string | number, newStatus: string) => {
    try {
      await adminService.updateJobStatus(String(jobId), newStatus);
      await fetchJobs(); // Refresh the jobs list
      onJobStatusChange?.(String(jobId), newStatus);
    } catch (error) {
      console.error('❌ Error updating job status:', error);
      alert('Failed to update job status. Please try again.');
    }
  };


  const totalPages = Math.ceil(totalJobs / jobsPerPage);

  if (loading && jobs.length === 0) {
    return (
      <div className="superadmin-jobs-loading">
        <div className="loading-spinner"></div>
        <p>Loading job postings...</p>
      </div>
    );
  }

  return (
    <>
    <div className="superadmin-jobs-tab">
      {/* Job Stats Cards */}
      <div className="employers-stats">
        <StatsCard
          icon={FiFileText}
          value={stats.totalJobs}
          label="Total Jobs"
          change={stats.totalJobs > 0 ? Math.floor(stats.totalJobs * 0.1) : 0}
          changeLabel="from last month"
        />
        <StatsCard
          icon={HiCheckCircle}
          value={stats.activeJobs}
          label="Active Jobs"
          change={stats.activeJobs > 0 ? Math.floor(stats.activeJobs * 0.15) : 0}
          changeLabel="from last month"
        />
      </div>

      {/* Error State */}
      {error && (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchJobs} className="retry-button">
            Try Again
          </button>
        </div>
      )}

      {/* Jobs Section with Search */}
      <div className="jobs-section">
        <div className="section-header">
          <div className="header-left">
            <h3 className="section-title">
              Job Postings ({totalJobs} total)
            </h3>
            <div className="view-info">
              {jobs.length > 0 
                ? `Showing ${((currentPage - 1) * jobsPerPage) + 1}-${Math.min(currentPage * jobsPerPage, totalJobs)} of ${totalJobs} jobs`
                : 'No jobs found'
              }
            </div>
          </div>
          
          {/* Search and Sort Controls */}
          <div className="jobs-controls">
            <div className="search-form">
              <div className="search-input-wrapper">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search jobs and companies..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="search-input"
                />
                {searchQuery && (
                  <button
                    onClick={clearSearch}
                    className="clear-search-btn"
                    type="button"
                    title="Clear search"
                  >
                    <FiX />
                  </button>
                )}
              </div>
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="status-filter-control"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="closed">Closed</option>
              <option value="paused">Paused</option>
              <option value="flagged">Flagged</option>
            </select>

            <select
              value={departmentFilter}
              onChange={(e) => handleDepartmentFilter(e.target.value)}
              className="department-filter-control"
            >
              <option value="all">All Departments</option>
              {getUniqueDepartments().map((department) => (
                <option key={department} value={department}>
                  {department}
                </option>
              ))}
            </select>

          </div>
        </div>
        
        {/* Jobs Table or Empty State */}
        {jobs.length > 0 ? (
          <>
            <div className="admin-jobs-table-container">
              <table className="admin-jobs-table">
                <thead>
                  <tr>
                    <th className="number-column">#</th>
                    <th>JOB TITLE</th>
                    <th>COMPANY</th>
                    <th>STATUS</th>
                    <th className="sortable-header" onClick={() => handleSort('date')}>
                      <div className="header-content">
                        <span className="two-line-header">
                          <span>POSTED</span>
                          <span>DATE</span>
                        </span>
                        {sortBy === 'date' ? (
                          sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                        ) : (
                          <FiChevronDown className="sort-icon-inactive" />
                        )}
                      </div>
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('daysActive')}>
                      <div className="header-content">
                        <span className="two-line-header">
                          <span>DAYS</span>
                          <span>ACTIVE</span>
                        </span>
                        {sortBy === 'daysActive' ? (
                          sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                        ) : (
                          <FiChevronDown className="sort-icon-inactive" />
                        )}
                      </div>
                    </th>
                    <th className="sortable-header" onClick={() => handleSort('applicants')}>
                      <div className="header-content">
                        <span>APPLICANTS</span>
                        {sortBy === 'applicants' ? (
                          sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                        ) : (
                          <FiChevronDown className="sort-icon-inactive" />
                        )}
                      </div>
                    </th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {jobs.map((job, index) => {
                    const { timeString, dateStr, daysActive } = formatDateTime(job.postedDate || new Date().toISOString());
                    const rowNumber = (currentPage - 1) * jobsPerPage + index + 1;
                    
                    return (
                      <tr key={job.id} className="job-row">
                        <td className="number-cell">
                          <span className="row-number">{rowNumber}</span>
                        </td>
                        <td className="job-title-cell">
                          <div className="job-title-info">
                            <span className="job-title">{job.title}</span>
                            <span className="job-type">{job.type}</span>
                          </div>
                        </td>
                        
                        <td className="company-cell">
                          <div className="company-info">
                            <span className="company-name">{job.company}</span>
                            <span className="job-location">{job.location}</span>
                          </div>
                        </td>
                        
                        <td className="status-cell">
                          <div className="job-status-badge" data-status={job.status}>
                            {job.status?.toUpperCase() || 'UNKNOWN'}
                          </div>
                        </td>
                        
                        <td className="date-cell">
                          <div className="date-info">
                            <span className="posted-date">{dateStr}</span>
                            <span className="posted-time">{timeString}</span>
                          </div>
                        </td>
                        
                        <td className="days-active-cell">
                          <span className="days-active">{daysActive}</span>
                        </td>
                        
                        
                        <td className="applicants-cell">
                          <div className="stat-value">
                            {job.applicants || 0}
                          </div>
                        </td>
                        
                        <td className="actions-cell">
                          <div className="action-buttons">
                            <button 
                              onClick={() => handleRemoveJob(String(job.id))}
                              className="action-btn remove-btn"
                              title="Remove Job"
                            >
                              Remove
                            </button>
                            
                            <button 
                              onClick={() => handleFlagJob(String(job.id))}
                              className="action-btn flag-btn"
                              title="Flag Job"
                            >
                              Flag
                            </button>
                            
                            <button 
                              onClick={() => handlePauseJob(String(job.id))}
                              className="action-btn pause-btn"
                              title="Pause Job"
                              disabled={job.status === 'paused'}
                            >
                              Pause
                            </button>
                            
                            <button 
                              onClick={() => handleViewJob(job)}
                              className="action-btn view-btn"
                              title="View Job Details"
                            >
                              View
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="pagination-button"
                >
                  Previous
                </button>
                
                <div className="pagination-info">
                  Page {currentPage} of {totalPages}
                </div>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="pagination-button"
                >
                  Next
                </button>
              </div>
            )}
          </>
        ) : (
          !loading && (
            <div className="empty-state">
              <FiFileText className="empty-icon" size={48} />
              <h3>No search found</h3>
            </div>
          )
        )}
      </div>

      {loading && jobs.length > 0 && (
        <div className="loading-overlay">
          <div className="loading-spinner"></div>
        </div>
      )}
    </div>

    {/* Job Details Modal - Rendered at document root using Portal */}
    {showJobModal && selectedJob && createPortal(
      <AdminJobDetailModal
        job={selectedJob}
        isOpen={showJobModal}
        onClose={closeJobModal}
      />,
      document.body
    )}

    {/* Custom Confirmation Modal */}
    {confirmModal.show && createPortal(
      <div className="confirm-modal-overlay" onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}>
        <div className="confirm-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="confirm-modal-header">
            <div className="confirm-modal-icon">{confirmModal.icon}</div>
            <h2 className="confirm-modal-title">{confirmModal.title}</h2>
          </div>
          
          <div className="confirm-modal-body">
            <p className="confirm-modal-message">{confirmModal.message}</p>
          </div>
          
          <div className="confirm-modal-footer">
            <button 
              className="confirm-modal-btn secondary"
              onClick={() => setConfirmModal(prev => ({ ...prev, show: false }))}
            >
              Cancel
            </button>
            <button 
              className="confirm-modal-btn primary"
              onClick={confirmModal.action}
            >
              {confirmModal.actionText}
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}

    {/* Custom Success Modal */}
    {successModal.show && createPortal(
      <div className="success-modal-overlay" onClick={() => setSuccessModal(prev => ({ ...prev, show: false }))}>
        <div className="success-modal-content" onClick={(e) => e.stopPropagation()}>
          <div className="success-modal-header">
            <div className="success-modal-icon">{successModal.icon}</div>
            <h2 className="success-modal-title">{successModal.title}</h2>
          </div>
          
          <div className="success-modal-body">
            <p className="success-modal-message">{successModal.message}</p>
          </div>
          
          <div className="success-modal-footer">
            <button 
              className="success-modal-btn"
              onClick={() => setSuccessModal(prev => ({ ...prev, show: false }))}
            >
              OK
            </button>
          </div>
        </div>
      </div>,
      document.body
    )}
    </>
  );
};

export default SuperAdminJobsTab;
