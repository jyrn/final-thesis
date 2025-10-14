import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiUpload, FiFile, FiX, FiCheck, FiAlertCircle } from 'react-icons/fi';
import styles from '../pages/jobseeker/Dashboard.module.css';

interface ResumeUploadPromptProps {
  isOpen: boolean;
  onClose: () => void;
  onUpload: (file: File) => Promise<void>;
  onSkip?: () => void;
  userProfile?: any;
}

const ResumeUploadPrompt: React.FC<ResumeUploadPromptProps> = ({ isOpen, onClose, onUpload, onSkip, userProfile }) => {
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile && droppedFile.type === 'application/pdf') {
      setFile(droppedFile);
      setError('');
    } else {
      setError('Please upload a PDF file');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {      // Check file type
      if (selectedFile.type !== 'application/pdf') {
        setError(`Invalid file type: ${selectedFile.type}. Please upload a PDF file.`);
        return;
      }
      
      // Check file size (5MB limit as shown in UI)
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError(`File too large: ${(selectedFile.size / 1024 / 1024).toFixed(2)}MB. Maximum size is 5MB.`);
        return;
      }
      
      setFile(selectedFile);
      setError('');    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    try {
      setIsLoading(true);
      await onUpload(file);
      onClose();
    } catch (err) {
      setError('Failed to upload resume. Please try again.');    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay}>
      <div className={styles.uploadModal}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>
            {userProfile?.resumeUrl ? 'Update Your Resume' : 'Upload Your Resume'}
          </h2>
          <button 
            type="button" 
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            <FiX size={24} />
          </button>
        </div>
        
        {userProfile?.resumeUrl ? (
          <div className={styles.existingResumeNotice}>
            <FiCheck className={styles.checkIcon} />
            <p className={styles.modalDescription}>
              You already have a resume uploaded. You can upload a new one to replace it, or skip to use your existing resume for job applications.
            </p>
          </div>
        ) : (
          <p className={styles.modalDescription}>
            Upload your resume to unlock personalized job recommendations and apply to jobs faster.
            We support PDF files up to 5MB.
          </p>
        )}
        
        <form onSubmit={handleSubmit} className={styles.uploadForm}>
          <div 
            className={`${styles.uploadArea} ${isDragging ? styles.dragging : ''}`}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf"
              onChange={handleFileChange}
              className={styles.fileInput}
              id="resume-upload"
            />
            
            <div className={styles.uploadContent}>
              <div className={styles.uploadIcon}>
                <FiUpload size={32} />
              </div>
              
              {file ? (
                <div className={styles.fileInfo}>
                  <div className={styles.fileIcon}>
                    <FiFile size={20} />
                  </div>
                  <div className={styles.fileDetails}>
                    <span className={styles.fileName}>{file.name}</span>
                    <span className={styles.fileSize}>
                      {(file.size / 1024 / 1024).toFixed(2)} MB
                    </span>
                  </div>
                  <button 
                    type="button"
                    className={styles.removeFile}
                    onClick={(e) => {
                      e.stopPropagation();
                      setFile(null);
                      setError('');
                    }}
                    aria-label="Remove file"
                  >
                    <FiX size={16} />
                  </button>
                </div>
              ) : (
                <>
                  <h3 className={styles.uploadTitle}>
                    {isDragging ? 'Drop your resume here' : 'Drag & drop your resume'}
                  </h3>
                  <p className={styles.uploadSubtitle}>
                    or <span className={styles.browseLink}>browse files</span>
                  </p>
                  <p className={styles.fileTypeHint}>PDF, up to 5MB</p>
                </>
              )}
            </div>
          </div>
          
          {error && (
            <div className={styles.errorMessage}>
              <FiAlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}
          
          <div className={styles.buttonGroup}>
            <button 
              type="button" 
              className={styles.skipButton}
              onClick={onSkip}
              disabled={isLoading}
            >
              {userProfile?.resumeUrl ? 'Use Existing Resume' : 'Skip for now'}
            </button>
            <button 
              type="submit" 
              className={styles.primaryButton}
              disabled={!file || isLoading}
            >
              {isLoading ? 'Uploading...' : userProfile?.resumeUrl ? 'Replace Resume' : 'Upload Resume'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResumeUploadPrompt;
