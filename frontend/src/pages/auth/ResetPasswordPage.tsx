import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ForgotPasswordPage.module.css';
import firebaseAuthService from '../../services/firebaseAuthService';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Validate inputs
    if (!password || password.length < 8) {
      setError('Password must be at least 8 characters long');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (!token || !email) {
      setError('Invalid reset link. Please request a new password reset.');
      return;
    }

    setIsLoading(true);

    try {
      const response = await firebaseAuthService.confirmPasswordReset(token, password);
      
      if (response.success) {
        setIsSuccess(true);
        toast.success('Password has been reset successfully!');
        // Redirect to login after 3 seconds
        setTimeout(() => {
          navigate('/auth');
        }, 3000);
      } else {
        setError(response.error || 'Failed to reset password');
        toast.error(response.error || 'Failed to reset password');
      }
    } catch (err) {
      const error = err as Error;      setError(error.message || 'An unknown error occurred');
      toast.error(error.message || 'Failed to reset password');
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
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

              <div className={styles.successMessage}>
                <h2>Password Reset</h2>
                <p>Your password has been updated successfully</p>
              </div>
            </div>
          </div>

          <div className={styles.rightPanel}>
            <div className={styles.formContainer}>
              <div className={styles.successSection}>
                <div className={styles.successIcon}>
                  <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                </div>
                <h1 className={styles.formTitle}>Password Changed!</h1>
                <p className={styles.instruction}>
                  Your password has been updated successfully. You will be redirected to the login page shortly.
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

            <div className={styles.helpMessage}>
              <h2>Reset Password</h2>
              <p>Create a new password for your account</p>
            </div>
          </div>
        </div>

        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Create New Password</h1>
              <p className={styles.formSubtitle}>
                {email ? `Resetting password for ${email}` : 'Enter your new password below'}
              </p>
            </div>

            <form className={styles.form} onSubmit={handleSubmit}>
              <div className={styles.inputGroup}>
                <label htmlFor="password" className={styles.inputLabel}>
                  New Password
                </label>
                <div className={styles.passwordContainer}>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    placeholder="Enter new password"
                    required
                    minLength={8}
                    disabled={isLoading}
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label htmlFor="confirmPassword" className={styles.inputLabel}>
                  Confirm New Password
                </label>
                <div className={styles.passwordContainer}>
                  <input
                    id="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`${styles.input} ${error ? styles.inputError : ''}`}
                    placeholder="Confirm new password"
                    required
                    minLength={8}
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
                    Resetting...
                  </>
                ) : (
                  'Reset Password'
                )}
              </button>
            </form>

            <div className={styles.backToLogin}>
              <Link to="/auth">Back to Login</Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
