import React from 'react';
import { FiX, FiMapPin, FiMail, FiPhone, FiCalendar, FiFileText, FiDownload, FiEye, FiUsers, FiClock, FiHome, FiGlobe, FiUser, FiCheck } from 'react-icons/fi';
import styles from './EmployerDetailsModal.module.css';
import { getImageSrc } from '../../utils/imageUtils';
import { HiOutlineHeart, HiOutlineStar, HiOutlineInformationCircle, HiOutlineOfficeBuilding } from 'react-icons/hi';
import { PendingEmployer } from '../../types/admin';
import DocumentViewer from './DocumentViewer';

interface EmployerDetailsModalProps {
  employer: PendingEmployer;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (employerId: string) => void;
  onReject: (employerId: string) => void;
  loading?: boolean;
}

const EmployerDetailsModal: React.FC<EmployerDetailsModalProps> = ({
  employer,
  isOpen,
  onClose,
  onApprove,
  onReject,
  loading = false
}) => {
  if (!isOpen) return null;

  const formatContactPersonName = () => {
    const { firstName, lastName } = employer.contactPerson || {};
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || 'Not provided';
  };

  const formatAddress = () => {
    const { street, city, province, zipCode } = employer.address || {};
    const parts = [street, city, province, zipCode].filter(Boolean);
    return parts.length > 0 ? parts.join(', ') : 'Not provided';
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  const getCompanyLogo = () => {
    const profilePicture = employer.profilePicture || employer.userId.profilePicture;    if (profilePicture) {
      return (
        <div 
          className="company-icon"
          style={{ 
            width: '48px', 
            height: '48px', 
            marginRight: '12px',
            overflow: 'hidden',
            borderRadius: '8px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <img 
            src={getImageSrc(profilePicture)} 
            alt="Company logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover'
            }}
            onLoad={() => console.log('✅ EmployerDetailsModal - Company logo loaded successfully')}
            onError={(e) => console.error('❌ EmployerDetailsModal - Company logo failed to load:', e)}
          />
        </div>
      );
    }    return (
      <div className="company-icon">
        <HiOutlineOfficeBuilding />
      </div>
    );
  };

  return (
    <div className="modal-backdrop" onClick={handleBackdropClick}>
      <div className="employer-details-modal">
        {/* Enhanced Modal Header */}
        <div className="modal-header">
          <div className="modal-title-section">
            <div className="company-header">
              {getCompanyLogo()}
              <div className="company-title-info">
                <h2>{employer.companyDetails?.companyName || employer.userId.companyName}</h2>
                <div className="company-subtitle">
                  <span className="industry">{employer.companyDetails?.industry || 'Industry not specified'}</span>
                  <span className="separator">•</span>
                  <span className="registration-date">
                    <FiCalendar /> Registered {new Date(employer.userId.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            </div>
            <div className="header-badges">
              <span className={`status-badge ${employer.accountStatus}`}>
                {employer.accountStatus.toUpperCase()}
              </span>
              {employer.companyDetails?.companySize && (
                <span className="info-badge">
                  <FiUsers /> {employer.companyDetails.companySize} employees
                </span>
              )}
            </div>
          </div>
          <button className="close-button" onClick={onClose}>
            <FiX />
          </button>
        </div>


        {/* Single Page Modal Content */}
        <div className="modal-content">
          <div className="single-page-layout">
            {/* Company Information Section */}
            <div className="company-info-section">
              <div className="section-title">
                <h2><HiOutlineOfficeBuilding /> Company Information</h2>
              </div>
              
              <div className="company-info-grid">
                {/* Company Summary Stats */}
                <div className="summary-stats-horizontal">
                  <div className="stat-item">
                    <div className="stat-icon"><FiUsers /></div>
                    <div className="stat-info">
                      <span className="stat-value">{employer.companyDetails?.companySize || 'N/A'}</span>
                      <span className="stat-label">Employees</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon"><FiCalendar /></div>
                    <div className="stat-info">
                      <span className="stat-value">{employer.companyDetails?.foundedYear || 'N/A'}</span>
                      <span className="stat-label">Founded</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon"><FiFileText /></div>
                    <div className="stat-info">
                      <span className="stat-value">{employer.documents?.length || 0}</span>
                      <span className="stat-label">Documents</span>
                    </div>
                  </div>
                  <div className="stat-item">
                    <div className="stat-icon"><FiClock /></div>
                    <div className="stat-info">
                      <span className="stat-value">{Math.ceil((Date.now() - new Date(employer.userId.createdAt).getTime()) / (1000 * 60 * 60 * 24))}</span>
                      <span className="stat-label">Days Ago</span>
                    </div>
                  </div>
                </div>

                {/* Company Details Grid */}
                <div className="company-details-grid">
                  {/* Basic Information */}
                  <div className="info-section">
                    <h3><FiHome /> Basic Information</h3>
                    <div className="info-rows">
                      <div className="info-row">
                        <span className="label">Company Name:</span>
                        <span className="value">{employer.companyDetails?.companyName || employer.userId.companyName}</span>
                      </div>
                      <div className="info-row">
                        <span className="label">Email:</span>
                        <span className="value">{employer.userId.email}</span>
                      </div>
                      {employer.companyDetails?.industry && (
                        <div className="info-row">
                          <span className="label">Industry:</span>
                          <span className="value">{employer.companyDetails.industry}</span>
                        </div>
                      )}
                      {employer.companyDetails?.website && (
                        <div className="info-row">
                          <span className="label">Website:</span>
                          <a href={employer.companyDetails.website} target="_blank" rel="noopener noreferrer" className="value link">
                            <FiGlobe /> {employer.companyDetails.website}
                          </a>
                        </div>
                      )}
                      {employer.workEnvironment && (
                        <div className="info-row">
                          <span className="label">Work Environment:</span>
                          <span className="value">{employer.workEnvironment}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Contact Information */}
                  <div className="info-section">
                    <h3><FiUser /> Contact Information</h3>
                    <div className="info-rows">
                      <div className="info-row">
                        <span className="label">Contact Person:</span>
                        <span className="value">{formatContactPersonName()}</span>
                      </div>
                      {employer.contactPerson?.position && (
                        <div className="info-row">
                          <span className="label">Position:</span>
                          <span className="value">{employer.contactPerson.position}</span>
                        </div>
                      )}
                      {employer.contactPerson?.email && (
                        <div className="info-row">
                          <span className="label">Contact Email:</span>
                          <span className="value">{employer.contactPerson.email}</span>
                        </div>
                      )}
                      {employer.contactPerson?.phoneNumber && (
                        <div className="info-row">
                          <span className="label">Phone:</span>
                          <span className="value">{employer.contactPerson.phoneNumber}</span>
                        </div>
                      )}
                      <div className="info-row">
                        <span className="label">Address:</span>
                        <span className="value">{formatAddress()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Business Registration */}
                  {(employer.companyDetails?.businessRegistrationNumber || employer.companyDetails?.taxIdentificationNumber) && (
                    <div className="info-section">
                      <h3><FiFileText /> Business Registration</h3>
                      <div className="info-rows">
                        {employer.companyDetails?.businessRegistrationNumber && (
                          <div className="info-row">
                            <span className="label">Business Registration No.:</span>
                            <span className="value">{employer.companyDetails.businessRegistrationNumber}</span>
                          </div>
                        )}
                        {employer.companyDetails?.taxIdentificationNumber && (
                          <div className="info-row">
                            <span className="label">Tax Identification No.:</span>
                            <span className="value">{employer.companyDetails.taxIdentificationNumber}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>

                {/* Company Description & Culture */}
                {(employer.companyDetails?.companyDescription || employer.benefits?.length > 0 || employer.companyValues?.length > 0) && (
                  <div className="company-description-section">
                    {employer.companyDetails?.companyDescription && (
                      <div className="description-block">
                        <h3><HiOutlineInformationCircle /> About the Company</h3>
                        <p className="description-text">{employer.companyDetails.companyDescription}</p>
                      </div>
                    )}

                    {(employer.benefits?.length > 0 || employer.companyValues?.length > 0) && (
                      <div className="culture-block">
                        <h3><HiOutlineHeart /> Company Culture</h3>
                        <div className="culture-grid">
                          {employer.benefits?.length > 0 && (
                            <div className="culture-section">
                              <h4><HiOutlineStar /> Benefits</h4>
                              <div className="tags">
                                {employer.benefits.map((benefit, index) => (
                                  <span key={index} className="tag benefit-tag">{benefit}</span>
                                ))}
                              </div>
                            </div>
                          )}
                          {employer.companyValues?.length > 0 && (
                            <div className="culture-section">
                              <h4><HiOutlineHeart /> Values</h4>
                              <div className="tags">
                                {employer.companyValues.map((value, index) => (
                                  <span key={index} className="tag value-tag">{value}</span>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Documents Section */}
            <div className="documents-section">
              <div className="section-title">
                <h2><FiFileText /> Required Documents ({employer.documents?.length || 0})</h2>
              </div>
              <div className="documents-viewer">
                <DocumentViewer
                  documents={employer.documents || []}
                  loading={loading}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="modal-footer">
          <div className="verification-info">
            <h4>Verification Decision</h4>
            <p>Review all company information and documents before making a decision.</p>
            <div className="current-status">
              <strong>Current Status:</strong>
              <span className={`status-indicator ${employer.accountStatus}`}>
                {employer.accountStatus.toUpperCase()}
              </span>
            </div>
          </div>
          
          {employer.accountStatus === 'pending' && (
            <div className="action-buttons">
              <button 
                className="reject-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onReject(employer._id);
                }}
                disabled={loading}
              >
                <FiX /> Reject Company
              </button>
              <button 
                className="approve-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  onApprove(employer._id);
                }}
                disabled={loading}
              >
                <FiCheck /> Approve Company
              </button>
            </div>
          )}
          
          {employer.accountStatus !== 'pending' && (
            <div className="status-message">
              <p>This company has already been {employer.accountStatus}.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployerDetailsModal;
