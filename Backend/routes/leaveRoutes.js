const express = require('express');
const router = express.Router();
const {
  submitStudentLeave,
  getStudentLeavesByDepartment,
  getStudentLeaves,
  updateStudentLeaveStatus,
  submitStaffLeave,
  getStaffLeavesByDepartment,
  getStaffLeaves,
  updateStaffLeaveStatus,
  getAllStudentLeaves,
  getAllStaffLeaves
} = require('../controllers/leaveController');

// Student Leave Routes
router.post('/student/submit', submitStudentLeave);
router.get('/student/:studentId', getStudentLeaves);
router.get('/student/department/:department', getStudentLeavesByDepartment);
router.patch('/student/:leaveId/status', updateStudentLeaveStatus);

// Staff Leave Routes
router.post('/staff/submit', submitStaffLeave);
router.get('/staff/department/:department', getStaffLeavesByDepartment);
router.patch('/staff/:leaveId/status', updateStaffLeaveStatus);

// Admin Routes (must come before parameterized routes)
router.get('/student/all', getAllStudentLeaves);
router.get('/staff/all', getAllStaffLeaves);

// Parameterized routes (must come after specific routes)
router.get('/staff/:staffId', getStaffLeaves);

module.exports = router;