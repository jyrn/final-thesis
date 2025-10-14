import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { auth } from '../../../../config/firebase';
import styles from '../../../../pages/jobseeker/Dashboard.module.css';
import JobsList from '../../JobsList/JobsList';
import ApplicationJobModal from '../../ApplicationJobModal/ApplicationJobModal';
import { Job } from '../../../../types/Job';

interface Application {
  id: string;
  jobId: string;
  jobTitle: string;
  company: string;
  location: string;
  type: string;
  level?: string;
  department?: string;
  workplaceType?: string;
  salary: string;
  description?: string;
  status: 'pending' | 'approved' | 'rejected';
  appliedDate: string;
  updatedAt: string;
}

const ApplicationsTab: React.FC<any> = ({
  onSaveJob,
  onApplyJob,
  onJobClick,
  savedJobs,
  onOpenFilters,
}) => {
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobDetails, setJobDetails] = useState<{[key: string]: Job}>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<Application | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    fetchApplications();
  }, []);

  const fetchApplications = async () => {
    try {
      setLoading(true);
      const user = auth.currentUser;
      if (!user) {
        setError('User not authenticated');
        return;
      }

      const token = await user.getIdToken();
      const response = await fetch('http://localhost:3001/api/applications/jobseeker', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch applications');
      }

      const data = await response.json();
      if (data.success) {
        setApplications(data.data);
        // Fetch job details for each application
        await fetchJobDetails(data.data);
      } else {
        setError(data.error || 'Failed to fetch applications');
      }
    } catch (err) {      setError('Failed to load applications');
    } finally {
      setLoading(false);
    }
  };

  const fetchJobDetails = async (applications: Application[]) => {
    try {
      const user = auth.currentUser;
      if (!user) return;

      const token = await user.getIdToken();
      const jobDetailsMap: {[key: string]: Job} = {};

      // Fetch job details for each unique jobId
      const uniqueJobIds = Array.from(new Set(applications.map(app => app.jobId)));
      
      for (const jobId of uniqueJobIds) {
        try {
          const response = await fetch(`http://localhost:3001/api/jobs/${jobId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const jobData = await response.json();
            if (jobData.success) {
              jobDetailsMap[jobId] = jobData.data;
            }
          }
        } catch (jobErr) {          // Continue with other jobs even if one fails
        }
      }

      setJobDetails(jobDetailsMap);
    } catch (err) {    }
  };

  const handleViewApplication = (job: Job) => {
    // Find the corresponding application data
    const application = applications.find(app => app.jobId === job.id);
    if (application) {
      setSelectedApplication(application);
      setIsModalOpen(true);
    }
  };

  const handleWithdrawApplication = async (applicationId: string) => {
    try {
      const user = auth.currentUser;
      if (!user) {
        throw new Error('User not authenticated');
      }

      const token = await user.getIdToken();
      const response = await fetch(`http://localhost:3001/api/applications/${applicationId}/withdraw`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to withdraw application');
      }

      // Refresh applications list
      await fetchApplications();
    } catch (error) {      throw error; // Re-throw to let the modal handle the error
    }
  };

  // Convert applications to Job format for JobsList component
  const convertApplicationsToJobs = (): Job[] => {
    return applications.map(app => {
      const jobDetail = jobDetails[app.jobId];
      return {
        id: app.jobId,
        title: app.jobTitle,
        company: app.company,
        location: app.location,
        description: jobDetail?.description || app.description || 'No description available',
        type: app.type,
        level: app.level || '',
        department: app.department,
        workplaceType: app.workplaceType as 'On-site' | 'Hybrid' | 'Remote' | undefined,
        salary: app.salary || '₱10,000+',
        applied: true, // All applications are already applied
        status: app.status,
        appliedDate: app.appliedDate,
        postedDate: app.appliedDate, // Use applied date as posted date for display
        // Include additional job details from the fetched job data
        requirements: jobDetail?.requirements || [],
        benefits: jobDetail?.benefits || [],
        applicantCount: jobDetail?.applicantCount,
        salaryMin: jobDetail?.salaryMin,
        salaryMax: jobDetail?.salaryMax,
        educationLevel: jobDetail?.educationLevel,
        preferredCourse: jobDetail?.preferredCourse,
        // Include any other fields from the full job data
        ...jobDetail
      };
    });
  };

  if (loading) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.loadingState}>
          <p>Loading applications...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.errorState}>
          <p>Error: {error}</p>
          <button onClick={fetchApplications} className={styles.retryButton}>
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (applications.length === 0) {
    return (
      <div className={styles.tabContent}>
        <div className={styles.emptyState}>
          <h3>No Applications Yet</h3>
          <p>You haven't applied to any jobs yet. Start browsing and apply to jobs that interest you!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.tabContent}>
      <JobsList
        jobs={convertApplicationsToJobs()}
        title=""
        onSaveJob={onSaveJob}
        onApplyJob={onApplyJob}
        onJobClick={handleViewApplication}
        onViewApplication={handleViewApplication}
        savedJobs={savedJobs}
        onOpenFilters={onOpenFilters}
      />
      
      {selectedApplication && isModalOpen && createPortal(
        <ApplicationJobModal
          job={convertApplicationsToJobs().find(job => job.id === selectedApplication.jobId) || null}
          application={selectedApplication}
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setSelectedApplication(null);
          }}
          onViewJob={(jobId) => {
            // Close the application modal first
            setIsModalOpen(false);
            setSelectedApplication(null);
            // Navigate to job details
            onJobClick?.(jobId);
          }}
          onWithdrawApplication={handleWithdrawApplication}
        />,
        document.body
      )}
    </div>
  );
};

export default ApplicationsTab;
