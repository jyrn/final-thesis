"use client"

import type React from "react"
import { useState, useEffect } from "react"
import { useNavigate, Link } from "react-router-dom"
import styles from "./AuthPage.module.css"
import RoleAgreementModal, { type UserRole } from "../../components/RoleAgreementModal"
import TermsModal from '../../components/TermsModal'
import SuccessModal from '../../components/SuccessModal'
import VerificationModal from '../../components/VerificationModal'
import ErrorModal from '../../components/ErrorModal'
import VerificationPendingModal from '../../components/VerificationPendingModal'
import { FormErrors, EmployerFormData, EmployerDocuments } from "./shared/authTypes"
import { validateEmail, validatePassword, validateName, validateCompanyName, validateConfirmPassword } from './shared/authValidation'
import firebaseAuthService from "../../services/firebaseAuthService"
import { apiService } from "../../services/apiService"
import { getAuthErrorDetails, extractErrorCode, AuthErrorDetails } from "../../utils/authErrorMessages"

const EmployerAuth: React.FC = () => {
  const navigate = useNavigate()
  const [isLogin, setIsLogin] = useState(true)
  const [registrationStep, setRegistrationStep] = useState(1)
  const [showAgreement, setShowAgreement] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [rememberMe, setRememberMe] = useState(false)
  
  const [errors, setErrors] = useState<FormErrors>({})
  const [loginErrors, setLoginErrors] = useState<FormErrors>({})
  const [successMessage, setSuccessMessage] = useState("")
  const [loginData, setLoginData] = useState({ email: "", password: "" })
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [fieldTouched, setFieldTouched] = useState<{ [key: string]: boolean }>({})
  const [realTimeErrors, setRealTimeErrors] = useState<FormErrors>({})
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showPrivacyModal, setShowPrivacyModal] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [privacyAccepted, setPrivacyAccepted] = useState(false)
  const [showSuccessModal, setShowSuccessModal] = useState(false)
  const [showVerificationModal, setShowVerificationModal] = useState(false)
  const [showErrorModal, setShowErrorModal] = useState(false)
  const [showVerificationPendingModal, setShowVerificationPendingModal] = useState(false)
  const [errorDetails, setErrorDetails] = useState<AuthErrorDetails | null>(null)

  const [formData, setFormData] = useState<EmployerFormData>({
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
  })

  const [employerDocuments, setEmployerDocuments] = useState<EmployerDocuments>({
    companyProfile: { file: null, uploaded: false },
    businessPermit: { file: null, uploaded: false },
    philjobnetRegistration: { file: null, uploaded: false },
    doleNoPendingCase: { file: null, uploaded: false },
  })

  useEffect(() => {
    // No need to load Google OAuth script as Firebase handles this
  }, [])

  const showError = (error: any) => {
    const errorCode = extractErrorCode(error)
    const details = getAuthErrorDetails(errorCode, error.message, 'employer')
    setErrorDetails(details)
    setShowErrorModal(true)
  }

  const handleErrorAction = (action: string) => {
    setShowErrorModal(false)
    switch (action) {
      case 'signup':
        setIsLogin(false)
        setErrors({})
        break
      case 'login':
        setIsLogin(true)
        setErrors({})
        break
      case 'forgot-password':
        navigate('/auth/forgot-password')
        break
      case 'verify-email':
        // Resend verification email logic
        break
      case 'retry':
        // Just close modal, user can try again
        break
    }
  }

  const handleGoogleSignIn = async (role: string, isLogin: boolean) => {
    setIsUploading(true)
    try {
      // For registration, we need to handle the fact that Google OAuth will create a Firebase account
      // even if the email already exists with email/password provider
      if (!isLogin) {
        // First, get Google account info without creating backend record
        const response = await firebaseAuthService.signInWithGoogle("employer")
        
        if (response.success && response.user) {
          // Check if this email is already registered in our backend
          const emailCheck = await apiService.checkEmailExists(response.user.email!, 'employer')
          
          // If account exists in backend, this means user previously registered with email/password
          if (emailCheck.data?.exists) {
            // Delete the newly created Google provider account from Firebase
            try {
              await response.user.delete()
            } catch (deleteError) {              // If we can't delete, at least sign out
              await firebaseAuthService.signOut()
            }
            
            if (emailCheck.data.crossRoleConflict) {
              showError({
                code: 'role-mismatch',
                message: `This email is already registered as a ${emailCheck.data.user.role}. Each email can only be used for one role. Please use a different email or login with the existing ${emailCheck.data.user.role} account.`
              })
              return
            }
            
            const userData = emailCheck.data?.user || emailCheck.data
            if (userData?.emailVerified) {
              showError({
                code: 'auth/email-already-in-use',
                message: "An account with this email already exists. Please login with your email and password instead."
              })
            } else {
              showError({
                code: 'account-not-verified',
                message: "An account with this email exists but is not verified. Please check your email for the verification link or try logging in with your email and password."
              })
            }
            return
          }
          
          // Create user profile in backend for new Google account
          const profileResponse = await apiService.createUserProfile({
            uid: response.user.uid,
            email: response.user.email!,
            role: "employer",
            companyName: response.user.displayName || '',
            emailVerified: response.user.emailVerified
          })
          
          if (!profileResponse.success) {
            // Delete the Firebase account if backend profile creation fails
            try {
              await response.user.delete()
            } catch (deleteError) {
              await firebaseAuthService.signOut()
            }
            throw new Error(profileResponse.error || "Failed to create user profile")
          }
          
          // Send OTP for email verification (Google accounts also need verification)
          const otpResponse = await apiService.sendOTP(response.user.email!);
          if (!otpResponse.success) {
            throw new Error(otpResponse.error || "Failed to send verification OTP");
          }
          
          // Always redirect to OTP verification for Google sign-ups
          navigate(`/auth/verify-otp?email=${encodeURIComponent(response.user.email!)}&role=employer`)
        } else {
          throw new Error(response.error || "Failed to sign up with Google")
        }
      } else {
        // For login, check role conflicts first
        const tempResponse = await firebaseAuthService.signInWithGoogle("employer")
        
        if (tempResponse.success && tempResponse.user) {
          // Check if this email is registered in our backend
          const emailCheck = await apiService.checkEmailExists(tempResponse.user.email!, 'employer')
          
          // If user doesn't exist in backend, they need to register first
          if (!emailCheck.success || !emailCheck.data.exists) {
            await firebaseAuthService.signOut()
            showError({
              code: 'account-not-found',
              message: "No account found with this Google email. Please register first by clicking 'Sign up with Google' above."
            })
            return
          }
          
          // Check for role conflicts
          if (emailCheck.data.crossRoleConflict) {
            await firebaseAuthService.signOut()
            showError({
              code: 'role-mismatch',
              message: `This Google email is registered as a ${emailCheck.data.user.role}. Please use the ${emailCheck.data.user.role} login page or use a different email.`
            })
            return
          }
          
          // Check if user is verified and redirect accordingly
          if (!emailCheck.data.user.emailVerified) {
            // Send OTP for verification and redirect to OTP page
            const otpResponse = await apiService.sendOTP(tempResponse.user.email!);
            if (otpResponse.success) {
              navigate(`/auth/verify-otp?email=${encodeURIComponent(tempResponse.user.email!)}&role=employer`)
            } else {
              showError({
                code: 'otp-send-failed',
                message: "Failed to send verification code. Please try again."
              })
            }
            return
          }
          
          // Check employer account status before allowing dashboard access
          try {
            const statusResponse = await apiService.get('/employers/account-status')
            
            if (statusResponse.success && statusResponse.data) {
              const { accountStatus } = statusResponse.data
              
              if (accountStatus === 'pending') {
                navigate('/auth/verification-pending')
                return
              } else if (accountStatus === 'rejected') {
                showError({
                  code: 'account-rejected',
                  message: 'Your employer account has been rejected. Please contact support for assistance.'
                })
                await firebaseAuthService.signOut()
                return
              } else if (accountStatus === 'suspended') {
                showError({
                  code: 'account-suspended',
                  message: 'Your employer account has been suspended. Please contact support for assistance.'
                })
                await firebaseAuthService.signOut()
                return
              } else if (accountStatus === 'verified') {
                // Continue to dashboard redirect below
              } else {
                navigate('/auth/verification-pending')
                return
              }
            } else {
              navigate('/auth/verification-pending')
              return
            }
          } catch (error: any) {            // Check if it's a 404 error (no employer profile found)
            if (error.response && error.response.status === 404) {
              navigate('/auth/employer/documents')
              return
            }
            
            navigate('/auth/verification-pending')
            return
          }
          
          // Only verified employers reach here
          navigate("/employer/dashboard")
        } else {
          showError(tempResponse)
        }
      }
    } catch (error: any) {      showError(error)
    } finally {
      setIsUploading(false)
    }
  }

  const validateField = (fieldName: string, value: string) => {
    const newRealTimeErrors = { ...realTimeErrors }
    
    switch (fieldName) {
      case 'email':
        const emailError = validateEmail(value)
        if (emailError) {
          newRealTimeErrors.email = emailError
        } else {
          delete newRealTimeErrors.email
        }
        break
      case 'password':
        const passwordError = validatePassword(value)
        if (passwordError) {
          newRealTimeErrors.password = passwordError
        } else {
          delete newRealTimeErrors.password
        }
        break
      case 'companyName':
        const companyError = validateCompanyName(value)
        if (companyError) {
          newRealTimeErrors.companyName = companyError
        } else {
          delete newRealTimeErrors.companyName
        }
        break
      case 'confirmPassword':
        const confirmPasswordError = validateConfirmPassword(formData.password, value)
        if (confirmPasswordError) {
          newRealTimeErrors.confirmPassword = confirmPasswordError
        } else {
          delete newRealTimeErrors.confirmPassword
        }
        break
    }
    
    setRealTimeErrors(newRealTimeErrors)
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    const emailError = validateEmail(formData.email)
    if (emailError) newErrors.email = emailError

    const passwordError = validatePassword(formData.password)
    if (passwordError) newErrors.password = passwordError

    if (!isLogin) {
      const companyError = validateCompanyName(formData.companyName)
      if (companyError) newErrors.companyName = companyError

      const confirmPasswordError = validateConfirmPassword(formData.password, formData.confirmPassword)
      if (confirmPasswordError) newErrors.confirmPassword = confirmPasswordError
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({ ...prev, [name]: type === "checkbox" ? checked : value }))
    
    // Clear errors when user starts typing
    if (errors[name as keyof FormErrors]) {
      setErrors(prev => ({ ...prev, [name]: undefined }))
    }
    
    // Clear real-time errors when user starts typing
    if (realTimeErrors[name as keyof FormErrors]) {
      setRealTimeErrors(prev => ({ ...prev, [name]: undefined }))
    }
    
    // Real-time validation while typing
    setFieldTouched(prev => ({ ...prev, [name]: true }))
    validateField(name, value)
  }

  const handleInputFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFieldTouched(prev => ({ ...prev, [name]: true }))
    validateField(name, value)
  }

  const validateLoginForm = () => {
    const newErrors: FormErrors = {}
    
    if (!formData.email) {
      newErrors.email = "Email is required"
    } else {
      const emailError = validateEmail(formData.email)
      if (emailError) {
        newErrors.email = emailError
      }
    }
    
    if (!formData.password) {
      newErrors.password = "Password is required"
    }
    
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  // Check if login form is valid for button state
  const isLoginFormValid = () => {
    return formData.email.trim() !== '' && 
           formData.password.trim() !== '' && 
           !realTimeErrors.email && 
           !realTimeErrors.password
  }

  // Check if registration form is valid for button state
  const isRegistrationFormValid = () => {
    return formData.email.trim() !== '' && 
           formData.password.trim() !== '' && 
           formData.confirmPassword.trim() !== '' && 
           formData.companyName.trim() !== '' && 
           termsAccepted && 
           privacyAccepted && 
           !realTimeErrors.email && 
           !realTimeErrors.password && 
           !realTimeErrors.confirmPassword && 
           !realTimeErrors.companyName
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateLoginForm()) return
    
    setIsUploading(true)
    try {
      // Check if email exists and validate role before attempting login
      const emailCheck = await apiService.checkEmailExists(formData.email, 'employer')
      
      if (emailCheck.success && emailCheck.data.exists) {
        if (emailCheck.data.crossRoleConflict) {
          showError({
            code: 'role-mismatch',
            message: `This email is registered as a ${emailCheck.data.user.role}. Please use the ${emailCheck.data.user.role} login page or use a different email.`
          })
          return
        }
      }
      
      const response = await firebaseAuthService.signInWithEmailPassword(
        formData.email, 
        formData.password
      )
      
      if (response.success && response.user) {
        // Check if user is verified before allowing login
        if (!response.user.emailVerified) {
          await firebaseAuthService.signOut()
          showError({
            code: 'account-not-verified',
            message: "Please verify your email before logging in. Check your inbox for the verification code."
          })
          return
        }
        
        // Check employer account status before allowing dashboard access
        try {
          const statusResponse = await apiService.get('/employers/account-status')
          
          if (statusResponse.success && statusResponse.data) {
            const { accountStatus } = statusResponse.data
            
            if (accountStatus === 'pending') {
              navigate('/auth/verification-pending')
              return
            } else if (accountStatus === 'rejected') {
              showError({
                code: 'account-rejected',
                message: 'Your employer account has been rejected. Please contact support for assistance.'
              })
              await firebaseAuthService.signOut()
              return
            } else if (accountStatus === 'suspended') {
              showError({
                code: 'account-suspended',
                message: 'Your employer account has been suspended. Please contact support for assistance.'
              })
              await firebaseAuthService.signOut()
              return
            } else if (accountStatus === 'verified') {
              // Continue to dashboard redirect below
            } else {
              navigate('/auth/verification-pending')
              return
            }
          } else {
            navigate('/auth/verification-pending')
            return
          }
        } catch (error) {          navigate('/auth/verification-pending')
          return
        }
        
        // Only verified employers reach here
        navigate("/employer/dashboard")
      } else {
        showError(response)
      }
    } catch (error: any) {
      showError(error)
    } finally {
      setIsUploading(false)
    }
  }

  const handleLoginSuccessModalClose = () => {
    setShowSuccessModal(false)
    navigate("/employer/dashboard")
  }

  const handleVerificationPendingModalClose = () => {
    setShowVerificationPendingModal(false)
    // Reset form and redirect to employer login
    setIsLogin(true)
    setRegistrationStep(1)
    setFormData({
      email: '',
      password: '',
      confirmPassword: '',
      companyName: '',
    })
    setEmployerDocuments({
      companyProfile: { file: null, uploaded: false },
      businessPermit: { file: null, uploaded: false },
      philjobnetRegistration: { file: null, uploaded: false },
      doleNoPendingCase: { file: null, uploaded: false },
    })
    // Stay on employer auth page instead of going to role selection
    // navigate('/auth') - removed to stay on current page
  }

  const handleBasicRegistration = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return

    setIsUploading(true)
    try {
      // Check if email already exists (with role-based conflict detection)
      const emailCheck = await apiService.checkEmailExists(formData.email, 'employer')
      
      if (emailCheck.success && emailCheck.data.exists) {
        if (emailCheck.data.crossRoleConflict) {
          throw new Error(`This email is already registered as a ${emailCheck.data.user.role}. Each email can only be used for one role. Please use a different email or login with the existing ${emailCheck.data.user.role} account.`)
        }
        
        if (emailCheck.data.emailVerified) {
          throw new Error("An account with this email already exists. Please login instead.")
        } else {
          throw new Error("An account with this email exists but is not verified. Please check your email for verification link or try logging in.")
        }
      }

      // Create Firebase user only if email doesn't exist
      const firebaseResponse = await firebaseAuthService.registerWithEmailPassword(
        formData.email, 
        formData.password,
        {
          role: 'employer',
          companyName: formData.companyName,
          emailVerified: false
        }
      )
      
      if (!firebaseResponse.success || !firebaseResponse.user) {
        throw new Error(firebaseResponse.error || "Failed to create account")
      }

      // Create user profile in backend
      const profileResponse = await apiService.createUserProfile({
        uid: firebaseResponse.user.uid,
        email: formData.email,
        role: "employer",
        companyName: formData.companyName,
        emailVerified: false
      })
      
      if (!profileResponse.success) {
        throw new Error(profileResponse.error || "Failed to create user profile")
      }
      
      // Send OTP for email verification
      const otpResponse = await apiService.sendOTP(formData.email);
      if (!otpResponse.success) {
        throw new Error(otpResponse.error || "Failed to send verification OTP");
      }
      
      // Redirect to OTP verification page
      navigate(`/auth/verify-otp?email=${encodeURIComponent(formData.email)}&role=employer`)

    } catch (error: any) {      showError(error);
    } finally {
      setIsUploading(false);
    }
  }

  const handleDocumentUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    
    const newErrors: FormErrors = {}

    // Validate document uploads
    if (!employerDocuments.companyProfile.file) {
      newErrors.companyProfile = 'Company profile is required'
    }
    if (!employerDocuments.businessPermit.file) {
      newErrors.businessPermit = 'Business permit is required'
    }
    if (!employerDocuments.philjobnetRegistration.file) {
      newErrors.philjobnetRegistration = 'PhilJobNet registration is required'
    }
    if (!employerDocuments.doleNoPendingCase.file) {
      newErrors.doleNoPendingCase = 'DOLE no pending case is required'
    }

    setErrors(newErrors)

    if (Object.keys(newErrors).length === 0) {
      try {
        setIsUploading(true)
        
        // Create FormData for file uploads
        const formDataToSend = new FormData()
        formDataToSend.append('email', formData.email)
        formDataToSend.append('companyName', formData.companyName)
        
        // Only append files if they exist
        if (employerDocuments.companyProfile.file) {
          formDataToSend.append('companyProfile', employerDocuments.companyProfile.file)
        }
        if (employerDocuments.businessPermit.file) {
          formDataToSend.append('businessPermit', employerDocuments.businessPermit.file)
        }
        if (employerDocuments.philjobnetRegistration.file) {
          formDataToSend.append('philjobnetRegistration', employerDocuments.philjobnetRegistration.file)
        }
        if (employerDocuments.doleNoPendingCase.file) {
          formDataToSend.append('doleNoPendingCase', employerDocuments.doleNoPendingCase.file)
        }

        const response = await fetch('http://localhost:3001/api/auth/employer/documents', {
          method: 'POST',
          body: formDataToSend,
          // Don't set Content-Type header, let the browser set it with the correct boundary
          headers: {
            'Accept': 'application/json',
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Document upload failed')
        }
        
        // Show verification pending modal instead of success message
        setShowVerificationPendingModal(true)
      } catch (error) {        setErrors({
          ...errors,
          form: error instanceof Error ? error.message : 'Failed to upload documents. Please try again.'
        })
      } finally {
        setIsUploading(false)
      }
    }
  }

  const handleEmployerDocumentChange = (documentType: keyof EmployerDocuments, file: File | null) => {
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

  const handleEmployerVerification = async () => {
    const allDocumentsUploaded = Object.values(employerDocuments).every(doc => doc.file !== null)

    if (!allDocumentsUploaded) {
      setErrors(prev => ({ ...prev, documents: "Please upload all required documents." }))
      return
    }

    setIsUploading(true)
    try {
      // Simulate document upload
      await new Promise(resolve => setTimeout(resolve, 3000))
      setShowVerificationModal(true)
    } catch (error) {
      setErrors(prev => ({ ...prev, general: "Failed to upload documents. Please try again." }))
    } finally {
      setIsUploading(false)
    }
  }

  const handleVerificationModalClose = () => {
    setShowVerificationModal(false)
    navigate("/employer/dashboard")
  }

  const handleSuccessModalClose = () => {
    setShowSuccessModal(false)
    navigate("/employer/dashboard")
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.leftPanel}>
          <div className={styles.visualContent}>
            <div className={styles.logoContainer}>
              <img src="/peso-logo.png" alt="PESO Logo" className={styles.pesoLogo} />
            </div>
            <div className={styles.journeyText}>
              <h2>{registrationStep === 2 ? "Verify Your Company" : "Start Your Journey with Us"}</h2>
              <p>{registrationStep === 2 ? "Upload required documents to verify your company" : "Connect with talented job seekers"}</p>
            </div>
            <div className={styles.decorativeCircle1}></div>
            <div className={styles.decorativeCircle2}></div>
            <div className={styles.decorativeCircle3}></div>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div className={styles.roleIndicator}>
              <div className={styles.roleInfo}>
                <div className={styles.roleIcon}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z" />
                  </svg>
                </div>
                <div className={styles.roleText}>
                  <span className={styles.roleLabel}>Signing up as</span>
                  <span className={styles.roleName}>Employer</span>
                </div>
              </div>
              <button type="button" className={styles.changeRoleButton} onClick={() => window.location.href = "/"}>
                Change Role
              </button>
            </div>

            {errors.general && (
              <div className={styles.errorMessage}>
                <svg className={styles.messageIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {errors.general}
              </div>
            )}

            {successMessage && (
              <div className={styles.successMessage}>
                <svg className={styles.messageIcon} viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
            )}



            {isLogin ? (
              <form onSubmit={handleLogin} className={styles.form}>
                <div className={styles.formHeader}>
                  <h1 className={styles.formTitle}>Welcome Back</h1>
                  <p className={styles.formSubtitle}>Sign in to your employer account</p>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Email</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      className={`${styles.input} ${styles.hasIcon} ${errors.email ? styles.error : ""}`}
                      placeholder="Enter your email"
                      required
                    />
                    <span className={`${styles.inputIcon} ${styles.emailIcon}`}>📧</span>
                  </div>
                  {(errors.email || realTimeErrors.email) && (
                    <div className={styles.inputError}>
                      {errors.email || realTimeErrors.email}
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      className={`${styles.input} ${styles.hasIcon} ${styles.hasEyeButton} ${errors.password ? styles.error : ""}`}
                      placeholder="Enter your password"
                      required
                    />
                    <span className={`${styles.inputIcon} ${styles.passwordIcon}`}>🔒</span>
                    <button
                      type="button"
                      className={styles.eyeButton}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {(errors.password || realTimeErrors.password) && (
                    <div className={styles.inputError}>
                      {errors.password || realTimeErrors.password}
                    </div>
                  )}
                  {isLogin && (
                    <div className={styles.forgotPasswordContainer}>
                      <Link to="/auth/forgot-password" className={styles.forgotPasswordLink}>
                        Forgot Password?
                      </Link>
                    </div>
                  )}
                </div>

                <button 
                  type="submit" 
                  className={styles.primaryButton} 
                  disabled={isUploading || !isLoginFormValid()}
                >
                  {isUploading ? "Signing In..." : "Sign In"}
                </button>

                <button type="button" onClick={() => handleGoogleSignIn("employer", true)} className={styles.googleButton}>
                  Sign in with Google
                </button>

                <div className={styles.authToggle}>
                  <span>Don't have an account? </span>
                  <button type="button" onClick={() => {
                    setIsLogin(false)
                    setErrors({})
                    setRealTimeErrors({})
                  }} className={styles.toggleLink}>
                    Sign up
                  </button>
                </div>
              </form>
            ) : registrationStep === 1 ? (
              <form onSubmit={handleBasicRegistration} className={styles.form}>
                <div className={styles.formHeader}>
                  <h1 className={styles.formTitle}>Create Employer Account</h1>
                  <p className={styles.formSubtitle}>Join our platform to post jobs and find talent</p>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Company Name</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="text"
                      name="companyName"
                      value={formData.companyName}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      className={`${styles.input} ${styles.hasIcon} ${errors.companyName ? styles.error : ""}`}
                      placeholder="Enter your company name"
                      required
                    />
                    <span className={`${styles.inputIcon} ${styles.nameIcon}`}>🏢</span>
                  </div>
                  {(errors.companyName || realTimeErrors.companyName) && (
                    <div className={styles.inputError}>
                      {errors.companyName || realTimeErrors.companyName}
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Email</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      className={`${styles.input} ${styles.hasIcon} ${errors.email ? styles.error : ""}`}
                      placeholder="Enter your email"
                      required
                    />
                    <span className={`${styles.inputIcon} ${styles.emailIcon}`}>📧</span>
                  </div>
                  {(errors.email || realTimeErrors.email) && (
                    <div className={styles.inputError}>
                      {errors.email || realTimeErrors.email}
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      className={`${styles.input} ${styles.hasIcon} ${styles.hasEyeButton} ${errors.password ? styles.error : ""}`}
                      placeholder="Enter your password"
                      required
                    />
                    <span className={`${styles.inputIcon} ${styles.passwordIcon}`}>🔒</span>
                    <button
                      type="button"
                      className={styles.eyeButton}
                      onClick={() => setShowPassword(!showPassword)}
                    >
                      {showPassword ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {(errors.password || realTimeErrors.password) && (
                    <div className={styles.inputError}>
                      {errors.password || realTimeErrors.password}
                    </div>
                  )}
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Confirm Password</label>
                  <div className={styles.inputWrapper}>
                    <input
                      type={showConfirmPassword ? "text" : "password"}
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleInputChange}
                      onFocus={handleInputFocus}
                      className={`${styles.input} ${styles.hasIcon} ${styles.hasEyeButton} ${errors.confirmPassword ? styles.error : ""}`}
                      placeholder="Confirm your password"
                      required
                    />
                    <span className={`${styles.inputIcon} ${styles.passwordIcon}`}>🔒</span>
                    <button
                      type="button"
                      className={styles.eyeButton}
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    >
                      {showConfirmPassword ? (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46C3.08 8.3 1.78 10.02 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78l3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z"/>
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
                        </svg>
                      )}
                    </button>
                  </div>
                  {(errors.confirmPassword || realTimeErrors.confirmPassword) && (
                    <div className={styles.inputError}>
                      {errors.confirmPassword || realTimeErrors.confirmPassword}
                    </div>
                  )}
                </div>

                <div className={styles.termsSection}>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="termsAccepted"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <label htmlFor="termsAccepted" className={styles.checkboxLabel}>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowTermsModal(true)}
                        className={styles.linkButton}
                      >
                        Terms and Conditions
                      </button>
                    </label>
                  </div>
                  <div className={styles.checkboxGroup}>
                    <input
                      type="checkbox"
                      id="privacyAccepted"
                      checked={privacyAccepted}
                      onChange={(e) => setPrivacyAccepted(e.target.checked)}
                      className={styles.checkbox}
                    />
                    <label htmlFor="privacyAccepted" className={styles.checkboxLabel}>
                      I agree to the{' '}
                      <button
                        type="button"
                        onClick={() => setShowPrivacyModal(true)}
                        className={styles.linkButton}
                      >
                        Privacy Policy
                      </button>
                    </label>
                  </div>
                </div>

                <button 
                  type="submit" 
                  className={styles.primaryButton} 
                  disabled={isUploading || !isRegistrationFormValid()}
                >
                  {isUploading && <div className={styles.loadingSpinner}></div>}
                  {isUploading ? "Creating Account..." : "Create Account"}
                </button>

                <button type="button" onClick={() => handleGoogleSignIn("employer", false)} className={styles.googleButton}>
                  Sign up with Google
                </button>

                <div className={styles.authToggle}>
                  <span>Already have an account? </span>
                  <button type="button" onClick={() => {
                    setIsLogin(true)
                    setErrors({})
                    setRealTimeErrors({})
                  }} className={styles.toggleLink}>
                    Sign in
                  </button>
                </div>
              </form>
            ) : (
              <div className={styles.form}>
                <div className={styles.formHeader}>
                  <h1 className={styles.formTitle}>Upload Required Documents</h1>
                  <p className={styles.formSubtitle}>Please upload the following documents to verify your company</p>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Company Profile</label>
                  <p className={styles.documentDescription}>Company profile document or business registration</p>
                  <label className={styles.uploadLabel}>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleEmployerDocumentChange("companyProfile", e.target.files?.[0] || null)}
                      className={styles.fileInput}
                    />
                    <div className={`${styles.uploadArea} ${employerDocuments.companyProfile.file ? styles.success : ""} ${errors.documents ? styles.error : ""}`}>
                      <div className={styles.uploadIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                        </svg>
                      </div>
                      <div className={styles.uploadText}>
                        <span className={styles.uploadMainText}>
                          {employerDocuments.companyProfile.file ? employerDocuments.companyProfile.file.name : "Choose PDF Document"}
                        </span>
                        <span className={styles.uploadHint}>PDF files only - Required for verification</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>Business Permit</label>
                  <p className={styles.documentDescription}>Valid business permit from local government</p>
                  <label className={styles.uploadLabel}>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleEmployerDocumentChange("businessPermit", e.target.files?.[0] || null)}
                      className={styles.fileInput}
                    />
                    <div className={`${styles.uploadArea} ${employerDocuments.businessPermit.file ? styles.success : ""} ${errors.documents ? styles.error : ""}`}>
                      <div className={styles.uploadIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                        </svg>
                      </div>
                      <div className={styles.uploadText}>
                        <span className={styles.uploadMainText}>
                          {employerDocuments.businessPermit.file ? employerDocuments.businessPermit.file.name : "Choose PDF Document"}
                        </span>
                        <span className={styles.uploadHint}>PDF files only - Required for verification</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>PhilJobNet Registration</label>
                  <p className={styles.documentDescription}>PhilJobNet registration certificate</p>
                  <label className={styles.uploadLabel}>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleEmployerDocumentChange("philjobnetRegistration", e.target.files?.[0] || null)}
                      className={styles.fileInput}
                    />
                    <div className={`${styles.uploadArea} ${employerDocuments.philjobnetRegistration.file ? styles.success : ""} ${errors.documents ? styles.error : ""}`}>
                      <div className={styles.uploadIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                        </svg>
                      </div>
                      <div className={styles.uploadText}>
                        <span className={styles.uploadMainText}>
                          {employerDocuments.philjobnetRegistration.file ? employerDocuments.philjobnetRegistration.file.name : "Choose PDF Document"}
                        </span>
                        <span className={styles.uploadHint}>PDF files only - Required for verification</span>
                      </div>
                    </div>
                  </label>
                </div>

                <div className={styles.inputGroup}>
                  <label className={styles.inputLabel}>DOLE No Pending Case Certificate</label>
                  <p className={styles.documentDescription}>Certificate showing no pending labor cases</p>
                  <label className={styles.uploadLabel}>
                    <input
                      type="file"
                      accept="application/pdf"
                      onChange={(e) => handleEmployerDocumentChange("doleNoPendingCase", e.target.files?.[0] || null)}
                      className={styles.fileInput}
                    />
                    <div className={`${styles.uploadArea} ${employerDocuments.doleNoPendingCase.file ? styles.success : ""} ${errors.documents ? styles.error : ""}`}>
                      <div className={styles.uploadIcon}>
                        <svg viewBox="0 0 24 24" fill="currentColor">
                          <path d="M19.35 10.04C18.67 6.59 15.64 4 12 4 9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z" />
                        </svg>
                      </div>
                      <div className={styles.uploadText}>
                        <span className={styles.uploadMainText}>
                          {employerDocuments.doleNoPendingCase.file ? employerDocuments.doleNoPendingCase.file.name : "Choose PDF Document"}
                        </span>
                        <span className={styles.uploadHint}>PDF files only - Required for verification</span>
                      </div>
                    </div>
                  </label>
                </div>

                {errors.documents && (
                  <div className={styles.errorMessage}>
                    <svg className={styles.messageIcon} viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    {errors.documents}
                  </div>
                )}

                <button 
                  type="button" 
                  onClick={handleEmployerVerification}
                  className={styles.primaryButton} 
                  disabled={isUploading}
                >
                  {isUploading && <div className={styles.loadingSpinner}></div>}
                  {isUploading ? "Submitting..." : "Submit Documents"}
                </button>

                <div className={styles.authToggle}>
                  <button type="button" onClick={() => setRegistrationStep(1)} className={styles.toggleLink}>
                    Back to Basic Information
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>


      <TermsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
        onAccept={() => {
          setTermsAccepted(true)
          setShowTermsModal(false)
        }}
        type="terms"
        userRole="employer"
      />

      <SuccessModal
        isOpen={showSuccessModal}
        title={isLogin ? "Login Successful!" : "Account Created Successfully!"}
        message={isLogin ? "Welcome back to PESO Job Portal! Redirecting to your dashboard..." : "Welcome to PESO Job Portal! Please upload your required company documents to complete your registration and access your dashboard."}
        onClose={isLogin ? handleLoginSuccessModalClose : handleSuccessModalClose}
        buttonText={isLogin ? "Go to Dashboard" : "Go to Dashboard"}
      />

      <VerificationModal
        isOpen={showVerificationModal}
        onClose={handleVerificationModalClose}
      />

      <ErrorModal
        isOpen={showErrorModal}
        onClose={() => setShowErrorModal(false)}
        title={errorDetails?.title || 'Error'}
        message={errorDetails?.message || 'An error occurred'}
        type={errorDetails?.type || 'error'}
        actionButton={errorDetails?.actionButton ? {
          text: errorDetails.actionButton.text,
          onClick: () => handleErrorAction(errorDetails.actionButton!.action)
        } : undefined}
      />

      <TermsModal
        isOpen={showPrivacyModal}
        onClose={() => setShowPrivacyModal(false)}
        onAccept={() => {
          setPrivacyAccepted(true)
          setShowPrivacyModal(false)
        }}
        type="privacy"
        userRole="employer"
      />

      <VerificationPendingModal
        isOpen={showVerificationPendingModal}
        onClose={handleVerificationPendingModalClose}
        companyName={formData.companyName}
      />
    </div>
  )
}

export default EmployerAuth

