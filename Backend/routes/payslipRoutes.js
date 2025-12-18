const express = require('express');
const router = express.Router();
const {
  generatePayslip,
  generateAllPayslips,
  regeneratePayslip,
  getStaffPayslips,
  getAllPayslips,
  downloadPayslip,
  resendPayslipEmail
} = require('../controllers/payslipController');

// Admin routes
router.post('/generate', generatePayslip);
router.post('/regenerate', regeneratePayslip);
router.post('/generate-all', generateAllPayslips);
router.get('/all', getAllPayslips);
router.post('/:payslipId/resend-email', resendPayslipEmail);

// Staff routes
router.get('/staff/:staffId', getStaffPayslips);

// Common routes
router.get('/:payslipId/download', downloadPayslip);

module.exports = router;