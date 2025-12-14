const express = require('express');
const router = express.Router();
const quizController = require('../controllers/quizController');

// Get teacher's papers for quizzes
router.get('/teacher-papers/:teacherId', quizController.getTeacherPapersForQuizzes);

// Get quizzes for students by section
router.get('/student/:section', quizController.getQuizzesForStudent);

// Get quiz marks for a paper (for Internal Marks integration)
router.get('/marks/:paperId', quizController.getQuizMarksForPaper);

// Create quiz
router.post('/', quizController.createQuiz);

// Specific quiz resources BEFORE generic paperId routes
// Get quiz by ID
router.get('/quiz/:quizId', quizController.getQuizById);
// Get quiz submissions
router.get('/:quizId/submissions', quizController.getQuizSubmissions);
// Download quiz report PDF
router.get('/:quizId/report/pdf', quizController.downloadQuizReportPDF);
// Student submits quiz
router.post('/:quizId/submit', quizController.submitQuiz);
// Get quiz results (for teachers)
router.get('/:quizId/results', quizController.getQuizResults);
// Update quiz marks (for teachers)
router.patch('/:quizId/update-marks', quizController.updateQuizMarks);
// Update quiz
router.put('/:quizId', quizController.updateQuiz);
// Delete quiz
router.delete('/:quizId', quizController.deleteQuiz);

// Generic paper routes LAST to avoid shadowing
// Get quizzes for a paper with optional section filter
router.get('/:paperId', quizController.getQuizzesByPaper);

module.exports = router; 