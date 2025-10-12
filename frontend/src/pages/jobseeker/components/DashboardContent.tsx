import React from 'react';
import JobCard from './JobCard';
import { FiFilter as FilterIcon } from 'react-icons/fi';

interface Job {
  id: string;
  title: string;
  company: string;
  location: string;
  salary: string;
  type: string;
  description: string;
  requirements: string[];
  responsibilities: string[];
  posted: string;
  saved?: boolean;
  matchPercentage?: number;
  matchScore?: number;
}
import styles from '../Dashboard.enhanced.module.css';

type DashboardContentProps = {
  activeTab: string;
  jobs: Job[];
  onSaveJob: (id: string) => void;
  searchQuery: string;
  onSearchChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onFilterClick: () => void;
};

const DashboardContent: React.FC<DashboardContentProps> = ({
  activeTab,
  jobs,
  onSaveJob,
  searchQuery,
  onSearchChange,
  onFilterClick,
}) => {
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className={styles.overview}>
            <div className={styles.statsGrid}>
              {/* Add your overview stats here */}
            </div>
            <h3>Recommended Jobs</h3>
            <div className={styles.jobsGrid}>
              {jobs.slice(0, 3).map((job) => (
                <JobCard key={job.id} job={job} onSave={onSaveJob} />
              ))}
            </div>
          </div>
        );
      case 'jobs':
        return (
          <div className={styles.jobsTab}>
            <div className={styles.searchBar}>
              <input
                type="text"
                placeholder="Search jobs..."
                value={searchQuery}
                onChange={onSearchChange}
                className={styles.searchInput}
              />
              <button onClick={onFilterClick} className={styles.filterButton}>
                <FilterIcon />
                <span>Filters</span>
              </button>
            </div>
            <div className={styles.jobsList}>
              {jobs.map((job) => (
                <JobCard key={job.id} job={job} onSave={onSaveJob} />
              ))}
            </div>
          </div>
        );
      case 'applications':
        return <div>Applications content</div>;
      case 'profile':
        return <div>Profile content</div>;
      default:
        return null;
    }
  };

  return <main className={styles.mainContent}>{renderTabContent()}</main>;
};

export default DashboardContent;
