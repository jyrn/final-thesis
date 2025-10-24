import React, { useState } from 'react';
import { HiCheckCircle, HiUsers, HiX, HiFilter, HiSearch, HiClock, HiEye, HiExclamation } from 'react-icons/hi';
import { PendingEmployer } from '../../types/admin';
import EmployerCard from './EmployerCard';
import EmployerDetailsView from './EmployerDetailsView';
import StatsCard from './StatsCard';
import './EmployersTab.css';

interface EmployersTabProps {
  pendingEmployers: PendingEmployer[];
  onEmployerAction: (employerId: string, action: 'approve' | 'reject' | 'remove', reason?: string) => void;
  loading?: boolean;
}

const EmployersTab: React.FC<EmployersTabProps> = ({
  pendingEmployers,
  onEmployerAction,
  loading = false
}) => {
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'rejected'>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedEmployer, setSelectedEmployer] = useState<PendingEmployer | null>(null);
  const [currentView, setCurrentView] = useState<'list' | 'details'>('list');

  const handleEmployerClick = (employer: PendingEmployer) => {
    setSelectedEmployer(employer);
    setCurrentView('details');
  };

  const handleBackToList = () => {
    setCurrentView('list');
    setSelectedEmployer(null);
  };


  // Filter employers based on status and search term
  const filteredEmployers = pendingEmployers.filter(employer => {
    // Status filter
    const statusMatch = statusFilter === 'all' || employer.accountStatus === statusFilter;
    
    // Search filter
    const searchMatch = searchTerm === '' || 
      employer.userId?.companyName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      employer.userId?.email?.toLowerCase().includes(searchTerm.toLowerCase());
    
    return statusMatch && searchMatch;
  });

  // Get counts for each status
  const statusCounts = {
    all: pendingEmployers.length,
    pending: pendingEmployers.filter(e => e.accountStatus === 'pending').length,
    verified: pendingEmployers.filter(e => e.accountStatus === 'verified').length,
    rejected: pendingEmployers.filter(e => e.accountStatus === 'rejected').length
  };


  // Show details view if selected
  if (currentView === 'details' && selectedEmployer) {
    return (
      <EmployerDetailsView
        employer={selectedEmployer}
        onBack={handleBackToList}
        onApprove={(reason) => {
          onEmployerAction(selectedEmployer._id, 'approve', reason);
          handleBackToList();
        }}
        onReject={(reason) => {
          onEmployerAction(selectedEmployer._id, 'reject', reason);
          handleBackToList();
        }}
        onRemove={(reason) => {
          onEmployerAction(selectedEmployer._id, 'remove', reason);
          handleBackToList();
        }}
        loading={loading}
      />
    );
  }

  return (
    <div className="admin-content">
      {/* Employer Stats Cards */}
      <div className="stats-grid">
        <StatsCard
          icon={HiClock}
          value={statusCounts.pending}
          label="Pending Review"
          changeText="Awaiting verification"
        />
        <StatsCard
          icon={HiEye}
          value={statusCounts.pending > 0 ? Math.min(statusCounts.pending, 12) : 0}
          label="Under Review"
          changeText="Currently reviewing"
        />
        <StatsCard
          icon={HiCheckCircle}
          value={statusCounts.verified}
          label="Verified"
          change={statusCounts.verified > 0 ? statusCounts.verified : 0}
          changeLabel="this week"
        />
        <StatsCard
          icon={HiExclamation}
          value={statusCounts.rejected}
          label="Flagged"
          changeText="Requires attention"
        />
      </div>

      {/* Search and Filter Section */}
      <div className="search-filter-container">
        <div className="search-filter-wrapper">
          {/* Search Bar */}
          <div className="search-section">
            <div className="search-bar">
              <HiSearch className="search-icon" />
              <input
                type="text"
                placeholder="Search by company name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
              {searchTerm && (
                <button
                  className="clear-search"
                  onClick={() => setSearchTerm('')}
                  title="Clear search"
                >
                  <HiX />
                </button>
              )}
            </div>
          </div>

          {/* Filter Section */}
          <div className="filter-section">
            <div className="filter-header">
              <HiFilter className="filter-icon" />
              <span>Status Filter</span>
            </div>
            <div className="filter-buttons">
              <button
                className={`filter-btn all ${statusFilter === 'all' ? 'active' : ''}`}
                onClick={() => setStatusFilter('all')}
              >
                All <span className="count">({statusCounts.all})</span>
              </button>
              <button
                className={`filter-btn pending ${statusFilter === 'pending' ? 'active' : ''}`}
                onClick={() => setStatusFilter('pending')}
              >
                Pending <span className="count">({statusCounts.pending})</span>
              </button>
              <button
                className={`filter-btn verified ${statusFilter === 'verified' ? 'active' : ''}`}
                onClick={() => setStatusFilter('verified')}
              >
                Approved <span className="count">({statusCounts.verified})</span>
              </button>
              <button
                className={`filter-btn rejected ${statusFilter === 'rejected' ? 'active' : ''}`}
                onClick={() => setStatusFilter('rejected')}
              >
                Rejected <span className="count">({statusCounts.rejected})</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="employers-list">
        {filteredEmployers.length === 0 ? (
          <div className="empty-state">
            <HiCheckCircle />
            <h3>No {statusFilter === 'all' ? '' : statusFilter} employers found</h3>
            <p>{statusFilter === 'all' ? 'No employer applications to display' : `No ${statusFilter} employers at this time`}</p>
          </div>
        ) : (
          filteredEmployers
            .filter((employer) => employer.documents && employer.documents.length > 0)
            .map((employer) => (
              <EmployerCard
                key={employer._id}
                employer={employer}
                onClick={() => handleEmployerClick(employer)}
                loading={loading}
              />
            ))
        )}
      </div>

    </div>
  );
};

export default EmployersTab;
