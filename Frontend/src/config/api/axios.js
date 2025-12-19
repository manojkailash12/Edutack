import axios from "axios";

// Use localhost for development
const baseURL = "http://localhost:3500";

// Log the API URL for debugging (development only)
if (process.env.NODE_ENV === 'development') {
  console.log('🔗 API Base URL:', baseURL);
}

const instance = axios.create({
  baseURL,
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // 30 second timeout (increased for timetable generation)
  // Enable request/response compression
  decompress: true,
  // Keep connections alive for better performance
  maxRedirects: 5,
});

// Request interceptor for debugging (development only)
instance.interceptors.request.use(
  config => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    }
    return config;
  },
  error => {
    if (process.env.NODE_ENV === 'development') {
      console.error('❌ Request Error:', error);
    }
    return Promise.reject(error);
  }
);

// Global error handler (non-intrusive)
instance.interceptors.response.use(
  response => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`✅ API Response: ${response.status} ${response.config.method?.toUpperCase()} ${response.config.url}`);
    }
    return response;
  },
  async error => {
    if (process.env.NODE_ENV === 'development') {
      const url = error.config?.url || 'unknown';
      const method = error.config?.method?.toUpperCase() || 'unknown';
      
      if (!error.response) {
        // Network error
        console.error(`🌐 Network Error: ${method} ${url}`, error.message);
      } else {
        // HTTP error
        console.error(`❌ HTTP Error: ${error.response.status} ${method} ${url}`, error.response?.data);
      }
    }
    return Promise.reject(error);
  }
);

export default instance;
