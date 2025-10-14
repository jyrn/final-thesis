import React, { useState, useEffect } from 'react';
import { EmployerDocument } from '../../types/admin';
import { 
  HiDocumentText, 
  HiCheck, 
  HiX, 
  HiEye, 
  HiDownload,
  HiExclamation,
  HiClock
} from 'react-icons/hi';
import { HiOutlineOfficeBuilding } from 'react-icons/hi';
import { getImageSrc } from '../../utils/imageUtils';
import './DocumentViewer.css';

interface DocumentViewerProps {
  documents: EmployerDocument[];
  loading?: boolean;
}

const DocumentViewer: React.FC<DocumentViewerProps> = ({
  documents,
  loading = false
}) => {
  const [previewDocument, setPreviewDocument] = useState<EmployerDocument | null>(null);
  const [showPreview, setShowPreview] = useState(false);

  const getDocumentTypeLabel = (type: string) => {
    const labels: { [key: string]: string } = {
      'companyProfile': 'Company Profile',
      'businessPermit': 'Business Permit',
      'philjobnetRegistration': 'PhilJobNet Registration',
      'doleNoPendingCase': 'DOLE No Pending Case Certificate',
      'other': 'Other Document'
    };
    return labels[type] || (type ? type.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()) : 'Unknown Document');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'approved':
        return <HiCheck className="status-icon approved" />;
      case 'rejected':
        return <HiX className="status-icon rejected" />;
      case 'requires_resubmission':
        return <HiExclamation className="status-icon resubmission" />;
      default:
        return <HiClock className="status-icon pending" />;
    }
  };

  const getStatusClass = (status: string) => {
    return `status-badge ${status}`;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };


  const openDocumentPreview = async (document: EmployerDocument) => {    if (!document._id) {
      alert('Document ID not available');
      return;
    }
    
    try {
      // Create authenticated URL for document preview (like employer settings)
      const token = localStorage.getItem('adminToken');
      if (!token) {
        alert('Authentication required');
        return;
      }
      
      const authenticatedUrl = `http://localhost:3001/api/admin/view-document/${document._id}?token=${token}`;
      
      // Create a document object with the authenticated URL for preview
      const previewDoc = {
        ...document,
        cloudUrl: authenticatedUrl
      };      setPreviewDocument(previewDoc);
      setShowPreview(true);
      
    } catch (error) {      alert('Unable to preview document');
    }
  };

  const closePreview = () => {
    setShowPreview(false);
    setPreviewDocument(null);
  };

  // Handle Escape key to close preview
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && showPreview) {
        closePreview();
      }
    };

    if (showPreview) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [showPreview]);

  const getCompanyLogo = (employerInfo?: { companyName: string; profilePicture?: string }) => {
    if (!employerInfo) return null;
    
    if (employerInfo.profilePicture) {
      return (
        <img 
          src={getImageSrc(employerInfo.profilePicture)} 
          alt={`${employerInfo.companyName} logo`} 
          className="company-logo-image"
        />
      );
    }
    
    return (
      <div className="company-logo-fallback">
        <HiOutlineOfficeBuilding />
      </div>
    );
  };

  if (!documents || documents.length === 0) {
    return (
      <div className="no-documents">
        <HiDocumentText className="no-docs-icon" />
        <p>No documents uploaded yet</p>
      </div>
    );
  }

  return (
    <div className="document-viewer">
      <div className="document-header">
        <h3>Document Status Overview</h3>
        <p>View document verification status and details</p>
      </div>

      <div className="documents-grid">
        {documents.map((document, index) => (
          <div key={document._id || index} className={`document-card ${document.verificationStatus || 'pending'}`}>
            <div className="document-card-header">
              <div className="document-status">
                {getStatusIcon(document.verificationStatus || 'pending')}
                <span className={getStatusClass(document.verificationStatus || 'pending')}>
                  {(document.verificationStatus || 'pending').replace('_', ' ').toUpperCase()}
                </span>
              </div>
              {document.employerInfo && (
                <div className="company-logo-container">
                  {getCompanyLogo(document.employerInfo)}
                </div>
              )}
            </div>

            <div className="document-info">
              {document.employerInfo && (
                <div className="employer-info">
                  <h5 className="company-name">{document.employerInfo.companyName}</h5>
                  <p className="company-email">{document.employerInfo.email}</p>
                </div>
              )}
              <h4 className="document-type">{getDocumentTypeLabel(document.documentType || '')}</h4>
              <p className="document-name">{document.documentName || 'Unknown Document'}</p>
              {!document.cloudUrl && (
                <div className="missing-url-warning">
                  <HiExclamation />
                  <span>Document URL missing - cannot preview/download</span>
                </div>
              )}
              <div className="document-meta">
                <span className="file-size">{formatFileSize(document.fileSize || 0)}</span>
                <span className="upload-date">
                  Uploaded: {document.uploadedAt ? new Date(document.uploadedAt).toLocaleDateString() : 'Unknown'}
                </span>
              </div>
              
              {document.documentNumber && (
                <p className="document-number">Ref: {document.documentNumber}</p>
              )}
              
              {document.expiryDate && (
                <p className="expiry-date">
                  Expires: {new Date(document.expiryDate).toLocaleDateString()}
                </p>
              )}
            </div>

            <div className="document-actions">
              <button
                className="action-btn view"
                onClick={() => openDocumentPreview(document)}
                title={document.cloudUrl ? "Preview Document" : "Document URL missing - check console"}
                disabled={!document.cloudUrl}
                style={{ 
                  opacity: document.cloudUrl ? 1 : 0.5,
                  cursor: document.cloudUrl ? 'pointer' : 'not-allowed'
                }}
              >
                <HiEye />
              </button>
              
              <button
                className="action-btn download"
                onClick={() => {                  if (!document.cloudUrl) {                    alert('Document download not available - document URL missing');
                    return;
                  }
                  
                  // Open cloud URL directly for download
                  const link = window.document.createElement('a');
                  link.href = document.cloudUrl;
                  link.download = document.documentName || 'document';
                  link.setAttribute('target', '_blank');
                  window.document.body.appendChild(link);
                  link.click();
                  window.document.body.removeChild(link);
                }}
                title={document.cloudUrl ? "Download Document" : "Document URL missing - check console"}
                disabled={!document.cloudUrl}
                style={{ 
                  opacity: document.cloudUrl ? 1 : 0.5,
                  cursor: document.cloudUrl ? 'pointer' : 'not-allowed'
                }}
              >
                <HiDownload />
              </button>
            </div>

            {document.rejectionReason && (
              <div className="rejection-reason">
                <strong>Rejection Reason:</strong> {document.rejectionReason}
              </div>
            )}

            {document.adminNotes && (
              <div className="admin-notes">
                <strong>Admin Notes:</strong> {document.adminNotes}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Document Preview Modal */}
      {showPreview && previewDocument && (
        <div className="document-preview-modal" onClick={closePreview}>
          <div className="document-preview-content" onClick={(e) => e.stopPropagation()}>
            <div className="document-preview-header">
              <h3>{previewDocument.documentName}</h3>
              <button className="close-preview-btn" onClick={closePreview}>
                <HiX />
              </button>
            </div>
            <div className="document-preview-body">
              {previewDocument.mimeType?.includes('pdf') ? (
                <iframe
                  src={previewDocument.cloudUrl}
                  width="100%"
                  height="100%"
                  style={{ border: 'none', minHeight: '600px' }}
                  title={previewDocument.documentName}
                  onLoad={() => console.log('PDF iframe loaded')}
                  onError={() => console.error('PDF iframe failed to load')}
                />
              ) : previewDocument.mimeType?.startsWith('image/') ? (
                <img
                  src={previewDocument.cloudUrl}
                  alt={previewDocument.documentName}
                  style={{ maxWidth: '100%', maxHeight: '600px', objectFit: 'contain' }}
                  onLoad={() => console.log('Image loaded successfully')}
                  onError={() => console.error('Image failed to load')}
                />
              ) : (
                <div className="unsupported-preview">
                  <HiDocumentText size={64} />
                  <p>Preview not available for this file type</p>
                  <p>{previewDocument.documentName}</p>
                  <button 
                    className="download-btn"
                    onClick={() => window.open(previewDocument.cloudUrl, '_blank')}
                  >
                    Open in New Tab
                  </button>
                </div>
              )}
            </div>
            <div className="document-preview-footer">
              <button 
                className="preview-btn secondary"
                onClick={() => window.open(previewDocument.cloudUrl, '_blank')}
              >
                Open in New Tab
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default DocumentViewer;
