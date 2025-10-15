'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import { 
  FiHome,
  FiUsers,
  FiBriefcase,
  FiSettings,
  FiSearch,
  FiMenu,
  FiX,
  FiPlus,
  FiEye,
  FiDownload,
  FiCheck,
  FiXCircle,
  FiTrendingUp,
  FiUserCheck,
  FiCalendar,
  FiLogOut,
  FiMapPin,
  FiClock,
  FiFilter
} from 'react-icons/fi';
import layoutStyles from '../../components/employer/dashboard/Layout.module.css';
import cardStyles from '../../components/employer/dashboard/Cards.module.css';
import sidebarStyles from '../../components/employer/dashboard/Sidebar.module.css';
import buttonStyles from '../../components/employer/dashboard/Buttons.module.css';
import { JobsTab } from '../../components/employer/dashboard/JobsTab';
import { ApplicantsTab } from '../../components/employer/dashboard/ApplicantsTab';
import { OverviewTab } from '../../components/employer/dashboard/OverviewTab';
import { SettingsTab } from '../../components/employer/dashboard/SettingsTab';
import { WelcomeSection } from '../../components/employer/dashboard/WelcomeSection';
import { StatsGrid } from '../../components/employer/dashboard/StatsGrid';
import { QuickActions } from '../../components/employer/dashboard/QuickActions';
import { DashboardSidebar } from '../../components/employer/dashboard/DashboardSidebar';
import { RecentApplicants } from '../../components/employer/dashboard/RecentApplicants';
import { ActiveJobPosts } from '../../components/employer/dashboard/ActiveJobPosts';
import { ApplicantsView } from '../../components/employer/dashboard/ApplicantsView';
import MobileHeader from '../../components/employer/dashboard/MobileHeader';
import { getImageSrc } from '../../utils/imageUtils';
import { useAutoRefresh, useTimeSinceRefresh } from '../../hooks/useAutoRefresh';
// Removed mock data imports - using real backend data only
import { 
  Applicant
} from '../../types/dashboard';
import { Job } from '../../types/Job';
import { jobApiService } from '../../services/jobApiService';
import { ApplicantDetailsModal } from '../../components/employer/dashboard/ApplicantDetailsModal';
import { JobDetailsModal } from '../../components/employer/dashboard/JobDetailsModal';
import { JobFormModal } from '../../components/employer/dashboard/JobFormModal';
import { CompanyProfileModal } from '../../components/employer/dashboard/CompanyProfileModal';
import { DocumentsModal } from '../../components/employer/dashboard/DocumentsModal';
import { InterviewEmailModal } from '../../components/employer/dashboard/InterviewEmailModal';
import { HireEmailModal } from '../../components/employer/dashboard/HireEmailModal';

// Modal data types
interface CompanyProfileData {
  companyName: string;
  industry: string;
  website: string;
  description: string;
  address: string;
  phone: string;
  email: string;
}

interface NotificationPreferences {
  email: {
    newApplications: boolean;
    applicationUpdates: boolean;
    interviewReminders: boolean;
    weeklyReports: boolean;
  };
  push: {
    newApplications: boolean;
    urgentUpdates: boolean;
    systemAlerts: boolean;
  };
  sms: {
    urgentOnly: boolean;
    interviewReminders: boolean;
  };
}

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'recruiter' | 'viewer';
  status: 'active' | 'pending' | 'inactive';
  joinDate: string;
}

interface TeamData {
  members: TeamMember[];
}

interface UserProfile {
  companyName: string;
  profilePicture?: string;
}

// Tab types
type TabType = 'overview' | 'applicants' | 'jobs' | 'settings';

const EmployerDashboard: React.FC = () => {
  const navigate = useNavigate();
  
  // State management
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [dateFromFilter, setDateFromFilter] = useState('');
  const [dateToFilter, setDateToFilter] = useState('');
  const [jobPostings, setJobPostings] = useState<Job[]>([]);
  const [isLoadingJobs, setIsLoadingJobs] = useState(true);
  const [applicantFilters, setApplicantFilters] = useState<{ status: string; sortBy: string; jobId: string }>({ status: '', sortBy: 'newest', jobId: '' });
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isAuthReady, setIsAuthReady] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [userVerificationStatus, setUserVerificationStatus] = useState<string | null>(null);
  const [isCheckingVerification, setIsCheckingVerification] = useState(true);
  
  // Settings modal states
  const [isCompanyProfileModalOpen, setIsCompanyProfileModalOpen] = useState(false);
  const [isDocumentsModalOpen, setIsDocumentsModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [selectedJob, setSelectedJob] = useState<Job | null>(null);
  const [isJobDetailsModalOpen, setIsJobDetailsModalOpen] = useState(false);
  const [applicantStatuses, setApplicantStatuses] = useState<Record<number, string>>({});
  const [companyProfileData, setCompanyProfileData] = useState<CompanyProfileData | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  
  // Job form modal states
  const [isJobFormModalOpen, setIsJobFormModalOpen] = useState(false);
  const [jobToEdit, setJobToEdit] = useState<Job | null>(null);

  // Initial interview email modal states
  const [isInitialInterviewModalOpen, setIsInitialInterviewModalOpen] = useState(false);
  const [applicantForInitialInterview, setApplicantForInitialInterview] = useState<Applicant | null>(null);

  // Final interview email modal states
  const [isFinalInterviewModalOpen, setIsFinalInterviewModalOpen] = useState(false);
  const [applicantForFinalInterview, setApplicantForFinalInterview] = useState<Applicant | null>(null);

  // Hire email modal states
  const [isHireEmailModalOpen, setIsHireEmailModalOpen] = useState(false);
  const [applicantToHire, setApplicantToHire] = useState<Applicant | null>(null);

  // Initialize Firebase auth state listener and check verification status
  useEffect(() => {
    const { auth } = require('../../config/firebase');
    
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      setIsAuthReady(true);
      
      if (user) {
        // Check employer account status
        try {
          const token = await user.getIdToken();
          const response = await fetch('http://localhost:3001/api/employers/account-status', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });
          
          if (response.ok) {
            const data = await response.json();
            setUserVerificationStatus(data.data?.accountStatus);
            
            // If employer is not verified, redirect to verification pending
            if (data.data?.accountStatus !== 'verified') {
              navigate('/auth/verification-pending');
              return;
            }
          } else {
            // If we can't verify status, redirect to auth
            navigate('/auth');
            return;
          }
        } catch (error) {
          navigate('/auth');
          return;
        }
      } else {
        // No user logged in, redirect to auth
        navigate('/auth');
        return;
      }
      
      setIsCheckingVerification(false);
    });

    return () => unsubscribe();
  }, [navigate]);

  // Load company profile data
  useEffect(() => {
    if (!isAuthReady || !currentUser || isCheckingVerification || userVerificationStatus !== 'verified') {
      return;
    }

    const loadCompanyProfile = async () => {
      try {
        const token = await currentUser.getIdToken();
        let companyName = '';
        
        // Load employer profile
        const employerResponse = await fetch('http://localhost:3001/api/employers/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (employerResponse.ok) {
          const employerData = await employerResponse.json();
          const employer = employerData.data;
          companyName = employer.companyName || '';
          
          // Map backend data to frontend CompanyProfileData format
          setCompanyProfileData({
            companyName: employer.companyName || '',
            industry: employer.industry || '',
            website: employer.website || '',
            email: employer.contactPerson?.email || employer.email || '',
            phone: employer.contactPerson?.phoneNumber || '',
            address: employer.address?.street || 
                    (employer.address ? `${employer.address.street || ''} ${employer.address.city || ''} ${employer.address.province || ''}`.trim() : ''),
            description: employer.companyDescription || ''
          });
        }

        // Load user profile for profile picture
        const userResponse = await fetch('http://localhost:3001/api/users/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('Dashboard user profile data:', userData); // Debug log
          // Set user profile for welcome header
          const newUserProfile = {
            companyName: companyName,
            profilePicture: userData.user.profilePicture || ''
          };
          setUserProfile(newUserProfile);
        }
      } catch (error) {
      }
    };

    loadCompanyProfile();
  }, [isAuthReady, currentUser, isCheckingVerification, userVerificationStatus]);

  // Listen for profile picture updates
  useEffect(() => {
    const handleProfilePictureUpdate = (event: CustomEvent) => {
      setUserProfile(prev => {
        const updated = prev ? {
          ...prev,
          profilePicture: event.detail.profilePicture
        } : null;
        return updated;
      });
    };

    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate as EventListener);
    };
  }, []);

  // Add a useEffect to debug userProfile state changes
  useEffect(() => {
  }, [userProfile]);

  // Extracted loadJobs function for reusability
  const loadJobs = useCallback(async () => {
    if (!isAuthReady || !currentUser || isCheckingVerification || userVerificationStatus !== 'verified') {
      return;
    }

    try {
      setIsLoadingJobs(true);
      const response = await jobApiService.getEmployerJobs();
      
      // Convert backend jobs to Job format
      const convertedJobs: Job[] = response.jobs.map((job: any) => ({
        id: job._id || job.id,
        _id: job._id,
        title: job.title,
        company: job.company || 'Your Company',
        companyLogo: job.companyLogo || userProfile?.profilePicture || '',
        location: job.location,
        description: job.description,
        salary: job.salary || (job.salaryMin && job.salaryMax ? `₱${job.salaryMin?.toLocaleString()} - ₱${job.salaryMax?.toLocaleString()}` : undefined),
        salaryMin: job.salaryMin,
        salaryMax: job.salaryMax,
        type: job.type,
        level: job.level || job.experienceLevel || 'Mid-level',
        experienceLevel: job.experienceLevel || job.level,
        department: job.department,
        isRemote: job.workplaceType === 'Remote' || job.remote || false,
        isHybrid: job.workplaceType === 'Hybrid' || job.hybrid || false,
        workplaceType: job.workplaceType as 'On-site' | 'Hybrid' | 'Remote',
        remote: job.workplaceType === 'Remote' || job.remote || false,
        requirements: job.requirements || [],
        responsibilities: job.responsibilities || [],
        benefits: job.benefits || [],
        educationLevel: job.educationLevel || '',
        preferredCourse: job.preferredCourse || '',
        postedDate: job.createdAt || job.postedDate || new Date().toISOString(),
        lastUpdated: job.updatedAt,
        posted: job.createdAt || job.postedDate || new Date().toISOString(),
        status: job.status,
        applicants: job.applicantCount || 0,
        applicantCount: job.applicantCount || 0,
        views: job.views || 0,
        urgency: 'medium' as const,
        matchQuality: 85
      }));
      
      setJobPostings(convertedJobs);
    } catch (error) {      // Set empty array instead of mock data
      setJobPostings([]);
    } finally {
      setIsLoadingJobs(false);
    }
  }, [isAuthReady, currentUser, isCheckingVerification, userVerificationStatus, userProfile]);

  // Load jobs from backend when auth is ready and user is verified
  useEffect(() => {
    loadJobs();
  }, [isAuthReady, currentUser, isCheckingVerification, userVerificationStatus, userProfile]);

  // Handle saving company profile
  const handleSaveCompanyProfile = async (profileData: CompanyProfileData) => {
    try {
      const token = await currentUser?.getIdToken();
      const response = await fetch('http://localhost:3001/api/employers/profile', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          companyName: profileData.companyName,
          companyDescription: profileData.description,
          industry: profileData.industry,
          website: profileData.website,
          contactPerson: {
            email: profileData.email,
            phoneNumber: profileData.phone
          },
          address: {
            street: profileData.address
          }
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update local state with new data
        setCompanyProfileData(profileData);
        
        // Show success message (you can add a toast notification here)
        alert('Company profile updated successfully!');
      } else {
        throw new Error('Failed to update company profile');
      }
    } catch (error) {
      alert('Error updating company profile. Please try again.');
    }
  };


  // State for real applications from backend
  const [applications, setApplications] = useState<Applicant[]>([]);
  const [isLoadingApplications, setIsLoadingApplications] = useState(true);

  // Extracted loadApplications function for reusability
  const loadApplications = useCallback(async () => {
    if (!isAuthReady || !currentUser || isCheckingVerification || userVerificationStatus !== 'verified') {
      return;
    }

    try {
      setIsLoadingApplications(true);
      
      const token = await currentUser.getIdToken();
      
      const response = await fetch('http://localhost:3001/api/applications/employer', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });


      if (response.ok) {
        const data = await response.json();        const applicationsArray = data.data || [];
        
        // If no applications, show empty state instead of mock data
        if (!data.data || data.data.length === 0) {
          setApplications([]);
          return;
        }
        
        // Convert backend applications to Applicant format
        const convertedApplications: Applicant[] = applicationsArray.map((app: any) => {
          // Debug logs removed - system working correctly
          
          return {
            id: app._id,
            name: app.applicant?.name || app.resumeData?.personalInfo?.name || 'Unknown Applicant',
            position: app.jobTitle || 'Unknown Position',
            email: app.applicant?.email || app.resumeData?.personalInfo?.email || '',
            phone: app.applicant?.phone || app.resumeData?.personalInfo?.phone || '',
            location: app.applicant?.address || app.resumeData?.personalInfo?.address || 'Metro Manila',
            salary: app.jobSalary || '₱80,000',
            expectedSalary: app.resumeData?.expectedSalary || '₱70,000 - ₱90,000',
            experience: app.resumeData?.experience?.[0]?.duration || app.resumeData?.workExperience?.[0]?.duration || '2+ years',
            skills: app.resumeData?.skills || [],
            education: app.resumeData?.education?.[0]?.degree || app.resumeData?.education?.[0]?.institution || '',
            appliedDate: app.appliedDate,
            status: app.status,
            match: 85, // Default match score
            matchPercentage: 85,
            matchScore: 85,
            jobTitle: app.jobTitle || 'Unknown Position',
            jobId: app.jobId,
            resumeUrl: app.resumeData ? '#' : undefined,
            coverLetter: app.coverLetter || '',
            notes: app.notes || '',
            avatar: app.applicant?.profilePicture || undefined
          };
        });
        
        setApplications(convertedApplications);
      } else {        const errorText = await response.text();        // Show empty state - no mock data fallback
        setApplications([]);
      }
    } catch (error) {      // Show empty state - no mock data fallback
      setApplications([]);
    } finally {
      setIsLoadingApplications(false);
    }
  }, [isAuthReady, currentUser, isCheckingVerification, userVerificationStatus]);

  // Load applications from backend when auth is ready and user is verified
  useEffect(() => {
    loadApplications();
  }, [isAuthReady, currentUser, isCheckingVerification, userVerificationStatus]);

  // Combined refresh function for both jobs and applications
  const refreshAllData = useCallback(async () => {
    await Promise.all([loadJobs(), loadApplications()]);
  }, [loadJobs, loadApplications]);

  // Auto-refresh hook - refreshes every 30 seconds
  const autoRefreshEnabled = isAuthReady && !!currentUser && !isCheckingVerification && userVerificationStatus === 'verified';
  
  const { refresh: manualRefresh, isRefreshing, lastRefreshTime } = useAutoRefresh(
    refreshAllData,
    {
      interval: 30000, // 30 seconds
      enabled: autoRefreshEnabled,
      refreshOnMount: false,
      refreshOnFocus: true
    }
  );

  // Get formatted time since last refresh
  const timeSinceRefresh = useTimeSinceRefresh(lastRefreshTime);

  // Use real applications data only
  const enhancedApplicants: Applicant[] = applications.sort((a, b) => (b.matchPercentage || 0) - (a.matchPercentage || 0));


  // Filter and sort applicants based on search and filters
  const filteredApplicants = enhancedApplicants
    .map(applicant => ({
      ...applicant,
      status: (applicantStatuses[applicant.id] || applicant.status || '').toLowerCase()
    }))
    .filter(applicant => {
      // Check search query match
      const matchesSearch = !searchQuery || 
        applicant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (applicant.position && applicant.position.toLowerCase().includes(searchQuery.toLowerCase()));
      
      // Check status match - if no status filter or status is empty, show all
      const matchesStatus = !applicantFilters.status || 
        applicantFilters.status === '' || 
        applicant.status === applicantFilters.status.toLowerCase();
      
      // Check job ID match - if no job filter or jobId is empty, show all
      const jobMatch = !applicantFilters.jobId || 
        applicantFilters.jobId === '' ||
        applicant.jobId === applicantFilters.jobId ||
        (applicant.jobId || '').toString() === applicantFilters.jobId.toString();
      
      return matchesSearch && matchesStatus && jobMatch;
  }).sort((a, b) => {
    const dateA = new Date(a.appliedDate).getTime();
    const dateB = new Date(b.appliedDate).getTime();
    
    switch (applicantFilters.sortBy) {
      case 'oldest':
        return dateA - dateB;
      case 'newest':
        return dateB - dateA;
      case 'match-high':
        return (b.match || 0) - (a.match || 0);
      case 'match-low':
        return (a.match || 0) - (b.match || 0);
      default:
        return dateB - dateA; // Default to newest first
    }
  });

  // Enhanced job postings from state
  const enhancedJobPostings: Job[] = jobPostings.map((job, index) => ({
    ...job,
    views: job.views || [450, 320, 280, 390][index % 4],
    id: job.id || index + 1,
    title: job.title,
    location: job.location,
    salary: job.salary,
    postedDate: job.postedDate || job.posted,
    applicantCount: job.applicants,
    status: job.status,
    requirements: job.requirements || [],
    type: job.type || 'Full-time',
    remote: job.remote || false,
    department: job.department || 'Engineering',
    posted: job.posted,
    applicants: job.applicants
  }));

  // Reset job filter if selected job no longer exists
  useEffect(() => {
    if (applicantFilters.jobId) {
      const jobExists = enhancedJobPostings.some(job => job.id.toString() === applicantFilters.jobId);
      if (!jobExists) {
        setApplicantFilters(prev => ({ ...prev, jobId: '' }));
      }
    }
  }, [enhancedJobPostings, applicantFilters.jobId]);

  // Real-time stats with enhanced calculations
  const realTimeStats = {
    totalApplicants: enhancedApplicants.length,
    pendingReviews: enhancedApplicants.filter(app => app.status === 'pending').length,
    openPositions: enhancedJobPostings.filter(job => job.status === 'active').length,
    hiredThisMonth: enhancedApplicants.filter(app => app.status === 'hired').length,
    interviewsThisWeek: enhancedApplicants.filter(app => 
      app.status === 'initial_interview' || app.status === 'final_interview'
    ).length,
    totalApplicationsThisWeek: enhancedApplicants.filter(app => 
      new Date(app.appliedDate) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length
  };

  // Recent applicants (oldest pending first)
  const recentApplicants = enhancedApplicants
    .filter(applicant => applicant.status === 'pending')
    .sort((a, b) => new Date(a.appliedDate).getTime() - new Date(b.appliedDate).getTime())
    .slice(0, 4);

  // Handle tab change
  const handleTabChange = (tab: TabType) => {
    setActiveTab(tab);
  };

  // Handle filter changes for job status
  const handleFilterChange = (filterType: string, value: string) => {
    if (filterType === 'status') {
      setFilterStatus(value);
    } else if (filterType === 'dateFrom') {
      setDateFromFilter(value);
    } else if (filterType === 'dateTo') {
      setDateToFilter(value);
    } else if (filterType === 'search') {
      setSearchQuery(value);
    }
  };

  // Handle editing a job
  const handleEditJob = (job: Job) => {
    setSelectedJob(job);
    // In a real implementation, you would open an edit form modal here
  };

  const handleApplicantFilter = (status: string) => {
    setApplicantFilters(prev => ({ ...prev, status }));
  };

  const handleLogout = () => {
    // Add logout logic here - clear tokens, redirect to login, etc.
    window.location.href = '/auth';
  };

  const handleApplicantFilterChange = (filterType: string, value: string) => {
    setApplicantFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  // Handle move to initial interview
  const handleMoveToInitialInterview = async (applicantId: string) => {
    const applicant = enhancedApplicants.find(app => app.id === applicantId);
    if (!applicant) {
      alert('Applicant not found.');
      return;
    }
    
    setApplicantForInitialInterview(applicant);
    setIsInitialInterviewModalOpen(true);
  };
  
  // Handle sending initial interview invitation
  const handleSendInitialInterviewInvitation = async (
    customMessage: string | null,
    interviewDetails: any,
    sendEmail: boolean
  ) => {
    try {
      if (!currentUser || !applicantForInitialInterview) {
        alert('Please log in again to update application status');
        return;
      }

      const token = await currentUser.getIdToken();
      
      const statusResponse = await fetch(`http://localhost:3001/api/applications/${applicantForInitialInterview.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'initial_interview' })
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to update application status');
      }
      
      if (sendEmail) {
        const emailResponse = await fetch(`http://localhost:3001/api/applications/${applicantForInitialInterview.id}/send-initial-interview-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ customMessage, interviewDetails })
        });
        
        if (!emailResponse.ok) {
          console.error('Failed to send email, but status was updated');
        }
      }
      
      setApplicantStatuses(prev => ({
        ...prev,
        [applicantForInitialInterview.id]: 'initial_interview'
      }));
      
      setApplications(prev => prev.map(app => 
        app.id === applicantForInitialInterview.id ? { ...app, status: 'initial_interview' } : app
      ));
      
      if (selectedApplicant?.id === applicantForInitialInterview.id) {
        setSelectedApplicant({ ...selectedApplicant, status: 'initial_interview' });
      }
      
      alert(sendEmail ? 'Applicant moved to initial interview and email sent!' : 'Applicant moved to initial interview!');
    } catch (error) {
      alert('Failed to update applicant status. Please try again.');
    }
  };

  // Handle move to final interview
  const handleMoveToFinalInterview = async (applicantId: string) => {
    const applicant = enhancedApplicants.find(app => app.id === applicantId);
    if (!applicant) {
      alert('Applicant not found.');
      return;
    }
    
    setApplicantForFinalInterview(applicant);
    setIsFinalInterviewModalOpen(true);
  };
  
  // Handle sending final interview invitation
  const handleSendFinalInterviewInvitation = async (
    customMessage: string | null,
    interviewDetails: any,
    sendEmail: boolean
  ) => {
    try {
      if (!currentUser || !applicantForFinalInterview) {
        alert('Please log in again to update application status');
        return;
      }

      const token = await currentUser.getIdToken();
      
      const statusResponse = await fetch(`http://localhost:3001/api/applications/${applicantForFinalInterview.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'final_interview' })
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to update application status');
      }
      
      if (sendEmail) {
        const emailResponse = await fetch(`http://localhost:3001/api/applications/${applicantForFinalInterview.id}/send-final-interview-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ customMessage, interviewDetails })
        });
        
        if (!emailResponse.ok) {
          console.error('Failed to send email, but status was updated');
        }
      }
      
      setApplicantStatuses(prev => ({
        ...prev,
        [applicantForFinalInterview.id]: 'final_interview'
      }));
      
      setApplications(prev => prev.map(app => 
        app.id === applicantForFinalInterview.id ? { ...app, status: 'final_interview' } : app
      ));
      
      if (selectedApplicant?.id === applicantForFinalInterview.id) {
        setSelectedApplicant({ ...selectedApplicant, status: 'final_interview' });
      }
      
      alert(sendEmail ? 'Applicant moved to final interview and email sent!' : 'Applicant moved to final interview!');
    } catch (error) {
      alert('Failed to update applicant status. Please try again.');
    }
  };

  // Handle hire applicant action
  const handleHireApplicant = async (applicantId: string) => {
    // Find the applicant to get their details
    const applicant = enhancedApplicants.find(app => app.id === applicantId);
    if (!applicant) {
      alert('Applicant not found.');
      return;
    }
    
    // Open the hire email modal
    setApplicantToHire(applicant);
    setIsHireEmailModalOpen(true);
  };

  // Handle sending hire confirmation email
  const handleSendHireConfirmation = async (
    customMessage: string | null,
    hireDetails: any,
    sendEmail: boolean
  ) => {
    try {
      if (!currentUser || !applicantToHire) {
        alert('Please log in again to update application status');
        return;
      }

      const token = await currentUser.getIdToken();
      
      // Update status to hired
      const statusResponse = await fetch(`http://localhost:3001/api/applications/${applicantToHire.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'hired' })
      });

      if (!statusResponse.ok) {
        throw new Error('Failed to update application status');
      }
      
      // Send email if requested
      if (sendEmail) {
        const emailResponse = await fetch(`http://localhost:3001/api/applications/${applicantToHire.id}/send-hire-email`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ customMessage, hireDetails })
        });
        
        if (!emailResponse.ok) {
          console.error('Failed to send email, but status was updated');
        }
      }
      
      // Update local state
      setApplicantStatuses(prev => ({
        ...prev,
        [applicantToHire.id]: 'hired'
      }));
      
      setApplications(prev => prev.map(app => 
        app.id === applicantToHire.id ? { ...app, status: 'hired' } : app
      ));
      
      // Update selectedApplicant if it's the same applicant
      if (selectedApplicant?.id === applicantToHire.id) {
        setSelectedApplicant({ ...selectedApplicant, status: 'hired' });
      }
      
      alert(sendEmail ? 'Applicant hired and confirmation email sent!' : 'Applicant marked as hired!');
    } catch (error) {
      alert('Failed to update applicant status. Please try again.');
    }
  };

  const handleRejectApplicant = async (applicantId: string) => {
    try {
      if (!currentUser) {
        alert('Please log in again to update application status');
        return;
      }

      const token = await currentUser.getIdToken();
      
      const response = await fetch(`http://localhost:3001/api/applications/${applicantId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: 'rejected' })
      });

      if (response.ok) {
        setApplicantStatuses(prev => ({
          ...prev,
          [applicantId]: 'rejected'
        }));
        
        // Update local applications state
        setApplications(prev => prev.map(app => 
          app.id === applicantId ? { ...app, status: 'rejected' } : app
        ));
        
        // Update selectedApplicant if it's the same applicant
        if (selectedApplicant?.id === applicantId) {
          setSelectedApplicant({ ...selectedApplicant, status: 'rejected' });
        }
        
        alert('Applicant has been rejected.');
      } else {
        throw new Error('Failed to update application status');
      }
    } catch (error) {
      alert('Failed to update applicant status. Please try again.');
    }
  };

  const handleViewResume = async (applicantId: string) => {
    try {
      const applicant = enhancedApplicants.find(app => app.id === applicantId);
      if (!applicant) {
        alert('Applicant not found.');
        return;
      }

      if (!currentUser) {
        alert('Please log in again to view resumes.');
        return;
      }

      const token = await currentUser.getIdToken();
      
      // Use the application ID to fetch the specific applicant's resume
      const response = await fetch(`http://localhost:3001/api/resumes/view/${applicant.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Create a blob URL for the PDF and open it in a new tab
        const blob = await response.blob();
        const pdfUrl = URL.createObjectURL(blob);
        window.open(pdfUrl, '_blank');
        
        // Clean up the blob URL after a delay to free memory
        setTimeout(() => URL.revokeObjectURL(pdfUrl), 1000);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Resume not available for this applicant.');
      }
    } catch (error) {
      alert('Failed to load resume. Please try again.');
    }
  };

  const handleViewApplicantDetails = (applicant: Applicant) => {
    setSelectedApplicant(applicant);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setSelectedApplicant(null);
  };

  const handleDownloadResume = async (applicantId: string) => {
    try {
      const applicant = enhancedApplicants.find(a => a.id === applicantId);
      if (!applicant) {
        alert('Applicant not found.');
        return;
      }

      if (!currentUser) {
        alert('Please log in again to download resumes.');
        return;
      }

      const token = await currentUser.getIdToken();
      
      // Use the application ID to download the specific applicant's resume
      const response = await fetch(`http://localhost:3001/api/resumes/download/${applicant.id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        // Create a blob from the response and trigger download
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${applicant.name.replace(/\s+/g, '_')}_Resume.pdf`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Clean up the blob URL
        URL.revokeObjectURL(url);
      } else {
        const errorData = await response.json();
        alert(errorData.error || 'Resume not available for download.');
      }
    } catch (error) {
      alert('Failed to download resume. Please try again.');
    }
  };


  // Function to open the job form modal (for quick actions)
  const handleOpenJobForm = () => {
    setJobToEdit(null);
    setIsJobFormModalOpen(true);
  };

  // Function to handle saving job from modal
  const handleSaveJobFromModal = (jobData: Partial<Job>) => {
    if (jobToEdit) {
      handleUpdateJob(jobData);
    } else {
      handleCreateJob(jobData);
    }
    setIsJobFormModalOpen(false);
    setJobToEdit(null);
  };

  const handleCreateJob = async (jobData: Partial<Job>) => {
    try {
      setIsLoadingJobs(true);
      
      // Convert Job data to backend format
      // Normalize job level to match backend enum values
      const normalizedLevel = jobData.level === 'Entry-level' ? 'Entry Level' : 
                           (jobData.level || 'Mid-level');
      
      // Format salary based on what's provided - handle empty strings properly
      const minSalary = jobData.salaryMin?.toString().trim() ? Number(jobData.salaryMin) : undefined;
      const maxSalary = jobData.salaryMax?.toString().trim() ? Number(jobData.salaryMax) : undefined;
      
      let formattedSalary = '';
      if (minSalary && maxSalary && !isNaN(minSalary) && !isNaN(maxSalary)) {
        formattedSalary = `₱${minSalary.toLocaleString()} - ₱${maxSalary.toLocaleString()}`;
      } else if (minSalary && !isNaN(minSalary)) {
        formattedSalary = `₱${minSalary.toLocaleString()}+`;
      } else if (maxSalary && !isNaN(maxSalary)) {
        formattedSalary = `Up to ₱${maxSalary.toLocaleString()}`;
      }
      
      const backendJobData = {
        title: jobData.title || '',
        description: jobData.description || '',
        location: jobData.location || '',
        salary: formattedSalary,
        salaryMin: minSalary,
        salaryMax: maxSalary,
        type: jobData.type || 'Full-time',
        level: normalizedLevel,
        department: jobData.department || 'General',
        workplaceType: jobData.workplaceType || 'On-site',
        remote: jobData.workplaceType === 'Remote' || jobData.remote || false,
        requirements: jobData.requirements || [],
        responsibilities: jobData.responsibilities || [],
        benefits: jobData.benefits || [],
        educationLevel: jobData.educationLevel || '',
        preferredCourse: jobData.preferredCourse || '',
        status: jobData.status || 'active'
      };

      const createdJob = await jobApiService.createJob(backendJobData);
      
      // Convert created job to Job format and add to state
      const newJob: Job = {
        id: createdJob._id || createdJob.id || Math.random().toString(),
        title: createdJob.title || jobData.title || '',
        company: createdJob.company || 'Your Company',
        location: createdJob.location || jobData.location || '',
        type: createdJob.type || jobData.type || 'Full-time',
        level: createdJob.level || jobData.level || 'Mid-level',
        applicants: 0,
        posted: createdJob.createdAt || new Date().toISOString(),
        status: createdJob.status || 'active',
        salary: createdJob.salary || jobData.salary || '',
        views: 0,
        description: createdJob.description || jobData.description || '',
        requirements: createdJob.requirements || jobData.requirements || [],
        responsibilities: createdJob.responsibilities || jobData.responsibilities || [],
        benefits: createdJob.benefits || jobData.benefits || [],
        educationLevel: createdJob.educationLevel || jobData.educationLevel || '',
        preferredCourse: createdJob.preferredCourse || jobData.preferredCourse || '',
        urgency: 'medium' as const,
        matchQuality: 85,
        department: createdJob.department || jobData.department || 'General',
        postedDate: createdJob.createdAt || new Date().toISOString(),
        remote: createdJob.remote || jobData.workplaceType === 'Remote' || jobData.remote || false,
        workplaceType: createdJob.workplaceType || jobData.workplaceType || 'On-site'
      };

      setJobPostings(prev => [...prev, newJob]);
    } catch (error) {
      alert('Failed to create job. Please try again.');
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const [showEditConfirm, setShowEditConfirm] = useState(false);
  const [pendingJobUpdate, setPendingJobUpdate] = useState<Partial<Job> | null>(null);

  const handleUpdateJob = async (jobData: Partial<Job>) => {
    if (!jobData.id) return;
    
    try {
      setIsLoadingJobs(true);
      
      // Normalize job level to match backend enum values
      const normalizedLevel = jobData.level === 'Entry-level' ? 'Entry Level' : 
                           (jobData.level || 'Mid-level');
      
      // Convert Job data to backend format
      // Format salary based on what's provided - handle empty strings properly
      const minSalary = jobData.salaryMin?.toString().trim() ? Number(jobData.salaryMin) : undefined;
      const maxSalary = jobData.salaryMax?.toString().trim() ? Number(jobData.salaryMax) : undefined;
      
      let formattedSalary = '';
      if (minSalary && maxSalary && !isNaN(minSalary) && !isNaN(maxSalary)) {
        formattedSalary = `₱${minSalary.toLocaleString()} - ₱${maxSalary.toLocaleString()}`;
      } else if (minSalary && !isNaN(minSalary)) {
        formattedSalary = `₱${minSalary.toLocaleString()}+`;
      } else if (maxSalary && !isNaN(maxSalary)) {
        formattedSalary = `Up to ₱${maxSalary.toLocaleString()}`;
      }
      
      const backendJobData = {
        title: jobData.title,
        description: jobData.description,
        location: jobData.location,
        salary: formattedSalary,
        type: jobData.type,
        department: jobData.department || 'General',
        level: normalizedLevel,
        workplaceType: jobData.workplaceType || (jobData.remote ? 'Remote' : 'On-site'),
        remote: jobData.remote,
        requirements: jobData.requirements || [],
        responsibilities: jobData.responsibilities || [],
        benefits: jobData.benefits || [],
        educationLevel: jobData.educationLevel || '',
        preferredCourse: jobData.preferredCourse || '',
        status: jobData.status || 'active',
        salaryMin: minSalary,
        salaryMax: maxSalary
      };

      await jobApiService.updateJob(jobData.id.toString(), backendJobData);
      
      // Update local state
      setJobPostings(prev => prev.map(job => {
        if (job.id === jobData.id) {
          return {
            ...job,
            ...jobData,
            requirements: jobData.requirements || [],
            responsibilities: jobData.responsibilities || [],
            benefits: jobData.benefits || [],
            educationLevel: jobData.educationLevel || '',
            preferredCourse: jobData.preferredCourse || ''
          };
        }
        return job;
      }));
    } catch (error) {
      alert('Failed to update job. Please try again.');
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const confirmUpdateJob = () => {
    if (!pendingJobUpdate?.id) return;
    
    setJobPostings(prev => prev.map(job => {
      if (job.id === pendingJobUpdate.id) {
        // Ensure arrays are properly handled and not lost during update
        return {
          ...job,
          ...pendingJobUpdate,
          requirements: pendingJobUpdate.requirements || [],
          responsibilities: pendingJobUpdate.responsibilities || [],
          benefits: pendingJobUpdate.benefits || []
        };
      }
      return job;
    }));
    
    setShowEditConfirm(false);
    setPendingJobUpdate(null);
  };

  const cancelUpdateJob = () => {
    setShowEditConfirm(false);
    setPendingJobUpdate(null);
  };

  const handleDeleteJob = async (jobId: number, hiredApplicantIds?: string[]) => {
    try {
      setIsLoadingJobs(true);
      
      await jobApiService.deleteJob(jobId.toString());
      
      // Update local state - remove job from job postings
      setJobPostings(prev => prev.filter(job => job.id !== jobId));
      
      // Remove applications for the deleted job from applicants list
      setApplications(prev => prev.filter(app => app.jobId !== jobId.toString()));
      
      // If the deleted job was currently selected in applicants tab, clear the selection
      if (selectedJob && selectedJob.id === jobId) {
        setSelectedJob(null);
        setApplicantFilters(prev => ({
          ...prev,
          jobId: '',
          status: ''
        }));
      }
      
      // In a real app, you would also update applicant statuses based on hiredApplicantIds
    } catch (error) {
      alert('Failed to delete job. Please try again.');
    } finally {
      setIsLoadingJobs(false);
    }
  };

  const handleJobClick = (job: Job) => {
    setSelectedJob(job);
    setApplicantFilters(prev => ({
      ...prev,
      jobId: job.id.toString(),
      status: ''
    }));
    setActiveTab('applicants');
    setIsJobDetailsModalOpen(true);
  };

  const handleViewJobDetails = (job: Job) => {
    setSelectedJob(job);
    setIsJobDetailsModalOpen(true);
  };

  // Handle viewing applicants for a specific job
  const handleViewJobApplicants = (job: Job) => {
    setActiveTab('applicants');
    setApplicantFilters(prev => ({
      ...prev,
      jobId: job.id.toString(),
      status: '' // Reset status filter to show all applicants for this job
    }));
  };

  const handleEditJobFromModal = (job: Job) => {
    const handleEditJob = (job: Job) => {
      setSelectedJob(job);
      // Here you would typically open an edit form modal
      // For now, we'll just log it
    };
    handleEditJob(job);
    setIsJobDetailsModalOpen(false);
  };

  const handleDeleteJobFromModal = (job: Job) => {
    setIsJobDetailsModalOpen(false);
    handleDeleteJob(typeof job.id === 'string' ? parseInt(job.id) : job.id || 0);
  };

  const closeJobDetailsModal = () => {
    setIsJobDetailsModalOpen(false);
    setSelectedJob(null);
  };

  // This has been consolidated into the filteredApplicants definition above

  // Filter and sort jobs based on status and date (latest first)
  const filteredJobs = enhancedJobPostings
    .filter(job => {
      if (filterStatus === 'all') return true;
      return job.status === filterStatus;
    })
    .sort((a, b) => {
      // Sort by posted date, latest first
      const dateA = new Date(a.postedDate || a.posted || 0).getTime();
      const dateB = new Date(b.postedDate || b.posted || 0).getTime();
      return dateB - dateA; // Latest first
    });

  // Get status badge style
  const getStatusBadgeStyle = (status: string) => {
    switch (status) {
      case 'hired': return { backgroundColor: '#10b981', color: 'white' };
      case 'interview': return { backgroundColor: '#3b82f6', color: 'white' };
      case 'pending': return { backgroundColor: '#f59e0b', color: 'white' };
      case 'rejected': return { backgroundColor: '#ef4444', color: 'white' };
      default: return { backgroundColor: '#6b7280', color: 'white' };
    }
  };

  // Format date
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Function to get dynamic header title based on active tab
  const getHeaderTitle = (tab: TabType): string => {
    switch (tab) {
      case 'overview':
        return 'Dashboard';
      case 'applicants':
        return 'Applicants';
      case 'jobs':
        return 'Job Posts';
      case 'settings':
        return 'Settings';
      default:
        return 'Dashboard';
    }
  };

  // Navigation items
  const navigationItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: FiHome, badge: null },
    { id: 'applicants' as TabType, label: 'Applicants', icon: FiUsers, badge: realTimeStats.pendingReviews },
    { id: 'jobs' as TabType, label: 'Job Posts', icon: FiBriefcase, badge: realTimeStats.openPositions },
    { id: 'settings' as TabType, label: 'Settings', icon: FiSettings, badge: null }
  ];

  // Show loading screen while checking verification status
  if (isCheckingVerification) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh',
        flexDirection: 'column',
        gap: '20px'
      }}>
        <div style={{ 
          width: '40px', 
          height: '40px', 
          border: '4px solid #f3f3f3', 
          borderTop: '4px solid #3498db', 
          borderRadius: '50%', 
          animation: 'spin 1s linear infinite' 
        }}></div>
        <p>Verifying your account...</p>
      </div>
    );
  }

  return (
    <div className={layoutStyles.dashboard}>
      {/* Sidebar */}
      <DashboardSidebar 
        activeTab={activeTab}
        onTabChange={setActiveTab}
        sidebarOpen={sidebarOpen}
        sidebarCollapsed={sidebarCollapsed}
        onToggleCollapse={setSidebarCollapsed}
        onCloseSidebar={() => setSidebarOpen(false)}
        pendingReviews={realTimeStats.pendingReviews}
        openPositions={realTimeStats.openPositions}
      />

      <div 
        className={`${sidebarStyles.sidebarOverlay} ${sidebarOpen ? sidebarStyles.open : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Header */}
      <div className={layoutStyles.mobileHeaderContainer}>
        <MobileHeader
          pageTitle={getHeaderTitle(activeTab)}
          userInitial={companyProfileData?.companyName?.charAt(0) || 'E'}
          profilePicture={userProfile?.profilePicture}
          onMenuClick={() => setSidebarOpen(!sidebarOpen)}
          onProfileClick={() => setActiveTab('settings')}
          notifications={1}
        />
      </div>

      <div className={`${layoutStyles.mainContent} ${sidebarCollapsed ? layoutStyles.sidebarCollapsed : layoutStyles.sidebarOpen}`}>
        {/* Header */}
        <header className={layoutStyles.desktopHeader}>
          <div className={layoutStyles.headerLeft}>
            <button 
              className={layoutStyles.menuToggle}
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
            >
              <FiMenu />
            </button>
            <h1 className={layoutStyles.pageTitle} style={{color: '#343386'}}>{getHeaderTitle(activeTab)}</h1>
          </div>
          
          <div className={layoutStyles.headerActions}>
            <button 
              className={layoutStyles.userAvatar}
              onClick={() => setActiveTab('settings')}
              aria-label="Go to settings"
            >
              {userProfile?.profilePicture ? (
                <img 
                  src={getImageSrc(userProfile.profilePicture)} 
                  alt="Company logo" 
                  className={layoutStyles.avatarImage}
                />
              ) : (
                companyProfileData?.companyName?.charAt(0) || 'E'
              )}
            </button>
          </div>
        </header>

        <div className={layoutStyles.fullWidthContent}>
          <div className={layoutStyles.tabContent}>
            {activeTab === 'overview' && (
              <>
                {/* Welcome Section */}
                <WelcomeSection 
                  userName={userProfile?.companyName || "Employer"}
                  subtitle="Here's what's happening with your hiring process today"
                  profilePicture={userProfile?.profilePicture}
                />

                {/* Enhanced Stats Grid */}
                <StatsGrid stats={realTimeStats} onNavigate={(tab) => setActiveTab(tab as TabType)} />

                {/* Quick Actions Section */}
                <QuickActions 
                  onCreateJob={handleOpenJobForm}
                  onViewJobs={() => setActiveTab('jobs')}
                  onViewApplications={() => setActiveTab('applicants')}
                  onOpenSettings={() => setActiveTab('settings')}
                />

                {/* Recent Applicants Section */}
                <RecentApplicants 
                  applicants={recentApplicants}
                  onViewAll={() => setActiveTab('applicants')}
                  onViewApplicantDetails={handleViewApplicantDetails}
                />

                {/* Job Posts Section */}
                <ActiveJobPosts 
                  jobs={enhancedJobPostings}
                  onViewAll={() => setActiveTab('jobs')}
                  onJobClick={handleJobClick}
                />
              </>
            )}

          {activeTab === 'applicants' && (
            <ApplicantsTab
              applicants={filteredApplicants}
              searchTerm={searchQuery}
              filters={{
                status: applicantFilters.status,
                jobId: applicantFilters.jobId
              }}
              onSearchChange={setSearchQuery}
              onFilterChange={(filterType, value) => {
                setApplicantFilters(prev => ({ ...prev, [filterType]: value }));
              }}
              onAcceptApplicant={handleMoveToInitialInterview}
              onRejectApplicant={handleRejectApplicant}
              onViewResume={handleViewResume}
              onViewDetails={(applicant) => {
                setSelectedApplicant(applicant);
                setIsModalOpen(true);
              }}
              onExport={() => {
              }}
              jobPostings={enhancedJobPostings}
            />
          )}

          {activeTab === 'jobs' && (
            <JobsTab
              jobs={filteredJobs}
              applicants={enhancedApplicants}
              searchTerm={searchQuery}
              filters={{
                status: filterStatus,
                department: '',
                location: '',
                dateFrom: dateFromFilter,
                dateTo: dateToFilter
              }}
              onSearchChange={setSearchQuery}
              onFilterChange={handleFilterChange}
              onViewJob={handleViewJobApplicants}
              onEditJob={handleEditJob}
              onDeleteJob={handleDeleteJob}
              onCreateJob={handleCreateJob}
              onUpdateJob={handleUpdateJob}
              isLoading={isLoadingJobs}
              profilePicture={userProfile?.profilePicture}
            />
          )}

          {activeTab === 'settings' && (
            <SettingsTab 
              onOpenCompanyProfile={() => setIsCompanyProfileModalOpen(true)}
              onOpenDocuments={() => setIsDocumentsModalOpen(true)}
              onLogout={() => {
                // Clear any stored authentication data
                localStorage.removeItem('authToken');
                sessionStorage.clear();
                // Redirect to employer auth page
                window.location.href = '/auth/employer';
              }}
            />
          )}
          </div>
        </div>
      </div>

      {/* Applicant Details Modal */}
      {selectedApplicant && (
        <ApplicantDetailsModal
          applicant={selectedApplicant}
          isOpen={isModalOpen}
          onClose={handleCloseModal}
          onMoveToInitialInterview={handleMoveToInitialInterview}
          onMoveToFinalInterview={handleMoveToFinalInterview}
          onReject={handleRejectApplicant}
          onHire={handleHireApplicant}
          onViewResume={handleViewResume}
          onDownloadResume={handleDownloadResume}
        />
      )}

      {/* Job Details Modal */}
      {selectedJob && userProfile && (
        <JobDetailsModal
          job={selectedJob}
          isOpen={isJobDetailsModalOpen}
          onClose={() => {
            setIsJobDetailsModalOpen(false);
            setSelectedJob(null);
          }}
          onEdit={() => {
            // Handle edit job
          }}
          onDelete={() => {
            // Handle delete job
          }}
          onViewApplicants={() => {
            // Handle view applicants
          }}
          profilePicture={userProfile.profilePicture}
        />
      )}

      {/* Settings Modals */}
      <CompanyProfileModal
        isOpen={isCompanyProfileModalOpen}
        onClose={() => setIsCompanyProfileModalOpen(false)}
        onSave={handleSaveCompanyProfile}
        initialData={companyProfileData || undefined}
      />


      <DocumentsModal
        isOpen={isDocumentsModalOpen}
        onClose={() => setIsDocumentsModalOpen(false)}
        onSave={(documentsData: any) => {
          // Handle save documents data
        }}
      />

      {/* Initial Interview Email Modal */}
      {applicantForInitialInterview && (
        <InterviewEmailModal
          isOpen={isInitialInterviewModalOpen}
          onClose={() => {
            setIsInitialInterviewModalOpen(false);
            setApplicantForInitialInterview(null);
          }}
          onSend={handleSendInitialInterviewInvitation}
          applicantName={applicantForInitialInterview.name}
          applicantEmail={applicantForInitialInterview.email}
          jobTitle={applicantForInitialInterview.position}
        />
      )}

      {/* Final Interview Email Modal */}
      {applicantForFinalInterview && (
        <InterviewEmailModal
          isOpen={isFinalInterviewModalOpen}
          onClose={() => {
            setIsFinalInterviewModalOpen(false);
            setApplicantForFinalInterview(null);
          }}
          onSend={handleSendFinalInterviewInvitation}
          applicantName={applicantForFinalInterview.name}
          applicantEmail={applicantForFinalInterview.email}
          jobTitle={applicantForFinalInterview.position}
        />
      )}

      {/* Hire Email Modal */}
      {applicantToHire && (
        <HireEmailModal
          isOpen={isHireEmailModalOpen}
          onClose={() => {
            setIsHireEmailModalOpen(false);
            setApplicantToHire(null);
          }}
          onSend={handleSendHireConfirmation}
          applicantName={applicantToHire.name}
          applicantEmail={applicantToHire.email}
          jobTitle={applicantToHire.position}
        />
      )}

      <JobFormModal
        job={jobToEdit}
        isOpen={isJobFormModalOpen}
        onClose={() => {
          setIsJobFormModalOpen(false);
          setJobToEdit(null);
        }}
        onSave={handleSaveJobFromModal}
        isEditing={!!jobToEdit}
      />
      {showEditConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            padding: '2rem',
            borderRadius: '8px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
          }}>
            <h3 style={{ marginTop: 0, marginBottom: '1rem' }}>Confirm Changes</h3>
            <p>Are you sure you want to update this job posting?</p>
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '1rem',
              marginTop: '1.5rem'
            }}>
              <button
                onClick={cancelUpdateJob}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: '1px solid #d1d5db',
                  backgroundColor: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'white';
                }}
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdateJob}
                style={{
                  padding: '0.5rem 1rem',
                  borderRadius: '4px',
                  border: 'none',
                  backgroundColor: '#3b82f6',
                  color: 'white',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = '#2563eb';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = '#3b82f6';
                }}
              >
                Confirm Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployerDashboard;
