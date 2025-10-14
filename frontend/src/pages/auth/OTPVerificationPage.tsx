import React, { useState, useEffect } from 'react';
import { useSearchParams, Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { apiService } from '../../services/apiService';
import styles from './AuthPage.module.css';

const OTPVerificationPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const [isVerified, setIsVerified] = useState(false);

  const emailParam = searchParams.get('email');
  const role = searchParams.get('role');

  useEffect(() => {
    if (emailParam) {
      setEmail(decodeURIComponent(emailParam));
    }
  }, [emailParam]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (countdown > 0) {
      timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    }
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleOtpChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      nextInput?.focus();
    }

    // Clear error when user starts typing
    if (error) {
      setError('');
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    
    for (let i = 0; i < pastedData.length && i < 6; i++) {
      newOtp[i] = pastedData[i];
    }
    
    setOtp(newOtp);
    
    // Focus the next empty input or the last input
    const nextEmptyIndex = newOtp.findIndex(digit => !digit);
    const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
    const inputToFocus = document.getElementById(`otp-${focusIndex}`);
    inputToFocus?.focus();
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const otpString = otp.join('');
    if (otpString.length !== 6) {
      setError('Please enter all 6 digits');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await apiService.verifyOTP(email, otpString);

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
        setError(response.error || 'Invalid OTP. Please try again.');
      }
    } catch (err: any) {      setError(err.message || 'An error occurred while verifying OTP. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (!email || countdown > 0) return;
    
    try {
      setResendLoading(true);
      setError('');
      
      const response = await apiService.sendOTP(email);
      
      if (response.success) {
        setCountdown(60); // 60 seconds cooldown
        setOtp(['', '', '', '', '', '']); // Clear current OTP
        toast.success('New OTP sent! Please check your email.');
      } else {
        setError(response.error || 'Failed to resend OTP.');
      }
    } catch (err: any) {      setError(err.message || 'An error occurred while resending OTP.');
    } finally {
      setResendLoading(false);
    }
  };

  if (isVerified) {
    return (
      <div className={styles.container}>
        <div className={styles.authCard}>
          <div className={styles.leftPanel}>
            <div className={styles.visualContent}>
              <div className={styles.logoContainer}>
                <img 
                  src="/skillsync.png" 
                  alt="SkillSync Logo" 
                  className={styles.skillsyncLogo}
                />
              </div>
              <div className={styles.journeyText}>
                <h2>Welcome to PESO!</h2>
                <p>Your account is now active and ready to use</p>
              </div>
            </div>
          </div>
          <div className={styles.rightPanel}>
            <div className={styles.formContainer}>
              <div className={styles.formHeader}>
                <h1 className={styles.formTitle}>Email Verified Successfully!</h1>
                <p className={styles.formSubtitle}>Your email has been successfully verified</p>
              </div>
              
              <div className={styles.form}>
                <div className={styles.successMessage}>
                  <svg className={styles.messageIcon} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>Your email has been successfully verified! Redirecting to login...</span>
                </div>
                <Link to="/auth/jobseeker" className={styles.primaryButton}>
                  Continue to Login
                </Link>
                <p style={{ textAlign: 'center', fontSize: '14px', color: '#6b7280', marginTop: '12px' }}>
                  Redirecting automatically in 2 seconds...
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
                src="/skillsync.JPG" 
                alt="SkillSync Logo" 
                className={styles.skillsyncLogo}
              />
            </div>
            <div className={styles.journeyText}>
              <h2>Email Verification</h2>
              <p>Enter the OTP code sent to your email</p>
            </div>
          </div>
        </div>
        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Enter Verification Code</h1>
              <p className={styles.formSubtitle}>
                We've sent a 6-digit verification code to <strong>{email}</strong>
              </p>
            </div>
            
            <form onSubmit={handleVerifyOtp} className={styles.form}>
              {error && (
                <div className={styles.errorMessage}>
                  <svg className={styles.messageIcon} fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  <span>{error}</span>
                </div>
              )}

              <div className={styles.otpContainer}>
                {otp.map((digit, index) => (
                  <input
                    key={index}
                    id={`otp-${index}`}
                    type="text"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(index, e.target.value.replace(/\D/g, ''))}
                    onKeyDown={(e) => handleKeyDown(index, e)}
                    onPaste={handlePaste}
                    className={styles.otpInput}
                    autoComplete="off"
                  />
                ))}
              </div>

              <button 
                type="submit" 
                className={styles.primaryButton}
                disabled={isLoading || otp.join('').length !== 6}
              >
                {isLoading ? (
                  <>
                    <div className={styles.loadingSpinner}></div>
                    Verifying...
                  </>
                ) : (
                  'Verify Code'
                )}
              </button>

              <div className={styles.socialSeparator}>
                <span>Didn't receive the code?</span>
              </div>

              <button 
                type="button"
                onClick={handleResendOtp} 
                disabled={resendLoading || countdown > 0}
                className={styles.googleButton}
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
                    {`Resend Code${countdown > 0 ? ` (${countdown}s)` : ''}`}
                  </>
                )}
              </button>

              <div className={styles.authToggle} style={{ marginTop: '24px' }}>
                <span>Want to use a different email? </span>
                <Link to="/auth/jobseeker" className={styles.toggleLink}>
                  Back to Registration
                </Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OTPVerificationPage;
