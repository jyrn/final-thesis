"use client"

import type React from "react"
import { useState } from "react"
import { useNavigate } from "react-router-dom"
import styles from "./AuthPage.module.css"
import { FormErrors, EmployerDocuments as EmployerDocsType, CompanyDetails } from "./shared/authTypes"
import SuccessModal from '../../components/SuccessModal'
import VerificationPending from './VerificationPending'

const EmployerDocuments: React.FC = () => {
  const navigate = useNavigate()
  const [isUploading, setIsUploading] = useState(false)
  const [errors, setErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState("")
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showVerificationPending, setShowVerificationPending] = useState(false)
  const [currentStep, setCurrentStep] = useState(1)
  const totalSteps = 2

  const [employerDocuments, setEmployerDocuments] = useState<EmployerDocsType>({
    companyProfile: { file: null, uploaded: false },
    businessPermit: { file: null, uploaded: false },
    philjobnetRegistration: { file: null, uploaded: false },
    doleNoPendingCase: { file: null, uploaded: false },
  })

  const [companyDetails, setCompanyDetails] = useState<CompanyDetails>({
    contactPersonFirstName: '',
    contactPersonLastName: '',
    contactNumber: '',
    companyDescription: '',
    companyAddress: '',
    natureOfBusiness: ''
  })

  const handleEmployerDocumentChange = (documentType: keyof EmployerDocsType, file: File | null) => {
    if (file) {
      const allowedTypes = ["application/pdf"]
      if (!allowedTypes.includes(file.type)) {
        setErrors(prev => ({ ...prev, documents: "Please upload only PDF files." }))
        return
      }
      if (file.size > 10 * 1024 * 1024) {
        setErrors(prev => ({ ...prev, documents: "File size must be less than 10MB." }))
        return
      }
    }

    setEmployerDocuments(prev => ({
      ...prev,
      [documentType]: { file, uploaded: false },
    }))
    setErrors(prev => ({ ...prev, documents: undefined }))
  }

  const validateField = (fieldName: keyof CompanyDetails, value: string) => {
    let error = ''
    
    switch (fieldName) {
      case 'contactPersonFirstName':
        if (!value.trim()) {
          error = "First name is required"
        } else if (value.trim().length < 2) {
          error = "First name must be at least 2 characters"
        }
        break
        
      case 'contactPersonLastName':
        if (!value.trim()) {
          error = "Last name is required"
        } else if (value.trim().length < 2) {
          error = "Last name must be at least 2 characters"
        }
        break
        
      case 'contactNumber':
        if (!value.trim()) {
          error = "Contact number is required"
        } else if (!/^[+]?[0-9\s\-\(\)]{10,15}$/.test(value.trim())) {
          error = "Please enter a valid contact number (10-15 digits)"
        }
        break
        
      case 'companyDescription':
        if (!value.trim()) {
          error = "Company description is required"
        } else if (value.trim().length < 150) {
          error = `Company description must be at least 150 characters (${value.trim().length}/150)`
        } else if (value.trim().length > 1000) {
          error = "Company description must not exceed 1000 characters"
        }
        break
        
      case 'companyAddress':
        if (!value.trim()) {
          error = "Company address is required"
        } else if (value.trim().length < 10) {
          error = "Please provide a complete address"
        }
        break
        
      case 'natureOfBusiness':
        if (!value.trim()) {
          error = "Nature of business is required"
        }
        break
    }
    
    return error
  }

  const validateCompanyDetails = () => {
    const newErrors: FormErrors = {}
    
    Object.keys(companyDetails).forEach((key) => {
      const fieldName = key as keyof CompanyDetails
      const error = validateField(fieldName, companyDetails[fieldName])
      if (error) {
        newErrors[fieldName] = error
      }
    })
    
    return newErrors
  }

  const handleFieldChange = (fieldName: keyof CompanyDetails, value: string) => {
    setCompanyDetails(prev => ({ ...prev, [fieldName]: value }))
    
    // Real-time validation
    const error = validateField(fieldName, value)
    setErrors(prev => ({ 
      ...prev, 
      [fieldName]: error || undefined 
    }))
  }

  const handleNextStep = () => {
    if (currentStep === 1) {
      const detailsErrors = validateCompanyDetails()
      if (Object.keys(detailsErrors).length > 0) {
        setErrors(prev => ({ ...prev, ...detailsErrors }))
        return
      }
      setCurrentStep(2)
    }
  }

  const handlePreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleEmployerVerification = async (e: React.FormEvent) => {
    e.preventDefault()

    const allDocumentsUploaded = Object.values(employerDocuments).every(doc => doc.file !== null)
    const detailsErrors = validateCompanyDetails()

    if (!allDocumentsUploaded) {
      setErrors(prev => ({ ...prev, documents: "Please upload all required documents." }))
      return
    }
    
    if (Object.keys(detailsErrors).length > 0) {
      setErrors(prev => ({ ...prev, ...detailsErrors }))
      return
    }

    setIsUploading(true)
    try {
      // Create FormData for file upload
      const formData = new FormData()
      
      // Add each document to FormData
      Object.entries(employerDocuments).forEach(([key, doc]) => {
        if (doc.file) {
          formData.append(key, doc.file)
        }
      })
      
      // Add company details to FormData
      Object.entries(companyDetails).forEach(([key, value]) => {
        formData.append(key, value)
      })

      // Get Firebase auth token
      const { auth } = await import('../../config/firebase')
      const user = auth.currentUser
      if (!user) {
        throw new Error('User not authenticated')
      }

      const token = await user.getIdToken()

      // Upload documents to backend using cloud storage
      const response = await fetch('http://localhost:3001/api/employers/upload-documents-cloud', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      let result
      try {
        result = await response.json()
      } catch (jsonError) {        throw new Error(`Server error: ${response.status} ${response.statusText}`)
      }

      if (!response.ok) {        throw new Error(result.message || result.error || 'Failed to upload documents')
      }

      setShowVerificationPending(true)
    } catch (error) {      setErrors(prev => ({ 
        ...prev, 
        general: error instanceof Error ? error.message : "Failed to upload documents. Please try again." 
      }))
    } finally {
      setIsUploading(false)
    }
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    navigate("/employer/dashboard")
  }

  // If verification pending is shown, render that component instead
  if (showVerificationPending) {
    return <VerificationPending />
  }

  const renderDocumentUpload = (documentType: keyof EmployerDocsType, label: string, description: string) => {
    const document = employerDocuments[documentType]

    return (
      <div className={styles.inputGroup} key={documentType}>
        <label className={styles.inputLabel}>{label}</label>
        <p className={styles.documentDescription}>{description}</p>
        <label className={styles.uploadLabel}>
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => handleEmployerDocumentChange(documentType, e.target.files?.[0] || null)}
            className={styles.fileInput}
          />
          <div className={`${styles.uploadArea} ${document.file ? styles.success : ""} ${errors.documents ? styles.error : ""}`}>
            <div className={styles.uploadIcon}>
              <svg viewBox="0 0 24 24" fill="currentColor">
                <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
              </svg>
            </div>
            <div className={styles.uploadText}>
              <span className={styles.uploadMainText}>
                {document.file ? document.file.name : "Choose PDF Document"}
              </span>
              <span className={styles.uploadHint}>PDF files only - Required for verification</span>
            </div>
          </div>
        </label>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.leftPanel}>
          <div className={styles.visualContent}>
            <div className={styles.logoContainer}>
              <img src="/skillsync.png" alt="SkillSync Logo" className={styles.skillsyncLogo} />
            </div>
            <div className={styles.journeyText}>
              <h2>Verify Your Company</h2>
              <p>Upload required documents to verify your company before posting jobs</p>
            </div>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div className={styles.roleIndicator}>
              <div className={styles.roleInfo}>
                <div className={`${styles.roleIcon} ${styles.employer}`}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                  </svg>
                </div>
                <div className={styles.roleText}>
                  <span className={styles.roleLabel}>Signing up as</span>
                  <span className={styles.roleName}>Employer</span>
                </div>
              </div>
            </div>

            <div className={styles.stepIndicator}>
              <div className={styles.stepProgress}>
                <div className={`${styles.step} ${currentStep >= 1 ? styles.active : ''} ${currentStep > 1 ? styles.completed : ''}`}>
                  <div className={styles.stepNumber}>1</div>
                  <span className={styles.stepLabel}>Company Info</span>
                </div>
                <div className={styles.stepConnector}></div>
                <div className={`${styles.step} ${currentStep >= 2 ? styles.active : ''}`}>
                  <div className={styles.stepNumber}>2</div>
                  <span className={styles.stepLabel}>Documents</span>
                </div>
              </div>
            </div>

            <h1 className={styles.formTitle}>
              {currentStep === 1 ? 'Company Information' : 'Upload Documents'}
            </h1>
            <p className={styles.formSubtitle}>
              {currentStep === 1 
                ? 'Please provide detailed information about your company'
                : 'Upload the required documents for company verification'
              }
            </p>

            {errors.general && (
              <div className={styles.errorMessage}>
                <svg className={styles.messageIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.general}
              </div>
            )}


            <form onSubmit={currentStep === 2 ? handleEmployerVerification : (e) => e.preventDefault()} className={styles.form}>
              {currentStep === 1 && (
                <div className={styles.stepContent}>
                  <div className={styles.inputGroup}>
                    <label className={styles.inputLabel}>Contact Person *</label>
                    <div className={styles.nameFieldsRow}>
                      <div className={styles.nameField}>
                        <label className={styles.subLabel}>First Name</label>
                        <input
                          type="text"
                          value={companyDetails.contactPersonFirstName}
                          onChange={(e) => handleFieldChange('contactPersonFirstName', e.target.value)}
                          className={`${styles.input} ${errors.contactPersonFirstName ? styles.error : ''}`}
                          placeholder="First name"
                        />
                        {errors.contactPersonFirstName && (
                          <div className={styles.errorText}>{errors.contactPersonFirstName}</div>
                        )}
                      </div>
                      <div className={styles.nameField}>
                        <label className={styles.subLabel}>Last Name</label>
                        <input
                          type="text"
                          value={companyDetails.contactPersonLastName}
                          onChange={(e) => handleFieldChange('contactPersonLastName', e.target.value)}
                          className={`${styles.input} ${errors.contactPersonLastName ? styles.error : ''}`}
                          placeholder="Last name"
                        />
                        {errors.contactPersonLastName && (
                          <div className={styles.errorText}>{errors.contactPersonLastName}</div>
                        )}
                      </div>
                    </div>
                  </div>


              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Contact Number *</label>
                <input
                  type="tel"
                  value={companyDetails.contactNumber}
                  onChange={(e) => handleFieldChange('contactNumber', e.target.value)}
                  className={`${styles.input} ${errors.contactNumber ? styles.error : ''}`}
                  placeholder="e.g., +63 912 345 6789 "
                />
                {errors.contactNumber && (
                  <div className={styles.errorText}>{errors.contactNumber}</div>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Company Address *</label>
                <textarea
                  value={companyDetails.companyAddress}
                  onChange={(e) => handleFieldChange('companyAddress', e.target.value)}
                  className={`${styles.textarea} ${errors.companyAddress ? styles.error : ''}`}
                  placeholder="Enter complete company address including city and postal code"
                  rows={3}
                />
                {errors.companyAddress && (
                  <div className={styles.errorText}>{errors.companyAddress}</div>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Nature of Business *</label>
                <select
                  value={companyDetails.natureOfBusiness}
                  onChange={(e) => handleFieldChange('natureOfBusiness', e.target.value)}
                  className={`${styles.select} ${errors.natureOfBusiness ? styles.error : ''}`}
                >
                  <option value="">Select nature of business</option>
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
                {errors.natureOfBusiness && (
                  <div className={styles.errorText}>{errors.natureOfBusiness}</div>
                )}
              </div>

              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>Company Description *</label>
                <textarea
                  value={companyDetails.companyDescription}
                  onChange={(e) => handleFieldChange('companyDescription', e.target.value)}
                  className={`${styles.textarea} ${errors.companyDescription ? styles.error : ''}`}
                  placeholder="Provide a detailed description of your company, its services, mission, and what makes it unique (minimum 150 characters)"
                  rows={4}
                />
                <div className={`${styles.characterCount} ${companyDetails.companyDescription.length >= 150 ? styles.success : companyDetails.companyDescription.length > 0 ? styles.warning : ''}`}>
                  {companyDetails.companyDescription.length}/150 minimum (max 1000)
                </div>
                {errors.companyDescription && (
                  <div className={styles.errorText}>{errors.companyDescription}</div>
                )}
                  </div>
                </div>
              )}

              {currentStep === 2 && (
                <div className={styles.stepContent}>
                  {errors.documents && (
                    <div className={styles.errorMessage}>
                      <svg className={styles.messageIcon} viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                      </svg>
                      {errors.documents}
                    </div>
                  )}

                  {renderDocumentUpload(
                    "companyProfile",
                    "Upload Company Profile",
                    "Company profile document or business registration",
                  )}

                  {renderDocumentUpload(
                    "businessPermit",
                    "Upload Business Permit",
                    "Valid business permit from local government",
                  )}

                  {renderDocumentUpload(
                    "philjobnetRegistration",
                    "Upload PhilJobNet Registration",
                    "PhilJobNet registration certificate",
                  )}

                  {renderDocumentUpload(
                    "doleNoPendingCase",
                    "Upload DOLE No Pending Case Certificate",
                    "Certificate showing no pending labor cases",
                  )}
                </div>
              )}

              <div className={styles.formNavigation}>
                <div className={styles.navigationLeft}>
                  {currentStep > 1 && (
                    <span 
                      onClick={handlePreviousStep}
                      className={styles.previousLink}
                    >
                      ← Back to Company Information
                    </span>
                  )}
                </div>
                
                <div className={styles.navigationRight}>
                  {currentStep < totalSteps ? (
                    <button 
                      type="button" 
                      onClick={handleNextStep}
                      className={styles.primaryButton}
                    >
                      Next
                    </button>
                  ) : (
                    <button type="submit" className={styles.primaryButton} disabled={isUploading}>
                      {isUploading && <div className={styles.loadingSpinner}></div>}
                      {isUploading ? "Submitting..." : "Submit"}
                    </button>
                  )}
                </div>
              </div>

             
            </form>
          </div>
        </div>
      </div>

      <SuccessModal
        isOpen={showSuccessModal}
        title="Documents Submitted Successfully!"
        message="Your company documents have been uploaded successfully and are now under review by PESO. You will be notified once verification is complete. You can now access your employer dashboard."
        onClose={handleSuccessModalClose}
        buttonText="Go to Dashboard"
      />
    </div>
  )
}

export default EmployerDocuments
