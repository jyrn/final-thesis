import React, { useState, useEffect } from 'react';
import { 
  FiX, 
  FiUser, 
  FiMail, 
  FiPhone, 
  FiMapPin, 
  FiCalendar, 
  FiClock, 
  FiEye, 
  FiDownload, 
  FiFileText, 
  FiCheck, 
  FiArrowLeft
} from 'react-icons/fi';
import { Applicant } from '../../../types/dashboard';
import { auth } from '../../../config/firebase';
import styles from './ApplicantDetailsModal.module.css';

interface ApplicationData {
  _id: string;
  jobTitle: string;
  applicant: {
    name: string;
    email: string;
    phone: string;
    address: string;
  };
  resumeData: {
    personalInfo: {
      firstName: string;
      lastName: string;
      name: string;
      email: string;
      phone: string;
      address: string;
      photo?: string;
    };
    summary: string;
    skills: string[];
    experience: Array<{
      company: string;
      position: string;
      duration: string;
      description: string;
    }>;
    education: {
      tertiary?: {
        institution?: string;
        degree?: string;
        year?: string;
      };
      secondary?: {
        institution?: string;
        degree?: string;
        year?: string;
      };
      primary?: {
        institution?: string;
        degree?: string;
        year?: string;
      };
    };
  };
  status: string;
  appliedDate: string;
  coverLetter: string;
  notes: string;
  resumeFile?: {
    fileName: string;
    filePath: string;
    fileSize: number;
    uploadDate: string;
  };
}

interface ApplicantDetailsModalProps {
  applicant: Applicant;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (applicantId: string) => void;
  onReject: (applicantId: string) => void;
  onViewResume: (applicantId: string) => void;
  onDownloadResume: (applicantId: string) => void;
}

export const ApplicantDetailsModal: React.FC<ApplicantDetailsModalProps> = ({
  applicant,
  isOpen,
  onClose,
  onApprove,
  onReject,
  onViewResume,
  onDownloadResume,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'resume' | 'notes'>('resume');
  const [notes, setNotes] = useState('');
  const [applicationData, setApplicationData] = useState<ApplicationData | null>(null);
  const [isLoadingApplication, setIsLoadingApplication] = useState(false);
  const [resumePreviewUrl, setResumePreviewUrl] = useState<string | null>(null);
  const [isFullScreenPreview, setIsFullScreenPreview] = useState(false);
  const [availableResumes, setAvailableResumes] = useState<{
    generated?: { url: string; label: string };
    uploaded?: { url: string; label: string };
  }>({});
  const [activeResumeType, setActiveResumeType] = useState<'generated' | 'uploaded'>('generated');
  const [isLoadingResume, setIsLoadingResume] = useState(false);

  // Fetch detailed application data when modal opens
  useEffect(() => {
    if (isOpen && applicant.id) {
      fetchApplicationDetails();
    }
  }, [isOpen, applicant.id]);

  // Auto-load resume preview when application data is available
  useEffect(() => {
    if (applicationData?._id && !resumePreviewUrl) {
      handleViewResume();
    }
  }, [applicationData]);

  const fetchApplicationDetails = async () => {
    try {
      setIsLoadingApplication(true);
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch('http://localhost:3001/api/applications/employer', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Try to find by applicant ID first, then by application ID
        let application = data.data.find((app: any) => app.applicant?.id === applicant.id);
        if (!application) {
          application = data.data.find((app: any) => app._id === applicant.id);
        }
        
        
        if (application) {
          setApplicationData(application);
          setNotes(application.notes || '');
        } else {
          console.error('No application found for applicant:', applicant.id);
        }
      }
    } catch (error) {
      console.error('Error fetching application details:', error);
    } finally {
      setIsLoadingApplication(false);
    }
  };

  const handleViewResume = async () => {
    if (!applicationData?._id) return;
    
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:3001/api/resumes/view/${applicationData._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if cloud URLs are available (multiple resumes)
        if (data.success && data.useCloudUrl && data.resumes) {
          setAvailableResumes(data.resumes);
          
          // Set initial resume to view (prefer generated, fallback to uploaded)
          if (data.resumes.generated) {
            try {
              // Try to fetch as blob first (to avoid download headers)
              const pdfResponse = await fetch(data.resumes.generated.url, { mode: 'cors' });
              if (pdfResponse.ok) {
                const arrayBuffer = await pdfResponse.arrayBuffer();
                // Create a new blob with explicit PDF mime type for inline viewing
                const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(pdfBlob);
                setResumePreviewUrl(blobUrl);
              } else {
                setResumePreviewUrl(data.resumes.generated.url);
              }
            } catch (fetchError) {
              setResumePreviewUrl(data.resumes.generated.url);
            }
            setActiveResumeType('generated');
          } else if (data.resumes.uploaded) {
            try {
              // Try to fetch as blob first (to avoid download headers)
              const pdfResponse = await fetch(data.resumes.uploaded.url, { mode: 'cors' });
              if (pdfResponse.ok) {
                const arrayBuffer = await pdfResponse.arrayBuffer();
                // Create a new blob with explicit PDF mime type for inline viewing
                const pdfBlob = new Blob([arrayBuffer], { type: 'application/pdf' });
                const blobUrl = URL.createObjectURL(pdfBlob);
                setResumePreviewUrl(blobUrl);
              } else {
                setResumePreviewUrl(data.resumes.uploaded.url);
              }
            } catch (fetchError) {
              setResumePreviewUrl(data.resumes.uploaded.url);
            }
            setActiveResumeType('uploaded');
          }
          
          setIsFullScreenPreview(true);
        } else if (data.success && data.generatePDF) {
          // Fallback: Generate PDF using the same logic as CreateResumeTab
          const { generateResumePDF } = await import('../../../utils/pdfGenerator');
          const pdfBlob = generateResumePDF(data.resumeData, undefined, true) as Blob;
          
          if (pdfBlob && pdfBlob.size > 0) {
            const url = URL.createObjectURL(pdfBlob);
            setResumePreviewUrl(url);
            setIsFullScreenPreview(true);
          }
        }
      } else {
        try {
          const errorData = await response.json();
          if (errorData.error === 'Resume visibility restricted by job seeker') {
            alert('This job seeker has restricted resume visibility.');
          }
        } catch (parseError) {
          // Ignore parse errors
        }
      }
    } catch (error) {
      console.error('Error fetching resume:', error);
    }
  };

  const handleBackToDetails = () => {
    setIsFullScreenPreview(false);
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
      // Ignore errors
    }
  };

  const handleDownloadResume = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser || !applicationData?._id) return;

      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:3001/api/resumes/download/${applicationData._id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        
        // Check if cloud URLs are available for direct download
        if (data.success && data.useCloudUrl && data.resumes) {
          console.log('✅ Downloading from cloud:', data.resumes);
          
          // Download both resumes if available
          if (data.resumes.generated) {
            const fileName = `${data.applicantName.replace(/[^a-zA-Z0-9]/g, '_')}_Generated_Resume.pdf`;
            const link = document.createElement('a');
            link.href = data.resumes.generated.url;
            link.download = fileName;
            link.target = '_blank';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }
          
          if (data.resumes.uploaded) {
            // Small delay to avoid browser blocking multiple downloads
            setTimeout(() => {
              const fileName = `${data.applicantName.replace(/[^a-zA-Z0-9]/g, '_')}_Original_Resume.pdf`;
              const link = document.createElement('a');
              link.href = data.resumes.uploaded.url;
              link.download = fileName;
              link.target = '_blank';
              document.body.appendChild(link);
              link.click();
              document.body.removeChild(link);
            }, 500);
          }
        } else if (data.success && data.downloadPDF) {
          // Fallback: Generate PDF using the same logic as CreateResumeTab
          const { generateResumePDF } = await import('../../../utils/pdfGenerator');
          const fileName = `${data.applicantName.replace(/[^a-zA-Z0-9]/g, '_')}_Resume.pdf`;
          generateResumePDF(data.resumeData, fileName, false);
        } else {
          alert(data.error || 'Invalid response format');
        }
      } else {
        try {
          const errorData = await response.json();
          if (errorData.error === 'Resume visibility restricted by job seeker') {
            alert('This job seeker has restricted resume visibility.');
          } else {
            alert(errorData.error || errorData.message || 'Resume not found or unable to download');
          }
        } catch (parseError) {
          alert('Error downloading resume');
        }
      }
    } catch (error) {
      alert('Error downloading resume');
    }
  };

  const saveNotes = async () => {
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) return;

      const token = await currentUser.getIdToken();
      const response = await fetch(`http://localhost:3001/api/applications/${applicant.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: applicant.status,
          notes: notes
        })
      });

      if (response.ok) {
        alert('Notes saved successfully');
      } else {
        alert('Failed to save notes');
      }
    } catch (error) {
      console.error('Error saving notes:', error);
      alert('Error saving notes');
    }
  };

  if (!isOpen) return null;

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'hired': return '#10b981';
      case 'interview': return '#3b82f6';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Remove full screen preview logic since modal now shows PDF directly

  return (
    <div className={`${styles.modalOverlay} ${isOpen ? styles.open : ''}`}>
      <div className={styles.modalContent}>
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <div className={styles.applicantInfo}>
            <h2>{applicant.name} - Resume</h2>
          </div>
          <div className={styles.headerActions}>
            <button 
              className={styles.downloadResumeButton}
              onClick={handleDownloadResume}
              disabled={!applicationData?._id}
              title="Download Resume"
            >
              <FiDownload size={20} />
              <span>Download</span>
            </button>
            <button className={styles.closeButton} onClick={onClose}>
              <FiX size={24} />
            </button>
          </div>
        </div>

        {/* Resume Tabs (if multiple resumes available) */}
        {(availableResumes.generated || availableResumes.uploaded) && (
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px 20px',
            borderBottom: '2px solid #e5e7eb',
            backgroundColor: '#f8fafc',
            borderRadius: '8px 8px 0 0'
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

        {/* PDF Resume Content */}
        <div className={styles.pdfContent} style={{ position: 'relative' }}>
          {resumePreviewUrl ? (
            <>
              <iframe
                src={resumePreviewUrl}
                width="100%"
                height="100%"
                style={{ border: 'none', minHeight: '800px' }}
                title="Resume Preview"
                onLoad={() => console.log('✅ Resume PDF loaded successfully')}
                onError={(e) => console.error('❌ Resume PDF failed to load:', e)}
              />
              {/* Fallback button if iframe doesn't work */}
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
            </>
          ) : (
            <div className={styles.loadingPlaceholder}>
              <div className={styles.loadingContent}>
                <FiFileText size={64} />
                <h3>Loading Resume...</h3>
                <p>Please wait while we load {applicant.name}'s resume</p>
              </div>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className={styles.modalActions}>
          {applicant.status === 'pending' ? (
            <>
              <button 
                className={`${styles.primaryActionButton} ${styles.rejectButton}`}
                onClick={() => onReject(applicant.id)}
              >
                <FiX size={20} />
                <span>Reject Application</span>
              </button>
              <button 
                className={`${styles.primaryActionButton} ${styles.approveButton}`}
                onClick={() => onApprove(applicant.id)}
              >
                <FiCheck size={20} />
                <span>Move to Interview</span>
              </button>
            </>
          ) : (
            <div className={styles.statusDisplay}>
              <div className={`${styles.statusBadge} ${styles[applicant.status]}`}>
                {applicant.status === 'interview' && <FiCheck size={16} />}
                {applicant.status === 'rejected' && <FiX size={16} />}
                {applicant.status === 'hired' && <FiCheck size={16} />}
                <span className={styles.statusText}>
                  {applicant.status === 'interview' ? 'Moved to Interview' :
                   applicant.status === 'rejected' ? 'Application Rejected' :
                   applicant.status === 'hired' ? 'Hired' :
                   applicant.status.charAt(0).toUpperCase() + applicant.status.slice(1)}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
