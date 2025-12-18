const express = require('express');
const router = express.Router();
const {
  staffCheckIn,
  staffCheckOut,
  hodMarkAttendance,
  getStaffAttendanceHistory,
  getMonthlyLeaveStats,
  getDepartmentStaffAttendanceReport,
  getTodayAttendanceStatus,
  calculateAttendanceBasedSalary,
  autoMarkHalfDay,
  testEndpoint
} = require('../controllers/staffAttendanceController');

// Staff self-attendance routes
router.post('/checkin', staffCheckIn);
router.put('/checkout', staffCheckOut);
router.get('/today/:staffId', getTodayAttendanceStatus);
router.get('/history/:staffId', getStaffAttendanceHistory);
router.get('/leave-stats/:staffId', getMonthlyLeaveStats);

// HOD routes
router.post('/hod-mark', hodMarkAttendance);
router.get('/department-report/:department', getDepartmentStaffAttendanceReport);

// Admin routes
router.post('/calculate-salary', calculateAttendanceBasedSalary);
router.post('/auto-mark-half-day', autoMarkHalfDay);

// Test route
router.get('/test', testEndpoint);

module.exports = router;