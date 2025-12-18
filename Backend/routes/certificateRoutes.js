const express = require('express');
const router = express.Router();
const certificateController = require('../controllers/certificateController');

// Staff routes - Internal marks submission
router.post('/internal-marks', certificateController.submitInternalMarks);

// Admin routes - External marks and certificate management
router.post('/external-marks', certificateController.addExternalMarks);
router.get('/external-marks/:studentId', certificateController.getStudentExternalMarks);

router.post('/generate', certificateController.generateCertificate);

router.post('/batch-generate', certificateController.batchGenerateCertificates);

router.get('/departments-sections', certificateController.getDepartmentsAndSections);

router.get('/dashboard', certificateController.getCertificateDashboard);

// Student routes - View and download certificates
router.get('/student/:studentId?', certificateController.getStudentCertificates);

// Staff routes - View student certificates
router.get('/staff-view', certificateController.getStaffCertificateView);

router.get('/download/:certificateId', certificateController.downloadCertificate);

router.post('/email', certificateController.emailCertificate);

module.exports = router;