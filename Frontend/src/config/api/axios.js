import axios from "axios";

// Determine the base URL based on environment
const getBaseURL = () => {
  if (process.env.NODE_ENV === 'production') {
    // Use deployed backend URL (update this after deploying backend)
    return process.env.REACT_APP_API_URL || 'https://edutack-production-33d4.up.railway.app';
  }
  // Use localhost for development
  return "http://localhost:3500";
};

const instance = axios.create({
  baseURL: getBaseURL(),
  headers: { "Content-Type": "application/json" },
  timeout: 30000, // 30 second timeout (increased for timetable generation)
  // Enable request/response compression
  decompress: true,
  // Keep connections alive for better performance
  maxRedirects: 5,
});

// Global error handler (non-intrusive)
instance.interceptors.response.use(
  response => response,
  async error => {
    // Do not use window.alert; allow UI layers to decide how to show errors
    if (!error.response) {
      // network error
      // Optionally log
      // console.error('Network error', error);
    } else if (error.response.status >= 500) {
      // server error
      // console.error('Server error', error.response?.data);
    }
    return Promise.reject(error);
  }
);

export default instance;
