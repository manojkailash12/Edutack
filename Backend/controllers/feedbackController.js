const Feedback = require('../models/Feedback');
const StaffFeedback = require('../models/StaffFeedback');
const Student = require('../models/Student');
const Staff = require('../models/Staff');

// Submit feedback (Student only)
const submitFeedback = async (req, res) => {
  try {
    const { studentId, subject, category, rating, feedback } = req.body;

    // Validate required fields
    if (!studentId || !subject || !category || !rating || !feedback) {
      return res.status(400).json({ 
        message: 'All fields are required: studentId, subject, category, rating, feedback' 
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Validate feedback length
    if (feedback.length > 1000) {
      return res.status(400).json({ message: 'Feedback must be less than 1000 characters' });
    }

    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Create new feedback
    const newFeedback = new Feedback({
      studentId,
      studentName: student.name,
      rollNo: student.rollNo,
      section: student.section,
      department: student.department,
      subject: subject.trim(),
      category,
      rating: parseInt(rating),
      feedback: feedback.trim()
    });

    await newFeedback.save();

    res.status(201).json({
      message: 'Feedback submitted successfully',
      feedback: newFeedback
    });
  } catch (error) {
    console.error('Error submitting feedback:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid data provided' });
    }
    res.status(500).json({ message: 'Server error while submitting feedback' });
  }
};

// Get all feedback for HOD's department
const getFeedbackByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    if (!department) {
      return res.status(400).json({ message: 'Department parameter is required' });
    }

    const feedbacks = await Feedback.find({ department })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(feedbacks || []);
  } catch (error) {
    console.error('Error fetching feedback:', error);
    res.status(500).json({ message: 'Server error while fetching feedback' });
  }
};

// Get feedback by student (for student to view their own feedback)
const getStudentFeedback = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID parameter is required' });
    }

    const feedbacks = await Feedback.find({ studentId })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(feedbacks || []);
  } catch (error) {
    console.error('Error fetching student feedback:', error);
    res.status(500).json({ message: 'Server error while fetching student feedback' });
  }
};

// Submit staff feedback (Staff only)
const submitStaffFeedback = async (req, res) => {
  try {
    const { staffId, subject, category, priority, rating, feedback } = req.body;

    // Validate required fields
    if (!staffId || !subject || !category || !priority || !rating || !feedback) {
      return res.status(400).json({ 
        message: 'All fields are required: staffId, subject, category, priority, rating, feedback' 
      });
    }

    // Validate rating range
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ message: 'Rating must be between 1 and 5' });
    }

    // Validate feedback length
    if (feedback.length > 1000) {
      return res.status(400).json({ message: 'Feedback must be less than 1000 characters' });
    }

    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Create new staff feedback
    const newStaffFeedback = new StaffFeedback({
      staffId,
      staffName: staff.name,
      employeeId: staff.employeeId,
      department: staff.department,
      subject: subject.trim(),
      category,
      priority,
      rating: parseInt(rating),
      feedback: feedback.trim()
    });

    await newStaffFeedback.save();

    res.status(201).json({
      message: 'Staff feedback submitted successfully',
      feedback: newStaffFeedback
    });
  } catch (error) {
    console.error('Error submitting staff feedback:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid data provided' });
    }
    res.status(500).json({ message: 'Server error while submitting staff feedback' });
  }
};

// Get all staff feedback for HOD's department
const getStaffFeedbackByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    if (!department) {
      return res.status(400).json({ message: 'Department parameter is required' });
    }

    const feedbacks = await StaffFeedback.find({ department })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(feedbacks || []);
  } catch (error) {
    console.error('Error fetching staff feedback:', error);
    res.status(500).json({ message: 'Server error while fetching staff feedback' });
  }
};

// Get feedback by staff (for staff to view their own feedback)
const getStaffFeedback = async (req, res) => {
  try {
    const { staffId } = req.params;

    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID parameter is required' });
    }

    const feedbacks = await StaffFeedback.find({ staffId })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(feedbacks || []);
  } catch (error) {
    console.error('Error fetching staff feedback:', error);
    res.status(500).json({ message: 'Server error while fetching staff feedback' });
  }
};

// Get all student feedback (Admin only)
const getAllStudentFeedback = async (req, res) => {
  try {
    const feedbacks = await Feedback.find({})
      .sort({ submittedAt: -1 })
      .lean();

    res.json(feedbacks || []);
  } catch (error) {
    console.error('Error fetching all student feedback:', error);
    res.status(500).json({ message: 'Server error while fetching all student feedback' });
  }
};

// Get all staff feedback (Admin only)
const getAllStaffFeedback = async (req, res) => {
  try {
    const feedbacks = await StaffFeedback.find({})
      .sort({ submittedAt: -1 })
      .lean();

    res.json(feedbacks || []);
  } catch (error) {
    console.error('Error fetching all staff feedback:', error);
    res.status(500).json({ message: 'Server error while fetching all staff feedback' });
  }
};

module.exports = {
  submitFeedback,
  getFeedbackByDepartment,
  getStudentFeedback,
  submitStaffFeedback,
  getStaffFeedbackByDepartment,
  getStaffFeedback,
  getAllStudentFeedback,
  getAllStaffFeedback
};