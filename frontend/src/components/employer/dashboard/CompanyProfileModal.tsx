import React, { useState, useEffect } from 'react';
import { FiX, FiHome, FiMail, FiPhone, FiMapPin, FiGlobe, FiUpload, FiTrash2 } from 'react-icons/fi';
import styles from './SettingsModal.module.css';
import { getImageSrc } from '../../../utils/imageUtils';

interface CompanyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (profileData: CompanyProfileData) => void;
  initialData?: CompanyProfileData;
}

export interface CompanyProfileData {
  companyName: string;
  industry: string;
  website: string;
  email: string;
  phone: string;
  address: string;
  description: string;
  logo?: string;
}

export const CompanyProfileModal: React.FC<CompanyProfileModalProps> = ({
  isOpen,
  onClose,
  onSave,
  initialData
}) => {
  const [formData, setFormData] = useState<CompanyProfileData>({
    companyName: '',
    industry: 'Information Technology',
    website: '',
    email: '',
    phone: '',
    address: '',
    description: ''
  });

  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [profilePicture, setProfilePicture] = useState<string>('');

  // Update form data when initialData changes
  useEffect(() => {
    if (initialData) {
      setFormData(initialData);
    } else {
      // Set default values when no initial data
      setFormData({
        companyName: '',
        industry: 'Information Technology',
        website: '',
        email: '',
        phone: '',
        address: '',
        description: ''
      });
    }
  }, [initialData]);

  // Load current user's profile picture when modal opens
  useEffect(() => {
    if (isOpen) {
      const loadUserProfile = async () => {
        try {
          const { auth } = await import('../../../config/firebase');
          const token = await auth.currentUser?.getIdToken();
          
          const response = await fetch('http://localhost:3001/api/users/profile', {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          if (response.ok) {
            const data = await response.json();
            console.log('User profile data:', data); // Debug log
            setProfilePicture(data.user?.profilePicture || '');
          }
        } catch (error) {
        }
      };

      loadUserProfile();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleInputChange = (field: keyof CompanyProfileData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setUploadError('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      setUploadError('Image size must be less than 5MB');
      return;
    }

    setIsUploading(true);
    setUploadError(null);

    try {
      // Create FormData for cloud upload
      const formData = new FormData();
      formData.append('profilePicture', file);

      const response = await fetch('http://localhost:3001/api/users/profile-picture-cloud', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${await (await import('../../../config/firebase')).auth.currentUser?.getIdToken()}`
          // Don't set Content-Type for FormData - browser will set it with boundary
        },
        body: formData
      });

      if (response.ok) {
        const result = await response.json();
        console.log('✅ Upload response:', result); // Debug log
        
        if (result.success && result.profilePicture) {
          setProfilePicture(result.profilePicture);
          setUploadError('');
          
          // Dispatch global event to update profile picture across components
          window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
            detail: { profilePicture: result.profilePicture }
          }));
        } else {
          setUploadError('Upload response was invalid');
        }
      } else {
        const errorData = await response.json();
        setUploadError(errorData.error || 'Failed to upload profile picture');
      }
    } catch (error) {
      setUploadError('Failed to upload logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleLogoRemove = async () => {
    setIsUploading(true);
    setUploadError(null);

    try {
      const response = await fetch('http://localhost:3001/api/users/profile-picture-cloud', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${await (await import('../../../config/firebase')).auth.currentUser?.getIdToken()}`
        }
      });

      const data = await response.json();

      if (data.success) {
        setProfilePicture('');
        setUploadError('');
        
        // Dispatch global event to update profile picture across components
        window.dispatchEvent(new CustomEvent('profilePictureUpdated', {
          detail: { profilePicture: null }
        }));
      } else {
        setUploadError(data.error || 'Failed to remove profile picture');
      }
    } catch (error) {
      setUploadError('Failed to remove logo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
    onClose();
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <div className={styles.headerContent}>
            <FiHome className={styles.headerIcon} />
            <h2 className={styles.title}>Company Profile</h2>
          </div>
          <button className={styles.closeButton} onClick={onClose}>
            <FiX />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className={styles.modalBody}>
            {/* Company Logo Upload Section */}
            <div className={styles.profilePictureSection}>
              <h3 className={styles.sectionTitle}>Company Logo</h3>
              <div className={styles.profilePictureContainer}>
                <div className={styles.profilePictureCircle}>
                  {profilePicture ? (
                    <img 
                      src={getImageSrc(profilePicture)} 
                      alt="Company Logo" 
                      className={styles.profilePictureImage}
                      onLoad={() => console.log('✅ Image loaded successfully')}
                      onError={(e) => {
                        setUploadError('Image failed to load. Please try uploading again.');
                      }}
                    />
                  ) : (
                    <span className={styles.profilePictureInitials}>
                      {formData.companyName ? getInitials(formData.companyName) : 'CO'}
                    </span>
                  )}
                </div>
                <div className={styles.profilePictureActions}>
                  <input
                    type="file"
                    id="logo-upload"
                    accept="image/*"
                    onChange={handleLogoUpload}
                    style={{ display: 'none' }}
                    disabled={isUploading}
                  />
                  <label htmlFor="logo-upload" className={`${styles.uploadButton} ${isUploading ? styles.uploading : ''}`}>
                    <FiUpload size={16} />
                    {isUploading ? 'Uploading...' : (profilePicture ? 'Change Logo' : 'Upload Logo')}
                  </label>
                  {profilePicture && (
                    <button
                      type="button"
                      onClick={handleLogoRemove}
                      className={styles.removeButton}
                      disabled={isUploading}
                    >
                      <FiTrash2 size={16} />
                      Remove
                    </button>
                  )}
                </div>
              </div>
              {uploadError && (
                <div className={styles.errorMessage}>{uploadError}</div>
              )}
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label className={styles.label}>Company Name</label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.companyName}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>Industry</label>
                <select
                  className={styles.input}
                  value={formData.industry}
                  onChange={(e) => handleInputChange('industry', e.target.value)}
                  required
                >
                  <option value="">Select industry</option>
                  <option value="Information Technology">Information Technology</option>
                  <option value="Healthcare">Healthcare</option>
                  <option value="Manufacturing">Manufacturing</option>
                  <option value="Retail">Retail</option>
                  <option value="Construction">Construction</option>
                  <option value="Education">Education</option>
                  <option value="Finance">Finance</option>
                  <option value="Hospitality">Hospitality</option>
                  <option value="Transportation">Transportation</option>
                  <option value="Real Estate">Real Estate</option>
                  <option value="Agriculture">Agriculture</option>
                  <option value="Business Process Outsourcing">Business Process Outsourcing</option>
                  <option value="Telecommunications">Telecommunications</option>
                  <option value="Government">Government</option>
                  <option value="Non-Profit">Non-Profit</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FiGlobe className={styles.inputIcon} />
                  Website
                </label>
                <input
                  type="url"
                  className={styles.input}
                  value={formData.website}
                  onChange={(e) => handleInputChange('website', e.target.value)}
                  placeholder="https://yourcompany.ph"
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FiMail className={styles.inputIcon} />
                  Email
                </label>
                <input
                  type="email"
                  className={styles.input}
                  value={formData.email}
                  onChange={(e) => handleInputChange('email', e.target.value)}
                  required
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FiPhone className={styles.inputIcon} />
                  Phone
                </label>
                <input
                  type="tel"
                  className={styles.input}
                  value={formData.phone}
                  onChange={(e) => handleInputChange('phone', e.target.value)}
                />
              </div>

              <div className={styles.formGroup}>
                <label className={styles.label}>
                  <FiMapPin className={styles.inputIcon} />
                  Address
                </label>
                <input
                  type="text"
                  className={styles.input}
                  value={formData.address}
                  onChange={(e) => handleInputChange('address', e.target.value)}
                />
              </div>

              <div className={styles.formGroupFull}>
                <label className={styles.label}>Company Description</label>
                <textarea
                  className={styles.textarea}
                  value={formData.description}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  rows={4}
                  placeholder="Describe your company, mission, values, and what makes you a great employer in the Philippines..."
                />
              </div>
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" className={styles.cancelButton} onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className={styles.saveButton}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};