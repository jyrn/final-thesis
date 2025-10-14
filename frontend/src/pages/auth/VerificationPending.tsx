import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { apiService } from '../../services/apiService'
import firebaseAuthService from '../../services/firebaseAuthService'
import styles from './VerificationPending.module.css'

const VerificationPending: React.FC = () => {
  const navigate = useNavigate()
  const [companyName, setCompanyName] = useState<string>('')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const checkAuthAndStatus = async () => {
      try {
        // Check if user is authenticated
        const currentUser = firebaseAuthService.getCurrentUser()
        if (!currentUser) {
          navigate('/auth')
          return
        }

        // Get employer profile to get company name
        const profileResponse = await apiService.get('/employers/profile')
        if (profileResponse.success && profileResponse.data) {
          setCompanyName(profileResponse.data.companyName || '')
        }

        // Check account status
        const statusResponse = await apiService.get('/employers/account-status')
        if (statusResponse.success && statusResponse.data) {
          const { accountStatus } = statusResponse.data
          
          // If account is verified, redirect to dashboard
          if (accountStatus === 'verified' || accountStatus === 'approved') {
            navigate('/employer/dashboard')
            return
          }
          
          // If account is rejected or suspended, redirect to auth with error
          if (accountStatus === 'rejected' || accountStatus === 'suspended') {
            navigate('/auth?error=account_status')
            return
          }
        }
      } catch (error) {        navigate('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuthAndStatus()
  }, [navigate])

  const handleSignOut = async () => {
    try {
      await firebaseAuthService.signOut()
      navigate('/auth/employer')
    } catch (error) {    }
  }

  const handleRefreshStatus = async () => {
    setIsLoading(true)
    try {
      const statusResponse = await apiService.get('/employers/account-status')
      if (statusResponse.success && statusResponse.data) {
        const { accountStatus } = statusResponse.data
        
        if (accountStatus === 'verified' || accountStatus === 'approved') {
          navigate('/employer/dashboard')
          return
        }
      }
    } catch (error) {    } finally {
      setIsLoading(false)
    }
  }

  if (isLoading) {
    return (
      <div className={styles.loadingContainer}>
        <div className={styles.loadingSpinner}></div>
        <p>Checking account status...</p>
      </div>
    )
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        <div className={styles.pendingIcon}>
          <svg viewBox="0 0 24 24" fill="currentColor" className={styles.clockIcon}>
            <path d="M12,2A10,10 0 0,0 2,12A10,10 0 0,0 12,22A10,10 0 0,0 22,12A10,10 0 0,0 12,2M16.2,16.2L11,13V7H12.5V12.2L17,14.7L16.2,16.2Z" />
          </svg>
        </div>
        
        <h1 className={styles.title}>Account Verification Pending</h1>
        
        <div className={styles.messageContainer}>
          <p className={styles.message}>
            Thank you for registering{companyName ? ` ${companyName}` : ''}! Your account and documents are currently under review by our administrators.
          </p>
          
          <div className={styles.statusInfo}>
            <div className={styles.statusItem}>
              <div className={styles.statusIcon}>📄</div>
              <span>Documents submitted successfully</span>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusIcon}>⏳</div>
              <span>Verification in progress</span>
            </div>
            <div className={styles.statusItem}>
              <div className={styles.statusIcon}>📧</div>
              <span>Email notification pending</span>
            </div>
          </div>
          
          <div className={styles.waitingMessage}>
            <h3>What happens next?</h3>
            <ul>
              <li>Our admin team will review your submitted documents</li>
              <li>You will receive an email notification once verification is complete</li>
              <li>Upon approval, you can log in and access your employer dashboard</li>
              <li>If additional information is needed, we'll contact you via email</li>
            </ul>
          </div>
          
          <div className={styles.estimatedTime}>
            <strong>Estimated verification time: 1-3 business days</strong>
          </div>
        </div>
        
        <div className={styles.actions}>
          <button 
            onClick={handleRefreshStatus}
            className={styles.refreshButton}
            disabled={isLoading}
          >
            {isLoading ? 'Checking...' : 'Check Status'}
          </button>
          
          <button 
            onClick={handleSignOut}
            className={styles.signOutButton}
          >
            Sign Out
          </button>
        </div>
      </div>
    </div>
  )
}

export default VerificationPending
