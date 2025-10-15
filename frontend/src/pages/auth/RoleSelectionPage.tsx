import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './RoleSelectionPage.module.css';

const RoleSelectionPage: React.FC = () => {
  const navigate = useNavigate();

  const handleRoleSelection = (role: 'jobseeker' | 'employer') => {
    // Store the selected role in localStorage for later use
    localStorage.setItem('selectedRole', role);
    navigate(`/auth/${role}`);
  };

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

            {/* Welcome Text */}
            <div className={styles.welcomeText}>
              <p>Bridging job seekers and employers through smart, skills-based matching.</p>
              <p>Choose your role to get started</p>
            </div>

            {/* Decorative Elements */}
            <div className={styles.decorativeCircle1}></div>
            <div className={styles.decorativeCircle2}></div>
            <div className={styles.decorativeCircle3}></div>
          </div>
        </div>

        {/* Right Panel - Role Selection */}
        <div className={styles.rightPanel}>
          <div className={styles.formContainer}>
            <div className={styles.formHeader}>
              <h1 className={styles.formTitle}>Choose Your Role</h1>
              <p className={styles.formSubtitle}>
                Select how you'd like to use our platform
              </p>
            </div>

            {/* Role Selection Buttons */}
            <div className={styles.roleButtons}>
              <button
                className={styles.roleButton}
                onClick={() => handleRoleSelection('jobseeker')}
              >
                <div className={`${styles.iconContainer} ${styles.jobseekerIcon}`}>
                  <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                  </svg>
                </div>
                <div className={styles.buttonText}>
                  <h3>Job Seeker</h3>
                  <p>Find your dream job and connect with opportunities</p>
                </div>
                <div className={styles.buttonArrow}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </button>

              <button
                className={styles.roleButton}
                onClick={() => handleRoleSelection('employer')}
              >
                <div className={`${styles.iconContainer} ${styles.employerIcon}`}>
                  <svg className={styles.icon} fill="currentColor" viewBox="0 0 24 24">
                    <path d="M20 6h-4V4c0-1.11-.89-2-2-2h-4c-1.11 0-2 .89-2 2v2H4c-1.11 0-1.99.89-1.99 2L2 19c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V8c0-1.11-.89-2-2-2zm-6 0h-4V4h4v2z"/>
                  </svg>
                </div>
                <div className={styles.buttonText}>
                  <h3>Employer</h3>
                  <p>Post jobs and find the perfect candidates</p>
                </div>
                <div className={styles.buttonArrow}>
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8.59 16.59L13.17 12 8.59 7.41 10 6l6 6-6 6-1.41-1.41z"/>
                  </svg>
                </div>
              </button>
            </div>

            {/* Footer Text */}
            <div className={styles.footerText}>
              <p>SkillSync Job Portal</p>
              <p>Connecting talent with opportunities</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RoleSelectionPage;
