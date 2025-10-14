/**
 * Utility functions for handling images in the application
 */

/**
 * Formats image URLs for display - supports only cloud URLs
 * @param imageData - Cloud URL only
 * @returns Cloud URL or empty string
 */
export const getImageSrc = (imageData: string | null | undefined): string => {
  if (!imageData) return '';
  
  // Cloud URLs (Cloudinary, AWS, etc.) - Return as-is
  if (imageData.startsWith('http://') || imageData.startsWith('https://')) {
    return imageData;
  }
  
  // No legacy support - only cloud URLs accepted  return '';
};

/**
 * Gets initials from a full name
 * @returns Uppercase initials
 */
export const getInitials = (name: string): string => {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase();
};

/**
 * Validates if a string is a valid cloud image URL
 * @param str - String to validate
 * @returns True if valid cloud URL
 */
export const isValidCloudImageUrl = (str: string): boolean => {
  if (!str) return false;
  
  // Only accept cloud URLs
  return str.startsWith('http://') || str.startsWith('https://');
};
