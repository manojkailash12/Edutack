const Quiz = require('../models/Quiz');
const Paper = require('../models/Paper');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');
const { generateClassReportPDF } = require('../services/pdfService');

// @desc Get Teacher's Papers and Sections for Quizzes
// @route GET /quizzes/teacher-papers/:teacherId
// @access Private
const getTeacherPapersForQuizzes = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  console.log('=== GET TEACHER PAPERS FOR QUIZZES ===');
  console.log('Teacher ID:', teacherId);
  
  if (!teacherId) {
    console.log('No teacher ID provided');
    return res.status(400).json({ message: "Teacher ID is required" });
  }
  
  try {
    // First, get the user to check their role
    const user = await User.findById(teacherId).select('role department');
    console.log('User found:', user);
    
    if (!user) {
      console.log('User not found for ID:', teacherId);
      return res.status(404).json({ message: "User not found" });
    }
    
    let papers;
    if (user.role === 'HOD') {
      console.log('Fetching papers for HOD in department:', user.department);
      // HODs can create quizzes for all papers in their department
      papers = await Paper.find({ department: user.department })
        .select('paper sections department semester year teacher')
        .populate('teacher', 'name')
        .lean();
    } else {
      console.log('Fetching papers for teacher:', teacherId);
      // Teachers can only create quizzes for papers they teach
      papers = await Paper.find({ teacher: teacherId })
        .select('paper sections department semester year')
        .lean();
    }
    
    console.log('Papers found:', papers.length);
    console.log('Papers data:', papers);
    
    if (!papers?.length) {
      const message = user.role === 'HOD' 
        ? "No papers found in your department" 
        : "No papers assigned to this teacher";
      console.log('No papers found:', message);
      return res.status(404).json({ message });
    }
    
    res.json(papers);
  } catch (err) {
    console.error('Error fetching papers for quizzes:', err);
    res.status(500).json({ message: "Error fetching papers", error: err.message });
  }
});

// @desc Create Quiz (teacher) with section
// @route POST /quizzes
// @access Private
const createQuiz = asyncHandler(async (req, res) => {
  const { paper, title, description, section, questions, duration, startTime, endTime, teacherId, allowRetake, showResults, showCorrectAnswers } = req.body;
  
  if (!paper || !title || !questions || !duration || !startTime || !endTime) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  // Fetch the paper to check teacher assignment
  const paperDoc = await Paper.findById(paper);
  if (!paperDoc) {
    return res.status(404).json({ message: 'Paper not found' });
  }
  
  // If teacherId is present, enforce teacher match (for teachers)
  if (teacherId) {
    if (String(paperDoc.teacher) !== String(teacherId)) {
      return res.status(403).json({ message: 'You are not assigned to this paper' });
    }
    
    // For teachers, validate section
    if (section && !paperDoc.sections.includes(section)) {
      return res.status(400).json({ message: "Invalid section for this paper" });
    }
  }
  
  // Validate questions
  if (!Array.isArray(questions) || questions.length === 0) {
    return res.status(400).json({ message: 'At least one question is required' });
  }
  
  for (let question of questions) {
    if (!question.question || !Array.isArray(question.options) || question.options.length < 2) {
      return res.status(400).json({ message: 'Each question must have a question text and at least 2 options' });
    }
    if (question.correctAnswer === undefined || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
      return res.status(400).json({ message: 'Each question must have a valid correct answer index' });
    }
  }
  
  const quiz = await Quiz.create({ 
    paper, 
    title, 
    description,
    section: section || null,
    questions,
    duration,
    startTime,
    endTime,
    allowRetake: allowRetake || false,
    showResults: showResults !== false, // Default to true
    showCorrectAnswers: showCorrectAnswers !== false // Default to true
  });
  
  if (quiz) {
    res.status(201).json({ message: 'Quiz created successfully', quiz });
  } else {
    res.status(400).json({ message: 'Failed to create quiz' });
  }
});

// @desc Get Quizzes for a Paper (filtered by section for teachers)
// @route GET /quizzes/:paperId?section=sectionName
// @access Private
const getQuizzesByPaper = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  const { section } = req.query;
  
  try {
    let quizzes;
    if (section) {
      // Filter by paper and section
      quizzes = await Quiz.find({
        paper: paperId,
        section: section,
      }).populate('submissions.student', '_id name rollNo').sort({ startTime: -1 });
    } else {
      // For HODs/Admins - get all quizzes for the paper
      quizzes = await Quiz.find({ paper: paperId }).populate('submissions.student', '_id name rollNo').sort({ startTime: -1 });
    }
    
    res.json(quizzes);
  } catch (err) {
    console.error('Error fetching quizzes:', err);
    res.status(500).json({ message: "Error fetching quizzes" });
  }
});

// @desc Get Quiz by ID
// @route GET /quizzes/quiz/:quizId
// @access Private
const getQuizById = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  
  const quiz = await Quiz.findById(quizId)
    .populate('paper', 'paper sections')
    .populate('submissions.student', '_id name rollNo');
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }
  
  res.json(quiz);
});

// @desc Student submits quiz
// @route POST /quizzes/:quizId/submit
// @access Private
const submitQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { student, answers, timeTaken } = req.body;
  
  if (!student || !Array.isArray(answers)) {
    return res.status(400).json({ message: 'Student ID and answers are required' });
  }
  
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }
  
  // Check if quiz is active and within time
  const now = new Date();
  if (now < quiz.startTime || now > quiz.endTime) {
    return res.status(400).json({ message: 'Quiz is not available at this time' });
  }
  
  // Check if student already submitted and retakes are not allowed
  const existingSubmission = quiz.submissions.find(sub => sub.student.toString() === student);
  if (existingSubmission && !quiz.allowRetake) {
    return res.status(409).json({ message: 'Already submitted and retakes are not allowed' });
  }
  
  // Calculate score
  let score = 0;
  for (let i = 0; i < quiz.questions.length; i++) {
    if (answers[i] === quiz.questions[i].correctAnswer) {
      score += quiz.questions[i].marks || 1;
    }
  }
  
  // If retake is allowed, update existing submission or add new one
  if (existingSubmission && quiz.allowRetake) {
    existingSubmission.answers = answers;
    existingSubmission.score = score;
    existingSubmission.timeTaken = timeTaken;
    existingSubmission.submittedAt = new Date();
  } else {
    quiz.submissions.push({ 
      student, 
      answers, 
      score, 
      timeTaken,
      submittedAt: new Date()
    });
  }
  
  await quiz.save();
  res.status(201).json({ 
    message: 'Quiz submitted successfully', 
    score,
    totalMarks: quiz.totalMarks
  });
});

// @desc Get Quiz Results (for teachers)
// @route GET /quizzes/:quizId/results
// @access Private
const getQuizResults = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  
  const quiz = await Quiz.findById(quizId)
    .populate('submissions.student', 'name rollNo email section')
    .populate('paper', 'paper sections');
    
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }
  
  // If quiz has a section, filter submissions by that section
  let submissions = quiz.submissions;
  if (quiz.section) {
    submissions = quiz.submissions.filter(sub => 
      sub.student.section === quiz.section
    );
  }
  
  res.json({
    quiz: {
      title: quiz.title,
      totalMarks: quiz.totalMarks,
      section: quiz.section
    },
    submissions
  });
});

// @desc Update Quiz
// @route PUT /quizzes/:quizId
// @access Private
const updateQuiz = asyncHandler(async (req, res) => {
  try {
    const { quizId } = req.params;
    const { paper, title, description, section, questions, duration, startTime, endTime, teacherId } = req.body;
    
    console.log('=== UPDATE QUIZ REQUEST ===');
    console.log('Quiz ID:', quizId);
    console.log('Request body:', req.body);
  
    if (!paper || !title || !questions || !duration || !startTime || !endTime) {
      console.log('Missing required fields:', { paper: !!paper, title: !!title, questions: !!questions, duration: !!duration, startTime: !!startTime, endTime: !!endTime });
      return res.status(400).json({ message: 'Missing required fields' });
    }
    
    const quiz = await Quiz.findById(quizId);
    console.log('Quiz found:', !!quiz);
    if (!quiz) {
      console.log('Quiz not found for ID:', quizId);
      return res.status(404).json({ message: 'Quiz not found' });
    }
    
    // Fetch the paper to check teacher assignment
    const paperDoc = await Paper.findById(paper);
    if (!paperDoc) {
      return res.status(404).json({ message: 'Paper not found' });
    }
    
    // If teacherId is present, enforce teacher match (for teachers)
    if (teacherId) {
      if (String(paperDoc.teacher) !== String(teacherId)) {
        return res.status(403).json({ message: 'You are not assigned to this paper' });
      }
      
      // For teachers, validate section
      if (section && !paperDoc.sections.includes(section)) {
        return res.status(400).json({ message: "Invalid section for this paper" });
      }
    }
    
    // Validate questions
    if (!Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ message: 'At least one question is required' });
    }
    
    for (let question of questions) {
      if (!question.question || !Array.isArray(question.options) || question.options.length < 2) {
        return res.status(400).json({ message: 'Each question must have a question text and at least 2 options' });
      }
      if (question.correctAnswer === undefined || question.correctAnswer < 0 || question.correctAnswer >= question.options.length) {
        return res.status(400).json({ message: 'Each question must have a valid correct answer index' });
      }
    }
    
    // Update quiz fields
    quiz.paper = paper;
    quiz.title = title;
    quiz.description = description;
    quiz.section = section || null;
    quiz.questions = questions;
    quiz.duration = duration;
    quiz.startTime = startTime;
    quiz.endTime = endTime;
    
    await quiz.save();
  
    console.log('Quiz updated successfully');
    res.json({ message: 'Quiz updated successfully', quiz });
  } catch (error) {
    console.error('Error in updateQuiz:', error);
    res.status(500).json({ message: 'Internal server error', error: error.message });
  }
});

// @desc Delete Quiz
// @route DELETE /quizzes/:quizId
// @access Private
const deleteQuiz = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }
  
  await quiz.deleteOne();
  res.json({ message: 'Quiz deleted successfully' });
});

// @desc Update Quiz Marks (for teachers)
// @route PATCH /quizzes/:quizId/update-marks
// @access Private
const updateQuizMarks = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  const { student, marks } = req.body;
  
  if (!student || marks === undefined) {
    return res.status(400).json({ message: 'Student ID and marks are required' });
  }
  
  const quiz = await Quiz.findById(quizId);
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }
  
  const submission = quiz.submissions.find(sub => sub.student.toString() === student);
  if (!submission) {
    return res.status(404).json({ message: 'Submission not found' });
  }
  
  submission.score = marks;
  await quiz.save();
  
  res.json({ message: 'Quiz marks updated successfully' });
});

// @desc Get Quiz Submissions (for teachers)
// @route GET /quizzes/:quizId/submissions
// @access Private
const getQuizSubmissions = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  
  const quiz = await Quiz.findById(quizId)
    .populate('submissions.student', 'name rollNo email section')
    .populate('paper', 'paper sections');
    
  if (!quiz) {
    return res.status(404).json({ message: 'Quiz not found' });
  }
  
  // If quiz has a section, filter submissions by that section
  let submissions = quiz.submissions;
  if (quiz.section) {
    submissions = quiz.submissions.filter(sub => 
      sub.student.section === quiz.section
    );
  }
  
  res.json(submissions);
});

// @desc Get Quizzes for Students by Section
// @route GET /quizzes/student/:section
// @access Private (students)
const getQuizzesForStudent = asyncHandler(async (req, res) => {
  const { section } = req.params;
  const { department, year } = req.query;
  
  if (!section || !department || !year) {
    return res.status(400).json({ message: "Section, department, and year are required" });
  }
  
  try {
    // Find all papers for this department, year, and section
    const papers = await Paper.find({
      department,
      year,
      sections: section
    }).select('_id paper').lean();
    
    if (!papers.length) {
      return res.status(404).json({ message: "No papers found for this section" });
    }
    
    // Get all quizzes for these papers in this section
    const quizzes = await Quiz.find({
      paper: { $in: papers.map(p => p._id) },
      section: section
    }).populate('paper', 'paper').sort({ startTime: -1 }).lean();
    
    res.json(quizzes);
  } catch (err) {
    res.status(500).json({ message: "Error fetching quizzes for student", error: err.message });
  }
});

// @desc Get Quiz Marks for a Paper (for Internal Marks integration)
// @route GET /quizzes/marks/:paperId
// @access Private
const getQuizMarksForPaper = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  
  try {
    // Get all quizzes for this paper
    const quizzes = await Quiz.find({ paper: paperId })
      .populate('submissions.student', '_id rollNo name')
      .lean();
    
    if (!quizzes.length) {
      return res.json({}); // No quizzes, return empty object
    }
    
    // Calculate average quiz marks for each student
    const studentMarks = {};
    
    quizzes.forEach(quiz => {
      quiz.submissions.forEach(submission => {
        if (submission.score !== null && submission.score !== undefined) {
          const studentId = submission.student._id.toString();
          if (!studentMarks[studentId]) {
            studentMarks[studentId] = {
              totalMarks: 0,
              quizCount: 0,
              rollNo: submission.student.rollNo,
              name: submission.student.name
            };
          }
          studentMarks[studentId].totalMarks += submission.score;
          studentMarks[studentId].quizCount += 1;
        }
      });
    });
    
    // Calculate averages and format response
    const result = {};
    Object.keys(studentMarks).forEach(studentId => {
      const data = studentMarks[studentId];
      result[studentId] = Math.round(data.totalMarks / data.quizCount);
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching quiz marks", error: err.message });
  }
});

// @desc Download Quiz Report PDF
// @route GET /quizzes/:quizId/report/pdf
// @access Private
const downloadQuizReportPDF = asyncHandler(async (req, res) => {
  const { quizId } = req.params;
  
  if (!quizId) {
    return res.status(400).json({ message: "Quiz ID is required" });
  }

  try {
    // Get quiz details with paper info
    const quiz = await Quiz.findById(quizId)
      .populate('paper', 'paper department semester year')
      .lean();
    
    if (!quiz) {
      return res.status(404).json({ message: "Quiz not found" });
    }

    // Transform submissions into report format
    const studentsData = quiz.submissions.map((submission, index) => ({
      _id: submission.student,
      rollNo: submission.rollNo || `STU${index + 1}`,
      name: submission.studentName || 'Unknown Student',
      midMarks: 0, // Not applicable for quizzes
      lab: 0, // Not applicable
      assignmentQuiz: submission.marks || 0,
      attendance: 0, // Not applicable
      total: submission.marks || 0,
      submittedAt: submission.submittedAt,
      status: submission.marks !== undefined ? 'Graded' : 'Submitted',
      score: `${submission.marks || 0}/${quiz.totalMarks || 0}`
    }));

    const reportData = {
      paper: quiz.paper.paper + ' - Quiz Report',
      department: quiz.paper.department,
      semester: quiz.paper.semester,
      year: quiz.paper.year,
      quizTitle: quiz.title,
      totalMarks: quiz.totalMarks,
      duration: quiz.duration,
      totalSubmissions: quiz.submissions.length
    };

    const filename = `Professional_Quiz_Report_${quiz.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    generateClassReportPDF(res, reportData, studentsData, filename);

  } catch (err) {
    console.error('Quiz PDF generation error:', err);
    res.status(500).json({ message: "Error generating quiz PDF report" });
  }
});

module.exports = {
  getTeacherPapersForQuizzes,
  createQuiz,
  getQuizzesByPaper,
  getQuizById,
  submitQuiz,
  getQuizResults,
  updateQuiz,
  deleteQuiz,
  updateQuizMarks,
  getQuizSubmissions,
  getQuizzesForStudent,
  getQuizMarksForPaper,
  downloadQuizReportPDF,
};