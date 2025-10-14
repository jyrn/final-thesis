import React from 'react';
import { 
  HiOutlineOfficeBuilding, 
  HiOutlineInformationCircle, 
  HiOutlineHeart,
  HiOutlineStar,
  HiArrowLeft
} from 'react-icons/hi';
import { 
  FiUsers, 
  FiCalendar, 
  FiFileText, 
  FiClock, 
  FiHome, 
  FiUser, 
  FiMapPin, 
  FiMail, 
  FiPhone, 
  FiGlobe 
} from 'react-icons/fi';
import { PendingEmployer } from '../../types/admin';
import { getImageSrc } from '../../utils/imageUtils';
import DocumentViewer from './DocumentViewer';

interface EmployerDetailsViewProps {
  employer: PendingEmployer;
  onBack: () => void;
  onApprove: (reason?: string) => void;
  onReject: (reason?: string) => void;
  loading?: boolean;
}

const EmployerDetailsView: React.FC<EmployerDetailsViewProps> = ({
  employer,
  onBack,
  onApprove,
  onReject,
  loading = false
}) => {
  const formatContactPersonName = () => {
    const { firstName, lastName } = employer.contactPerson || {};
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || 'Not provided';
  };

  const formatAddress = () => {
    const address = employer.address;
    if (!address) return 'Address not provided';
    
    const parts = [
      address.street,
      address.city,
      address.province
    ].filter(Boolean);
    
    return parts.join(', ');
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
            onLoad={() => console.log('✅ Company logo loaded successfully')}
            onError={(e) => console.error('❌ Company logo failed to load:', e)}
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
    <div className="employer-details-view">
      {/* Header */}
      <div className="details-header">
        <button className="back-button" onClick={onBack}>
          <HiArrowLeft />
          <span>Back to Employers</span>
        </button>
        
        <div className="company-header">
          {getCompanyLogo()}
          <div className="company-title-info">
            <h1>{employer.companyDetails?.companyName || employer.userId.companyName}</h1>
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
            <span className="size-badge">
              <FiUsers /> {employer.companyDetails.companySize} employees
            </span>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="details-content">
        {/* Company Information Section */}
        <div className="company-info-section">
          <div className="section-title">
            <h2><HiOutlineOfficeBuilding /> Company Information</h2>
          </div>
          
          <div className="company-info-grid">
            {/* Company Summary Stats */}
            <div className="summary-stats-horizontal">
              <div className="stat-item">
                <div className="stat-icon"><FiMapPin /></div>
                <div className="stat-info">
                  <span className="stat-value">{employer.address ? 'Complete' : 'Missing'}</span>
                  <span className="stat-label">Address Info</span>
                </div>
              </div>
              <div className="stat-item">
                <div className="stat-icon"><FiPhone /></div>
                <div className="stat-info">
                  <span className="stat-value">{employer.contactPerson?.phoneNumber ? 'Provided' : 'Missing'}</span>
                  <span className="stat-label">Contact Info</span>
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

      {/* Footer Actions */}
      <div className="details-footer">
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
              className="decision-btn reject-btn" 
              onClick={() => onReject()}
              disabled={loading}
            >
              Reject Application
            </button>
            <button 
              className="decision-btn approve-btn" 
              onClick={() => onApprove()}
              disabled={loading}
            >
              Approve Application
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default EmployerDetailsView;
