// API Configuration
const getApiBaseUrl = () => {
  // If environment variable is set, use it
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  
  // Otherwise, determine based on NODE_ENV
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3001/api';
  }
  
  // Production fallback
  return 'https://skillsync-backend-gwwo.onrender.com/api';
};

export const API_BASE_URL = getApiBaseUrl();

// Debug: Log the API URL being used
console.log('🔧 NODE_ENV:', process.env.NODE_ENV);
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('🔧 REACT_APP_API_URL env var:', process.env.REACT_APP_API_URL);

export default API_BASE_URL;
