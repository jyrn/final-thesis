import React from 'react'
import { FiMenu } from 'react-icons/fi'
import styles from './MobileHeader.module.css'
import { getImageSrc } from '../../../utils/imageUtils'

interface MobileHeaderProps {
  pageTitle: string
  userName?: string
  userInitial?: string
  userProfilePicture?: string
  onMenuClick?: () => void
  onProfileClick?: () => void
  showSearch?: boolean
  searchComponent?: React.ReactNode
}

const MobileHeader: React.FC<MobileHeaderProps> = ({
  pageTitle,
  userName = 'User',
  userInitial = 'U',
  userProfilePicture,
  onMenuClick,
  onProfileClick,
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
