import React, { useState, useEffect } from 'react';
import { FiAlertCircle, FiCheck, FiX, FiClock, FiFileText, FiDownload, FiUsers } from 'react-icons/fi';
import StatsCard from './StatsCard';

interface ComplianceItem {
  _id: string;
  type: 'employer_verification' | 'job_posting' | 'user_report' | 'data_privacy' | 'system_audit';
  title: string;
  description: string;
  status: 'compliant' | 'non_compliant' | 'pending_review' | 'requires_action';
  priority: 'low' | 'medium' | 'high' | 'critical';
  assignedTo?: string;
  dueDate?: string;
  createdAt: string;
  updatedAt: string;
  relatedEntity?: {
    id: string;
    type: 'employer' | 'job' | 'user';
    name: string;
  };
}

const ComplianceTab: React.FC = () => {
  const [complianceItems, setComplianceItems] = useState<ComplianceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<'all' | 'compliant' | 'non_compliant' | 'pending_review' | 'requires_action'>('all');
  const [filterPriority, setFilterPriority] = useState<'all' | 'low' | 'medium' | 'high' | 'critical'>('all');

  useEffect(() => {
    fetchComplianceData();
  }, []);

  const fetchComplianceData = async () => {
    try {
      setLoading(true);
      // Mock data for now - replace with actual API call
      const mockComplianceItems: ComplianceItem[] = [
        {
          _id: '1',
          type: 'employer_verification',
          title: 'Pending Employer Document Verification',
          description: 'TechCorp Inc. has submitted business permit but DTI registration is missing',
          status: 'requires_action',
          priority: 'high',
          assignedTo: 'admin@peso.gov.ph',
          dueDate: '2024-01-25',
          createdAt: '2024-01-20',
          updatedAt: '2024-01-20',
          relatedEntity: {
            id: 'emp_001',
            type: 'employer',
            name: 'TechCorp Inc.'
          }
        },
        {
          _id: '2',
          type: 'job_posting',
          title: 'Job Posting Compliance Review',
          description: 'Job posting contains potentially discriminatory language',
          status: 'pending_review',
          priority: 'medium',
          assignedTo: 'moderator@peso.gov.ph',
          dueDate: '2024-01-23',
          createdAt: '2024-01-19',
          updatedAt: '2024-01-19',
          relatedEntity: {
            id: 'job_001',
            type: 'job',
            name: 'Senior Developer Position'
          }
        },
        {
          _id: '3',
          type: 'data_privacy',
          title: 'GDPR Compliance Audit',
          description: 'Quarterly data privacy compliance audit completed successfully',
          status: 'compliant',
          priority: 'low',
          createdAt: '2024-01-15',
          updatedAt: '2024-01-18'
        },
        {
          _id: '4',
          type: 'system_audit',
          title: 'Security Vulnerability Assessment',
          description: 'Critical security vulnerability detected in user authentication system',
          status: 'non_compliant',
          priority: 'critical',
          assignedTo: 'security@peso.gov.ph',
          dueDate: '2024-01-22',
          createdAt: '2024-01-21',
          updatedAt: '2024-01-21'
        }
      ];
      setComplianceItems(mockComplianceItems);
    } catch (error) {    } finally {
      setLoading(false);
    }
  };

  const filteredItems = complianceItems.filter(item => {
    const matchesStatus = filterStatus === 'all' || item.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || item.priority === filterPriority;
    return matchesStatus && matchesPriority;
  });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'compliant': return <FiCheck className="status-icon compliant" />;
      case 'non_compliant': return <FiX className="status-icon non-compliant" />;
      case 'pending_review': return <FiClock className="status-icon pending" />;
      case 'requires_action': return <FiAlertCircle className="status-icon requires-action" />;
      default: return <FiAlertCircle className="status-icon" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return 'priority-critical';
      case 'high': return 'priority-high';
      case 'medium': return 'priority-medium';
      case 'low': return 'priority-low';
      default: return 'priority-medium';
    }
  };

  const exportComplianceReport = () => {
    const csvContent = [
      ['Type', 'Title', 'Status', 'Priority', 'Assigned To', 'Due Date', 'Created At'],
      ...filteredItems.map(item => [
        item.type.replace('_', ' '),
        item.title,
        item.status.replace('_', ' '),
        item.priority,
        item.assignedTo || 'Unassigned',
        item.dueDate || 'No due date',
        item.createdAt
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `compliance-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const complianceStats = {
    total: complianceItems.length,
    compliant: complianceItems.filter(item => item.status === 'compliant').length,
    nonCompliant: complianceItems.filter(item => item.status === 'non_compliant').length,
    pendingReview: complianceItems.filter(item => item.status === 'pending_review').length,
    requiresAction: complianceItems.filter(item => item.status === 'requires_action').length,
    critical: complianceItems.filter(item => item.priority === 'critical').length
  };

  if (loading) {
    return (
      <div className="tab-content">
        <div className="loading-spinner"></div>
        <p>Loading compliance data...</p>
      </div>
    );
  }

  return (
    <div className="tab-content">
      <div className="tab-header">
        <div className="tab-title">
          <FiAlertCircle className="tab-icon" />
          <h2>Compliance Management</h2>
        </div>
        <div className="tab-actions">
          <button className="btn btn-secondary" onClick={exportComplianceReport}>
            <FiDownload />
            Export Report
          </button>
        </div>
      </div>

      <div className="stats-grid">
        <StatsCard
          icon={FiUsers}
          value={complianceStats.total}
          label="Total Items"
          iconClassName="users"
        />
        <StatsCard
          icon={FiCheck}
          value={complianceStats.compliant}
          label="Compliant"
          iconClassName="active-icon"
        />
        <StatsCard
          icon={FiX}
          value={complianceStats.nonCompliant}
          label="Non-Compliant"
          iconClassName="pending-icon"
        />
        <StatsCard
          icon={FiAlertCircle}
          value={complianceStats.requiresAction}
          label="Requires Action"
          iconClassName="employers"
        />
        <StatsCard
          icon={FiClock}
          value={complianceStats.critical}
          label="Critical Issues"
          iconClassName="jobs"
        />
      </div>

      <div className="filters-section">
        <div className="filter-group">
          <label>Status:</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="compliant">Compliant</option>
            <option value="non_compliant">Non-Compliant</option>
            <option value="pending_review">Pending Review</option>
            <option value="requires_action">Requires Action</option>
          </select>
        </div>
        
        <div className="filter-group">
          <label>Priority:</label>
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value as any)}
            className="filter-select"
          >
            <option value="all">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      <div className="compliance-items">
        {filteredItems.map((item) => (
          <div key={item._id} className={`compliance-item ${item.status} ${getPriorityColor(item.priority)}`}>
            <div className="item-header">
              <div className="item-title">
                {getStatusIcon(item.status)}
                <h3>{item.title}</h3>
                <span className={`priority-badge ${getPriorityColor(item.priority)}`}>
                  {item.priority}
                </span>
              </div>
              <div className="item-meta">
                <span className="item-type">{item.type.replace('_', ' ')}</span>
                {item.dueDate && (
                  <span className="due-date">Due: {item.dueDate}</span>
                )}
              </div>
            </div>
            
            <div className="item-content">
              <p>{item.description}</p>
              
              {item.relatedEntity && (
                <div className="related-entity">
                  <FiFileText className="entity-icon" />
                  <span>Related {item.relatedEntity.type}: {item.relatedEntity.name}</span>
                </div>
              )}
              
              <div className="item-footer">
                <div className="assignment">
                  {item.assignedTo && (
                    <span>Assigned to: {item.assignedTo}</span>
                  )}
                </div>
                <div className="timestamps">
                  <span>Created: {item.createdAt}</span>
                  <span>Updated: {item.updatedAt}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredItems.length === 0 && (
        <div className="empty-state">
          <FiAlertCircle className="empty-icon" />
          <h3>No compliance items found</h3>
          <p>No compliance items match your current filters.</p>
        </div>
      )}
    </div>
  );
};

export default ComplianceTab;
