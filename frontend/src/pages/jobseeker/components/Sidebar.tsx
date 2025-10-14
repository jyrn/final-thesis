import React, { useState, useRef, useEffect } from 'react';
import styles from '../Dashboard.module.css';

// Import icons directly
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

const JobsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const ApplicationsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
    <polyline points="14 2 14 8 20 8" />
    <line x1="12" y1="18" x2="12" y2="12" />
    <line x1="9" y1="15" x2="15" y2="15" />
  </svg>
);

const ProfileIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const CreateResumeIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
    <path d="m18.5 2.5 3 3L12 15l-4 1 1-4 9.5-9.5z" />
  </svg>
);

const SavedJobsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z" />
  </svg>
);

const ChevronLeftIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6" />
  </svg>
);

// Types
interface MenuItem {
  id: string;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  hasNotification?: boolean;
}

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode; show: boolean }> = ({ text, children, show }) => {
  if (!show) return <>{children}</>;
  
  return (
    <div className={styles.tooltipContainer}>
      {children}
      <div className={styles.tooltip}>
        {text}
      </div>
    </div>
  );
};

type SidebarProps = {
  activeTab: string;
  onTabChange: (tab: string) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
};

const Sidebar: React.FC<SidebarProps> = ({ 
  activeTab, 
  onTabChange, 
  isSidebarOpen, 
  onToggleSidebar,
  isCollapsed = false,
  onToggleCollapse
}) => {
  const [hoveredItem, setHoveredItem] = useState<string | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);

  // Check if we're on mobile
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Handle click outside sidebar on mobile
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isMobile && isSidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        onToggleSidebar();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, isSidebarOpen, onToggleSidebar]);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', shortLabel: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'jobs', label: 'Find Jobs', shortLabel: 'Find Jobs', icon: <JobsIcon /> },
    { id: 'create-resume', label: 'Create Resume', shortLabel: 'Create\nResume', icon: <CreateResumeIcon /> },
    { id: 'applications', label: 'Applications', shortLabel: 'Applications', icon: <ApplicationsIcon /> },
    { id: 'saved', label: 'Saved Jobs', shortLabel: 'Saved\nJobs', icon: <SavedJobsIcon /> },
    { id: 'profile', label: 'Settings', shortLabel: 'Settings', icon: <ProfileIcon /> },
  ];

  const handleItemClick = (itemId: string) => {
    onTabChange(itemId);
    // Close sidebar on mobile after selection
    if (isMobile && isSidebarOpen) {
      onToggleSidebar();
    }
  };

  const shouldShowTooltip = (itemId: string) => {
    return false;
  };

  return (
    <>
      {/* Removed dimming overlay on mobile to preserve background styling */}
      
      <div 
        ref={sidebarRef}
        className={`${styles.sidebar} ${
          isSidebarOpen ? styles.sidebarOpen : ''
        } ${
          !isMobile && isCollapsed ? styles.sidebarCollapsed : ''
        }`}
      >
        <div className={styles.sidebarHeader}>
          {(!isCollapsed || isMobile) && (
            <h2 className={styles.logo}>SkillSync</h2>
          )}
          
          {/* Desktop collapse toggle */}
          {!isMobile && onToggleCollapse && (
            <button 
              className={styles.collapseToggle}
              onClick={onToggleCollapse}
              aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {isCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          )}
          
          {/* Mobile close button */}
          {isMobile && (
            <button 
              className={styles.closeSidebar} 
              onClick={onToggleSidebar}
              aria-label="Close sidebar"
            >
              ×
            </button>
          )}
        </div>
        
        <nav className={styles.sidebarNav}>
          {menuItems.map((item) => (
            <Tooltip 
              key={item.id} 
              text={item.label} 
              show={shouldShowTooltip(item.id)}
            >
              <button
                className={`${styles.navItem} ${activeTab === item.id ? styles.active : ''} ${
                  isCollapsed && !isMobile ? styles.navItemCollapsed : ''
                }`}
                onClick={() => handleItemClick(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                aria-label={item.label}
              >
                <span className={styles.navIcon}>
                  {item.icon}
                </span>
                
                <span className={`${styles.navLabel} ${
                  isCollapsed && !isMobile ? styles.navLabelCollapsed : ''
                }`}>
                  {isCollapsed && !isMobile ? (
                    item.shortLabel.split('\n').map((line, index) => (
                      <span key={index} className={styles.labelLine}>
                        {line}
                      </span>
                    ))
                  ) : (
                    item.label
                  )}
                </span>
              </button>
            </Tooltip>
          ))}
        </nav>
      </div>
    </>
  );
};

export default Sidebar;
