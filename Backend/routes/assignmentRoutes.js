const express = require('express');
const router = express.Router();
const assignmentController = require('../controllers/assignmentController');
const multer = require('multer');
const path = require('path');

// Set up multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join('/tmp/uploads/assignments'));
  },
  filename: function (req, file, cb) {
    cb(null, Date.now() + '-' + file.originalname);
  }
});

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: function (req, file, cb) {
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|txt/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only images, PDFs, and documents are allowed'));
    }
  }
});

// Create assignments directory if it doesn't exist
const fs = require('fs');
const assignmentDir = path.join(__dirname, '../public/assignments');
if (!fs.existsSync(assignmentDir)) {
  fs.mkdirSync(assignmentDir, { recursive: true });
}

// Get teacher's papers for assignments
router.get('/teacher-papers/:teacherId', assignmentController.getTeacherPapersForAssignments);

// Get assignments for students by section
router.get('/student/:section', assignmentController.getAssignmentsForStudent);

// Get assignment marks for a paper (for Internal Marks integration)
router.get('/marks/:paperId', assignmentController.getAssignmentMarksForPaper);

// Create assignment (with file upload)
router.post('/', upload.array('attachments', 5), assignmentController.createAssignment);

// Delete submission route (MUST be before other routes)
router.delete('/:assignmentId/submit/:studentId', assignmentController.deleteSubmission);

// Specific assignment resources BEFORE generic paperId routes
// Get assignment by ID
router.get('/assignment/:assignmentId', assignmentController.getAssignmentById);
// Get assignment submissions
router.get('/:assignmentId/submissions', assignmentController.getAssignmentSubmissions);
// Download assignment report PDF
router.get('/:assignmentId/report/pdf', assignmentController.downloadAssignmentReportPDF);
// Student submits assignment (with file upload)
router.post('/:assignmentId/submit', upload.array('attachments', 3), assignmentController.submitAssignment);
// Grade assignment
router.post('/:assignmentId/grade', assignmentController.gradeAssignment);
// Update assignment
router.put('/:assignmentId', upload.array('attachments', 5), assignmentController.updateAssignment);
// Delete assignment (MUST be after more specific routes)
router.delete('/:assignmentId', assignmentController.deleteAssignment);

// Generic paper routes LAST to avoid shadowing
// Get assignments for a paper with optional section filter
router.get('/:paperId', assignmentController.getAssignmentsByPaper);

module.exports = router;