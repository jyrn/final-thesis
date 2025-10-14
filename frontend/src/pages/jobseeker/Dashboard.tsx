import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import styles from './Dashboard.module.css'
import { FiHome, FiBriefcase, FiFileText, FiUser, FiBookmark, FiMapPin, FiDollarSign, FiClock, FiMenu, FiX, FiFilter, FiSliders, FiLogOut, FiEdit3 } from 'react-icons/fi'
import { getImageSrc } from '../../utils/imageUtils'
import FilterModal from '../../components/jobseeker/FilterModal/FilterModal'
import SearchBar from '../../components/jobseeker/SearchBar/SearchBar'
import ResumeUploadPrompt from '../../components/ResumeUploadPrompt';
import JobDetailModal from '../../components/jobseeker/JobDetailModal/JobDetailModal';
import ApplicationSuccessModal from '../../components/ApplicationSuccessModal';
import DashboardTab from '../../components/jobseeker/Dashboard/tabs/DashboardTab';
import JobsTab from '../../components/jobseeker/Dashboard/tabs/JobsTab';
import SavedJobsTab from '../../components/jobseeker/Dashboard/tabs/SavedJobsTab';
import ApplicationsTab from '../../components/jobseeker/Dashboard/tabs/ApplicationsTab';
import CreateResumeTab from '../../components/jobseeker/Dashboard/tabs/CreateResumeTab';
import SettingsTab from '../../components/jobseeker/Settings/SettingsTab';
import Sidebar from './components/Sidebar';
import MobileHeader from '../../components/jobseeker/MobileHeader/MobileHeader';
import { parseResume } from '../../utils/resumeParser'
import { Job } from '../../types/Job'
import { JobService } from '../../services/jobService'
import { apiService } from '../../services/apiService'
import { useAutoRefresh, useTimeSinceRefresh } from '../../hooks/useAutoRefresh'

// Types
interface PersonalInfo {
  name: string
  email: string
  phone: string
  address: string
}

interface Experience {
  company: string
  position: string
  duration: string
  description: string
}

interface Education {
  institution: string
  degree: string
  year: string
}


interface Application {
  id: number
  jobId: number
  status: 'pending' | 'review' | 'interview' | 'rejected' | 'accepted'
  appliedDate: string
  updatedAt: string
}

interface ParsedResume {
  personalInfo: PersonalInfo
  summary: string
  experience: Experience[]
  education: Education[]
  skills: string[]
  certifications: string[]
}

const Dashboard: React.FC = () => {
  const navigate = useNavigate()
  const [activeTab, setActiveTab] = useState('dashboard')
  const [showFilters, setShowFilters] = useState(false)
  const [showJobDetail, setShowJobDetail] = useState(false)
  const [selectedJob, setSelectedJob] = useState<Job | null>(null)
  const [showApplicationSuccess, setShowApplicationSuccess] = useState(false)
  const [appliedJobDetails, setAppliedJobDetails] = useState<{ title: string; company: string } | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [jobs, setJobs] = useState<Job[]>([])
  const [filteredJobs, setFilteredJobs] = useState<Job[]>([])
  const [showResumeUpload, setShowResumeUpload] = useState(false)
  const [resume, setResume] = useState<ParsedResume | null>(null)
  const [applications, setApplications] = useState<Application[]>([])
  const [appliedJobs, setAppliedJobs] = useState<Set<string | number>>(new Set())
  const [savedJobs, setSavedJobs] = useState<Set<string | number>>(new Set())
  const [error, setError] = useState<string | null>(null)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false)
  const [isFirstVisit, setIsFirstVisit] = useState(true)
  const [hasSkippedResume, setHasSkippedResume] = useState(false)
  const [showInitialResumePrompt, setShowInitialResumePrompt] = useState(false)
  const [attemptedJobId, setAttemptedJobId] = useState<string | number | null>(null)
  const [showFilterModal, setShowFilterModal] = useState(false)
  const [userProfile, setUserProfile] = useState<any>(null)
  const [currentResume, setCurrentResume] = useState<any>(null)
  const [resumeFormData, setResumeFormData] = useState<any>(null)
  
  interface ActiveFilters {
    lastUpdate: string;
    workplaceType: string;
    jobType: string[];
    positionLevel: string[];
    location: {
      withinKm: number;
      nearMe: boolean;
      withinCountry: boolean;
      international: boolean;
      remote: boolean;
    };
    salary: {
      min: number;
      max: number;
    };
  }
  
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>({
    lastUpdate: '',
    workplaceType: '',
    jobType: [],
    positionLevel: [],
    location: {
      withinKm: 10,
      nearMe: false,
      withinCountry: false,
      international: false,
      remote: false
    },
    salary: {
      min: 20000,
      max: 50000
    }
  })

  // Handle user logout
  const handleLogout = () => {
    // Clear user session data
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    // Redirect to jobseeker auth page
    navigate('/auth/jobseeker')
  }

  // Filter jobs based on search query and filters
  useEffect(() => {
    const query = searchQuery.toLowerCase().trim();
    
    const filtered = jobs.filter(job => {
      // Search query matching - check all relevant fields
      if (query === '') {
        return true; // No search query, show all jobs (subject to filters)
      }
      
      // Check each field individually for better debugging
      const titleMatch = job.title?.toLowerCase().includes(query);
      const companyMatch = job.company?.toLowerCase().includes(query);
      const locationMatch = job.location?.toLowerCase().includes(query);
      const descriptionMatch = job.description?.toLowerCase().includes(query);
      const typeMatch = job.type?.toLowerCase().includes(query);
      const levelMatch = job.level?.toLowerCase().includes(query);
      const experienceLevelMatch = job.experienceLevel?.toLowerCase().includes(query);
      const requirementsMatch = job.requirements?.some(req => 
        req && req.toLowerCase().includes(query)
      );
      
      const matchesSearch = titleMatch || companyMatch || locationMatch || 
                           descriptionMatch || typeMatch || levelMatch || 
                           experienceLevelMatch || requirementsMatch;
      
      // Debug logging (remove in production)
      if (query && matchesSearch) {      }
      
      return matchesSearch;
    });
    
    // Apply additional filters only if search returned results or no search query
    const finalFiltered = filtered.filter(job => {
      // Always apply filters - let each filter decide if it should be active
      // This way filters work immediately when set
      
      // Filter matching with proper type checking
      const jobTypeMatch = !activeFilters.jobType?.length || 
        activeFilters.jobType.some(filterType => 
          job.type?.toLowerCase() === filterType.toLowerCase()
        );
      
      const workplaceTypeMatch = !activeFilters.workplaceType || 
        (activeFilters.workplaceType === 'Remote' && (job.isRemote || job.workplaceType === 'Remote')) ||
        (activeFilters.workplaceType === 'Hybrid' && (job.isHybrid || job.workplaceType === 'Hybrid')) ||
        (activeFilters.workplaceType === 'On-site' && (!job.isRemote && !job.isHybrid));
      
      const positionLevelMatch = !activeFilters.positionLevel?.length || 
        activeFilters.positionLevel.some((level: string) => 
          (job.title?.toLowerCase() || '').includes(level.toLowerCase()) ||
          (job.level?.toLowerCase() || '').includes(level.toLowerCase()) ||
          (job.experienceLevel?.toLowerCase() || '').includes(level.toLowerCase())
        );
      
      // Skip salary filtering for now - it's causing all jobs to be filtered out
      const salaryMatch = true;
      
      const locationMatch = 
        (!activeFilters.location?.remote || job.isRemote || job.workplaceType === 'Remote') &&
        (!activeFilters.location?.withinCountry || job.location?.toLowerCase().includes('metro manila')) &&
        (!activeFilters.location?.international || !job.location?.toLowerCase().includes('metro manila'));
      
      const matchesFilters = jobTypeMatch && workplaceTypeMatch && positionLevelMatch && salaryMatch && locationMatch;
      
      // Debug logging for filters
      if (activeFilters.jobType?.length > 0 || activeFilters.workplaceType || activeFilters.positionLevel?.length > 0) {      }
      
      return matchesFilters;
    });
    
    setFilteredJobs(finalFiltered);
  }, [searchQuery, jobs, activeFilters]);
  
  const handleApplyFilters = (filters: ActiveFilters) => {
    setActiveFilters(filters);
    setShowFilterModal(false);
  };

  // Extract loadJobs function for reusability
  const loadJobs = async () => {
    try {
      // Load jobs from backend API (public endpoint, no auth needed)
      const jobService = JobService.getInstance();
      const backendJobs = await jobService.getRecommendedJobs();
      setJobs(backendJobs);
    } catch (err) {
      setError('Failed to load jobs. Please try again later.');
    }
  };

  // Extract loadAuthData function for reusability
  const loadAuthData = async () => {
    try {
      // Wait for Firebase auth to be ready
      const { auth } = await import('../../config/firebase');
      
      return new Promise((resolve) => {
        const unsubscribe = auth.onAuthStateChanged(async (user) => {
          unsubscribe(); // Clean up listener
          
          if (!user) {
            resolve(null);
            return;
          }
          
          try {
            // Load user's saved jobs
            const savedJobsResponse = await apiService.getSavedJobs();
            if (savedJobsResponse.success && savedJobsResponse.data) {
              const userSavedJobs = savedJobsResponse.data.savedJobs || [];
              setSavedJobs(new Set(userSavedJobs));
            }
            
            // Load user's applications to mark applied jobs
            const applicationsResponse = await apiService.getUserApplications();
            if (applicationsResponse.success && applicationsResponse.data) {
              const userApplications = applicationsResponse.data;
              setApplications(userApplications);
              
              // Mark jobs as applied based on user's applications
              const appliedJobIds = new Set<string | number>();
              
              userApplications.forEach((app: any) => {
                const jobId = app.jobId;
                
                // Handle MongoDB ObjectId format
                if (typeof jobId === 'string') {
                  appliedJobIds.add(jobId);
                } else if (typeof jobId === 'object' && jobId) {
                  // MongoDB ObjectId object - convert to string
                  const objectIdString = jobId.toString();
                  appliedJobIds.add(objectIdString);
                  
                  // Also try extracting the hex string if it's a proper ObjectId
                  if (jobId.$oid) {
                    appliedJobIds.add(jobId.$oid);
                  }
                } else if (typeof jobId === 'number') {
                  appliedJobIds.add(jobId);
                  appliedJobIds.add(jobId.toString());
                }
              });
              
              setAppliedJobs(appliedJobIds);
              
              // Update existing jobs with applied state
              setJobs(prev => prev.map(job => {
                const jobIdStr = job.id?.toString() || job._id?.toString() || '';
                return {
                  ...job,
                  applied: appliedJobIds.has(job.id) || appliedJobIds.has(job._id) || appliedJobIds.has(jobIdStr)
                };
              }));
            }
            
            // Load user profile
            const profileResponse = await apiService.getUserProfile();
            if (profileResponse.success && profileResponse.user) {
              setUserProfile(profileResponse.user);
            }
            
            // Load current resume
            const resumeResponse = await apiService.getCurrentResume();
            if (resumeResponse.success && resumeResponse.data) {
              setCurrentResume(resumeResponse.data);
            }
            
            resolve(user);
          } catch (error) {
            resolve(null);
          }
        });
      });
    } catch (error) {
      // Silent fail for auth errors
    }
  };

  // Combined refresh function
  const refreshAllData = async () => {
    await Promise.all([loadJobs(), loadAuthData()]);
  };

  // Auto-refresh hook - refreshes every 30 seconds
  const { refresh: manualRefresh, isRefreshing, lastRefreshTime } = useAutoRefresh(
    refreshAllData,
    {
      interval: 30000, // 30 seconds
      enabled: true,
      refreshOnMount: false,
      refreshOnFocus: true
    }
  );

  // Get formatted time since last refresh
  const timeSinceRefresh = useTimeSinceRefresh(lastRefreshTime);

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        await loadJobs();

        // Check if user has visited before
        const hasVisited = localStorage.getItem('hasVisitedDashboard')
        
        // Show initial resume prompt only if first visit
        if (!hasVisited) {
          setShowInitialResumePrompt(true)
          setIsFirstVisit(true)
        } else {
          setIsFirstVisit(false)
        }

        localStorage.setItem('hasVisitedDashboard', 'true')
      } catch (err) {
        setError('Failed to load data. Please try again later.')      }
    }

    loadData()
    
    // Listen for profile picture updates from Settings component
    const handleProfilePictureUpdate = (event: any) => {
      setUserProfile(prev => ({
        ...prev,
        profilePicture: event.detail.profilePicture
      }));
    };
    
    window.addEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    
    return () => {
      window.removeEventListener('profilePictureUpdated', handleProfilePictureUpdate);
    };
  }, [])

  // Separate effect for auth-dependent data loading
  useEffect(() => {
    loadAuthData();
  }, [])


  const handleResumeUpload = async (file: File) => {
    try {
      // Upload the file to the new resume collection
      const uploadResponse = await apiService.uploadResume(file);
      
      if (!uploadResponse.success) {
        throw new Error(uploadResponse.error || 'Failed to upload resume');
      }      // Update the current resume state with the new upload
      setCurrentResume(uploadResponse.data);
      
      // Parse the resume for local display (this won't be integrated with NER service yet)
      const parsed = await parseResume(file)
      const resumeData = {
        personalInfo: {
          name: parsed.personalInfo.name,
          email: parsed.personalInfo.email,
          phone: parsed.personalInfo.phone,
          address: parsed.personalInfo.address || 'Not specified'
        },
        summary: parsed.summary,
        experience: parsed.experience,
        education: parsed.education.map(edu => ({
          institution: edu.institution || 'Not specified',
          degree: edu.degree || 'Not specified',
          year: edu.year || 'Not specified'
        })),
        skills: parsed.skills,
        certifications: parsed.certifications || []
      }
      
      setResume(resumeData)
      setShowResumeUpload(false)
      setShowInitialResumePrompt(false)
      setHasSkippedResume(false)
      
      // Save to localStorage as backup/cache
      localStorage.setItem('userResume', JSON.stringify(resumeData))
      
      // Set resume in JobService for better job matching
      const jobService = JobService.getInstance();
      jobService.setUserResume(resumeData);
      
      // If user was trying to apply to a job, proceed with application
      if (attemptedJobId) {
        handleApplyJob(attemptedJobId)
        setAttemptedJobId(null)
      }
    } catch (err) {
      setError('Failed to parse resume. Please try again.')    }
  }

  const handleSkipResume = () => {
    setHasSkippedResume(true);
    setShowInitialResumePrompt(false);
    setShowResumeUpload(false);
    // Don't change the active tab, just close the modal
  };

  // Job matching logic based on resume skills
  const getMatchedJobs = () => {
    if (!resume || !resume.skills?.length) {
      return jobs // Return all jobs if no resume or skills
    }

    const userSkills = resume.skills.map(skill => skill?.toLowerCase() || '')
    
    return jobs
      .map(job => {
        const jobRequirements = job.requirements || []
        const matchingSkills = jobRequirements.filter(req => 
          req && userSkills.some(skill => 
            skill && req.toLowerCase().includes(skill.toLowerCase())
          )
        )
        
        return {
          ...job,
          matchScore: matchingSkills.length,
          matchingSkills
        }
      })
      .sort((a, b) => b.matchScore - a.matchScore)
  }

  const getJobsToDisplay = () => {
    // Always use filteredJobs as the base (includes both search and filter results)
    let jobsToShow = filteredJobs;
    
    // If no search query and user has resume, apply skill matching to filtered results
    if (searchQuery.trim() === '' && resume && !hasSkippedResume) {
      const userSkills = resume.skills?.map(skill => skill?.toLowerCase() || '') || [];
      
      jobsToShow = filteredJobs
        .map(job => {
          const jobRequirements = job.requirements || []
          const matchingSkills = jobRequirements.filter(req => 
            req && userSkills.some(skill => 
              skill && req.toLowerCase().includes(skill.toLowerCase())
            )
          )
          
          return {
            ...job,
            matchScore: matchingSkills.length,
            matchingSkills
          }
        })
        .sort((a, b) => b.matchScore - a.matchScore)
    }
    
    return jobsToShow;
  }

  const handleSaveJob = async (jobId: string | number) => {    try {
      const response = await apiService.toggleSavedJob(jobId);
      
      if (response.success) {
        // Update local state based on server response
        setSavedJobs(prev => {
          const newSet = new Set(prev);
          
          if (response.data?.action === 'added') {
            newSet.add(jobId);          } else if (response.data?.action === 'removed') {
            newSet.delete(jobId);          }          return newSet;
        });
      } else {        setError('Failed to save job. Please try again.');
      }
    } catch (error) {      setError('Failed to save job. Please try again.');
    }
  }

  const handleApplyJob = async (jobId: string | number) => {
    // More permissive resume validation - allow application if user has any resume data or profile info
    const hasCurrentResume = currentResume && currentResume.fileUrl
    const hasResumeData = resume && (resume.personalInfo || resume.skills || resume.experience)
    const hasResumeFile = userProfile?.resumeUrl && userProfile.resumeUrl.trim() !== ''
    const hasBasicProfile = userProfile && (userProfile.firstName || userProfile.email)
    const hasResume = hasCurrentResume || hasResumeData || hasResumeFile || hasBasicProfile    if (!hasResume) {      setAttemptedJobId(jobId)
      setShowResumeUpload(true)
      return
    }    // Find the job details for the success modal
    const job = jobs.find(j => j.id === jobId);    if (!job) {      return;
    }    try {
      // Get Firebase auth token directly instead of localStorage
      const { auth } = await import('../../config/firebase');
      const user = auth.currentUser;
      
      if (!user) {        alert('Please log in again to apply for jobs');
        window.location.href = '/auth/jobseeker';
        return;
      }

      const token = await user.getIdToken();      // Submit application to backend      const response = await fetch('http://localhost:3001/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          jobId, 
          resumeData: resume,
          coverLetter: '' // Optional cover letter
        })
      });      if (!response.ok) {
        const errorText = await response.text();        if (response.status === 401) {
          alert('Authentication failed. Please log in again.');
          // Redirect to login or refresh token
          window.location.href = '/auth';
          return;
        }
        
        throw new Error(`Failed to submit application: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();      // Apply through JobService
      const jobService = JobService.getInstance();
      const updatedJob = jobService.applyToJob(Number(jobId));
      
      // Create application record
      const newApplication: Application = {
        id: Date.now(),
        jobId: Number(jobId),
        status: 'pending',
        appliedDate: new Date().toISOString().split('T')[0],
        updatedAt: new Date().toISOString()
      }
      
      setApplications(prev => [...prev, newApplication])
      setShowJobDetail(false)
      
      // Show success modal
      setAppliedJobDetails({
        title: job.title,
        company: job.company
      });
      setShowApplicationSuccess(true);
      
      
      // Update the jobs list to reflect the applied status
      setJobs(prev => {
        const updated = prev.map(job => 
          job.id === jobId ? { ...job, applied: true } : job
        );
        return updated;
      });
      
      // Update appliedJobs set - ensure consistent ID format
      setAppliedJobs(prev => {
        const newSet = new Set(Array.from(prev).concat([jobId, jobId?.toString()]));
        return newSet;
      });
      
      // Also update filteredJobs if it's being used
      setFilteredJobs(prev => prev.map(job => 
        job.id === jobId ? { ...job, applied: true } : job
      ));
      
      // Show success message
      setError(null)
    } catch (error) {      setError('Failed to submit application. Please try again.');
    }
  }

  const handleJobClick = (job: Job) => {    setSelectedJob(job)
    setShowJobDetail(true)  }

  const handleFilterApply = (filters: any) => {    setShowFilters(false)
  }

  // Function to get the display title based on active tab
  const getPageTitle = (tabId: string): string => {
    const tabTitles: { [key: string]: string } = {
      'dashboard': 'Dashboard',
      'create-resume': 'Create Resume',
      'jobs': 'Find Jobs',
      'applications': 'Applications',
      'saved': 'Saved Jobs',
      'profile': 'Settings'
    }
    return tabTitles[tabId] || 'Dashboard'
  }

  const renderDesktopSidebar = () => (
    <Sidebar
      activeTab={activeTab}
      onTabChange={setActiveTab}
      isSidebarOpen={isSidebarOpen}
      onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      isCollapsed={isSidebarCollapsed}
      onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
    />
  )

  const renderContent = () => {
    const tabProps = {
      resume,
      applications,
      savedJobs,
      appliedJobs,
      jobs,
      hasSkippedResume,
      getJobsToDisplay,
      onSaveJob: handleSaveJob,
      onApplyJob: handleApplyJob,
      onJobClick: handleJobClick,
      onOpenFilters: () => setShowFilterModal(true),
      onNavigate: setActiveTab,
      onShowResumeUpload: () => setShowResumeUpload(true),
      userProfile: userProfile,
    };

    switch (activeTab) {
      case 'dashboard':
        return <DashboardTab {...tabProps} />;
      case 'jobs':
        return <JobsTab {...tabProps} />;
      case 'saved':
        return <SavedJobsTab {...tabProps} />;
      case 'applications':
        return <ApplicationsTab {...tabProps} />;
      case 'create-resume':
        return <CreateResumeTab 
          resumeFormData={resumeFormData}
          onResumeDataChange={setResumeFormData}
        />;
      case 'profile':
        return <SettingsTab onNavigate={setActiveTab} />;
      default:
        return (
          <div className={styles.pageContent}>
            <div className={styles.emptyState}>
              <FiX size={48} className={styles.emptyIcon} />
              <h3>Page not found</h3>
              <p>The requested page could not be found</p>
            </div>
          </div>
        );
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Enhanced Sidebar */}
      {renderDesktopSidebar()}
      
      {/* Mobile Header */}
      <div className={styles.mobileHeaderContainer}>
        <MobileHeader
          pageTitle={getPageTitle(activeTab)}
          userInitial={resume?.personalInfo?.name?.charAt(0) || 'U'}
          userProfilePicture={userProfile?.profilePicture}
          onMenuClick={() => setIsSidebarOpen(!isSidebarOpen)}
          onProfileClick={() => setActiveTab('profile')}
          onFilterClick={activeTab === 'jobs' ? () => setShowFilterModal(true) : undefined}
              showSearch={activeTab === 'jobs'}
          searchComponent={activeTab === 'jobs' ? (
            <SearchBar 
              value={searchQuery}
              onChange={(value) => setSearchQuery(value)}
              placeholder="Search for jobs, companies, or keywords"
            />
          ) : undefined}
        />
      </div>

      {/* Main Content */}
      <main className={`${styles.mainContent} ${
        isSidebarOpen ? styles.sidebarOpen : ''
      } ${
        isSidebarCollapsed ? styles.sidebarCollapsed : ''
      } ${
        activeTab === 'jobs' ? styles.withMobileSearch : ''
      }`}>
        {/* Desktop Header */}
        <header className={styles.desktopHeader}>
          <div className={styles.headerLeft}>
            <button 
              className={styles.menuToggle}
              onClick={() => {                setIsSidebarOpen(!isSidebarOpen);
              }}
              aria-label="Toggle menu"
            >
              <FiMenu />
            </button>
            <h1 className={styles.pageTitle}>{getPageTitle(activeTab)}</h1>
          </div>
          
          {activeTab === 'jobs' && (
            <div className={styles.headerSearch}>
              <SearchBar 
                value={searchQuery}
                onChange={(value) => setSearchQuery(value)}
                placeholder="Search for jobs, companies, or keywords"
              />
            </div>
          )}
          
          <div className={styles.headerActions}>
            <button 
              className={styles.userAvatar}
              onClick={() => setActiveTab('profile')}
              aria-label="Go to settings"
            >
              {userProfile?.profilePicture ? (
                <img 
                  src={getImageSrc(userProfile.profilePicture)} 
                  alt="Profile" 
                  style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                />
              ) : (
                resume?.personalInfo?.name?.charAt(0) || 'U'
              )}
            </button>
          </div>
        </header>

        {/* Error Banner */}
        {error && (
          <div className={styles.contentArea}>
            <div className={styles.errorBanner}>
              <p>{error}</p>
              <button onClick={() => setError(null)}>×</button>
            </div>
          </div>
        )}

        {/* Content - Outside contentArea to align with header */}
        <div className={styles.fullWidthContent}>
          {renderContent()}
        </div>
      </main>

      <FilterModal 
        isOpen={showFilterModal}
        onClose={() => setShowFilterModal(false)}
        onApply={handleApplyFilters}
      />

      {/* Mobile Bottom Navigation - Removed for now */}

      {/* Modals - Filter modal removed for now */}

      <JobDetailModal
        job={selectedJob}
        isOpen={showJobDetail}
        onClose={() => setShowJobDetail(false)}
        onApply={handleApplyJob}
      />

      {showResumeUpload && (
        <ResumeUploadPrompt 
          isOpen={showResumeUpload || (isFirstVisit && !hasSkippedResume && !resume)} 
          onClose={() => setShowResumeUpload(false)} 
          onUpload={handleResumeUpload}
          onSkip={handleSkipResume}
          userProfile={currentResume ? { resumeUrl: currentResume.fileUrl } : null}
        />
      )}

      <ApplicationSuccessModal
        isOpen={showApplicationSuccess}
        onClose={() => setShowApplicationSuccess(false)}
        jobTitle={appliedJobDetails?.title || ''}
        companyName={appliedJobDetails?.company || ''}
      />

      {showInitialResumePrompt && (
        <div className={styles.modalOverlay}>
          <div className={styles.initialResumeModal}>
            <div className={styles.modalHeader}>
              <h2>Welcome to Your Job Dashboard!</h2>
            </div>
            <div className={styles.modalContent}>
              <div className={styles.resumeIcon}>
                <FiFileText size={48} />
              </div>
              <h3>Upload Your Resume for Better Job Matches</h3>
              <p>
                Your resume helps us understand your skills and experience to recommend 
                the most relevant job opportunities. We'll analyze your background and 
                match you with positions that fit your profile.
              </p>
              <ul className={styles.benefitsList}>
                <li>Get personalized job recommendations</li>
                <li>See jobs ranked by skill match</li>
                <li>Apply to jobs with one click</li>
                <li>Track your application status</li>
              </ul>
            </div>
            <div className={styles.modalActions}>
              <button 
                className={styles.primaryBtn}
                onClick={() => {
                  setShowInitialResumePrompt(false)
                  setShowResumeUpload(true)
                }}
              >
                Upload Resume
              </button>
              <button 
                className={styles.secondaryBtn}
                onClick={handleSkipResume}
              >
                Skip for Now
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Dashboard
