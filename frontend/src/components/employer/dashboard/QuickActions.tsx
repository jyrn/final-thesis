import React from 'react';
import { FiPlus, FiEye, FiBriefcase, FiSettings } from 'react-icons/fi';

interface QuickActionsProps {
  onCreateJob: () => void;
  onViewJobs: () => void;
  onViewApplications: () => void;
  onOpenSettings: () => void;
}

export const QuickActions: React.FC<QuickActionsProps> = ({
  onCreateJob,
  onViewJobs,
  onViewApplications,
  onOpenSettings
}) => {
  const actionCardStyle = {
    background: 'white',
    borderRadius: '12px',
    border: '1px solid #e2e8f0',
    padding: '2rem 1rem',
    cursor: 'pointer',
    transition: 'all 0.2s',
    display: 'flex',
    flexDirection: 'column' as const,
    alignItems: 'center',
    textAlign: 'center' as const,
    minHeight: '120px'
  };

  const iconStyle = {
    width: '48px',
    height: '48px',
    color: '#343386',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '1rem'
  };

  const titleStyle = {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e293b',
    margin: '0'
  };

  const handleMouseEnter = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#343386';
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 4px 12px rgba(52, 51, 134, 0.15)';
  };

  const handleMouseLeave = (e: React.MouseEvent<HTMLDivElement>) => {
    e.currentTarget.style.borderColor = '#e2e8f0';
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  };

  return (
    <div style={{ marginBottom: '2rem' }}>
      <h2 style={{ 
        fontSize: '1.5rem', 
        fontWeight: '600', 
        color: '#1e293b',
        margin: '0 0 1.5rem 0' 
      }}>
        Quick Actions
      </h2>
      <div style={{ 
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '1rem'
      }}>
        <div 
          style={actionCardStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={onCreateJob}
        >
          <div style={iconStyle}>
            <FiPlus size={32} />
          </div>
          <h4 style={titleStyle}>
            Post New Job
          </h4>
        </div>

        <div 
          style={actionCardStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={onViewJobs}
        >
          <div style={iconStyle}>
            <FiEye size={32} />
          </div>
          <h4 style={titleStyle}>
            View Job Posts
          </h4>
        </div>

        <div 
          style={actionCardStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={onViewApplications}
        >
          <div style={iconStyle}>
            <FiBriefcase size={32} />
          </div>
          <h4 style={titleStyle}>
            View Applications
          </h4>
        </div>

        <div 
          style={actionCardStyle}
          onMouseEnter={handleMouseEnter}
          onMouseLeave={handleMouseLeave}
          onClick={onOpenSettings}
        >
          <div style={iconStyle}>
            <FiSettings size={32} />
          </div>
          <h4 style={titleStyle}>
            Settings
          </h4>
        </div>
      </div>
    </div>
  );
};
