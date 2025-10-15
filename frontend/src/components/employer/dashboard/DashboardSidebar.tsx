import React, { useState, useRef, useEffect } from 'react';
import layoutStyles from './Layout.module.css';

// Import icons directly
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="7" height="9" />
    <rect x="14" y="3" width="7" height="5" />
    <rect x="14" y="12" width="7" height="9" />
    <rect x="3" y="16" width="7" height="5" />
  </svg>
);

const ApplicantsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

const JobsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

const SettingsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="3" />
    <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1 1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z" />
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

const BriefcaseIcon = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
  </svg>
);

// Types
type TabType = 'overview' | 'applicants' | 'jobs' | 'settings';

interface MenuItem {
  id: TabType;
  label: string;
  shortLabel: string;
  icon: React.ReactNode;
  hasNotification?: boolean;
  notificationCount?: number;
}

// Tooltip component
const Tooltip: React.FC<{ text: string; children: React.ReactNode; show: boolean }> = ({ text, children, show }) => {
  if (!show) return <>{children}</>;
  
  return (
    <div className={layoutStyles.tooltipContainer}>
      {children}
      <div className={layoutStyles.tooltip}>
        {text}
      </div>
    </div>
  );
};

interface DashboardSidebarProps {
  activeTab: TabType;
  onTabChange: (tab: TabType) => void;
  sidebarOpen: boolean;
  sidebarCollapsed: boolean;
  onToggleCollapse: (collapsed: boolean) => void;
  onCloseSidebar?: () => void;
  pendingReviews: number;
  openPositions: number;
}

export const DashboardSidebar: React.FC<DashboardSidebarProps> = ({
  activeTab,
  onTabChange,
  sidebarOpen,
  sidebarCollapsed,
  onToggleCollapse,
  onCloseSidebar,
  pendingReviews,
  openPositions
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
      if (isMobile && sidebarOpen && sidebarRef.current && !sidebarRef.current.contains(event.target as Node)) {
        // Close sidebar on mobile when clicking outside
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isMobile, sidebarOpen]);

  const menuItems: MenuItem[] = [
    { id: 'overview', label: 'Dashboard', shortLabel: 'Dashboard', icon: <DashboardIcon /> },
    { 
      id: 'applicants', 
      label: 'Applicants', 
      shortLabel: 'Applicants', 
      icon: <ApplicantsIcon />, 
      hasNotification: pendingReviews > 0,
      notificationCount: pendingReviews
    },
    { 
      id: 'jobs', 
      label: 'Job Posts', 
      shortLabel: 'Job\nPosts', 
      icon: <JobsIcon />, 
      hasNotification: openPositions > 0,
      notificationCount: openPositions
    },
    { id: 'settings', label: 'Settings', shortLabel: 'Settings', icon: <SettingsIcon /> },
  ];

  const handleItemClick = (itemId: TabType) => {
    onTabChange(itemId);
    // Close sidebar on mobile after selection
    if (isMobile && onCloseSidebar) {
      onCloseSidebar();
    }
  };

  const shouldShowTooltip = (itemId: string) => {
    return false;
  };

  const handleToggleCollapse = () => {
    onToggleCollapse(!sidebarCollapsed);
  };

  return (
    <>      
      <div 
        ref={sidebarRef}
        className={`${layoutStyles.sidebar} ${
          sidebarOpen ? layoutStyles.sidebarOpen : ''
        } ${
          !isMobile && sidebarCollapsed ? layoutStyles.sidebarCollapsed : ''
        }`}
      >
        <div className={layoutStyles.sidebarHeader}>
          {(!sidebarCollapsed || isMobile) && (
            <div className={layoutStyles.logoContainer}>
              <img 
                src="/logo.png" 
                alt="SkillSync Logo" 
                className={layoutStyles.logoImage}
              />
              <span className={layoutStyles.logoText}>SkillSync</span>
            </div>
          )}
          
          {/* Collapsed state logo */}
          {sidebarCollapsed && !isMobile && (
            <div className={layoutStyles.logoCollapsed}>
              <img 
                src="/logo.png" 
                alt="SkillSync Logo" 
                className={layoutStyles.logoImageCollapsed}
              />
            </div>
          )}
          
          {/* Desktop collapse toggle */}
          {!isMobile && (
            <button 
              className={layoutStyles.collapseToggle}
              onClick={handleToggleCollapse}
              aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              {sidebarCollapsed ? <ChevronRightIcon /> : <ChevronLeftIcon />}
            </button>
          )}
          
          {/* Mobile close button */}
          {isMobile && (
            <button 
              className={layoutStyles.closeSidebar}
              onClick={onCloseSidebar}
              aria-label="Close sidebar"
            >
              ×
            </button>
          )}
        </div>
        
        <nav className={layoutStyles.sidebarNav}>
          {menuItems.map((item) => (
            <Tooltip 
              key={item.id} 
              text={item.label} 
              show={shouldShowTooltip(item.id)}
            >
              <button
                className={`${layoutStyles.navItem} ${activeTab === item.id ? layoutStyles.active : ''} ${
                  sidebarCollapsed && !isMobile ? layoutStyles.navItemCollapsed : ''
                }`}
                onClick={() => handleItemClick(item.id)}
                onMouseEnter={() => setHoveredItem(item.id)}
                onMouseLeave={() => setHoveredItem(null)}
                aria-label={item.label}
              >
                <span className={layoutStyles.navIcon}>
                  {item.icon}
                  {item.hasNotification && (
                    <span className={layoutStyles.notificationDot}>
                      {(item.notificationCount || 0) > 9 ? '9+' : item.notificationCount}
                    </span>
                  )}
                </span>
                
                <span className={`${layoutStyles.navLabel} ${
                  sidebarCollapsed && !isMobile ? layoutStyles.navLabelCollapsed : ''
                }`}>
                  {sidebarCollapsed && !isMobile ? (
                    item.shortLabel.split('\n').map((line, index) => (
                      <span key={index} className={layoutStyles.labelLine}>
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
