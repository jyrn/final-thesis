// API Configuration
export const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://skillsync-backend-gwwo.onrender.com/api';

// Debug: Log the API URL being used
console.log('🔧 API_BASE_URL:', API_BASE_URL);
console.log('🔧 REACT_APP_API_URL env var:', process.env.REACT_APP_API_URL);

export default API_BASE_URL;
