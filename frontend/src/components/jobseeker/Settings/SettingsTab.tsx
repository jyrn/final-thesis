import React, { useState, useEffect } from 'react';
import { FiUser, FiFileText, FiSave, FiX, FiUpload, FiDownload, FiTrash2, FiEye, FiMail, FiPhone, FiMapPin, FiGlobe, FiDollarSign, FiStar, FiPlus, FiMinus, FiLogOut, FiBell, FiSettings, FiEdit2, FiCheck } from 'react-icons/fi';
import styles from './SettingsTab.module.css';
import firebaseAuthService from '../../../services/firebaseAuthService';
import { apiService } from '../../../services/apiService';
import ResumeEditModal from '../../ResumeEditModal/ResumeEditModal';
import { useNavigate } from 'react-router-dom';
import PDFPreview from '../../shared/PDFPreview';
import { getImageSrc } from '../../../utils/imageUtils';


interface JobseekerProfile {
  _id?: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  email: string;
  phone?: string;
  address?: {
    street?: string;
    city?: string;
    province?: string;
    zipCode?: string;
    country?: string;
  } | string;
  jobTitle?: string;
  portfolioUrl?: string;
  linkedinUrl?: string;
  salaryExpectation?: {
    min: number;
    max: number;
  };
  skills?: Array<{
    name: string;
    level: string;
  }>;
  experience?: string;
  education?: string;
  resumeUrl?: string;
  profilePicture?: string;
  preferredJobTypes?: string[];
  preferredLocations?: string;
  remoteWork?: boolean;
  privacySettings?: {
    profileVisibility: string;
    allowEmployerContact: boolean;
  };
  completionPercentage?: number;
  createdAt?: string;
  isActive?: boolean;
}

interface SettingsTabProps {
  onNavigate?: (tab: string) => void;
}

const SettingsTab: React.FC<SettingsTabProps> = ({ onNavigate }) => {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<JobseekerProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeSection, setActiveSection] = useState<'profile' | 'resume' | 'privacy'>('profile');
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [profilePicture, setProfilePicture] = useState<File | null>(null);
  const [uploadingPicture, setUploadingPicture] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', level: 'beginner' });
  const [darkMode, setDarkMode] = useState(false);
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    smsAlerts: false,
    inAppAlerts: true,
    jobMatches: true,
    applicationUpdates: true
  });
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [updatingPassword, setUpdatingPassword] = useState(false);
  const [showResumeEditModal, setShowResumeEditModal] = useState(false);
  const [parsedResumeData, setParsedResumeData] = useState(null);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [userAuthMethods, setUserAuthMethods] = useState<{hasPassword: boolean; providers: string[]}>({
    hasPassword: true,
    providers: []
  });
  const [checkingAuthMethods, setCheckingAuthMethods] = useState(false);
  const [originalResumeUrl, setOriginalResumeUrl] = useState<string | null>(null);
  const [showOriginalToEmployers, setShowOriginalToEmployers] = useState(false);
  const [availableResumes, setAvailableResumes] = useState<{
    generated?: { url: string; label: string };
    uploaded?: { url: string; label: string };
  }>({});
  const [activeResumeType, setActiveResumeType] = useState<'generated' | 'uploaded'>('generated');
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);

  useEffect(() => {
    fetchProfile();
    checkUserAuthMethods();
  }, []);

  useEffect(() => {
    if (activeSection === 'profile' || activeSection === 'resume') {
      fetchProfile();
    }
  }, [activeSection]);


  const checkUserAuthMethods = async () => {
    try {
      setCheckingAuthMethods(true);
      console.log('SettingsTab: Checking user auth methods...');
      const methods = await firebaseAuthService.checkUserAuthMethods();
      console.log('SettingsTab: Auth methods result:', methods);
      setUserAuthMethods(methods);
    } catch (error) {
      console.error('SettingsTab: Error checking user auth methods:', error);
      // Default to showing password form if there's an error
      setUserAuthMethods({ hasPassword: true, providers: [] });
    } finally {
      setCheckingAuthMethods(false);
    }
  };

  const handleLogout = async () => {
    try {
      await firebaseAuthService.signOut();
      navigate('/auth/jobseeker');
    } catch (error) {
      console.error('Logout error:', error);
      setError('Failed to logout. Please try again.');
    }
  };

  const fetchProfile = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is authenticated
      const currentUser = firebaseAuthService.getCurrentUser();
      if (!currentUser) {
        setError('Please sign in to access your profile');
        navigate('/auth');
        return;
      }
      
      // Fetch both jobseeker profile and user profile to get complete data
      const [jobseekerResponse, userResponse] = await Promise.all([
        apiService.get('/jobseekers/profile'),
        apiService.getUserProfile()
      ]);
      
      if (jobseekerResponse.success && jobseekerResponse.data) {
        let profileData = jobseekerResponse.data;
        
        // Merge user data (including profilePicture) with jobseeker data
        if (userResponse.success && userResponse.data) {
          console.log('User response data:', userResponse.data);
          const userData = userResponse.data.user || userResponse.data;
          console.log('Profile picture from user data:', userData.profilePicture);
          profileData = {
            ...profileData,
            profilePicture: userData.profilePicture
          };
        }
        
        // Fetch current resume from the Resume collection
        try {
          const resumeResponse = await apiService.getCurrentResume();
          if (resumeResponse.success && resumeResponse.data) {
            // Add resume URL to profile data
            profileData = {
              ...profileData,
              resumeUrl: resumeResponse.data.fileUrl
            };
            
            // Set original resume data if available
            
            // Set up available resumes
            const resumes: { generated?: { url: string; label: string }; uploaded?: { url: string; label: string } } = {};
            
            if (resumeResponse.data.fileUrl) {
              resumes.generated = {
                url: `http://localhost:3001${resumeResponse.data.fileUrl}`,
                label: 'Generated Resume'
              };
            }
            
            if (resumeResponse.data.uploadedResumeUrl) {
              setOriginalResumeUrl(resumeResponse.data.uploadedResumeUrl);
              setShowOriginalToEmployers(resumeResponse.data.showUploadedToEmployers || false);
              resumes.uploaded = {
                url: resumeResponse.data.uploadedResumeUrl,
                label: 'Original Resume'
              };
            }
            
            setAvailableResumes(resumes);
            
            // Set default active resume type and load preview
            if (resumes.generated) {
              setActiveResumeType('generated');
              switchResume('generated');
            } else if (resumes.uploaded) {
              setActiveResumeType('uploaded');
              switchResume('uploaded');
            }
          }
        } catch (resumeErr) {
          // No resume found in Resume collection
        }
        
        setProfile(profileData);
      } else {
        // If 401 error, redirect to auth
        if (jobseekerResponse.error?.includes('401') || jobseekerResponse.error?.includes('Unauthorized')) {
          setError('Session expired. Please sign in again.');
          navigate('/auth');
          return;
        }
        setError(jobseekerResponse.error || 'Failed to load profile');
      }
    } catch (err: any) {
      console.error('Profile fetch error:', err);
      setError(err.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };


  const handleProfilePictureChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select a valid image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image size must be less than 5MB');
      return;
    }

    try {
      setUploadingPicture(true);
      setError(null);

      const response = await apiService.uploadProfilePicture(file);
      
      if (response.success && response.data) {
        console.log('Upload response:', response.data);
        const cloudUrl = response.data.cloudUrl || response.data.profilePicture;
        console.log('New profile picture cloud URL:', cloudUrl);
        setProfile(prev => prev ? { ...prev, profilePicture: cloudUrl } : null);
        
        // Trigger a custom event to notify other components of the profile update
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
          detail: { profilePicture: cloudUrl }
        }));
        
        setSuccess('Profile picture uploaded to cloud storage successfully!');
      } else {
        setError(response.error || 'Failed to upload profile picture');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleRemoveProfilePicture = async () => {
    try {
      setUploadingPicture(true);
      setError(null);

      const response = await apiService.removeProfilePicture();
      
      if (response.success) {
        setProfile(prev => prev ? { ...prev, profilePicture: undefined } : null);
        
        // Trigger a custom event to notify other components of the profile update
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
          detail: { profilePicture: undefined }
        }));
        
        setSuccess('Profile picture removed successfully!');
      } else {
        setError(response.error || 'Failed to remove profile picture');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to remove profile picture');
    } finally {
      setUploadingPicture(false);
    }
  };

  const handleResumeUpload = async (file: File) => {
    try {
      setUploading(true);
      setError(null);

      const response = await apiService.uploadResume(file);

      if (response.success && response.data) {
        // If resume data was parsed, show edit modal
        if (response.data.resumeData) {
          setParsedResumeData(response.data.resumeData);
          setShowResumeEditModal(true);
          setSuccess('Resume uploaded! Please review the extracted information.');
        } else {
          setSuccess('Resume uploaded successfully!');
        }
        
        // Update profile to reflect new resume
        const updatedProfile = { ...profile, resumeUrl: response.data.fileUrl };
        setProfile(updatedProfile);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to upload resume');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to upload resume');
    } finally {
      setUploading(false);
      setResumeFile(null);
    }
  };

  const handleResumeDelete = async () => {
    try {
      setError(null);
      
      // First get the current resume to get its ID
      const currentResumeResponse = await apiService.getCurrentResume();
      if (!currentResumeResponse.success || !currentResumeResponse.data) {
        setError('No resume found to delete');
        return;
      }
      
      const resumeId = currentResumeResponse.data.id;
      const response = await apiService.deleteResume(resumeId);
      
      if (response.success) {
        setProfile(prev => prev ? { ...prev, resumeUrl: undefined } : null);
        setSuccess('Resume deleted successfully!');
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to delete resume');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete resume');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'application/pdf') {
        setError('Please upload only PDF files.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB.');
        return;
      }
      setResumeFile(file);
      handleResumeUpload(file);
    }
  };

  const handlePasswordUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }
    
    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }
    
    setUpdatingPassword(true);
    setError(null); // Clear any previous errors
    
    try {
      // Update password via Firebase Auth
      const result = await firebaseAuthService.updatePassword(passwordData.currentPassword, passwordData.newPassword);
      
      if (result.success) {
        setSuccess('Password updated successfully');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setShowPasswordForm(false);
        setShowPasswords({ current: false, new: false, confirm: false });
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(result.error || 'Failed to update password');
      }
    } catch (error: any) {
      console.error('Password update error:', error);
      setError(error.message || 'Failed to update password');
    } finally {
      setUpdatingPassword(false);
    }
  };

  const togglePasswordVisibility = (field: 'current' | 'new' | 'confirm') => {
    setShowPasswords(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };

  const handleResumeEditSave = async (editedResumeData: any) => {
    try {
      // Save the edited resume data to backend
      const response = await apiService.post('/jobseekers/resume-data', {
        resumeData: editedResumeData
      });
      
      if (response.success) {
        setShowResumeEditModal(false);
        setSuccess('Resume data saved successfully!');
        setParsedResumeData(editedResumeData);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        throw new Error(response.error || 'Failed to save resume data');
      }
    } catch (error: any) {
      console.error('Failed to save resume data:', error);
      setError(error.message || 'Failed to save resume data. Please try again.');
    }
  };

  const handleResumeEditClose = () => {
    setShowResumeEditModal(false);
    // Keep the original parsed data if user cancels
  };

  const switchResume = async (type: 'generated' | 'uploaded') => {
    try {
      if (type === 'generated' && availableResumes.generated) {
        try {
          const pdfResponse = await fetch(availableResumes.generated.url, { mode: 'cors' });
          if (pdfResponse.ok) {
            const arrayBuffer = await pdfResponse.arrayBuffer();
            const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(pdfBlob);
            setResumePreviewUrl(blobUrl);
          } else {
            setResumePreviewUrl(availableResumes.generated.url);
          }
        } catch (fetchError) {
          setResumePreviewUrl(availableResumes.generated.url);
        }
        setActiveResumeType('generated');
      } else if (type === 'uploaded' && availableResumes.uploaded) {
        try {
          const pdfResponse = await fetch(availableResumes.uploaded.url, { mode: 'cors' });
          if (pdfResponse.ok) {
            const arrayBuffer = await pdfResponse.arrayBuffer();
            const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
            const blobUrl = URL.createObjectURL(pdfBlob);
            setResumePreviewUrl(blobUrl);
          } else {
            setResumePreviewUrl(availableResumes.uploaded.url);
          }
        } catch (fetchError) {
          setResumePreviewUrl(availableResumes.uploaded.url);
        }
        setActiveResumeType('uploaded');
      }
    } catch (error) {
      console.error('Error switching resume:', error);
    }
  };

  const handleOriginalResumeVisibilityToggle = async (showToEmployers: boolean) => {
    try {
      setError(null);
      
      const response = await apiService.put('/resumes/original-visibility', {
        showUploadedToEmployers: showToEmployers
      });
      
      if (response.success) {
        setShowOriginalToEmployers(showToEmployers);
        setSuccess(`Original resume ${showToEmployers ? 'will be shown' : 'will be hidden'} to employers`);
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.error || 'Failed to update resume visibility');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update resume visibility');
    }
  };

  if (loading) {
    return (
      <div className={styles.settingsTab}>
        <div className={styles.loading}>
          <div className={styles.spinner}></div>
          <p>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (error && !loading) {
    return (
      <div className={styles.settingsTab}>
        <div className={styles.error}>
          <FiX className={styles.messageIcon} />
          <p>{error}</p>
          <button onClick={fetchProfile} className={styles.retryButton}>
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!profile && !loading) {
    return (
      <div className={styles.settingsTab}>
        <div className={styles.error}>
          <FiX className={styles.messageIcon} />
          <p>No profile data available. Please try refreshing the page.</p>
          <button onClick={fetchProfile} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.settingsTab}>
      {error && (
        <div className={styles.errorMessage}>
          <FiX className={styles.messageIcon} />
          {error}
          <button onClick={() => setError(null)} className={styles.closeButton}>
            <FiX />
          </button>
        </div>
      )}

      {success && (
        <div className={styles.successMessage}>
          <FiSave className={styles.messageIcon} />
          {success}
        </div>
      )}

      <div className={styles.settingsContent}>
        <div className={styles.settingsNav}>
          <button
            className={`${styles.navButton} ${activeSection === 'profile' ? styles.active : ''}`}
            onClick={() => setActiveSection('profile')}
          >
            <FiUser />
            Profile & Account Management
          </button>
          <button
            className={`${styles.navButton} ${activeSection === 'resume' ? styles.active : ''}`}
            onClick={() => setActiveSection('resume')}
          >
            <FiFileText />
            Resume & Documents
          </button>
          <button
            className={`${styles.navButton} ${activeSection === 'privacy' ? styles.active : ''}`}
            onClick={() => setActiveSection('privacy')}
          >
            <FiBell />
            Notifications
          </button>
          
          <div className={styles.navDivider}></div>
          
          <button
            className={`${styles.navButton} ${styles.signOutNavButton}`}
            onClick={handleLogout}
          >
            <FiLogOut />
            Sign Out
          </button>
        </div>

        <div className={styles.settingsMain}>
          {activeSection === 'profile' && (
            <div className={styles.profileSection}>
              <div className={styles.sectionHeader}>
                <h2>Profile Information</h2>
                <div className={styles.profileCompletion}>
                  <span>Profile Completion: {profile.completionPercentage || 0}%</span>
                  <div className={styles.progressBar}>
                    <div 
                      className={styles.progressFill}
                      style={{ width: `${profile.completionPercentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>

              <div className={styles.profileForm}>
                {/* Profile Picture Section */}
                <div className={styles.profilePictureSection}>
                  <h3>Profile Picture</h3>
                  <div className={styles.profilePictureUpload}>
                    <div className={styles.currentPicture}>
                      {profile.profilePicture ? (
                        <img 
                          src={getImageSrc(profile.profilePicture)} 
                          alt="Profile" 
                          style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                        />
                      ) : (
                        <FiUser className={styles.defaultAvatar} />
                      )}
                    </div>
                    <div className={styles.pictureActions}>
                      <label className={styles.uploadPictureButton}>
                        <FiUpload />
                        {profile.profilePicture ? 'Change Photo' : 'Upload Photo'}
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleProfilePictureChange}
                          style={{ display: 'none' }}
                          disabled={uploadingPicture}
                        />
                      </label>
                      {profile.profilePicture && (
                        <button 
                          onClick={handleRemoveProfilePicture}
                          className={styles.removePictureButton}
                          disabled={uploadingPicture}
                        >
                          <FiTrash2 />
                          Remove
                        </button>
                      )}
                    </div>
                  </div>
                  {uploadingPicture && (
                    <div className={styles.uploadProgress}>
                      <div className={styles.spinner}></div>
                      <span>Uploading photo...</span>
                    </div>
                  )}
                </div>

                {/* Basic Information - Only show essential fields */}
                <div className={styles.basicInfoSection}>
                  <h3>Basic Information</h3>
                  <p className={styles.sectionNote}>This information is from your registration and cannot be changed here.</p>
                  
                  <div className={styles.formRow}>
                    <div className={styles.formGroup}>
                      <label>First Name</label>
                      <div className={styles.displayValue}>
                        <FiUser className={styles.fieldIcon} />
                        {profile.firstName || 'Not specified'}
                      </div>
                    </div>
                    <div className={styles.formGroup}>
                      <label>Last Name</label>
                      <div className={styles.displayValue}>
                        <FiUser className={styles.fieldIcon} />
                        {profile.lastName || 'Not specified'}
                      </div>
                    </div>
                  </div>

                </div>

                {/* Account Management Section */}
                <div className={styles.accountInfo}>
                  <h3>Account Information</h3>
                  <div className={styles.accountGrid}>
                    <div className={styles.accountCard}>
                      <div className={styles.cardHeader}>
                        <FiMail className={styles.cardIcon} />
                        <h4>Email Address</h4>
                      </div>
                      <p className={styles.cardValue}>{profile?.email}</p>
                    </div>
                    
                    <div className={styles.accountCard}>
                      <div className={styles.cardHeader}>
                        <FiUser className={styles.cardIcon} />
                        <h4>Account Status</h4>
                      </div>
                      <div className={styles.statusBadge}>
                        <FiCheck className={styles.statusIcon} />
                        <span>Active</span>
                      </div>
                    </div>
                    
                    <div className={styles.accountCard}>
                      <div className={styles.cardHeader}>
                        <FiSettings className={styles.cardIcon} />
                        <h4>Member Since</h4>
                      </div>
                      <p className={styles.cardValue}>
                        {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Password & Security Section */}
                <div className={styles.passwordSection}>
                  <div className={styles.passwordHeader}>
                    <h3>Password & Security</h3>
                    {checkingAuthMethods ? (
                      <div className={styles.loadingText}>Checking account type...</div>
                    ) : !userAuthMethods.hasPassword ? (
                      <div className={styles.googleAuthInfo}>
                        <div className={styles.infoCard}>
                          <FiSettings className={styles.infoIcon} />
                          <div>
                            <h4>Google Account</h4>
                            <p>Your account uses Google sign-in. To change your password, please visit your Google Account settings.</p>
                            <a 
                              href="https://myaccount.google.com/security" 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className={styles.googleLink}
                            >
                              Manage Google Account →
                            </a>
                          </div>
                        </div>
                      </div>
                    ) : !showPasswordForm ? (
                      <button 
                        className={styles.changePasswordButton}
                        onClick={() => setShowPasswordForm(true)}
                      >
                        <FiEdit2 />
                        Change Password
                      </button>
                    ) : null}
                  </div>
                  
                  {showPasswordForm && userAuthMethods.hasPassword && (
                    <form onSubmit={handlePasswordUpdate} className={styles.passwordForm}>
                      <div className={styles.formGroup}>
                        <label>Current Password</label>
                        <div className={styles.passwordInputWrapper}>
                          <input
                            type={showPasswords.current ? "text" : "password"}
                            value={passwordData.currentPassword}
                            onChange={(e) => setPasswordData({...passwordData, currentPassword: e.target.value})}
                            className={styles.passwordInput}
                            placeholder="Enter your current password"
                            required
                          />
                          <button
                            type="button"
                            className={styles.passwordToggle}
                            onClick={() => togglePasswordVisibility('current')}
                          >
                            {showPasswords.current ? <FiEye /> : <FiEye style={{opacity: 0.5}} />}
                          </button>
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>New Password</label>
                        <div className={styles.passwordInputWrapper}>
                          <input
                            type={showPasswords.new ? "text" : "password"}
                            value={passwordData.newPassword}
                            onChange={(e) => setPasswordData({...passwordData, newPassword: e.target.value})}
                            className={styles.passwordInput}
                            placeholder="Enter your new password"
                            required
                          />
                          <button
                            type="button"
                            className={styles.passwordToggle}
                            onClick={() => togglePasswordVisibility('new')}
                          >
                            {showPasswords.new ? <FiEye /> : <FiEye style={{opacity: 0.5}} />}
                          </button>
                        </div>
                      </div>
                      <div className={styles.formGroup}>
                        <label>Confirm New Password</label>
                        <div className={styles.passwordInputWrapper}>
                          <input
                            type={showPasswords.confirm ? "text" : "password"}
                            value={passwordData.confirmPassword}
                            onChange={(e) => setPasswordData({...passwordData, confirmPassword: e.target.value})}
                            className={styles.passwordInput}
                            placeholder="Confirm your new password"
                            required
                          />
                          <button
                            type="button"
                            className={styles.passwordToggle}
                            onClick={() => togglePasswordVisibility('confirm')}
                          >
                            {showPasswords.confirm ? <FiEye /> : <FiEye style={{opacity: 0.5}} />}
                          </button>
                        </div>
                      </div>
                      <div className={styles.passwordFormActions}>
                        <button 
                          type="button"
                          className={styles.cancelPasswordButton}
                          onClick={() => {
                            setShowPasswordForm(false);
                            setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                            setShowPasswords({ current: false, new: false, confirm: false });
                          }}
                        >
                          <FiX />
                          Cancel
                        </button>
                        <button 
                          type="submit"
                          className={styles.updatePasswordButton}
                          disabled={updatingPassword}
                        >
                          <FiSave />
                          {updatingPassword ? 'Updating...' : 'Update Password'}
                        </button>
                      </div>
                    </form>
                  )}
                </div>

                {/* Danger Zone */}
                <div className={styles.dangerZone}>
                  <h3>Danger Zone</h3>
                  <div className={styles.dangerActions}>
                    <div className={styles.dangerCard}>
                      <div className={styles.dangerInfo}>
                        <div className={styles.dangerHeader}>
                          <FiEye className={styles.dangerIcon} />
                          <h4>Deactivate Account</h4>
                        </div>
                        <p>Temporarily deactivate your account. You can reactivate it anytime by signing in.</p>
                      </div>
                      <button className={styles.deactivateButton}>
                        <FiEye />
                        Deactivate
                      </button>
                    </div>
                    
                    <div className={styles.dangerCard}>
                      <div className={styles.dangerInfo}>
                        <div className={styles.dangerHeader}>
                          <FiTrash2 className={styles.dangerIcon} />
                          <h4>Delete Account</h4>
                        </div>
                        <p>Permanently delete your account and all associated data. This action cannot be undone.</p>
                      </div>
                      <button className={styles.deleteButton}>
                        <FiTrash2 />
                        Delete Account
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'resume' && (
            <div className={styles.resumeSection}>
              <div className={styles.sectionHeader} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <h2>Resume & Documents</h2>
                {profile.resumeUrl && (
                  <button 
                    onClick={() => onNavigate?.('create-resume')}
                    className={styles.editButton}
                  >
                    <FiEdit2 />
                    Edit Resume
                  </button>
                )}
              </div>

              {/* Create Resume Button (only when no resume exists) */}
              {!profile.resumeUrl && (
                <div style={{ marginBottom: '20px', textAlign: 'center' }}>
                  <button 
                    onClick={() => onNavigate?.('create-resume')}
                    className={styles.createResumeButton}
                  >
                    <FiEdit2 />
                    Create Resume
                  </button>
                </div>
              )}

              {/* Resume Tabs */}
              {(availableResumes.generated || availableResumes.uploaded) && (
                <div style={{
                  display: 'flex',
                  gap: '12px',
                  padding: '16px 0',
                  borderBottom: '2px solid #e5e7eb',
                  marginBottom: '24px',
                  backgroundColor: '#f8fafc',
                  borderRadius: '8px 8px 0 0',
                  paddingLeft: '16px',
                  paddingRight: '16px'
                }}>
                  {availableResumes.generated && (
                    <button
                      onClick={() => switchResume('generated')}
                      style={{
                        padding: '12px 24px',
                        border: activeResumeType === 'generated' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: activeResumeType === 'generated' ? '#3b82f6' : 'white',
                        color: activeResumeType === 'generated' ? 'white' : '#374151',
                        fontSize: '15px',
                        fontWeight: activeResumeType === 'generated' ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: activeResumeType === 'generated' 
                          ? '0 4px 12px rgba(59, 130, 246, 0.4)' 
                          : '0 2px 4px rgba(0,0,0,0.1)',
                        transform: activeResumeType === 'generated' ? 'translateY(-1px)' : 'translateY(0)',
                        minWidth: '140px'
                      }}
                      onMouseEnter={(e) => {
                        if (activeResumeType !== 'generated') {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeResumeType !== 'generated') {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {availableResumes.generated.label}
                    </button>
                  )}
                  {availableResumes.uploaded && (
                    <button
                      onClick={() => switchResume('uploaded')}
                      style={{
                        padding: '12px 24px',
                        border: activeResumeType === 'uploaded' ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                        borderRadius: '8px',
                        backgroundColor: activeResumeType === 'uploaded' ? '#3b82f6' : 'white',
                        color: activeResumeType === 'uploaded' ? 'white' : '#374151',
                        fontSize: '15px',
                        fontWeight: activeResumeType === 'uploaded' ? '600' : '500',
                        cursor: 'pointer',
                        transition: 'all 0.3s ease',
                        boxShadow: activeResumeType === 'uploaded' 
                          ? '0 4px 12px rgba(59, 130, 246, 0.4)' 
                          : '0 2px 4px rgba(0,0,0,0.1)',
                        transform: activeResumeType === 'uploaded' ? 'translateY(-1px)' : 'translateY(0)',
                        minWidth: '140px'
                      }}
                      onMouseEnter={(e) => {
                        if (activeResumeType !== 'uploaded') {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#3b82f6';
                          e.currentTarget.style.transform = 'translateY(-1px)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeResumeType !== 'uploaded') {
                          e.currentTarget.style.backgroundColor = 'white';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                          e.currentTarget.style.transform = 'translateY(0)';
                        }
                      }}
                    >
                      {availableResumes.uploaded.label}
                    </button>
                  )}
                </div>
              )}

              {/* Original Resume Visibility Control */}
              {originalResumeUrl && activeResumeType === 'uploaded' && (
                <div className={styles.visibilityCard} style={{ marginBottom: '20px' }}>
                  <div className={styles.visibilityInfo} style={{ marginBottom: '16px' }}>
                    <div className={styles.visibilityHeader}>
                      <FiSettings className={styles.visibilityIcon} />
                      <h3>Original Resume Visibility</h3>
                    </div>
                    <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: '#6b7280' }}>
                      Control whether employers can see your original uploaded resume.
                    </p>
                  </div>
                  
                  <div className={styles.visibilityToggle} style={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'flex-start',
                    gap: '12px'
                  }}>
                    <label className={styles.toggle}>
                      <input
                        type="checkbox"
                        checked={showOriginalToEmployers}
                        onChange={(e) => handleOriginalResumeVisibilityToggle(e.target.checked)}
                      />
                      <span className={styles.slider}></span>
                    </label>
                    <span className={styles.toggleLabel} style={{ 
                      fontWeight: '500',
                      fontSize: '14px',
                      color: showOriginalToEmployers ? '#059669' : '#6b7280',
                      flex: '1'
                    }}>
                      {showOriginalToEmployers ? 'Visible to employers' : 'Hidden from employers'}
                    </span>
                  </div>
                </div>
              )}

              {/* PDF Preview */}
              {resumePreviewUrl && (
                <div className={styles.pdfPreviewSection} style={{ position: 'relative' }}>
                  <iframe
                    src={resumePreviewUrl}
                    width="100%"
                    height="800px"
                    style={{ border: '1px solid #e5e7eb', borderRadius: '8px' }}
                    title="Resume Preview"
                  />
                  {/* Open in New Tab button */}
                  <div style={{
                    position: 'absolute',
                    top: '100px',
                    right: '16px',
                    zIndex: 10
                  }}>
                    <button
                      onClick={async () => {
                        const url = activeResumeType === 'generated' 
                          ? availableResumes.generated?.url 
                          : availableResumes.uploaded?.url;
                        if (url) {
                          try {
                            // Fetch as blob and open in new tab
                            const response = await fetch(url, { mode: 'cors' });
                            const blob = await response.blob();
                            const blobUrl = URL.createObjectURL(new Blob([blob], { type: 'application/pdf' }));
                            window.open(blobUrl, '_blank');
                          } catch (error) {
                            console.error('Error opening in new tab:', error);
                            // Fallback to direct URL
                            window.open(url, '_blank');
                          }
                        }
                      }}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: 'rgba(255, 255, 255, 0.95)',
                        color: '#374151',
                        border: '1px solid #e5e7eb',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: '500',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <FiEye size={14} />
                      Open in New Tab
                    </button>
                  </div>
                </div>
              )}

              {uploading && (
                <div className={styles.uploadProgress}>
                  <div className={styles.spinner}></div>
                  <p>Uploading resume...</p>
                </div>
              )}
            </div>
          )}

          {activeSection === 'privacy' && (
            <div className={styles.privacySection}>
              <div className={styles.sectionHeader}>
                <h2>Notifications</h2>
                <p className={styles.sectionDescription}>Manage your notification preferences</p>
              </div>

              <div className={styles.preferencesContent}>
                {/* Job Alerts & Notifications */}
                <div className={styles.preferenceGroup}>
                  <div className={styles.groupHeader}>
                    <FiBell className={styles.groupIcon} />
                    <h3>Job Alerts & Notifications</h3>
                  </div>
                  
                  <div className={styles.alertsGrid}>
                    <div className={styles.alertCard}>
                      <div className={styles.alertInfo}>
                        <h4 className={styles.alertTitle}>Job Match Alerts</h4>
                        <p className={styles.alertDescription}>Get notified when jobs match your skills and preferences</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notifications.jobMatches}
                          onChange={(e) => setNotifications({...notifications, jobMatches: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <div className={styles.alertCard}>
                      <div className={styles.alertInfo}>
                        <h4 className={styles.alertTitle}>Application Updates</h4>
                        <p className={styles.alertDescription}>Receive updates on your job applications</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notifications.applicationUpdates}
                          onChange={(e) => setNotifications({...notifications, applicationUpdates: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <div className={styles.alertCard}>
                      <div className={styles.alertInfo}>
                        <h4 className={styles.alertTitle}>Email Notifications</h4>
                        <p className={styles.alertDescription}>Receive job alerts via email</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notifications.emailAlerts}
                          onChange={(e) => setNotifications({...notifications, emailAlerts: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <div className={styles.alertCard}>
                      <div className={styles.alertInfo}>
                        <h4 className={styles.alertTitle}>SMS Alerts</h4>
                        <p className={styles.alertDescription}>Get urgent job notifications via SMS</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notifications.smsAlerts}
                          onChange={(e) => setNotifications({...notifications, smsAlerts: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>

                    <div className={styles.alertCard}>
                      <div className={styles.alertInfo}>
                        <h4 className={styles.alertTitle}>In-App Notifications</h4>
                        <p className={styles.alertDescription}>Show notifications within the app</p>
                      </div>
                      <label className={styles.toggle}>
                        <input
                          type="checkbox"
                          checked={notifications.inAppAlerts}
                          onChange={(e) => setNotifications({...notifications, inAppAlerts: e.target.checked})}
                        />
                        <span className={styles.slider}></span>
                      </label>
                    </div>
                  </div>
                </div>

                {/* Save functionality is handled by the main save button in the header */}
              </div>
            </div>
          )}
        </div>
      </div>

      {showResumeEditModal && parsedResumeData && (
        <ResumeEditModal
          isOpen={showResumeEditModal}
          onClose={handleResumeEditClose}
          onSave={handleResumeEditSave}
          initialData={parsedResumeData}
          fileName={resumeFile?.name || 'resume.pdf'}
        />
      )}
    </div>
  );
};

export default SettingsTab;
