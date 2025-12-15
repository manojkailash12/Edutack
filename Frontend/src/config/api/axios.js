import axios from "axios";

// Determine the base URL based on environment
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    // Check if custom API URL is provided
    if (process.env.REACT_APP_API_URL) {
      return process.env.REACT_APP_API_URL;
    }
    
    // Auto-detect Netlify Functions URL based on current domain
    if (typeof window !== 'undefined') {
      const currentDomain = window.location.origin;
      return `${currentDomain}/.netlify/functions/api`;
    }
    
    // Fallback for server-side rendering or build time
    return '/.netlify/functions/api';
  }
  // Use localhost for development
  return "http://localhost:3500";
};

const baseURL = getBaseURL();

// Log the API URL for debugging
console.log('🔗 API Base URL:', baseURL);

const instance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // 30 second timeout (increased for timetable generation)
  // Enable request/response compression
  decompress: true,
  // Keep connections alive for better performance
  maxRedirects: 5,
});

// Request interceptor for debugging
instance.interceptors.request.use(
  config => {
    console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    return config;
  },
  error => {
    console.error('❌ Request Error:', error);
    return Promise.reject(error);
  }
);

// Global error handler (non-intrusive)
instance.interceptors.response.use(
  response => {
    console.log(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    return response;
  },
  async error => {
    const url = error.config?.url || 'unknown';
    const method = error.config?.method?.toUpperCase() || 'unknown';
    
    if (!error.response) {
      // Network error
      console.error(`🌐 Network Error: ${method} ${url}`, error.message);
    } else {
      // HTTP error
      console.error(`❌ HTTP Error: ${error.response.status} ${method} ${url}`, error.response?.data);
    }
    return Promise.reject(error);
  }
);

export default instance;
