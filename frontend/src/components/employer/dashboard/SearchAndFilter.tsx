import React, { useState, useRef, useEffect } from 'react';
import { FiSearch, FiFilter, FiX, FiChevronDown } from 'react-icons/fi';
import Button from '../ui/Button';
import styles from './SearchAndFilter.module.css';

interface SearchAndFilterProps {
  searchTerm: string;
  onSearchChange: (term: string) => void;
  onFilterChange?: (filterType: string, value: string) => void;
  filters?: {
    status: string;
    jobId?: string;
  };
  onFilterClick?: () => void;
  showFilters?: boolean;
  onClearFilters?: () => void;
  activeFiltersCount?: number;
  placeholder?: string;
  jobPostings?: Array<{ id: string | number; title: string; }>;
}

const filterOptions = {
  status: [
    { value: '', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'initial_interview', label: 'Initial Interview' },
    { value: 'final_interview', label: 'Final Interview' },
    { value: 'rejected', label: 'Rejected' },
    { value: 'hired', label: 'Hired' }
  ]
};

export const SearchAndFilter: React.FC<SearchAndFilterProps> = ({
  searchTerm,
  onSearchChange,
  onFilterChange,
  filters = { status: '', jobId: '' },
  placeholder = 'Search applicants...',
  jobPostings = [],
}) => {

  const activeFiltersCount = Object.values(filters).filter(value => value !== '').length;

  const handleFilterChange = (filterType: string, value: string) => {
    if (onFilterChange) {
      onFilterChange(filterType, value);
    }
  };

  const clearAllFilters = () => {
    if (onFilterChange) {
      onFilterChange('status', '');
      onFilterChange('jobId', '');
    }
  };

  // Generate job options from job postings
  const jobOptions = [
    { value: '', label: 'All Job Posts' },
    ...jobPostings.map(job => ({
      value: job.id.toString(),
      label: job.title
    }))
  ];

  return (
    <div className={styles.searchAndFilter}>
      <div className={styles.searchContainer}>
        <FiSearch className={styles.searchIcon} />
        <input
          type="text"
          placeholder={placeholder}
          className={styles.searchInput}
          value={searchTerm}
          onChange={(e) => onSearchChange(e.target.value)}
        />
        {searchTerm && (
          <button className={styles.clearButton} onClick={() => onSearchChange('')}>
            <FiX />
          </button>
        )}
      </div>
      
      <div className={styles.filtersRow}>
        {/* Status Filter */}
        <div className={styles.filterDropdown}>
          <select
            className={`${styles.filterSelect} ${filters.status ? styles.hasValue : ''}`}
            value={filters.status}
            onChange={(e) => handleFilterChange('status', e.target.value)}
          >
            {filterOptions.status.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Job Posts Filter */}
        <div className={styles.filterDropdown}>
          <select
            className={`${styles.filterSelect} ${filters.jobId ? styles.hasValue : ''}`}
            value={filters.jobId || ''}
            onChange={(e) => handleFilterChange('jobId', e.target.value)}
          >
            {jobOptions.map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </div>

        {/* Clear All Button */}
        {activeFiltersCount > 0 && (
          <button className={styles.clearAllButton} onClick={clearAllFilters}>
            <FiX className={styles.clearIcon} />
            Clear all
          </button>
        )}
      </div>
    </div>
  );
};
