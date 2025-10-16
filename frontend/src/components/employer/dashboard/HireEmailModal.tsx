import React, { useState, useEffect } from 'react';
import { FiX, FiMail, FiCalendar, FiClock, FiMapPin, FiUser, FiDollarSign } from 'react-icons/fi';
import styles from './InterviewEmailModal.module.css';

interface HireEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (customMessage: string | null, hireDetails: HireDetails, sendEmail: boolean) => void;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
}

interface HireDetails {
  startDate?: string;
  salary?: string;
  location?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatToBring?: string;
  additionalNotes?: string;
  nextSteps?: string;
}

export const HireEmailModal: React.FC<HireEmailModalProps> = ({
  isOpen,
  onClose,
  onSend,
  applicantName,
  applicantEmail,
  jobTitle
}) => {
  const [useCustomMessage, setUseCustomMessage] = useState(false);
  const [customMessage, setCustomMessage] = useState('');
  const [isEditingNextSteps, setIsEditingNextSteps] = useState(false);
  const [isEditingWhatToBring, setIsEditingWhatToBring] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Default values for hire confirmation
  const defaultNextSteps = 'Please confirm your acceptance by replying to this email\nComplete any required pre-employment paperwork\nAttend orientation on your first day\nBring required documents for HR processing';
  const defaultWhatToBring = 'Valid government-issued ID (2 copies)\nBirth certificate (photocopy)\nTIN ID or TIN number\nSSS/PhilHealth/Pag-IBIG numbers\n2x2 ID pictures (2 pcs)\nNBI Clearance (if required)\nMedical certificate';
  
  const [nextSteps, setNextSteps] = useState(defaultNextSteps);
  const [hireDetails, setHireDetails] = useState<HireDetails>({
    startDate: '',
    salary: '',
    location: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    whatToBring: defaultWhatToBring,
    additionalNotes: ''
  });
  const [sendEmail, setSendEmail] = useState(true);
  
  // Load saved templates from database when modal opens
  useEffect(() => {
    if (isOpen) {
      loadTemplatesFromDatabase();
    }
  }, [isOpen]);
  
  const loadTemplatesFromDatabase = async () => {
    try {
      const { auth } = await import('../../../config/firebase');
      const user = auth.currentUser;
      if (!user) return;
      
      const token = await user.getIdToken();
      const response = await fetch('https://skillsync-backend-gwwo.onrender.com/api/employers/hire-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setNextSteps(data.data.nextSteps || defaultNextSteps);
          setHireDetails(prev => ({
            ...prev,
            whatToBring: data.data.whatToBring || defaultWhatToBring
          }));
        }
      }
    } catch (error) {
      console.error('Error loading templates:', error);
    }
  };

  if (!isOpen) return null;

  const saveTemplates = async () => {
    try {
      const { auth } = await import('../../../config/firebase');
      const user = auth.currentUser;
      if (!user) return;
      
      const token = await user.getIdToken();
      const templates = {
        whatToBring: hireDetails.whatToBring,
        nextSteps: nextSteps
      };
      
      await fetch('https://skillsync-backend-gwwo.onrender.com/api/employers/hire-templates', {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(templates)
      });
    } catch (error) {
      console.error('Error saving templates:', error);
    }
  };

  const handleComposeInGmail = async () => {
    setIsLoading(true);
    
    try {
      // Save templates for future use
      await saveTemplates();
      
      // Update applicant status to hired (without sending email through system)
      await onSend(null, { ...hireDetails, nextSteps }, false);
      
      // Open Gmail with compose window and pre-filled recipient
      const gmailUrl = `https://mail.google.com/mail/?view=cm&to=${encodeURIComponent(applicantEmail)}`;
      window.open(gmailUrl, '_blank');
      
      // Close the modal after status update
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  const handleSend = async () => {
    // Validate required fields
    if (!hireDetails.startDate) {
      alert('Please provide the start date.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Save templates for future use
      await saveTemplates();
      
      await onSend(
        useCustomMessage ? customMessage : null,
        { ...hireDetails, nextSteps },
        sendEmail
      );
      
      // Close the modal after status update
      onClose();
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    setUseCustomMessage(false);
    setCustomMessage('');
    setIsEditingNextSteps(false);
    setIsEditingWhatToBring(false);
    setNextSteps(defaultNextSteps);
    setHireDetails({
      startDate: '',
      salary: '',
      location: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      whatToBring: defaultWhatToBring,
      additionalNotes: ''
    });
    setSendEmail(true);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={handleClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        {/* Loading Overlay */}
        {isLoading && (
          <div className={styles.loadingOverlay}>
            <div className={styles.spinner}></div>
            <p>Processing...</p>
          </div>
        )}
        
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <FiMail size={24} className={styles.headerIcon} />
            <div>
              <h2>Hire Confirmation</h2>
              <p className={styles.subtitle}>
                Send job offer to {applicantName} for {jobTitle}
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Required Hire Details at Top */}
          <div className={styles.requiredSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Employment Details</h3>
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Pre-filled with defaults - edit as needed
              </small>
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.formGroup}>
                <label>
                  <FiCalendar size={16} />
                  Start Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={hireDetails.startDate}
                  onChange={(e) => setHireDetails({ ...hireDetails, startDate: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FiDollarSign size={16} />
                  Salary (Optional)
                </label>
                <input
                  type="text"
                  value={hireDetails.salary}
                  onChange={(e) => setHireDetails({ ...hireDetails, salary: e.target.value })}
                  placeholder="e.g., ₱25,000/month"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>
                  <FiMapPin size={16} />
                  Work Location
                </label>
                <input
                  type="text"
                  value={hireDetails.location}
                  onChange={(e) => setHireDetails({ ...hireDetails, location: e.target.value })}
                  placeholder="e.g., Main Office, 123 Business St."
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FiUser size={16} />
                  HR Contact Person
                </label>
                <input
                  type="text"
                  value={hireDetails.contactPerson}
                  onChange={(e) => setHireDetails({ ...hireDetails, contactPerson: e.target.value })}
                  placeholder="e.g., Jane Smith"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FiMail size={16} />
                  HR Contact Email
                </label>
                <input
                  type="email"
                  value={hireDetails.contactEmail}
                  onChange={(e) => setHireDetails({ ...hireDetails, contactEmail: e.target.value })}
                  placeholder="e.g., hr@company.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FiClock size={16} />
                  HR Contact Phone
                </label>
                <input
                  type="tel"
                  value={hireDetails.contactPhone}
                  onChange={(e) => setHireDetails({ ...hireDetails, contactPhone: e.target.value })}
                  placeholder="e.g., +63 912 345 6789"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>Required Documents</label>
                  <button
                    type="button"
                    onClick={() => setIsEditingWhatToBring(!isEditingWhatToBring)}
                    className={styles.editButton}
                  >
                    {isEditingWhatToBring ? 'Done Editing' : 'Edit'}
                  </button>
                </div>
                {isEditingWhatToBring ? (
                  <textarea
                    value={hireDetails.whatToBring}
                    onChange={(e) => setHireDetails({ ...hireDetails, whatToBring: e.target.value })}
                    className={styles.textarea}
                    rows={6}
                  />
                ) : (
                  <div className={styles.readOnlyBox}>
                    {hireDetails.whatToBring?.split('\n').map((item, index) => (
                      <div key={index} className={styles.stepItem}>
                        • {item}
                      </div>
                    ))}
                  </div>
                )}
                <small className={styles.hint}>
                  Documents the new hire should bring on their first day
                </small>
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>Additional Notes (Optional)</label>
                <textarea
                  value={hireDetails.additionalNotes}
                  onChange={(e) => setHireDetails({ ...hireDetails, additionalNotes: e.target.value })}
                  placeholder="e.g., Parking information, dress code, reporting time..."
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              {/* Next Steps Section */}
              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>Next Steps</label>
                  <button
                    type="button"
                    onClick={() => setIsEditingNextSteps(!isEditingNextSteps)}
                    className={styles.editButton}
                  >
                    {isEditingNextSteps ? 'Done Editing' : 'Edit'}
                  </button>
                </div>
                {isEditingNextSteps ? (
                  <textarea
                    value={nextSteps}
                    onChange={(e) => setNextSteps(e.target.value)}
                    className={styles.textarea}
                    rows={4}
                  />
                ) : (
                  <div className={styles.readOnlyBox}>
                    {nextSteps.split('\n').map((step, index) => (
                      <div key={index} className={styles.stepItem}>
                        • {step}
                      </div>
                    ))}
                  </div>
                )}
                <small className={styles.hint}>
                  Instructions for the new hire on what to do next
                </small>
              </div>
            </div>
          </div>

          {/* Custom Message Section */}
          <div className={styles.customSection}>
            {/* Custom Message Toggle */}
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={useCustomMessage}
                  onChange={(e) => setUseCustomMessage(e.target.checked)}
                />
                <span>Add custom message</span>
              </label>
            </div>

            {/* Custom Message Textarea */}
            {useCustomMessage && (
              <div className={styles.formGroup}>
                <label>Custom Message</label>
                <textarea
                  value={customMessage}
                  onChange={(e) => setCustomMessage(e.target.value)}
                  placeholder="Add a personalized congratulatory message..."
                  className={styles.textarea}
                  rows={5}
                />
                <small className={styles.hint}>
                  This message will be included in the email along with the employment details.
                </small>
              </div>
            )}

            {/* Send Email Checkbox */}
            <div className={styles.checkboxGroup}>
              <label className={styles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={sendEmail}
                  onChange={(e) => setSendEmail(e.target.checked)}
                />
                <span>Send email notification to applicant</span>
              </label>
            </div>
          </div>
        </div>

        <div className={styles.modalFooter}>
          <button className={styles.cancelButton} onClick={handleClose}>
            Cancel
          </button>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button className={styles.gmailButton} onClick={handleComposeInGmail}>
              <FiMail size={18} />
              Compose in Gmail
            </button>
            <button className={styles.sendButton} onClick={handleSend}>
              <FiMail size={18} />
              {sendEmail ? 'Send Job Offer' : 'Mark as Hired (No Email)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
