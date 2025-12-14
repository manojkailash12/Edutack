const Assignment = require('../models/Assignment');
const Paper = require('../models/Paper');
const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');
const { generateClassReportPDF } = require('../services/pdfService');

// @desc Get Teacher's Papers and Sections for Assignments
// @route GET /assignments/teacher-papers/:teacherId
// @access Private
const getTeacherPapersForAssignments = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  if (!teacherId) {
    return res.status(400).json({ message: "Teacher ID is required" });
  }
  
  try {
    // Use the same logic as quiz controller - get papers directly
    let papers;
    
    // Get all papers for this teacher first
    papers = await Paper.find({ teacher: teacherId })
      .select('paper sections department semester year')
      .lean();
    
    // If no papers found as teacher, check if user is HOD
    if (!papers?.length) {
      const Staff = require('../models/Staff');
      const staff = await Staff.findById(teacherId).select('role department');
      
      if (staff?.role === 'HOD') {
        // HODs can create assignments for all papers in their department
        papers = await Paper.find({ department: staff.department })
          .select('paper sections department semester year teacher')
          .populate('teacher', 'name')
          .lean();
      }
    }
    
    if (!papers?.length) {
      return res.status(404).json({ message: "No papers assigned to this teacher" });
    }
    
    res.json(papers);
  } catch (err) {
    console.error('Error fetching papers for assignments:', err);
    res.status(500).json({ message: "Error fetching papers" });
  }
});

// @desc Create Assignment (teacher) with section
// @route POST /assignments
// @access Private
const createAssignment = asyncHandler(async (req, res) => {
  const { paper, title, description, instructions, section, dueDate, maxMarks, teacherId, allowLateSubmission, allowRetake } = req.body;
  
  if (!paper || !title || !description || !dueDate || !maxMarks) {
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
  
  // Handle file attachments if any
  let attachments = [];
  if (req.files && req.files.length > 0) {
    attachments = req.files.map(file => `/assignments/files/${file.filename}`);
  }
  
  // Use only the custom instructions provided by the teacher
  const defaultInstructions = instructions || '';
  
  const assignment = await Assignment.create({ 
    paper, 
    title, 
    description,
    instructions: defaultInstructions,
    section: section || null,
    dueDate,
    maxMarks,
    allowLateSubmission: allowLateSubmission || false,
    allowRetake: allowRetake || false,
    attachments
  });
  
  if (assignment) {
    res.status(201).json({ message: 'Assignment created successfully', assignment });
  } else {
    res.status(400).json({ message: 'Failed to create assignment' });
  }
});

// @desc Get Assignments for a Paper (filtered by section for teachers)
// @route GET /assignments/:paperId?section=sectionName
// @access Private
const getAssignmentsByPaper = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  const { section } = req.query;
  

  
  try {
    let assignments;
    if (section) {
      // Filter by paper and section
      assignments = await Assignment.find({
        paper: paperId,
        section: section,
      }).sort({ dueDate: -1 });
    } else {
      // For HODs/Admins - get all assignments for the paper
      assignments = await Assignment.find({ paper: paperId }).sort({ dueDate: -1 });
    }
    res.json(assignments);
  } catch (err) {
    console.error('Error fetching assignments:', err);
    res.status(500).json({ message: "Error fetching assignments" });
  }
});

// @desc Get Assignment by ID
// @route GET /assignments/assignment/:assignmentId
// @access Private
const getAssignmentById = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  
  const assignment = await Assignment.findById(assignmentId).populate('paper', 'paper sections');
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }
  
  res.json(assignment);
});

// @desc Student submits assignment
// @route POST /assignments/:assignmentId/submit
// @access Private
const submitAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { student, content } = req.body;
  

  
  if (!student) {
    return res.status(400).json({ message: 'Student ID is required' });
  }
  
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }
  
  // Check if assignment is still accepting submissions
  const now = new Date();
  if (now > assignment.dueDate && !assignment.allowLateSubmission) {
    return res.status(400).json({ message: 'Assignment deadline has passed' });
  }
  
  // Handle file attachments - at least one file is required
  let attachments = [];
  if (req.files && req.files.length > 0) {
    attachments = req.files.map(file => `/assignments/files/${file.filename}`);
  } else {
    return res.status(400).json({ message: 'At least one file attachment is required' });
  }
  
  // Check if student already submitted
  const existingSubmission = assignment.submissions.find(sub => sub.student.toString() === student);
  

  
  if (existingSubmission) {
    // If student has existing submission and retakes are not allowed, block submission
    if (!assignment.allowRetake) {
      return res.status(409).json({ message: 'Already submitted and retakes are not allowed' });
    }
    
    console.log('Updating existing submission');
    // Update existing submission (retake allowed)
    existingSubmission.content = content || '';
    existingSubmission.attachments = attachments;
    existingSubmission.submittedAt = new Date();
    existingSubmission.attemptNumber += 1;
    existingSubmission.isGraded = false; // Reset grading status
    existingSubmission.score = 0;
    existingSubmission.feedback = '';
  } else {
    console.log('Creating new submission');
    // No existing submission, create new one (this should happen after deletion)
    assignment.submissions.push({ 
      student, 
      content: content || '', 
      attachments,
      attemptNumber: 1
    });
  }
  
  await assignment.save();
  res.status(201).json({ message: 'Assignment submitted successfully' });
});

// @desc Student deletes their assignment submission
// @route DELETE /assignments/:assignmentId/submit/:studentId
// @access Private
const deleteSubmission = asyncHandler(async (req, res) => {
  const { assignmentId, studentId } = req.params;
  
  console.log('Delete submission called with:', { assignmentId, studentId });
  
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    console.log('Assignment not found:', assignmentId);
    return res.status(404).json({ message: 'Assignment not found' });
  }
  
  console.log('Assignment found, submissions count:', assignment.submissions.length);
  
  const submissionIndex = assignment.submissions.findIndex(sub => sub.student.toString() === studentId);
  if (submissionIndex === -1) {
    console.log('Submission not found for student:', studentId);
    console.log('Available submissions:', assignment.submissions.map(s => s.student.toString()));
    return res.status(404).json({ message: 'Submission not found' });
  }
  
  const submission = assignment.submissions[submissionIndex];
  
  // Delete associated files
  if (submission.attachments && submission.attachments.length > 0) {
    submission.attachments.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', 'public', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });
  }
  
  console.log('Deleting submission at index:', submissionIndex);
  
  // Remove submission from array
  assignment.submissions.splice(submissionIndex, 1);
  await assignment.save();
  
  console.log('Submission deleted, remaining submissions:', assignment.submissions.length);
  
  res.json({ message: 'Submission deleted successfully' });
});

// @desc Teacher grades assignment submission
// @route POST /assignments/:assignmentId/grade
// @access Private
const gradeAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { student, score, feedback, isGraded } = req.body;
  
  if (!student || score === undefined) {
    return res.status(400).json({ message: 'Student ID and score are required' });
  }
  
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }
  
  const submission = assignment.submissions.find(sub => sub.student.toString() === student);
  if (!submission) {
    return res.status(404).json({ message: 'Submission not found' });
  }
  
  // Validate score (allow 0 for ungraded)
  if (score < 0 || score > assignment.maxMarks) {
    return res.status(400).json({ message: `Score must be between 0 and ${assignment.maxMarks}` });
  }
  
  submission.score = score;
  submission.feedback = feedback || '';
  // Allow explicit control of graded status, default to true if not specified
  submission.isGraded = isGraded !== undefined ? isGraded : true;
  
  await assignment.save();
  
  const statusMessage = submission.isGraded ? 'Assignment graded successfully' : 'Assignment marked as ungraded';
  res.json({ message: statusMessage });
});

// @desc Get assignment submissions for teacher
// @route GET /assignments/:assignmentId/submissions
// @access Private
const getAssignmentSubmissions = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  
  const assignment = await Assignment.findById(assignmentId)
    .populate('submissions.student', 'name rollNo section')
    .lean();
    
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }
  
  res.json(assignment.submissions);
});

// @desc Get Assignment Marks for a Paper (for Internal Marks integration)
// @route GET /assignments/marks/:paperId
// @access Private
const getAssignmentMarksForPaper = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  
  try {
    // Get all assignments for this paper
    const assignments = await Assignment.find({ paper: paperId })
      .populate('submissions.student', '_id rollNo name')
      .lean();
    
    if (!assignments.length) {
      return res.json({}); // No assignments, return empty object
    }
    
    // Get all students for this paper to ensure we include students with no submissions
    const Paper = require('../models/Paper');
    const Student = require('../models/Student');
    const paperDoc = await Paper.findById(paperId).populate('sections');
    
    // Get all students from the paper's sections
    const allStudents = await Student.find({
      department: paperDoc.department,
      year: paperDoc.year,
      section: { $in: paperDoc.sections }
    }).select('_id rollNo name').lean();
    
    // Initialize student marks with all students (default 0)
    const studentMarks = {};
    allStudents.forEach(student => {
      studentMarks[student._id.toString()] = {
        totalMarks: 0,
        assignmentCount: assignments.length, // Count all assignments, not just submitted ones
        rollNo: student.rollNo,
        name: student.name,
        submittedCount: 0
      };
    });
    
    // Calculate marks for students who submitted
    assignments.forEach(assignment => {
      assignment.submissions.forEach(submission => {
        const studentId = submission.student._id.toString();
        if (studentMarks[studentId]) {
          studentMarks[studentId].submittedCount += 1;
          if (submission.isGraded && submission.score !== null && submission.score !== undefined) {
            // Convert score to 10-point scale for internal marks
            const normalizedScore = (submission.score / assignment.maxMarks) * 10;
            studentMarks[studentId].totalMarks += normalizedScore;
          }
        }
      });
    });
    
    // Calculate averages and format response
    const result = {};
    Object.keys(studentMarks).forEach(studentId => {
      const data = studentMarks[studentId];
      // Average includes 0 for missing submissions
      result[studentId] = Math.round(data.totalMarks / data.assignmentCount);
    });
    
    res.json(result);
  } catch (err) {
    res.status(500).json({ message: "Error fetching assignment marks", error: err.message });
  }
});

// @desc Get Assignments for Students by Section
// @route GET /assignments/student/:section
// @access Private (students)
const getAssignmentsForStudent = asyncHandler(async (req, res) => {
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
    
    // Get all assignments for these papers in this section
    const assignments = await Assignment.find({
      paper: { $in: papers.map(p => p._id) },
      section: section,
      isActive: true
    }).populate('paper', 'paper').sort({ dueDate: -1 }).lean();
    
    res.json(assignments);
  } catch (err) {
    res.status(500).json({ message: "Error fetching assignments for student", error: err.message });
  }
});

// @desc Update Assignment
// @route PUT /assignments/:assignmentId
// @access Private
const updateAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  const { paper, title, description, instructions, section, dueDate, maxMarks, teacherId, allowLateSubmission, allowRetake } = req.body;
  
  if (!paper || !title || !description || !dueDate || !maxMarks) {
    return res.status(400).json({ message: 'Missing required fields' });
  }
  
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
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
  
  // Handle file attachments if any
  let attachments = assignment.attachments || [];
  if (req.files && req.files.length > 0) {
    const newAttachments = req.files.map(file => `/assignments/files/${file.filename}`);
    attachments = [...attachments, ...newAttachments];
  }
  
  // Use only the custom instructions provided by the teacher
  const defaultInstructions = instructions || '';
  
  // Update assignment
  assignment.paper = paper;
  assignment.title = title;
  assignment.description = description;
  assignment.instructions = defaultInstructions;
  assignment.section = section || null;
  assignment.dueDate = dueDate;
  assignment.maxMarks = maxMarks;
  assignment.allowLateSubmission = allowLateSubmission || false;
  assignment.allowRetake = allowRetake || false;
  assignment.attachments = attachments;
  
  await assignment.save();
  
  res.json({ message: 'Assignment updated successfully', assignment });
});

// @desc Delete Assignment
// @route DELETE /assignments/:assignmentId
// @access Private
const deleteAssignment = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  
  const assignment = await Assignment.findById(assignmentId);
  if (!assignment) {
    return res.status(404).json({ message: 'Assignment not found' });
  }
  
  // Delete associated files
  if (assignment.attachments && assignment.attachments.length > 0) {
    assignment.attachments.forEach(filePath => {
      const fullPath = path.join(__dirname, '..', 'public', filePath);
      if (fs.existsSync(fullPath)) {
        fs.unlinkSync(fullPath);
      }
    });
  }
  
  // Delete submission files
  assignment.submissions.forEach(submission => {
    if (submission.attachments && submission.attachments.length > 0) {
      submission.attachments.forEach(filePath => {
        const fullPath = path.join(__dirname, '..', 'public', filePath);
        if (fs.existsSync(fullPath)) {
          fs.unlinkSync(fullPath);
        }
      });
    }
  });
  
  await Assignment.findByIdAndDelete(assignmentId);
  res.json({ message: 'Assignment deleted successfully' });
});

// @desc Download Assignment Report PDF
// @route GET /assignments/:assignmentId/report/pdf
// @access Private
const downloadAssignmentReportPDF = asyncHandler(async (req, res) => {
  const { assignmentId } = req.params;
  
  if (!assignmentId) {
    return res.status(400).json({ message: "Assignment ID is required" });
  }

  try {
    // Get assignment details with paper info
    const assignment = await Assignment.findById(assignmentId)
      .populate('paper', 'paper department semester year')
      .lean();
    
    if (!assignment) {
      return res.status(404).json({ message: "Assignment not found" });
    }

    // Transform submissions into report format
    const studentsData = assignment.submissions.map((submission, index) => ({
      _id: submission.student,
      rollNo: submission.rollNo || `STU${index + 1}`,
      name: submission.studentName || 'Unknown Student',
      midMarks: 0, // Not applicable for assignments
      lab: 0, // Not applicable
      assignmentQuiz: submission.marks || 0,
      attendance: 0, // Not applicable
      total: submission.marks || 0,
      submittedAt: submission.submittedAt,
      status: submission.marks !== undefined ? 'Graded' : 'Submitted'
    }));

    const reportData = {
      paper: assignment.paper.paper + ' - Assignment Report',
      department: assignment.paper.department,
      semester: assignment.paper.semester,
      year: assignment.paper.year,
      assignmentTitle: assignment.title,
      dueDate: assignment.dueDate,
      totalSubmissions: assignment.submissions.length
    };

    const filename = `Professional_Assignment_Report_${assignment.title.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    generateClassReportPDF(res, reportData, studentsData, filename);

  } catch (err) {
    console.error('Assignment PDF generation error:', err);
    res.status(500).json({ message: "Error generating assignment PDF report" });
  }
});

module.exports = {
  getTeacherPapersForAssignments,
  createAssignment,
  getAssignmentsByPaper,
  getAssignmentById,
  submitAssignment,
  deleteSubmission,
  gradeAssignment,
  getAssignmentSubmissions,
  getAssignmentMarksForPaper,
  getAssignmentsForStudent,
  updateAssignment,
  deleteAssignment,
  downloadAssignmentReportPDF,
};