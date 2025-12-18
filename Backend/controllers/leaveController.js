const StudentLeave = require('../models/StudentLeave');
const StaffLeave = require('../models/StaffLeave');
const Student = require('../models/Student');
const Staff = require('../models/Staff');

// Student Leave Controllers

// Submit student leave request
const submitStudentLeave = async (req, res) => {
  try {
    const { studentId, leaveType, startDate, endDate, reason, documents } = req.body;

    // Validate required fields
    if (!studentId || !leaveType || !startDate || !endDate || !reason) {
      return res.status(400).json({ 
        message: 'All fields are required: studentId, leaveType, startDate, endDate, reason' 
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    // Create new leave request
    const newLeave = new StudentLeave({
      studentId,
      studentName: student.name,
      rollNo: student.rollNo,
      section: student.section,
      department: student.department,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      documents: documents || []
    });

    await newLeave.save();

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leave: newLeave
    });
  } catch (error) {
    console.error('Error submitting student leave:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid data provided' });
    }
    res.status(500).json({ message: 'Server error while submitting leave request' });
  }
};

// Get student leave requests by department (for HOD)
const getStudentLeavesByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    if (!department) {
      return res.status(400).json({ message: 'Department parameter is required' });
    }

    const leaves = await StudentLeave.find({ department })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(leaves || []);
  } catch (error) {
    console.error('Error fetching student leaves:', error);
    res.status(500).json({ message: 'Server error while fetching leave requests' });
  }
};

// Get student's own leave requests
const getStudentLeaves = async (req, res) => {
  try {
    const { studentId } = req.params;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID parameter is required' });
    }

    const leaves = await StudentLeave.find({ studentId })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(leaves || []);
  } catch (error) {
    console.error('Error fetching student leaves:', error);
    res.status(500).json({ message: 'Server error while fetching leave requests' });
  }
};

// Approve/Reject student leave
const updateStudentLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, comments, reviewerId } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Approved or Rejected' });
    }

    const leave = await StudentLeave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leave.status = status;
    leave.reviewedAt = new Date();
    leave.reviewedBy = reviewerId;
    if (comments) leave.comments = comments.trim();

    await leave.save();

    res.json({
      message: `Leave request ${status.toLowerCase()} successfully`,
      leave
    });
  } catch (error) {
    console.error('Error updating student leave status:', error);
    res.status(500).json({ message: 'Server error while updating leave status' });
  }
};

// Staff Leave Controllers

// Submit staff leave request
const submitStaffLeave = async (req, res) => {
  try {
    const { staffId, leaveType, startDate, endDate, reason, substitute, documents } = req.body;

    // Validate required fields
    if (!staffId || !leaveType || !startDate || !endDate || !reason || !substitute) {
      return res.status(400).json({ 
        message: 'All fields are required: staffId, leaveType, startDate, endDate, reason, substitute' 
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start >= end) {
      return res.status(400).json({ message: 'End date must be after start date' });
    }

    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Create new leave request
    const newLeave = new StaffLeave({
      staffId,
      staffName: staff.name,
      employeeId: staff.employeeId,
      department: staff.department,
      leaveType,
      startDate: start,
      endDate: end,
      reason: reason.trim(),
      substitute: substitute.trim(),
      documents: documents || []
    });

    await newLeave.save();

    res.status(201).json({
      message: 'Leave request submitted successfully',
      leave: newLeave
    });
  } catch (error) {
    console.error('Error submitting staff leave:', error);
    if (error.name === 'ValidationError') {
      return res.status(400).json({ message: 'Invalid data provided' });
    }
    res.status(500).json({ message: 'Server error while submitting leave request' });
  }
};

// Get staff leave requests by department (for HOD)
const getStaffLeavesByDepartment = async (req, res) => {
  try {
    const { department } = req.params;

    if (!department) {
      return res.status(400).json({ message: 'Department parameter is required' });
    }

    const leaves = await StaffLeave.find({ department })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(leaves || []);
  } catch (error) {
    console.error('Error fetching staff leaves:', error);
    res.status(500).json({ message: 'Server error while fetching leave requests' });
  }
};

// Get staff's own leave requests
const getStaffLeaves = async (req, res) => {
  try {
    const { staffId } = req.params;

    if (!staffId) {
      return res.status(400).json({ message: 'Staff ID parameter is required' });
    }

    const leaves = await StaffLeave.find({ staffId })
      .sort({ submittedAt: -1 })
      .lean();

    res.json(leaves || []);
  } catch (error) {
    console.error('Error fetching staff leaves:', error);
    res.status(500).json({ message: 'Server error while fetching leave requests' });
  }
};

// Approve/Reject staff leave
const updateStaffLeaveStatus = async (req, res) => {
  try {
    const { leaveId } = req.params;
    const { status, comments, reviewerId } = req.body;

    if (!['Approved', 'Rejected'].includes(status)) {
      return res.status(400).json({ message: 'Invalid status. Must be Approved or Rejected' });
    }

    const leave = await StaffLeave.findById(leaveId);
    if (!leave) {
      return res.status(404).json({ message: 'Leave request not found' });
    }

    leave.status = status;
    leave.reviewedAt = new Date();
    leave.reviewedBy = reviewerId;
    if (comments) leave.comments = comments.trim();

    await leave.save();

    res.json({
      message: `Leave request ${status.toLowerCase()} successfully`,
      leave
    });
  } catch (error) {
    console.error('Error updating staff leave status:', error);
    res.status(500).json({ message: 'Server error while updating leave status' });
  }
};

// Admin Controllers

// Get all student leave requests (Admin only)
const getAllStudentLeaves = async (req, res) => {
  try {
    const leaves = await StudentLeave.find({})
      .sort({ submittedAt: -1 })
      .lean();

    res.json(leaves || []);
  } catch (error) {
    console.error('Error fetching all student leaves:', error);
    res.status(500).json({ message: 'Server error while fetching all student leave requests' });
  }
};

// Get all staff leave requests (Admin only)
const getAllStaffLeaves = async (req, res) => {
  try {
    const leaves = await StaffLeave.find({})
      .sort({ submittedAt: -1 })
      .lean();

    res.json(leaves || []);
  } catch (error) {
    console.error('Error fetching all staff leaves:', error);
    res.status(500).json({ message: 'Server error while fetching all staff leave requests' });
  }
};

module.exports = {
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
};