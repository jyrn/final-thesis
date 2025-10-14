import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import firebaseAuthService from '../../services/firebaseAuthService';
import styles from './AuthPage.module.css';

const EmailVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [isVerified, setIsVerified] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isPolling, setIsPolling] = useState(false);

  const token = searchParams.get('token');
  const emailParam = searchParams.get('email');
  const role = searchParams.get('role');

  useEffect(() => {
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }

    // Auto-verify if token is present
    if (token) {
      verifyEmailToken(token);
    } else {
      setIsLoading(false);
      // Start polling for email verification status
      startPollingForVerification();
    }
  }, [token, emailParam]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  // Polling effect to check verification status
  useEffect(() => {
    let pollInterval: NodeJS.Timeout;
    
    if (isPolling) {
      pollInterval = setInterval(async () => {
        await checkVerificationStatus();
      }, 3000); // Check every 3 seconds
    }
    
    return () => {
      if (pollInterval) {
        clearInterval(pollInterval);
      }
    };
  }, [isPolling]);

  const startPollingForVerification = () => {
    setIsPolling(true);
  };

  const stopPollingForVerification = () => {
    setIsPolling(false);
  };

  const checkVerificationStatus = async () => {
    try {
      // Reload the current user to get updated verification status
      const currentUser = firebaseAuthService.getCurrentUser();
      if (currentUser) {
        await firebaseAuthService.reloadUser();
        const updatedUser = firebaseAuthService.getCurrentUser();
        
        if (updatedUser && updatedUser.emailVerified) {
          stopPollingForVerification();
          setIsVerified(true);
          toast.success('Email verified successfully!');
          
          // Auto-redirect after 2 seconds based on role
          setTimeout(() => {
            if (role === 'employer') {
              navigate('/auth/employer/documents');
            } else {
              navigate('/auth/jobseeker');
            }
          }, 2000);
        }
      }
    } catch (error) {    }
  };

  const verifyEmailToken = async (token: string) => {
    try {
      setIsLoading(true);
      const response = await firebaseAuthService.verifyEmail(token);
      
      if (response.success) {
        setIsVerified(true);
        toast.success('Email verified successfully!');
        // Auto-redirect after 2 seconds based on role
        setTimeout(() => {
          if (role === 'employer') {
            navigate('/auth/employer/documents');
          } else {
            navigate('/auth/jobseeker');
          }
        }, 2000);
      } else {
        setError(response.error || 'Failed to verify email. The link may be invalid or expired.');
      }
    } catch (err) {      setError('An error occurred while verifying your email. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendVerification = async () => {
    if (!email || countdown > 0) return;
    
    try {
      setResendLoading(true);
      setResendSuccess(false);
      const response = await firebaseAuthService.sendEmailVerification(email);
      
      if (response.success) {
        setResendSuccess(true);
        setCountdown(60); // 60 seconds cooldown
        toast.success('Verification email sent! Please check your inbox.');
      } else {
        setError(response.error || 'Failed to resend verification email.');
      }
    } catch (err) {      setError('An error occurred while resending the verification email.');
    } finally {
      setResendLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.container}>
        <div className={styles.authCard}>
          <div className={styles.leftPanel}>
            <div className={styles.visualContent}>
              <div className={styles.logoContainer}>
                <img 
                  src="/peso-logo.png" 
                  alt="PESO Logo" 
                  className={styles.pesoLogo}
                />
              </div>
              <div className={styles.journeyText}>
                <h2>Email Verification</h2>
                <p>Securing your account with us</p>
              </div>
            </div>
          </div>
          <div className={styles.rightPanel}>
            <div className={styles.formContainer}>
              <div className={styles.formHeader}>
                <h1 className={styles.formTitle}>Verifying Your Email</h1>
                <p className={styles.formSubtitle}>Please wait while we verify your email address</p>
              </div>
              <div className={styles.form}>
                <div className={styles.loadingSpinner}></div>
                <p style={{ textAlign: 'center', color: '#6b7280', marginTop: '16px' }}>
                  This may take a few moments...
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        <div className={styles.leftPanel}>
          <div className={styles.visualContent}>
            <div className={styles.logoContainer}>
              <img 
                src="/peso-logo.png" 
                alt="PESO Logo" 
                className={styles.pesoLogo}
              />
            </div>
            <div className={styles.journeyText}>
              <h2>{isVerified ? 'Welcome to PESO!' : 'Email Verification'}</h2>
              <p>{isVerified ? 'Your account is now active and ready to use' : 'Secure your account with us'}</p>
            </div>
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>
                {isVerified ? 'Email Verified Successfully!' : error ? 'Verification Issue' : 'Check Your Email'}
              </h1>
              <p className={styles.formSubtitle}>
                {isVerified 
                  ? 'Your email has been successfully verified'
                  : error 
                    ? 'There was a problem verifying your email'
                    : 'We\'ve sent a verification link to your email address'
                }
              </p>
            </div>
            
            <div className={styles.form}>
              {isVerified ? (
                <>
                  <div className={styles.successMessage}>
                    <svg className={styles.messageIcon} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                    <span>Your email has been successfully verified! Redirecting to login...</span>
                  </div>
                  <Link to="/auth" className={styles.primaryButton}>
                    Continue to Login
                  </Link>
                  <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginTop: '12px' }}>
                    Redirecting automatically in 3 seconds...
                  </p>
                </>
              ) : error ? (
                <>
                  <div className={styles.errorMessage}>
                    <svg className={styles.messageIcon} fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                  
                  {email && (
                    <div className={styles.inputGroup}>
                      <button 
                        onClick={handleResendVerification} 
                        disabled={resendLoading || countdown > 0}
                        className={styles.primaryButton}
                        style={{ marginTop: '16px' }}
                      >
                        {resendLoading ? (
                          <>
                            <div className={styles.loadingSpinner}></div>
                            Sending...
                          </>
                        ) : (
                          `Resend Verification Email${countdown > 0 ? ` (${countdown}s)` : ''}`
                        )}
                      </button>
                    </div>
                  )}
                  
                  {resendSuccess && (
                    <div className={styles.successMessage} style={{ marginTop: '16px' }}>
                      <svg className={styles.messageIcon} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Verification email sent! Please check your inbox.</span>
                    </div>
                  )}
                  
                  <Link to="/auth" className={styles.linkButton} style={{ marginTop: '24px', textAlign: 'center', display: 'block' }}>
                    ← Back to Login
                  </Link>
                </>
              ) : (
                <>
                  <div className={styles.notice}>
                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                      <div className={styles.emailVerificationIcon}>
                        📧
                      </div>
                      <h3 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: '600', color: '#1f2937' }}>Check Your Email</h3>
                      <p style={{ margin: 0, fontSize: '14px', color: '#6b7280' }}>We've sent a verification link to your email address</p>
                    </div>
                    
                    <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '20px' }}>
                      <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#374151', fontWeight: '600' }}>📋 Next steps:</p>
                      <ol style={{ margin: 0, paddingLeft: '20px', fontSize: '14px', color: '#6b7280', lineHeight: '1.6' }}>
                        <li>Check your email inbox (and spam folder)</li>
                        <li>Click on the verification link in the email</li>
                        <li>Return here to continue to your dashboard</li>
                      </ol>
                    </div>
                    
                    <div style={{ background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)', padding: '16px', borderRadius: '8px', border: '1px solid #f59e0b' }}>
                      <p style={{ margin: 0, fontSize: '13px', color: '#92400e', fontWeight: '500', textAlign: 'center' }}>
                        💡 <strong>Tip:</strong> If you don't see the email, check your spam or junk folder
                      </p>
                    </div>
                  </div>
                  
                  <div className={styles.socialSeparator}>
                    <span>Didn't receive the email?</span>
                  </div>
                  
                  <button 
                    onClick={handleResendVerification} 
                    disabled={resendLoading || countdown > 0 || !email}
                    className={styles.googleButton}
                    style={{ marginBottom: '16px' }}
                  >
                    {resendLoading ? (
                      <>
                        <div className={styles.loadingSpinner}></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                        </svg>
                        {`Resend Verification Email${countdown > 0 ? ` (${countdown}s)` : ''}`}
                      </>
                    )}
                  </button>
                  
                  {resendSuccess && (
                    <div className={styles.successMessage}>
                      <svg className={styles.messageIcon} fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Verification email sent! Please check your inbox.</span>
                    </div>
                  )}
                  
                  <div className={styles.authToggle} style={{ marginTop: '24px' }}>
                    <span>Want to use a different email? </span>
                    <Link to="/auth" className={styles.toggleLink}>
                      Back to Login
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmailVerificationPage;
