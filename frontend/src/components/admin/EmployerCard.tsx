import React from 'react';
import { FiMapPin, FiUsers, FiCalendar, FiEye, FiMail, FiPhone, FiFileText, FiChevronRight } from 'react-icons/fi';
import styles from './EmployerCard.module.css';
import { getImageSrc } from '../../utils/imageUtils';
import { PendingEmployer } from '../../types/admin';

interface EmployerCardProps {
  employer: PendingEmployer;
  onClick: () => void;
  loading?: boolean;
}

const EmployerCard: React.FC<EmployerCardProps> = ({
  employer,
  onClick,
  loading = false
}) => {
  const formatContactPersonName = () => {
    const { firstName, lastName } = employer.contactPerson || {};
    if (firstName && lastName) {
      return `${firstName} ${lastName}`;
    }
    return firstName || lastName || 'Not provided';
  };

  const getLocationSummary = () => {
    const address = employer.address;
    if (!address) return 'Location not provided';
    
    const parts = [];
    if (address.street) parts.push(address.street);
    if (address.city) parts.push(address.city);
    if (address.province) parts.push(address.province);
    
    return parts.length > 0 ? parts.join(', ') : 'Location not provided';
  };

  const getCompanyInitials = () => {
    const companyName = employer.companyDetails?.companyName || employer.userId.companyName;
    if (!companyName) return 'C';
    
    // Split by spaces and take first letter of each word, max 2 letters
    const words = companyName.trim().split(/\s+/);
    if (words.length === 1) {
      return words[0].substring(0, 2).toUpperCase();
    }
    return words.slice(0, 2).map(word => word.charAt(0)).join('').toUpperCase();
  };

  const getInitialsColor = () => {
    const companyName = employer.companyDetails?.companyName || employer.userId.companyName || '';
    // Generate a consistent color based on company name
    const colors = [
      '#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
      '#06b6d4', '#84cc16', '#f97316', '#ec4899', '#6366f1'
    ];
    const index = companyName.length % colors.length;
    return colors[index];
  };

  const getCompanyLogo = () => {
    const profilePicture = employer.profilePicture || employer.userId.profilePicture;
    
    // Debug logging    if (profilePicture) {      return (
        <div 
          className="company-initials"
          style={{ 
            backgroundColor: 'transparent',
            padding: 0,
            overflow: 'hidden'
          }}
        >
          <img 
            src={getImageSrc(profilePicture)} 
            alt="Company logo" 
            style={{ 
              width: '100%', 
              height: '100%', 
              objectFit: 'cover', 
              borderRadius: '12px'
            }}
            onLoad={() => console.log('EmployerCard - Image loaded successfully')}
            onError={(e) => console.error('EmployerCard - Image failed to load:', e)}
          />
        </div>
      );
    }    return (
      <div 
        className="company-initials"
        style={{ backgroundColor: getInitialsColor() }}
      >
        {getCompanyInitials()}
      </div>
    );
  };

  return (
    <div className="employer-card-compact" onClick={onClick}>
      <div className="card-header">
        <div className="company-avatar">
          {getCompanyLogo()}
        </div>
        <div className="company-info">
          <h4 className="company-name">
            {employer.companyDetails?.companyName || employer.userId.companyName}
          </h4>
          <div className="company-meta">
            <span className="industry">
              {employer.companyDetails?.industry || 'Industry not specified'}
            </span>
            {employer.companyDetails?.companySize && (
              <>
                <span className="separator">•</span>
                <span className="company-size">{employer.companyDetails.companySize} employees</span>
              </>
            )}
          </div>
        </div>
        <div className="card-status">
          <span className={`status-badge ${employer.accountStatus}`}>
            {employer.accountStatus.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="card-body">
        <div className="quick-info">
          <div className="info-item">
            <FiMail className="info-icon" />
            <span className="info-text">{employer.userId.email}</span>
          </div>
          
          {employer.contactPerson?.phoneNumber && (
            <div className="info-item">
              <FiPhone className="info-icon" />
              <span className="info-text">{employer.contactPerson.phoneNumber}</span>
            </div>
          )}
          
          <div className="info-item">
            <FiMapPin className="info-icon" />
            <span className="info-text">{getLocationSummary()}</span>
          </div>
        </div>

      </div>

      <div className="card-footer">
        <div className="document-summary">
          <FiFileText className="doc-icon" />
          <span className="doc-count">
            {employer.documents?.length || 0} documents
          </span>
        </div>
        
        <div className="registration-date">
          Registered: {new Date(employer.userId.createdAt).toLocaleDateString()}
        </div>
        
        <div className="view-details">
          <span>View Details</span>
          <FiChevronRight className="chevron-icon" />
        </div>
      </div>
    </div>
  );
};

export default EmployerCard;
