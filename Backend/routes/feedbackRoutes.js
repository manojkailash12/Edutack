const express = require('express');
const router = express.Router();
const { 
  submitFeedback, 
  getFeedbackByDepartment, 
  getStudentFeedback,
  submitStaffFeedback,
  getStaffFeedbackByDepartment,
  getStaffFeedback,
  getAllStudentFeedback,
  getAllStaffFeedback
} = require('../controllers/feedbackController');

// Student routes
router.post('/submit', submitFeedback);
router.get('/student/:studentId', getStudentFeedback);

// Staff routes
router.post('/staff/submit', submitStaffFeedback);

// HOD routes
router.get('/department/:department', getFeedbackByDepartment);
router.get('/staff/department/:department', getStaffFeedbackByDepartment);

// Admin routes (must come before parameterized routes)
router.get('/all', getAllStudentFeedback);
router.get('/staff/all', getAllStaffFeedback);

// Parameterized routes (must come after specific routes)
router.get('/staff/:staffId', getStaffFeedback);

module.exports = router;