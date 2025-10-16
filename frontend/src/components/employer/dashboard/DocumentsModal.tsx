import React, { useState, useEffect } from 'react';
import { FiX, FiUpload, FiFileText, FiCheck, FiAlertCircle, FiBriefcase } from 'react-icons/fi';
import styles from './SettingsModal.module.css';

interface DocumentsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: DocumentsData) => void;
}

interface DocumentsData {
  companyProfile: File | null;
  businessPermit: File | null;
  philjobnetRegistration: File | null;
  doleNoPendingCase: File | null;
}

interface ExistingDocument {
  name: string;
  uploadDate: string;
  size: string;
  url: string;
  verificationStatus?: string;
}

interface BackendDocument {
  documentType: string;
  documentName: string;
  documentUrl?: string; // Legacy field
  cloudUrl?: string; // New cloud storage URL
  uploadedAt: string;
  verificationStatus?: string;
}

export const DocumentsModal: React.FC<DocumentsModalProps> = ({
  isOpen,
  onClose,
  onSave
}) => {
  const [documents, setDocuments] = useState<DocumentsData>({
    companyProfile: null,
    businessPermit: null,
    philjobnetRegistration: null,
    doleNoPendingCase: null
  });

  const [uploadStatus, setUploadStatus] = useState<{[key: string]: 'idle' | 'uploading' | 'success' | 'error'}>({});
  const [existingDocuments, setExistingDocuments] = useState<{[key: string]: ExistingDocument}>({});
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false);
  const [errorMessages, setErrorMessages] = useState<{[key: string]: string}>({});
  const [previewDocument, setPreviewDocument] = useState<{type: string, url: string, name: string} | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // Load existing documents from backend
  useEffect(() => {
    if (isOpen) {
      loadExistingDocuments();
    }
  }, [isOpen]);

  const loadExistingDocuments = async () => {
    setIsLoadingDocuments(true);
    try {
      const { auth } = require('../../../config/firebase');
      const user = auth.currentUser;
      
      if (user) {
        const token = await user.getIdToken();
        const response = await fetch('https://skillsync-backend-gwwo.onrender.com/api/employers/profile', {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (response.ok) {
          const data = await response.json();
          const employer = data.data;
          
          // Convert backend documents to frontend format
          const documentsMap: {[key: string]: ExistingDocument} = {};
          
          if (employer.documents && employer.documents.length > 0) {
            employer.documents.forEach((doc: BackendDocument) => {
              documentsMap[doc.documentType] = {
                name: doc.documentName,
                uploadDate: doc.uploadedAt,
                size: 'Unknown', // Backend doesn't store file size
                url: doc.cloudUrl || `https://skillsync-backend-gwwo.onrender.com/${doc.documentUrl}`,
                verificationStatus: doc.verificationStatus || employer.documentVerificationStatus
              };
            });
          }
          
          setExistingDocuments(documentsMap);
        }
      }
    } catch (error) {    } finally {
      setIsLoadingDocuments(false);
    }
  };

  const documentTypes = [
    {
      key: 'companyProfile',
      label: 'Company Profile',
      description: 'Comprehensive company profile including business overview and operations',
      required: true
    },
    {
      key: 'businessPermit',
      label: 'Business Permit',
      description: 'Valid business permit from your local government unit',
      required: true
    },
    {
      key: 'philjobnetRegistration',
      label: 'PhilJobNet Registration',
      description: 'Official registration certificate from PhilJobNet (DOLE online job portal)',
      required: true
    },
    {
      key: 'doleNoPendingCase',
      label: 'DOLE No Pending Case Certificate',
      description: 'Certificate from Department of Labor and Employment confirming no pending labor cases',
      required: true
    }
  ];

  const handleFileUpload = async (key: string, file: File) => {
    setUploadStatus(prev => ({ ...prev, [key]: 'uploading' }));
    
    try {
      // Create FormData for individual document upload
      const formData = new FormData();
      formData.append(key, file);
      
      // Get Firebase auth token
      const { auth } = require('../../../config/firebase');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();
      
      // Upload single document to cloud storage
      const response = await fetch('https://skillsync-backend-gwwo.onrender.com/api/employers/upload-single-document', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      
      const result = await response.json();
      
      if (result.success) {
        setUploadStatus(prev => ({ ...prev, [key]: 'success' }));
        setErrorMessages(prev => ({ ...prev, [key]: '' })); // Clear error message
        
        // Update existing documents list with the uploaded document
        setExistingDocuments(prev => ({
          ...prev,
          [key]: {
            name: file.name,
            uploadDate: new Date().toISOString(),
            size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            url: result.data.cloudUrl,
            verificationStatus: 'pending'
          }
        }));
        
        // Clear the temporary documents state so it shows the existing document
        setDocuments(prev => ({ ...prev, [key]: null }));
        
        // Show success message
        setSuccessMessage(`${file.name} uploaded successfully! Your document has been saved to the cloud.`);
        setShowSuccessModal(true);
        
        // Auto-close success modal after 3 seconds
        setTimeout(() => {
          setShowSuccessModal(false);
          setSuccessMessage('');
        }, 3000);
      } else {
        throw new Error(result.message || 'Upload failed');
      }
    } catch (error) {      setUploadStatus(prev => ({ ...prev, [key]: 'error' }));
      setErrorMessages(prev => ({ ...prev, [key]: error instanceof Error ? error.message : 'Upload failed. Please try again.' }));
    }
  };

  const handleFileChange = (key: string, event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Clear previous error
      setErrorMessages(prev => ({ ...prev, [key]: '' }));      // Validate file type - PDF only (check both MIME type and extension)
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPDF) {
        setUploadStatus(prev => ({ ...prev, [key]: 'error' }));
        setErrorMessages(prev => ({ ...prev, [key]: `Invalid file type: ${file.type}. Please upload PDF files only.` }));
        return;
      }
      
      // Validate file size (max 10MB for PDFs)
      const maxSize = 10 * 1024 * 1024; // 10MB
      if (file.size > maxSize) {
        const fileSizeMB = (file.size / 1024 / 1024).toFixed(2);
        setUploadStatus(prev => ({ ...prev, [key]: 'error' }));
        setErrorMessages(prev => ({ ...prev, [key]: `File size too large: ${fileSizeMB}MB. Please upload PDF files under 10MB only.` }));
        return;
      }
      
      handleFileUpload(key, file);
    }
  };

  const handleViewDocument = async (documentType: string) => {
    try {      // Get Firebase auth token
      const { auth } = require('../../../config/firebase');
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }
      
      const token = await user.getIdToken();
      
      // Create the authenticated URL for the PDF
      const url = `https://skillsync-backend-gwwo.onrender.com/api/employers/view-document/${documentType}?token=${token}`;
      
      // Get document name for preview
      const document = existingDocuments[documentType];
      const documentName = document?.name || `${documentType}.pdf`;
      
      // Set preview state to show the PDF in modal
      setPreviewDocument({
        type: documentType,
        url: url,
        name: documentName
      });    } catch (error) {      alert(`Unable to preview document: ${error.message}`);
    }
  };

  const handleClosePreview = () => {
    setPreviewDocument(null);
  };

  const handleSave = () => {
    onSave(documents);
    
    // Show success message for saving changes
    setSuccessMessage('All changes have been saved successfully!');
    setShowSuccessModal(true);
    
    // Close modal after a short delay
    setTimeout(() => {
      onClose();
    }, 1500);
  };

  const handleCloseSuccessModal = () => {
    setShowSuccessModal(false);
    setSuccessMessage('');
  };

  const getStatusIcon = (key: string) => {
    const status = uploadStatus[key];
    switch (status) {
      case 'uploading':
        return <div className={styles.spinner} />;
      case 'success':
        return <FiCheck className={styles.successIcon} />;
      case 'error':
        return <FiAlertCircle className={styles.errorIcon} />;
      default:
        return <FiUpload />;
    }
  };

  if (!isOpen) return null;

  return (
    <div className={styles.modalOverlay}>
      <div className={`${styles.modalContainer} ${styles.documentsModalContainer}`}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <FiBriefcase className={styles.headerIcon} />
            <h2 className={styles.title}>Company Documents</h2>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            <FiX />
          </button>
        </div>

        <div className={styles.modalBody}>
          <p className={styles.modalDescription}>
            Update your company's legal documents and certificates. These documents are required for account verification and compliance with Philippine business regulations.
          </p>

          <div className={styles.uploadNotes}>
            <h4>Upload Requirements:</h4>
            <ul>
              <li>Accepted format: PDF files only</li>
              <li>Maximum file size: 10MB per document</li>
              <li>Documents must be clear and readable</li>
              <li>You can view existing documents before updating them</li>
            </ul>
          </div>

          <div className={styles.documentsGrid}>
            {documentTypes.map((docType) => (
              <div key={docType.key} className={styles.documentCard}>
                <div className={styles.documentHeader}>
                  <h3 className={styles.documentTitle}>
                    {docType.label}
                    {docType.required && <span className={styles.required}>*</span>}
                  </h3>
                  <div className={styles.documentStatus}>
                    {getStatusIcon(docType.key)}
                  </div>
                </div>
                
                <p className={styles.documentDescription}>{docType.description}</p>
                
                {/* Existing Document Preview */}
                {isLoadingDocuments ? (
                  <div className={styles.loadingDocument}>
                    <div className={styles.spinner} />
                    <span>Loading documents...</span>
                  </div>
                ) : existingDocuments[docType.key] ? (
                  <div className={styles.existingDocument}>
                    <div className={styles.documentPreview}>
                      <FiFileText className={styles.pdfIcon} />
                      <div className={styles.documentInfo}>
                        <div className={styles.documentName}>{existingDocuments[docType.key].name}</div>
                        <div className={styles.documentMeta}>
                          Uploaded: {new Date(existingDocuments[docType.key].uploadDate).toLocaleDateString('en-PH')}
                          {existingDocuments[docType.key].verificationStatus && (
                            <span className={`${styles.verificationStatus} ${styles[existingDocuments[docType.key].verificationStatus || '']}`}>
                              • {existingDocuments[docType.key].verificationStatus?.charAt(0).toUpperCase() + existingDocuments[docType.key].verificationStatus?.slice(1)}
                            </span>
                          )}
                        </div>
                      </div>
                      <button 
                        onClick={() => handleViewDocument(docType.key)}
                        className={styles.viewButton}
                      >
                        Preview PDF
                      </button>
                    </div>
                  </div>
                ) : !isLoadingDocuments && (
                  <div className={styles.noDocument}>
                    <FiFileText className={styles.noDocIcon} />
                    <span>No document uploaded yet</span>
                  </div>
                )}

                <div className={styles.uploadArea}>
                  <input
                    type="file"
                    id={`file-${docType.key}`}
                    accept=".pdf"
                    onChange={(e) => handleFileChange(docType.key, e)}
                    className={styles.fileInput}
                  />
                  <label htmlFor={`file-${docType.key}`} className={styles.uploadButton}>
                    <FiUpload />
                    {documents[docType.key as keyof DocumentsData] 
                      ? 'Replace Document' 
                      : existingDocuments[docType.key]
                        ? 'Update Document'
                        : 'Upload Document'
                    }
                  </label>
                  
                  {documents[docType.key as keyof DocumentsData] && (
                    <div className={styles.fileName}>
                      {(documents[docType.key as keyof DocumentsData] as File)?.name}
                    </div>
                  )}
                </div>

                {uploadStatus[docType.key] === 'error' && (
                  <div className={styles.errorMessage}>
                    {errorMessages[docType.key] || 'Upload failed. Please try again.'}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>

        <div className={styles.modalActions}>
          <button onClick={onClose} className={styles.cancelButton}>
            Cancel
          </button>
          <button onClick={handleSave} className={styles.saveButton}>
            Save Documents
          </button>
        </div>
      </div>

      {/* PDF Preview Modal */}
      {previewDocument && (
        <div className={styles.previewOverlay}>
          <div className={styles.previewModal}>
            <div className={styles.previewHeader}>
              <h3 className={styles.previewTitle}>
                <FiFileText className={styles.previewIcon} />
                {previewDocument.name}
              </h3>
              <button 
                onClick={handleClosePreview}
                className={styles.previewCloseButton}
              >
                <FiX />
              </button>
            </div>
            <div className={styles.previewContent}>
              <iframe
                src={previewDocument.url}
                className={styles.pdfViewer}
                title={`Preview of ${previewDocument.name}`}
              />
            </div>
            <div className={styles.previewActions}>
              <button 
                onClick={() => window.open(previewDocument.url, '_blank')}
                className={styles.openInNewTabButton}
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div className={styles.successOverlay}>
          <div className={styles.successModal}>
            <div className={styles.successIcon}>
              <FiCheck />
            </div>
            <h3 className={styles.successTitle}>Success!</h3>
            <p className={styles.successMessage}>{successMessage}</p>
            <button 
              onClick={handleCloseSuccessModal}
              className={styles.successButton}
            >
              Continue
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
