import React from 'react'
import { FiSliders, FiMenu, FiBell } from 'react-icons/fi'
import styles from './MobileHeader.module.css'
import { getImageSrc } from '../../../utils/imageUtils'

interface MobileHeaderProps {
  pageTitle: string
  userName?: string
  userInitial?: string
  userProfilePicture?: string
  onFilterClick?: () => void
  onMenuClick?: () => void
  onProfileClick?: () => void
  notifications?: number
  showSearch?: boolean
  searchComponent?: React.ReactNode
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  pageTitle,
  userName = 'User',
  userInitial = 'U',
  userProfilePicture,
  onFilterClick,
  onMenuClick,
  onProfileClick,
  notifications = 0,
  showSearch = false,
  searchComponent
}) => {
  return (
    <>
      <header className={styles.appHeader}>
        <div className={styles.headerLeft}>
          {onMenuClick && (
            <button 
              className={styles.menuButton}
              onClick={onMenuClick}
              aria-label="Toggle menu"
            >
              <FiMenu />
            </button>
          )}
          <div className={styles.titleSection}>
            <h1 className={styles.pageTitle}>{pageTitle}</h1>
          </div>
        </div>
        
        <div className={styles.headerRight}>
          {onFilterClick && (
            <button 
              className={styles.filterButton} 
              onClick={onFilterClick}
              aria-label="Open filters"
            >
              <FiSliders />
            </button>
          )}
          
          <button 
            className={styles.notificationButton}
            aria-label="Notifications"
          >
            <FiBell />
            {notifications > 0 && (
              <span className={styles.notificationBadge}>
                {notifications > 9 ? '9+' : notifications}
              </span>
            )}
          </button>
          
          <button 
            className={styles.userAvatar} 
            onClick={onProfileClick}
            aria-label="Go to settings"
          >
            {userProfilePicture ? (
              <img 
                src={getImageSrc(userProfilePicture)} 
                alt="Profile" 
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
              />
            ) : (
              userInitial
            )}
          </button>
        </div>
      </header>
      
      {showSearch && searchComponent && (
        <div className={styles.mobileSearchContainer}>
          {searchComponent}
        </div>
      )}
    </>
  )
}

export default MobileHeader
