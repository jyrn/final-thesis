import React, { useState } from 'react';
import { 
  FiX, 
  FiAlertCircle, 
  FiUsers, 
  FiCheck,
  FiUser
} from 'react-icons/fi';
import { Job } from '@/types/Job';
import { Applicant } from '@/types/dashboard';
import styles from './DeleteJobModal.module.css';

interface DeleteJobModalProps {
  job: Job | null;
  applicants: Applicant[];
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (jobId: string | number, hiredApplicantIds: string[]) => void;
}

export const DeleteJobModal: React.FC<DeleteJobModalProps> = ({
  job,
  applicants,
  isOpen,
  onClose,
  onConfirmDelete
}) => {
  const [selectedApplicants, setSelectedApplicants] = useState<string[]>([]);
  const [step, setStep] = useState<'warning' | 'selectApplicants'>('warning');

  if (!isOpen || !job) return null;

  // Filter applicants for this specific job
  const jobApplicants = applicants.filter(applicant => 
    applicant.position === job.title && 
    (applicant.status === 'pending' || applicant.status === 'interview')
  );

  const handleNext = () => {
    if (jobApplicants.length > 0) {
      setStep('selectApplicants');
    } else {
      handleConfirmDelete();
    }
  };

  const handleConfirmDelete = () => {
    onConfirmDelete(job.id, selectedApplicants);
    setStep('warning');
    setSelectedApplicants([]);
    onClose();
  };

  const toggleApplicantSelection = (applicantId: string) => {
    setSelectedApplicants(prev => 
      prev.includes(applicantId)
        ? prev.filter(id => id !== applicantId)
        : [...prev, applicantId]
    );
  };

  const handleClose = () => {
    setStep('warning');
    setSelectedApplicants([]);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {step === 'warning' && (
          <>
            <div className={styles.modalHeader}>
              <div className={styles.warningIcon}>
                <FiAlertCircle />
              </div>
              <button className={styles.closeButton} onClick={handleClose}>
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <h2 className={styles.title}>Delete Job Posting</h2>
              <p className={styles.description}>
                Are you sure you want to delete the job posting for <strong>"{job.title}"</strong>?
              </p>
              
              <div className={styles.warningBox}>
                <FiAlertCircle className={styles.warningBoxIcon} />
                <div>
                  <p className={styles.warningText}>
                    This action cannot be undone. The job posting will be permanently removed.
                  </p>
                  {jobApplicants.length > 0 && (
                    <p className={styles.applicantInfo}>
                      This job has <strong>{jobApplicants.length} applicant{jobApplicants.length !== 1 ? 's' : ''}</strong>.
                    </p>
                  )}
                  {jobApplicants.length > 0 && (
                    <p className={styles.applicantInfo}>
                      You'll need to select which applicants (if any) you want to mark as hired before deletion.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.cancelButton} onClick={handleClose}>
                Cancel
              </button>
              <button className={styles.continueButton} onClick={handleNext}>
                {jobApplicants.length > 0 ? 'Continue' : 'Delete Job'}
              </button>
            </div>
          </>
        )}

        {step === 'selectApplicants' && (
          <>
            <div className={styles.modalHeader}>
              <div className={styles.headerContent}>
                <FiUsers className={styles.headerIcon} />
                <h2 className={styles.title}>Select Hired Applicants</h2>
              </div>
              <button className={styles.closeButton} onClick={handleClose}>
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <p className={styles.description}>
                Before deleting this job posting, please select any applicants you want to mark as hired. 
                Unselected applicants will be automatically rejected.
              </p>

              <div className={styles.applicantsList}>
                {jobApplicants.map((applicant) => (
                  <div 
                    key={applicant.id} 
                    className={`${styles.applicantItem} ${selectedApplicants.includes(applicant.id) ? styles.selected : ''}`}
                    onClick={() => toggleApplicantSelection(applicant.id)}
                  >
                    <div className={styles.applicantInfo}>
                      <div className={styles.applicantAvatar}>
                        <FiUser />
                      </div>
                      <div className={styles.applicantDetails}>
                        <h4 className={styles.applicantName}>{applicant.name}</h4>
                        <p className={styles.applicantMeta}>
                          Applied {new Date(applicant.appliedDate).toLocaleDateString()} • 
                          {applicant.match}% match • {applicant.experience?.length || 0} years experience
                        </p>
                        <div className={styles.applicantSkills}>
                          {applicant.skills.slice(0, 3).map((skill, index) => (
                            <span key={index} className={styles.skillTag}>
                              {skill}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className={styles.selectionIndicator}>
                      {selectedApplicants.includes(applicant.id) && (
                        <FiCheck className={styles.checkIcon} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <div className={styles.selectionSummary}>
                <p>
                  <strong>{selectedApplicants.length}</strong> applicant{selectedApplicants.length !== 1 ? 's' : ''} selected to be hired
                </p>
                <p>
                  <strong>{jobApplicants.length - selectedApplicants.length}</strong> applicant{(jobApplicants.length - selectedApplicants.length) !== 1 ? 's' : ''} will be rejected
                </p>
              </div>
            </div>

            <div className={styles.modalActions}>
              <button className={styles.backButton} onClick={() => setStep('warning')}>
                Back
              </button>
              <button className={styles.deleteButton} onClick={handleConfirmDelete}>
                Delete Job & Update Applicants
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
