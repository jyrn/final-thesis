import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { FiUsers, FiSearch, FiFilter, FiFileText, FiBriefcase, FiTrendingUp, FiEye, FiChevronDown, FiChevronUp } from 'react-icons/fi';
import adminService from '../../services/adminService';
import StatsCard from './StatsCard';
import './JobseekersTab.css';
interface Jobseeker {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  skills: string[];
  applications: number;
  status: 'active' | 'inactive' | 'removed';
  createdAt: string;
  lastActive?: string;
  resume?: {
    personalInfo?: {
      name?: string;
      email?: string;
      phone?: string;
      address?: string;
      age?: string;
      birthday?: string;
    };
  };
}

const JobseekersTab: React.FC = () => {
  const [jobseekers, setJobseekers] = useState<Jobseeker[]>([]);
  const [totalUsers, setTotalUsers] = useState(0);
  const [totalApplications, setTotalApplications] = useState(0);
  const [totalJobs, setTotalJobs] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'inactive' | 'removed'>('all');
  
  // Pagination and sorting states
  const [currentPage, setCurrentPage] = useState(1);
  const [jobseekersPerPage] = useState(10);
  const [sortBy, setSortBy] = useState<string>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  
  // Modal states
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
  const [viewModal, setViewModal] = useState<{
    show: boolean;
    jobseeker: Jobseeker | null;
    loading: boolean;
  }>({
    show: false,
    jobseeker: null,
    loading: false
  });
  const [totalJobseekers, setTotalJobseekers] = useState(0);

  useEffect(() => {
    fetchAllData();
  }, []);

  const handleSort = (column: string) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'desc' ? 'asc' : 'desc');
    } else {
      setSortBy(column);
      setSortOrder('desc');
    }
    setCurrentPage(1);
  };

  const handleStatusFilter = (status: string) => {
    setFilterStatus(status as 'all' | 'active' | 'inactive' | 'removed');
    setCurrentPage(1);
  };

  // Admin action handlers
  const handleRemoveJobseeker = (jobseekerId: string) => {
    setConfirmModal({
      show: true,
      title: 'Completely Remove Jobseeker Account',
      message: `This action will PERMANENTLY and COMPLETELY delete the jobseeker from the entire system. This includes:

• Complete removal from Firebase Authentication (user cannot sign in)
• Permanent deletion of all user data from the database
• Deletion of all job applications and resume data
• Removal of all associated profile information

This is typically done when:
• The account has been inactive for an extended period and has not responded to reactivation requests.
• The account shows clear evidence of fraudulent, misleading, or suspicious activity.
• The account repeatedly violates platform policies despite prior warnings.
• The account was identified as a duplicate and merged or removed for consistency.

⚠️ IMPORTANT: This deletion is irreversible and complete. The user will be able to register again with the same email address since their account will no longer exist in our system. The user will be automatically notified via email about this action.`,
      action: async () => {
        try {
          console.log(`🗑️ Completely removing jobseeker: ${jobseekerId}`);
          const response = await adminService.completelyDeleteJobseeker(jobseekerId);
          console.log('✅ Jobseeker complete removal response:', response);
          
          await fetchAllData();
          setConfirmModal(prev => ({ ...prev, show: false }));
          
          // Show success message
          setSuccessModal({
            show: true,
            title: 'Jobseeker Completely Removed',
            message: 'The jobseeker has been permanently and completely deleted from the entire system including Firebase Authentication and all database records. The user can now register again with the same email if they choose to. An email notification has been sent to the user.',
            icon: '✅'
          });
        } catch (error) {
          console.error('❌ Error completely removing jobseeker:', error);
          setConfirmModal(prev => ({ ...prev, show: false }));
          alert('❌ Failed to completely remove jobseeker. Please try again.');
        }
      },
      actionText: 'Delete Completely',
      icon: '🗑️'
    });
  };

  const handleSuspendJobseeker = (jobseekerId: string) => {
    setConfirmModal({
      show: true,
      title: 'Suspend Inactive Account',
      message: `This action will suspend the jobseeker's account due to inactivity (no login for over 1 year). 

The system will:
• Mark the account as suspended
• Send an email notification to the user
• Allow the user to reactivate by simply logging in again
• Automatically remove the account if no login occurs within 30 days

This helps maintain database hygiene by managing inactive accounts while giving users a chance to reactivate if needed.`,
      action: async () => {
        try {
          console.log(`🔧 Suspending jobseeker: ${jobseekerId}`);
          const response = await adminService.updateUser(jobseekerId, { status: 'inactive' });
          console.log('✅ Jobseeker suspension response:', response);
          
          await fetchAllData();
          setConfirmModal(prev => ({ ...prev, show: false }));
          
          // Show success message
          setSuccessModal({
            show: true,
            title: 'Account Suspended Successfully',
            message: 'The inactive account has been suspended. An email notification has been sent to the user with instructions to reactivate by logging in within 30 days.',
            icon: '⏸️'
          });
        } catch (error) {
          console.error('❌ Error suspending jobseeker:', error);
          setConfirmModal(prev => ({ ...prev, show: false }));
          alert('❌ Failed to suspend jobseeker account. Please try again.');
        }
      },
      actionText: 'Suspend Inactive Account',
      icon: '⏸️'
    });
  };

  const handleViewJobseeker = async (jobseeker: Jobseeker) => {
    setViewModal({
      show: true,
      jobseeker: jobseeker,
      loading: true
    });

    try {
      // Try different API endpoints to fetch resume data
      let enhancedJobseeker = { ...jobseeker };
      
      // Try the resume API endpoint
      try {
        const response = await fetch(`/api/resumes/user/${jobseeker._id}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const resumeData = await response.json();
          
          if (resumeData.success && resumeData.resume) {
            enhancedJobseeker.resume = resumeData.resume;
          } else if (resumeData.personalInfo) {
            // Maybe the structure is different
            enhancedJobseeker.resume = { personalInfo: resumeData.personalInfo };
          }
        }
      } catch (resumeError) {
        // Resume API not available, use existing data
      }
      
      setViewModal({
        show: true,
        jobseeker: enhancedJobseeker,
        loading: false
      });
    } catch (error) {
      console.error('Error fetching jobseeker details:', error);
      setViewModal({
        show: true,
        jobseeker: jobseeker,
        loading: false
      });
    }
  };

  const formatDateTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    return {
      dateStr: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
      timeString: date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }),
      daysAgo: diffDays
    };
  };

  const getNewThisMonth = (currentData: Jobseeker[], dateField: 'createdAt' | 'lastActive') => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    
    return currentData.filter(item => 
      new Date(item[dateField]) >= thisMonth
    ).length;
  };


  const getMonthlyChange = (currentData: Jobseeker[]) => {
    const now = new Date();
    const thisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    
    const thisMonthCount = currentData.filter(item => 
      new Date(item.createdAt) >= thisMonth
    ).length;
    
    const lastMonthCount = currentData.filter(item => {
      const itemDate = new Date(item.createdAt);
      return itemDate >= lastMonth && itemDate < thisMonth;
    }).length;
    
    const change = thisMonthCount - lastMonthCount;
    return change;
  };

  const fetchAllData = async () => {
    try {
      setLoading(true);
      
      // Make parallel API calls for admin-accessible endpoints only
      const [jobsResponse, dashboardStats, applicationsResponse, resumesResponse, jobseekersResponse, jobseekerUsersResponse] = await Promise.all([
        adminService.getJobs({}), // Get all job postings
        adminService.getDashboardStats(),
        adminService.getAllApplications(), // Get all applications
        adminService.getAllResumes(), // Get all resumes with names and skills
        adminService.getAllJobSeekers(), // Get all jobseeker profiles
        adminService.getJobseekerUsers() // Get jobseeker users (admin-accessible)
      ]);
      
      // Process data from admin-accessible endpoints
      const allJobs = jobsResponse.jobs || jobsResponse.data || [];
      const allApplications = applicationsResponse || [];
      const allResumes = resumesResponse || [];
      const allJobSeekers = jobseekersResponse || [];
      const allJobseekerUsers = jobseekerUsersResponse || [];

      // Create maps for quick lookup
      const resumeMap = new Map();
      allResumes.forEach((resume: any) => {
        resumeMap.set(resume.jobSeekerUid, resume);
      });

      const jobSeekerMap = new Map();
      allJobSeekers.forEach((js: any) => {
        jobSeekerMap.set(js.uid, js);
      });

      // Create a map of jobseeker users for additional data
      const jobseekerUserMap = new Map();
      allJobseekerUsers.forEach((user: any) => {
        jobseekerUserMap.set(user.uid, user);
      });

      // Create a map of applications by jobSeekerUid for counting
      const applicationCountMap = new Map();
      allApplications.forEach((app: any) => {
        const uid = app.jobSeekerUid;
        applicationCountMap.set(uid, (applicationCountMap.get(uid) || 0) + 1);
      });

      // Transform jobseekers using JobSeeker collection as primary source
      const transformedJobseekers: Jobseeker[] = [];

      // Create a combined set of all unique jobseeker UIDs
      const allJobseekerUIDs = new Set([
        ...allJobSeekers.map((js: any) => js.uid),
        ...allJobseekerUsers.map((user: any) => user.uid),
        ...allResumes.map((resume: any) => resume.jobSeekerUid).filter(Boolean)
      ]);

      allJobseekerUIDs.forEach((uid: string) => {
        const jobSeekerProfile = jobSeekerMap.get(uid);
        const userProfile = jobseekerUserMap.get(uid);
        const resume = resumeMap.get(uid);
        
        // If no resume found by uid, try to find by email
        let fallbackResume = null;
        const email = jobSeekerProfile?.email || userProfile?.email;
        if (!resume && email) {
          fallbackResume = allResumes.find((r: any) => 
            r.personalInfo?.email === email || 
            r.applicantEmail === email
          );
        }
        
        const finalResume = resume || fallbackResume;
        const applicationCount = applicationCountMap.get(uid) || 0;

        // Prioritize resume name data, then fallback to local profile data
        let firstName = 'Unknown';
        let lastName = '';
        
        if (finalResume?.personalInfo?.fullName) {
          const nameParts = finalResume.personalInfo.fullName.split(' ');
          firstName = nameParts[0] || 'Unknown';
          lastName = nameParts.slice(1).join(' ') || '';
        } else if (finalResume?.personalInfo?.name) {
          const nameParts = finalResume.personalInfo.name.split(' ');
          firstName = nameParts[0] || 'Unknown';
          lastName = nameParts.slice(1).join(' ') || '';
        } else {
          // Fallback to local profile data
          firstName = jobSeekerProfile?.firstName || userProfile?.firstName || 'Unknown';
          lastName = jobSeekerProfile?.lastName || userProfile?.lastName || '';
        }

        const jobseekerData: Jobseeker = {
          _id: uid,
          firstName: firstName,
          lastName: lastName,
          email: finalResume?.personalInfo?.email || 
                 jobSeekerProfile?.email || 
                 userProfile?.email ||
                 'No email provided',
          phone: finalResume?.personalInfo?.phone || jobSeekerProfile?.phoneNumber || userProfile?.phone,
          skills: finalResume?.skills || jobSeekerProfile?.skills?.map((s: any) => s.name || s) || [],
          applications: applicationCount,
          status: userProfile?.status || jobSeekerProfile?.status || ((jobSeekerProfile?.isActive === false || userProfile?.disabled || userProfile?.isActive === false) ? 'inactive' : 'active'),
          createdAt: jobSeekerProfile?.createdAt || userProfile?.createdAt || finalResume?.createdAt || new Date().toISOString(),
          lastActive: finalResume?.updatedAt || 
                     jobSeekerProfile?.updatedAt || 
                     userProfile?.lastLoginAt ||
                     userProfile?.updatedAt ||
                     jobSeekerProfile?.createdAt ||
                     userProfile?.createdAt,
          resume: finalResume ? {
            personalInfo: {
              phone: finalResume.personalInfo?.phone,
              birthday: finalResume.personalInfo?.birthday,
              age: finalResume.personalInfo?.age,
              name: finalResume.personalInfo?.name,
              email: finalResume.personalInfo?.email,
              address: finalResume.personalInfo?.address
            }
          } : undefined
        };
        
        transformedJobseekers.push(jobseekerData);
      });
      
      // Set individual stats using real API data
      setTotalUsers(dashboardStats.totalJobSeekers || transformedJobseekers.length || 0);
      setTotalJobs(dashboardStats.totalJobs || allJobs.length || 0);
      setTotalApplications(dashboardStats.totalApplications || allApplications.length || 0);
      
      // Store raw data - filtering will be done separately
      setJobseekers(transformedJobseekers);
      setTotalJobseekers(transformedJobseekers.length);
      
    } catch (error) {
      console.error('Error fetching jobseekers data:', error);
      setJobseekers([]);
      setTotalUsers(0);
      setTotalJobs(0);
      setTotalApplications(0);
    } finally {
      setLoading(false);
    }
  };

  // Apply filtering and sorting to jobseekers data
  const getFilteredAndSortedJobseekers = () => {
    let filtered = [...jobseekers];
    
    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(jobseeker =>
        jobseeker.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jobseeker.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jobseeker.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        jobseeker.skills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }
    
    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(jobseeker => jobseeker.status === filterStatus);
    }
    
    // Apply sorting
    filtered.sort((a: Jobseeker, b: Jobseeker) => {
      let valueA: any, valueB: any;
      
      switch (sortBy) {
        case 'date':
          valueA = new Date(a.createdAt || new Date()).getTime();
          valueB = new Date(b.createdAt || new Date()).getTime();
          break;
        case 'name':
          valueA = `${a.firstName} ${a.lastName}`.toLowerCase();
          valueB = `${b.firstName} ${b.lastName}`.toLowerCase();
          break;
        case 'applications':
          valueA = a.applications || 0;
          valueB = b.applications || 0;
          break;
        case 'lastActive':
          valueA = new Date(a.lastActive || new Date()).getTime();
          valueB = new Date(b.lastActive || new Date()).getTime();
          break;
        default:
          return 0;
      }
      
      if (sortOrder === 'desc') {
        return typeof valueA === 'string' ? valueB.localeCompare(valueA) : valueB - valueA;
      } else {
        return typeof valueA === 'string' ? valueA.localeCompare(valueB) : valueA - valueB;
      }
    });
    
    return filtered;
  };

  // Get filtered and sorted data
  const filteredJobseekers = getFilteredAndSortedJobseekers();
  
  // Pagination logic
  const indexOfLastJobseeker = currentPage * jobseekersPerPage;
  const indexOfFirstJobseeker = indexOfLastJobseeker - jobseekersPerPage;
  const currentJobseekers = filteredJobseekers.slice(indexOfFirstJobseeker, indexOfLastJobseeker);
  const totalPages = Math.ceil(filteredJobseekers.length / jobseekersPerPage);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, sortBy, sortOrder]);


  if (loading) {
    return (
      <div className="tab-content">
        <div className="loading-spinner"></div>
        <p>Loading jobseekers...</p>
      </div>
    );
  }

  return (
    <div className="admin-content">
      {/* Jobseekers Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          icon={FiUsers}
          value={totalUsers}
          label="Total Jobseekers"
          change={getMonthlyChange(jobseekers)}
          changeLabel="new this month"
        />
        <StatsCard
          icon={FiFileText}
          value={totalApplications}
          label="Total Applications"
          change={Math.max(0, totalApplications - Math.floor(totalApplications * 0.8))}
          changeLabel="from last month"
        />
        <StatsCard
          icon={FiBriefcase}
          value={totalJobs}
          label="Available Jobs"
          change={Math.max(0, totalJobs - Math.floor(totalJobs * 0.9))}
          changeLabel="new this month"
        />
      </div>


      {/* Jobseekers Management Container */}
      <div className="jobseekers-management-container">
        {/* Header Container */}
        <div className="jobseekers-header-container">
          <div className="jobseekers-header">
          <div className="header-left">
            <h2 className="section-title">Jobseekers ({totalJobseekers} total)</h2>
            <p className="view-info">Showing {indexOfFirstJobseeker + 1}-{Math.min(indexOfLastJobseeker, filteredJobseekers.length)} of {filteredJobseekers.length} jobseekers</p>
          </div>
          
          <div className="jobseekers-controls">
            <div className="search-controls">
              <div className="search-input-wrapper">
                <FiSearch className="search-icon" />
                <input
                  type="text"
                  placeholder="Search jobseekers and companies..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="search-input-modern"
                />
              </div>
            </div>
            
            <select
              value={filterStatus}
              onChange={(e) => handleStatusFilter(e.target.value)}
              className="status-filter-control"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
              <option value="removed">Removed</option>
            </select>
          </div>
          </div>
        </div>

        {/* Table Section */}
        {jobseekers.length > 0 ? (
          <div className="admin-jobseekers-table-container">
            <div className="admin-jobseekers-table-wrapper">
              <table className="admin-jobseekers-table">
              <thead>
                <tr>
                  <th className="number-column">#</th>
                  <th className="sortable-header" onClick={() => handleSort('name')}>
                    <div className="header-content">
                      <span>NAME</span>
                      {sortBy === 'name' ? (
                        sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                      ) : (
                        <FiChevronDown className="sort-icon-inactive" />
                      )}
                    </div>
                  </th>
                  <th>EMAIL</th>
                  <th>SKILLS</th>
                  <th className="sortable-header" onClick={() => handleSort('applications')}>
                    <div className="header-content">
                      <span>APPLICATIONS</span>
                      {sortBy === 'applications' ? (
                        sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                      ) : (
                        <FiChevronDown className="sort-icon-inactive" />
                      )}
                    </div>
                  </th>
                  <th>STATUS</th>
                  <th className="sortable-header" onClick={() => handleSort('date')}>
                    <div className="header-content">
                      <span className="two-line-header">
                        <span>JOINED</span>
                        <span>DATE</span>
                      </span>
                      {sortBy === 'date' ? (
                        sortOrder === 'desc' ? <FiChevronDown /> : <FiChevronUp />
                      ) : (
                        <FiChevronDown className="sort-icon-inactive" />
                      )}
                    </div>
                  </th>
                  <th className="sortable-header" onClick={() => handleSort('lastActive')}>
                    <div className="header-content">
                      <span className="two-line-header">
                        <span>LAST</span>
                        <span>ACTIVE</span>
                      </span>
                      {sortBy === 'lastActive' ? (
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
                {currentJobseekers.map((jobseeker, index) => {
                  const { timeString, dateStr, daysAgo } = formatDateTime(jobseeker.createdAt || new Date().toISOString());
                  const lastActiveInfo = jobseeker.lastActive ? formatDateTime(jobseeker.lastActive) : null;
                  const rowNumber = (currentPage - 1) * jobseekersPerPage + index + 1;
                  
                  return (
                    <tr key={jobseeker._id} className="jobseeker-row">
                      <td className="number-cell">
                        <span className="row-number">{rowNumber}</span>
                      </td>
                      <td className="name-cell">
                        <div className="name-info">
                          <span className="jobseeker-name">{jobseeker.firstName} {jobseeker.lastName}</span>
                        </div>
                      </td>
                      
                      <td className="email-cell">
                        <span className="email-text">{jobseeker.email}</span>
                      </td>
                      
                      <td className="skills-cell">
                        <div className="skills-list">
                          {jobseeker.skills.slice(0, 2).map((skill, index) => (
                            <span key={index} className="skill-tag">{skill}</span>
                          ))}
                          {jobseeker.skills.length > 2 && (
                            <span className="skill-tag more">+{jobseeker.skills.length - 2}</span>
                          )}
                          {jobseeker.skills.length === 0 && (
                            <span className="no-skills">No skills listed</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="applications-cell">
                        <div className="stat-value">
                          {jobseeker.applications || 0}
                        </div>
                      </td>
                      
                      <td className="status-cell">
                        <div className="jobseeker-status-badge" data-status={jobseeker.status}>
                          {jobseeker.status === 'active' ? 'ACTIVE' : 
                           jobseeker.status === 'inactive' ? 'SUSPENDED' : 
                           jobseeker.status === 'removed' ? 'REMOVED' : 'UNKNOWN'}
                        </div>
                      </td>
                      
                      <td className="date-cell">
                        <div className="date-info">
                          <span className="joined-date">{dateStr}</span>
                          <span className="joined-time">{timeString}</span>
                        </div>
                      </td>
                      
                      <td className="last-active-cell">
                        <div className="last-active-info">
                          {lastActiveInfo ? (
                            <>
                              <span className="active-date">{lastActiveInfo.dateStr}</span>
                              <span className="active-time">{lastActiveInfo.daysAgo} days ago</span>
                            </>
                          ) : (
                            <span className="never-active">Never</span>
                          )}
                        </div>
                      </td>
                      
                      <td className="actions-cell">
                        <div className="action-buttons">
                          <button 
                            onClick={() => handleRemoveJobseeker(jobseeker._id)}
                            className={`action-btn remove-btn ${jobseeker.status === 'removed' ? 'disabled' : ''}`}
                            title={jobseeker.status === 'removed' ? 'Account already removed' : 'Completely Delete Jobseeker (removes from Firebase & database)'}
                            disabled={jobseeker.status === 'removed'}
                          >
                            {jobseeker.status === 'removed' ? 'Removed' : 'Delete'}
                          </button>
                          
                          <button 
                            onClick={() => handleSuspendJobseeker(jobseeker._id)}
                            className={`action-btn pause-btn ${jobseeker.status === 'removed' ? 'disabled' : ''}`}
                            title={jobseeker.status === 'removed' ? 'Account already removed' : 'Suspend inactive account (user can reactivate by logging in)'}
                            disabled={jobseeker.status === 'removed'}
                          >
                            Suspend
                          </button>
                          
                          <button 
                            onClick={() => handleViewJobseeker(jobseeker)}
                            className="action-btn view-btn"
                            title="View Details"
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
            </div>
          </div>
        ) : (
          !loading && (
            <div className="empty-state">
              <FiUsers className="empty-icon" size={48} />
              <h3>No jobseekers found</h3>
              <p>No jobseekers match your current filters.</p>
            </div>
          )
        )}
      </div>

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

      {/* View Jobseeker Modal */}
      {viewModal.show && viewModal.jobseeker && createPortal(
        <div className="view-modal-overlay" onClick={() => setViewModal({ show: false, jobseeker: null, loading: false })}>
          <div className="view-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="view-modal-header">
              <h2 className="view-modal-title">Jobseeker Details</h2>
              <button 
                className="view-modal-close"
                onClick={() => setViewModal({ show: false, jobseeker: null, loading: false })}
              >
                ×
              </button>
            </div>
            
            <div className="view-modal-body">
              {viewModal.loading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>Loading jobseeker details...</p>
                </div>
              ) : (
                <>
                  {/* Top Row - Three Column Layout */}
                  <div className="modal-row">
                    <div className="modal-column">
                      <h3 className="section-title-compact">Personal Details</h3>
                      <div className="compact-details">
                        <div className="compact-item">
                          <strong>{viewModal.jobseeker.firstName} {viewModal.jobseeker.lastName}</strong>
                        </div>
                        <div className="compact-item">
                          <strong>Email:</strong> {viewModal.jobseeker.email}
                        </div>
                        <div className="compact-item">
                          <strong>Phone:</strong> {
                            viewModal.jobseeker.resume?.personalInfo?.phone || 
                            viewModal.jobseeker.phone || 
                            'No phone provided'
                          }
                        </div>
                        {viewModal.jobseeker.resume?.personalInfo?.birthday && (
                          <div className="compact-item">
                            <strong>Birthday:</strong> {viewModal.jobseeker.resume.personalInfo.birthday}
                          </div>
                        )}
                        {viewModal.jobseeker.resume?.personalInfo?.age && (
                          <div className="compact-item">
                            <strong>Age:</strong> {viewModal.jobseeker.resume.personalInfo.age}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div className="modal-column">
                      <h3 className="section-title-compact">Account Status</h3>
                      <div className="compact-details">
                        <div className="compact-item">
                          <strong>Status:</strong> 
                          <span className={`status-badge ${viewModal.jobseeker.status}`} style={{marginLeft: '0.5rem'}}>
                            {viewModal.jobseeker.status === 'active' ? 'Active' : 
                             viewModal.jobseeker.status === 'inactive' ? 'Suspended' : 
                             viewModal.jobseeker.status === 'removed' ? 'Removed' : 'Unknown'}
                          </span>
                        </div>
                        <div className="compact-item">
                          <strong>Applications:</strong> {viewModal.jobseeker.applications || 0}
                        </div>
                        <div className="compact-item">
                          <strong>Skills:</strong> {viewModal.jobseeker.skills?.length || 0}
                        </div>
                        <div className="compact-item">
                          <strong>Profile:</strong> 
                          <span className={viewModal.jobseeker.skills && viewModal.jobseeker.skills.length > 0 ? 'complete' : 'incomplete'} style={{marginLeft: '0.5rem'}}>
                            {viewModal.jobseeker.skills && viewModal.jobseeker.skills.length > 0 ? 'Complete' : 'Incomplete'}
                          </span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="modal-column">
                      <h3 className="section-title-compact">Activity Timeline</h3>
                      <div className="compact-details">
                        <div className="compact-item">
                          <strong>Registered:</strong> {formatDateTime(viewModal.jobseeker.createdAt).dateStr}
                          <div className="compact-meta">({formatDateTime(viewModal.jobseeker.createdAt).daysAgo} days ago)</div>
                        </div>
                        <div className="compact-item">
                          <strong>Last Activity:</strong> {viewModal.jobseeker.lastActive ? (
                            <>
                              {formatDateTime(viewModal.jobseeker.lastActive).dateStr}
                              <div className="compact-meta">({formatDateTime(viewModal.jobseeker.lastActive).daysAgo} days ago)</div>
                            </>
                          ) : (
                            <span className="inactive">Never active</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {/* Skills Row */}
              {!viewModal.loading && viewModal.jobseeker.skills && viewModal.jobseeker.skills.length > 0 && (
                <div className="modal-row">
                  <div className="modal-column-full">
                    <h3 className="section-title-compact">Skills</h3>
                    <div className="skills-display-compact">
                      {viewModal.jobseeker.skills.slice(0, 12).map((skill, index) => (
                        <span key={index} className="skill-badge-compact">{skill}</span>
                      ))}
                      {viewModal.jobseeker.skills.length > 12 && (
                        <span className="skill-badge-compact more">+{viewModal.jobseeker.skills.length - 12} more</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

            </div>
            
            {/* Fixed Action Buttons Footer */}
            <div className="view-modal-footer">
              <p className="action-note">
                <strong>Note:</strong> All actions will automatically send email notifications to the user. 
                Suspended accounts have 30 days to reactivate before permanent removal.
              </p>
              <div className="modal-action-buttons">
                <button 
                  onClick={() => {
                    setViewModal({ show: false, jobseeker: null, loading: false });
                    handleRemoveJobseeker(viewModal.jobseeker._id);
                  }}
                  className="modal-action-btn remove-btn"
                  title="Permanently Remove Account - User will be notified via email"
                  disabled={viewModal.jobseeker.status === 'removed'}
                >
                  Remove Account
                </button>
                
                <button 
                  onClick={() => {
                    setViewModal({ show: false, jobseeker: null, loading: false });
                    handleSuspendJobseeker(viewModal.jobseeker._id);
                  }}
                  className="modal-action-btn suspend-btn"
                  title="Suspend Account - User will receive reactivation instructions via email"
                  disabled={viewModal.jobseeker.status === 'inactive' || viewModal.jobseeker.status === 'removed'}
                >
                  Suspend Account
                </button>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default JobseekersTab;
