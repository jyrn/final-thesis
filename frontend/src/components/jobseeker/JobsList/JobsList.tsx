import React from 'react'
import JobCard from '../JobCard/JobCard'
import { FiFilter } from 'react-icons/fi'
import styles from './JobsList.module.css'
import { Job } from '../../../types/Job'

interface JobsListProps {
  jobs: Job[]
  title?: string
  onSaveJob?: (jobId: string | number) => void
  onApplyJob?: (jobId: string | number) => void
  onJobClick?: (job: Job) => void
  onViewApplication?: (job: Job) => void
  savedJobs?: Set<string | number>
  onOpenFilters?: () => void
}

const JobsList: React.FC<JobsListProps> = ({
  jobs,
  title = "Recommended Jobs",
  onSaveJob,
  onApplyJob,
  onJobClick,
  onViewApplication,
  savedJobs = new Set(),
  onOpenFilters
}) => {
  return (
    <div className={styles.jobsSection}>
      {(title || onOpenFilters) && (
        <div className={styles.sectionHeader}>
          {title && <h3 className={styles.sectionTitle}>{title}</h3>}
          {onOpenFilters && (
            <button 
              className={styles.filterButton}
              onClick={onOpenFilters}
              aria-label="Filter jobs"
            >
              <FiFilter className={styles.filterIcon} />
              <span>Filters</span>
            </button>
          )}
        </div>
      )}
      
      <div className={styles.jobsList}>
        {jobs.map((job) => (
          <JobCard
            key={job.id}
            job={job}
            onSave={onSaveJob}
            onApply={onApplyJob}
            onJobClick={onJobClick}
            onViewApplication={onViewApplication}
            isSaved={savedJobs.has(job.id)}
            companyLogo={job.companyLogo}
          />
        ))}
      </div>
    </div>
  )
}

export default JobsList
