import axios from '../config/api/axios';
import { apiCache } from '../utils/cache';

class ApiService {
  constructor() {
    this.pendingRequests = new Map();
  }

  // Generic cached API call
  async cachedGet(url, options = {}) {
    const cacheKey = `${url}${JSON.stringify(options.params || {})}`;
    
    // Return cached data if available
    if (apiCache.has(cacheKey) && !options.forceRefresh) {
      return apiCache.get(cacheKey);
    }

    // Prevent duplicate requests
    if (this.pendingRequests.has(cacheKey)) {
      return this.pendingRequests.get(cacheKey);
    }

    // Make the request
    const requestPromise = axios.get(url, {
      timeout: 5000, // Reduced timeout for faster failure
      ...options
    }).then(response => {
      const data = response.data;
      apiCache.set(cacheKey, data, options.ttl);
      this.pendingRequests.delete(cacheKey);
      return data;
    }).catch(error => {
      this.pendingRequests.delete(cacheKey);
      throw error;
    });

    this.pendingRequests.set(cacheKey, requestPromise);
    return requestPromise;
  }

  // Specific API methods with caching
  async getStudents(department = null, forceRefresh = false) {
    const url = department ? `/student/list/${encodeURIComponent(department)}` : '/student';
    return this.cachedGet(url, { forceRefresh });
  }

  async getStaff(department = null, forceRefresh = false) {
    const url = department ? `/staff/list/${encodeURIComponent(department)}` : '/staff';
    return this.cachedGet(url, { forceRefresh });
  }

  async getPapers(forceRefresh = false) {
    return this.cachedGet('/paper/all', { forceRefresh });
  }

  async getAttendance(department, forceRefresh = false) {
    return this.cachedGet(`/attendance/department-report/${encodeURIComponent(department)}`, { forceRefresh });
  }

  async getStaffAttendance(staffId, month, year, forceRefresh = false) {
    return this.cachedGet(`/staff-attendance/history/${staffId}`, {
      params: { month, year },
      forceRefresh
    });
  }

  async getCertificates(studentId = null, forceRefresh = false) {
    const url = studentId ? `/certificates/student/${studentId}` : '/certificates/dashboard';
    return this.cachedGet(url, { forceRefresh });
  }

  async getQuizzes(forceRefresh = false) {
    return this.cachedGet('/quiz', { forceRefresh });
  }

  async getAssignments(forceRefresh = false) {
    return this.cachedGet('/assignment', { forceRefresh });
  }

  async getDepartments(forceRefresh = false) {
    return this.cachedGet('/staff/departments', { forceRefresh });
  }

  // Prefetch common data
  async prefetchCommonData(user) {
    if (!user) return;

    const prefetchPromises = [];

    // Prefetch based on user role
    if (user.role === 'admin') {
      prefetchPromises.push(
        this.getStudents(),
        this.getStaff(),
        this.getPapers(),
        this.getCertificates()
      );
    } else if (user.role === 'HOD') {
      prefetchPromises.push(
        this.getStudents(user.department),
        this.getStaff(user.department),
        this.getAttendance(user.department)
      );
    } else if (user.role === 'teacher') {
      prefetchPromises.push(
        this.getStudents(user.department),
        this.getQuizzes(),
        this.getAssignments()
      );
    } else if (user.role === 'student') {
      prefetchPromises.push(
        this.getCertificates(user._id),
        this.getQuizzes(),
        this.getAssignments()
      );
    }

    // Execute prefetch in background (don't wait for completion)
    Promise.allSettled(prefetchPromises).catch(console.warn);
  }

  // Clear cache for specific data type
  clearCache(pattern = null) {
    if (pattern) {
      // Clear specific cache entries
      for (const key of apiCache.cache.keys()) {
        if (key.includes(pattern)) {
          apiCache.delete(key);
        }
      }
    } else {
      apiCache.clear();
    }
  }
}

export const apiService = new ApiService();