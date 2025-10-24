import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import styles from './ForgotPasswordPage.module.css';

const ResetPasswordPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [userRole, setUserRole] = useState<string>('');

  const token = searchParams.get('token');
  const email = searchParams.get('email');

  // Fetch user role on component mount
  useEffect(() => {
    const fetchUserRole = async () => {
      if (!email) return;
      
      try {
        const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://skillsync-backend-gwwo.onrender.com/api'}/auth/get-user-role?email=${encodeURIComponent(email)}`);
        const data = await response.json();
        
        if (data.success && data.role) {
          setUserRole(data.role);
        }
      } catch (error) {
        console.error('Error fetching user role:', error);
      }
    };

    fetchUserRole();
  }, [email]);

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
      const response = await fetch(`${process.env.REACT_APP_API_URL || 'https://skillsync-backend-gwwo.onrender.com/api'}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          email,
          newPassword: password
        }),
      });

      const data = await response.json();
      
      if (data.success) {
        setIsSuccess(true);
        setUserRole(data.userRole);
        toast.success('Password has been reset successfully!');
        // Redirect to appropriate login page based on user role after 3 seconds
        setTimeout(() => {
          const role = data.userRole;
          if (role === 'jobseeker') {
            window.location.hash = '#/auth/jobseeker';
          } else if (role === 'employer') {
            window.location.hash = '#/auth/employer';
          } else {
            // Fallback to role selection if role is unknown
            window.location.hash = '#/auth';
          }
        }, 3000);
      } else {
        setError(data.error || 'Failed to reset password. Please try again.');
      }
    } catch (error: any) {
      console.error('Password reset error:', error);
      setError('Failed to reset password. Please try again.');
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
                Enter your new password below
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
              <Link to={userRole === 'jobseeker' ? '/auth/jobseeker' : userRole === 'employer' ? '/auth/employer' : '/auth'}>
                Back to Login
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordPage;
