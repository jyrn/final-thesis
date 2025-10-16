import React, { useState, useEffect } from 'react';
import { FiX, FiMail, FiCalendar, FiClock, FiMapPin, FiUser, FiPhone } from 'react-icons/fi';
import styles from './InterviewEmailModal.module.css';

interface InterviewEmailModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSend: (customMessage: string | null, interviewDetails: InterviewDetails, sendEmail: boolean) => void;
  applicantName: string;
  applicantEmail: string;
  jobTitle: string;
}

interface InterviewDetails {
  date?: string;
  time?: string;
  location?: string;
  contactPerson?: string;
  contactEmail?: string;
  contactPhone?: string;
  whatToBring?: string;
  dressCode?: string;
  additionalNotes?: string;
  nextSteps?: string;
}

export const InterviewEmailModal: React.FC<InterviewEmailModalProps> = ({
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
  const [isEditingDressCode, setIsEditingDressCode] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  
  // Default values
  const defaultNextSteps = 'Please confirm your attendance by replying to this email\nReview the job description and company information\nPrepare questions you\'d like to ask during the interview\nArrive 10-15 minutes early';
  const defaultWhatToBring = 'Updated resume/CV\nValid government-issued ID\nPortfolio or work samples (if applicable)\nAny relevant certificates or credentials';
  const defaultDressCode = 'Business Casual';
  
  const [nextSteps, setNextSteps] = useState(defaultNextSteps);
  const [interviewDetails, setInterviewDetails] = useState<InterviewDetails>({
    date: '',
    time: '',
    location: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    whatToBring: defaultWhatToBring,
    dressCode: defaultDressCode,
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
      const response = await fetch('https://skillsync-backend-gwwo.onrender.com/api/employers/interview-templates', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.data) {
          setNextSteps(data.data.nextSteps || defaultNextSteps);
          setInterviewDetails(prev => ({
            ...prev,
            whatToBring: data.data.whatToBring || defaultWhatToBring,
            dressCode: data.data.dressCode || defaultDressCode
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
        whatToBring: interviewDetails.whatToBring,
        dressCode: interviewDetails.dressCode,
        nextSteps: nextSteps
      };
      
      await fetch('https://skillsync-backend-gwwo.onrender.com/api/employers/interview-templates', {
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
      
      // Update applicant status to interview (without sending email through system)
      await onSend(null, { ...interviewDetails, nextSteps }, false);
      
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
    if (!interviewDetails.date || !interviewDetails.time) {
      alert('Please provide both interview date and time.');
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Save templates for future use
      await saveTemplates();
      
      await onSend(
        useCustomMessage ? customMessage : null,
        { ...interviewDetails, nextSteps },
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
    setIsEditingDressCode(false);
    setNextSteps('Please confirm your attendance by replying to this email\nReview the job description and company information\nPrepare questions you\'d like to ask during the interview\nArrive 10-15 minutes early');
    setInterviewDetails({
      date: '',
      time: '',
      location: '',
      contactPerson: '',
      contactEmail: '',
      contactPhone: '',
      whatToBring: 'Updated resume/CV\nValid government-issued ID\nPortfolio or work samples (if applicable)\nAny relevant certificates or credentials',
      dressCode: 'Business Casual',
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
              <h2>Interview Invitation</h2>
              <p className={styles.subtitle}>
                Send interview invitation to {applicantName} for {jobTitle}
              </p>
            </div>
          </div>
          <button className={styles.closeButton} onClick={handleClose}>
            <FiX size={24} />
          </button>
        </div>

        <div className={styles.modalBody}>
          {/* Required Interview Details at Top */}
          <div className={styles.requiredSection}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ margin: 0 }}>Interview Details</h3>
              <small style={{ color: '#6b7280', fontSize: '12px' }}>
                Pre-filled with defaults - edit as needed
              </small>
            </div>
            <div className={styles.detailsGrid}>
              <div className={styles.formGroup}>
                <label>
                  <FiCalendar size={16} />
                  Interview Date <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="date"
                  value={interviewDetails.date}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, date: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FiClock size={16} />
                  Interview Time <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <input
                  type="time"
                  value={interviewDetails.time}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, time: e.target.value })}
                  className={styles.input}
                  required
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <label>
                  <FiMapPin size={16} />
                  Location
                </label>
                <input
                  type="text"
                  value={interviewDetails.location}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, location: e.target.value })}
                  placeholder="e.g., Main Office, 123 Business St., or Zoom Meeting"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FiUser size={16} />
                  Contact Person
                </label>
                <input
                  type="text"
                  value={interviewDetails.contactPerson}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, contactPerson: e.target.value })}
                  placeholder="e.g., John Doe"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FiMail size={16} />
                  Contact Email
                </label>
                <input
                  type="email"
                  value={interviewDetails.contactEmail}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, contactEmail: e.target.value })}
                  placeholder="e.g., hr@company.com"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>
                  <FiPhone size={16} />
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={interviewDetails.contactPhone}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, contactPhone: e.target.value })}
                  placeholder="e.g., +63 912 345 6789"
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup} style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>What to Bring</label>
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
                    value={interviewDetails.whatToBring}
                    onChange={(e) => setInterviewDetails({ ...interviewDetails, whatToBring: e.target.value })}
                    className={styles.textarea}
                    rows={4}
                  />
                ) : (
                  <div className={styles.readOnlyBox}>
                    {interviewDetails.whatToBring?.split('\n').map((item, index) => (
                      <div key={index} className={styles.stepItem}>
                        • {item}
                      </div>
                    ))}
                  </div>
                )}
                <small className={styles.hint}>
                  Items the applicant should bring to the interview
                </small>
              </div>

              <div className={styles.formGroup}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label>Dress Code</label>
                  <button
                    type="button"
                    onClick={() => setIsEditingDressCode(!isEditingDressCode)}
                    className={styles.editButton}
                  >
                    {isEditingDressCode ? 'Done Editing' : 'Edit'}
                  </button>
                </div>
                {isEditingDressCode ? (
                  <input
                    type="text"
                    value={interviewDetails.dressCode}
                    onChange={(e) => setInterviewDetails({ ...interviewDetails, dressCode: e.target.value })}
                    placeholder="e.g., Business Casual, Formal, Smart Casual"
                    className={styles.input}
                  />
                ) : (
                  <div className={styles.readOnlyBox}>
                    {interviewDetails.dressCode}
                  </div>
                )}
              </div>

              <div className={styles.formGroup}>
                <label>Additional Notes (Optional)</label>
                <textarea
                  value={interviewDetails.additionalNotes}
                  onChange={(e) => setInterviewDetails({ ...interviewDetails, additionalNotes: e.target.value })}
                  placeholder="e.g., Parking information, building access instructions..."
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
                  Instructions for the applicant on what to do next
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
                  placeholder="Add a personalized message to the applicant..."
                  className={styles.textarea}
                  rows={5}
                />
                <small className={styles.hint}>
                  This message will be included in the email along with the interview details.
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
              {sendEmail ? 'Send Interview Invitation' : 'Move to Interview (No Email)'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
