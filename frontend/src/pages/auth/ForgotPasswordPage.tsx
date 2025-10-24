import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ForgotPasswordPage.module.css';
import apiService from '../../services/apiService';

const ForgotPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [backToLoginPath, setBackToLoginPath] = useState('/auth');

  // Determine the correct back to login path based on referrer or URL params
  useEffect(() => {
    const from = searchParams.get('from');
    const referrer = document.referrer;
    
    if (from === 'jobseeker' || referrer.includes('/auth/jobseeker')) {
      setBackToLoginPath('/auth/jobseeker');
    } else if (from === 'employer' || referrer.includes('/auth/employer')) {
      setBackToLoginPath('/auth/employer');
    } else {
      // Default to role selection if we can't determine the source
      setBackToLoginPath('/auth');
    }
  }, [searchParams]);

  const isValidEmail = (email: string) => {
    return /\S+@\S+\.\S+/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      // First check if email exists in our backend
      const emailCheckData = await apiService.checkEmailExists(email);
      
      if (!emailCheckData.success || !emailCheckData.data?.exists) {
        const errorMsg = 'No account found with this email address.';
        setError(errorMsg);
        toast.error(errorMsg);
        return;
      }
      
      // Send password reset email using our backend API
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://skillsync-backend-gwwo.onrender.com/api'}/auth/request-password-reset`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (data.success) {
        setIsSubmitted(true);
        toast.success('Password reset link has been sent to your email. Please check your inbox.');
      } else {
        const errorMsg = data.error || 'Failed to send password reset email. Please try again.';
        setError(errorMsg);
        toast.error(errorMsg);
      }
    } catch (err) {
      const error = err as Error;
      // Handle specific API errors
      let errorMsg = 'An unexpected error occurred. Please try again.';
      if (error.message.includes('Failed to fetch')) {
        errorMsg = 'Unable to connect to server. Please check if the backend is running.';
      } else if (error.message.includes('Unexpected token')) {
        errorMsg = 'Server error. Please try again later.';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      setError(errorMsg);
      toast.error(errorMsg);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className={styles.container}>
        <div className={styles.authCard}>
          {/* Left Panel - Visual Background */}
          <div className={styles.leftPanel}>
            <div className={styles.visualContent}>
              {/* PESO Logo */}
              <div className={styles.logoContainer}>
                <img 
                  src="/skillsync.png" 
                  alt="SkillSync Logo" 
                  className={styles.skillsyncLogo}
                />
              </div>

              {/* Success Message */}
              <div className={styles.successMessage}>
                <h2>Password Reset Sent</h2>
                <p>Check your email for the reset link</p>
              </div>

              {/* Decorative Elements */}
              <div className={styles.decorativeCircle1}></div>
              <div className={styles.decorativeCircle2}></div>
              <div className={styles.decorativeCircle3}></div>
            </div>
          </div>

          {/* Right Panel - Success Content */}
          <div className={styles.rightPanel}>
            <div className={styles.formContainer}>
              <div className={styles.successSection}>
                <div className={styles.successIcon}>
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h1 className={styles.formTitle}>Check Your Email</h1>
                <p className={styles.formSubtitle}>
                  We've sent a password reset link to <strong>{email}</strong>
                </p>
                <p className={styles.instruction}>
                  Please check your email and click the link to reset your password. The link will expire in 24 hours.
                </p>
              </div>

              <Link to={backToLoginPath} className={styles.backToLogin}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.authCard}>
        {/* Left Panel - Visual Background */}
        <div className={styles.leftPanel}>
          <div className={styles.visualContent}>
            {/* PESO Logo */}
            <div className={styles.logoContainer}>
              <img 
                src="/skillsync.png" 
                alt="SkillSync Logo" 
                className={styles.skillsyncLogo}
              />
            </div>

            {/* Help Message */}
            <div className={styles.helpMessage}>
              <h2>Need Help?</h2>
              <p>We'll help you get back to your account</p>
            </div>

            {/* Decorative Elements */}
            <div className={styles.decorativeCircle1}></div>
            <div className={styles.decorativeCircle2}></div>
            <div className={styles.decorativeCircle3}></div>
          </div>
        </div>

        {/* Right Panel - Form */}
        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Forgot Password?</h1>
              <p className={styles.formSubtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="email" className={styles.inputLabel}>Email</label>
                <div className={styles.inputWrapper}>
                  <div className={styles.inputIcon}>
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <path d="M20 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
                    </svg>
                  </div>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      setError(''); // Clear error when user types
                    }}
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    placeholder="Enter your email"
                    required
                    disabled={isLoading}
                  />
                </div>
                {error && <div className={styles.errorText}>{error}</div>}
              </div>

              <button 
                type="submit" 
                className={`${styles.primaryButton} ${isLoading ? styles.loading : ''}`}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <span className={styles.spinner}></span>
                    Sending...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </button>
            </form>

            <Link to={backToLoginPath} className={styles.backToLogin}>
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordPage;
