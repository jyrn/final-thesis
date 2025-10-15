import React from 'react';
import { FiSettings, FiHome, FiUsers, FiLogOut, FiFileText } from 'react-icons/fi';
import styles from './SettingsTab.module.css';

interface SettingsTabProps {
  onOpenCompanyProfile: () => void;
  onOpenTeamManagement: () => void;
  onOpenDocuments?: () => void;
  onLogout?: () => void;
}

export const SettingsTab: React.FC<SettingsTabProps> = ({
  onOpenCompanyProfile,
  onOpenTeamManagement,
  onOpenDocuments,
  onLogout,
}) => {
  const settingsOptions = [
    {
      id: 'company-profile',
      title: 'Company Profile',
      description: 'Update your company information and branding',
      icon: FiHome,
      action: onOpenCompanyProfile,
      buttonText: 'Edit Profile'
    },
    {
      id: 'team-management',
      title: 'Team Management',
      description: 'Add or remove team members and set permissions',
      icon: FiUsers,
      action: onOpenTeamManagement,
      buttonText: 'Manage Team'
    },
    {
      id: 'documents',
      title: 'Company Documents',
      description: 'Update business permits, certificates, and verification documents',
      icon: FiFileText,
      action: onOpenDocuments || (() => {}),
      buttonText: 'Update Documents'
    },
    {
      id: 'logout',
      title: 'Logout',
      description: 'Sign out of your account and return to login page',
      icon: FiLogOut,
      action: onLogout || (() => {}),
      buttonText: 'Sign Out'
    }
  ];

  return (
    <div className={styles.settingsTab}>

      <div className={styles.settingsGrid}>
        {settingsOptions.map((setting) => {
          const IconComponent = setting.icon;
          return (
            <div key={setting.id} className={styles.settingCard}>
              <div className={styles.settingHeader}>
                <div className={styles.settingIcon}>
                  <IconComponent size={24} />
                </div>
                <h3 className={styles.settingTitle}>{setting.title}</h3>
              </div>
              <p className={styles.settingDescription}>{setting.description}</p>
              <button 
                className={styles.settingButton}
                onClick={setting.action}
              >
                {setting.buttonText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};
