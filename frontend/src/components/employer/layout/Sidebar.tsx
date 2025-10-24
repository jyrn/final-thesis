import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import styles from './Sidebar.module.css';

interface NavItemProps {
  icon: React.ReactNode;
  label: string;
  href: string;
  isActive: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ icon, label, href, isActive }) => (
  <Link to={href} className={`${styles.navItem} ${isActive ? styles.active : ''}`}>
    <span className={styles.navIcon}>{icon}</span>
    <span className={styles.navLabel}>{label}</span>
  </Link>
);

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ isOpen, onClose }) => {
  const location = useLocation();
  const navItems = [
    { icon: '🏠', label: 'Dashboard', href: '/employer/dashboard' },
    { icon: '💼', label: 'Jobs', href: '/employer/jobs' },
    { icon: '👥', label: 'Applicants', href: '/employer/applicants' },
    { icon: '📊', label: 'Analytics', href: '/employer/analytics' },
    { icon: '⚙️', label: 'Settings', href: '/employer/settings' },
  ];

  return (
    <>
      <div className={`${styles.sidebar} ${isOpen ? styles.open : ''}`}>
        <div className={styles.sidebarHeader}>
          <div className={styles.logo}>
            <span className={styles.logoIcon}>💼</span>
            <h1>Employer Portal</h1>
          </div>
          <button onClick={onClose} className={styles.closeButton}>
            ✕
          </button>
        </div>
        
        <nav className={styles.nav}>
          {navItems.map((item) => (
            <NavItem
              key={item.href}
              icon={item.icon}
              label={item.label}
              href={item.href}
              isActive={location.pathname === item.href}
            />
          ))}
        </nav>
        
        <div className={styles.footer}>
          <div className={styles.userProfile}>
            <div className={styles.avatar}>👤</div>
            <div className={styles.userInfo}>
              <h4>Employer Name</h4>
              <p>Company Name</p>
            </div>
          </div>
          <button 
            className={styles.logoutButton}
            onClick={() => window.location.hash = '#/auth/employer'}
          >
            <span>🚪</span>
            <span>Logout</span>
          </button>
        </div>
      </div>
      {isOpen && <div className={styles.overlay} onClick={onClose} />}
    </>
  );
};

export default Sidebar;
