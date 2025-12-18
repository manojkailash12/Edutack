const Staff = require("../models/Staff");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const Student = require("../models/Student");
const Paper = require("../models/Paper");
const Attendance = require("../models/Attendance");
const Internal = require("../models/Internal");

// @desc Get Staff
// @route GET /staff
// @access Private
const getStaff = asyncHandler(async (req, res) => {
  if (!req?.params?.id) return res.status(400).json({ message: "ID Missing" });

  const staff = await Staff.findById(req.params.id)
    .select("-password -_id -__v")
    .lean();
  if (!staff) {
    return res.status(404).json({ message: "No Staff Found." });
  }
  res.json(staff);
});

// @desc Get all Staffs
// @route GET /Staffs
// @access Private
const getNewStaffs = asyncHandler(async (req, res) => {
  if (!req?.params?.department)
    return res.status(400).json({ message: "Params Missing" });

  const query = {
    department: req.params.department,
    approved: false,
  };
  console.log('Fetching unapproved staff with query:', query);
  const staffs = await Staff.find(query)
    .select("-password")
    .lean();
  console.log('Unapproved staff found:', staffs);
  res.json(staffs);
});

// @desc Get Staff Names only
// @route GET /StaffsList
// @access Private
const getStaffList = asyncHandler(async (req, res) => {
  if (!req?.params?.department)
    return res.status(400).json({ message: "Params Missing" });

  const staffsList = await Staff.find({
    department: req.params.department,
    role:{
      $in:['teacher','HOD']
    }
  })
    .select("-password")
    .lean();
  if (!staffsList?.length) {
    return res.status(400).json({ message: "No Staff(s) Found" });
  }
  console.log(staffsList);
  res.json(staffsList);
});

// @desc Create New Staff
// @route POST /Staff
// @access Private
const createNewStaff = asyncHandler(async (req, res) => {
  const { username, name, email, department, password, role, otp } = req.body;

  // Confirm Data
  if (!username || !name || !email || !department || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Special handling for admin registration
  if (role === 'admin') {
    // Check if this is the first admin (no OTP required)
    const existingAdmins = await Staff.countDocuments({ role: 'admin' });
    
    if (existingAdmins === 0) {
      // First admin - no OTP required
      console.log('Creating first admin without OTP verification');
    } else {
      // Subsequent admin - OTP required
      if (!otp) {
        return res.status(400).json({ 
          message: "OTP verification required for admin registration",
          requiresOTP: true
        });
      }

      // Verify OTP
      const record = registrationOtpStore[email];
      if (!record || record.otp !== otp || record.expires < Date.now()) {
        return res.status(400).json({ message: 'Invalid or expired OTP' });
      }

      // Clear the OTP after successful verification
      delete registrationOtpStore[email];
    }
  }

  // Check for Duplicate Username
  const duplicateUsername = await Staff.findOne({ username }).lean().exec();
  if (duplicateUsername) {
    return res.status(409).json({ message: "Duplicate Username" });
  }

  // Check for Duplicate Email
  const duplicateEmail = await Staff.findOne({ email }).lean().exec();
  if (duplicateEmail) {
    return res.status(409).json({ message: "Email already registered" });
  }

  // Find the current max employeeId, only considering non-null values
  const lastStaff = await Staff.findOne({ employeeId: { $ne: null } }).sort({ employeeId: -1 }).lean();
  const nextEmployeeId = lastStaff && lastStaff.employeeId ? lastStaff.employeeId + 1 : 1;

  // Hash Password
  const hashedPwd = await bcrypt.hash(password, 10);

  const staffObj = {
    employeeId: nextEmployeeId,
    username,
    name,
    email,
    department,
    password: hashedPwd,
    role,
    approved: role === 'HOD' || role === 'admin', // Auto-approve HOD and admin
  };

  // Create and Store New staff
  const staff = await Staff.create(staffObj);

  if (staff) {
    res.status(201).json({ 
      message: `New ${role} ${username} Registered`, 
      employeeId: staff.employeeId,
      isFirstAdmin: role === 'admin' && (await Staff.countDocuments({ role: 'admin' })) === 1
    });
  } else {
    res.status(400).json({ message: "Invalid data received" });
  }
});

// @desc Send OTP for Admin Registration
// @route POST /staff/admin-registration-otp
// @access Public
const sendAdminRegistrationOTP = asyncHandler(async (req, res) => {
  const { email, name } = req.body;

  if (!email || !name) {
    return res.status(400).json({ message: "Email and name are required" });
  }

  // Check if this would be the first admin
  const existingAdmins = await Staff.countDocuments({ role: 'admin' });
  if (existingAdmins === 0) {
    return res.status(400).json({ 
      message: "First admin registration does not require OTP",
      isFirstAdmin: true
    });
  }

  // Check if email is already registered
  const existingStaff = await Staff.findOne({ email });
  if (existingStaff) {
    return res.status(409).json({ message: "Email already registered" });
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  
  // Store OTP with 10-minute expiry
  registrationOtpStore[email] = {
    otp,
    expires: Date.now() + 10 * 60 * 1000, // 10 minutes
    name,
    role: 'admin'
  };

  try {
    // Send OTP email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Admin Registration OTP - Edutack',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #333;">Admin Registration OTP</h2>
          <p>Dear ${name},</p>
          <p>You are registering as an Administrator for Edutack. Please use the following OTP to complete your registration:</p>
          <div style="background-color: #f0f0f0; padding: 20px; text-align: center; margin: 20px 0;">
            <h1 style="color: #007bff; margin: 0; font-size: 32px; letter-spacing: 5px;">${otp}</h1>
          </div>
          <p><strong>This OTP is valid for 10 minutes only.</strong></p>
          <p>If you did not request this registration, please ignore this email.</p>
          <hr style="margin: 30px 0;">
          <p style="color: #666; font-size: 12px;">This is an automated email from Edutack System.</p>
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    
    res.json({
      message: `Admin registration OTP sent successfully to ${email}`,
      email: email
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: 'Failed to send OTP email. Please try again later.' });
  }
});

// @desc Update Staff
// @route PATCH /Staff
// @access Private
const approveStaff = asyncHandler(async (req, res) => {
  const { id, role } = req.body;

  // Confirm Data
  if ((!id, !role)) {
    return res.status(400).json({ message: "All fields are required" });
  }
  // Find Staff
  const staff = await Staff.findById(id).exec();
  if (!staff) {
    return res.status(400).json({ message: "User not found" });
  }

  staff.role = role;
  staff.approved = true;

  await staff.save();

  res.json({ message: "Staff Approved" });
});



const changeStaffPassword = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { previousPassword, newPassword } = req.body;
  if (!id || !previousPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }
  const staff = await Staff.findById(id).exec();
  if (!staff) {
    return res.status(404).json({ message: "Staff not found" });
  }
  const match = await bcrypt.compare(previousPassword, staff.password);
  if (!match) {
    return res.status(401).json({ message: "Previous password is incorrect" });
  }
  staff.password = await bcrypt.hash(newPassword, 10);
  await staff.save();
  res.json({ message: "Password changed successfully" });
});

// @desc Update Staff Profile Photo
// @route PATCH /staff/:id/profile-photo
// @access Private
const updateProfilePhoto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Staff ID required" });
  }

  if (!req.file) {
    return res.status(400).json({ message: "Profile photo is required" });
  }

  try {
    const staff = await Staff.findById(id).exec();

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Update profile photo URL (normalize path for URLs)
    staff.profilePhoto = req.file.path.replace(/\\/g, '/');
    const updatedStaff = await staff.save();

    res.json({
      message: "Profile photo updated successfully",
      profilePhoto: updatedStaff.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ message: "Error updating profile photo", error: error.message });
  }
});

// @desc Delete Staff Profile Photo
// @route DELETE /staff/:id/profile-photo
// @access Private
const deleteProfilePhoto = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Staff ID required" });
  }

  try {
    const staff = await Staff.findById(id).exec();

    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Remove profile photo
    staff.profilePhoto = undefined;
    const updatedStaff = await staff.save();

    res.json({
      message: "Profile photo removed successfully",
      profilePhoto: updatedStaff.profilePhoto
    });
  } catch (error) {
    res.status(500).json({ message: "Error removing profile photo", error: error.message });
  }
});

// @desc Get HOD Dashboard Data
// @route GET /staff/hod-dashboard/:department
// @access Private (HOD only)
const getHODDashboard = asyncHandler(async (req, res) => {
  if (!req?.params?.department) {
    return res.status(400).json({ message: "Department parameter required" });
  }

  try {
    // Decode the department parameter
    const department = decodeURIComponent(req.params.department);
    
    // Get all teachers in the department with their papers and sections
    const teachers = await Staff.find({ 
      department: department, 
      role: "teacher",
      approved: true 
    }).select('name email username');

    // Get all students in the department
    const students = await Student.find({ 
      department: department 
    }).select('name rollNo section year email');

    // Get all papers in the department with teacher info
    const papers = await Paper.find({ 
      department: department 
    })
    .populate('teacher', 'name email')
    .populate('students', 'name rollNo section')
    .select('paper semester year sections teacher students');

    // Get attendance data for all students
    const attendanceData = await Attendance.aggregate([
      {
        $unwind: "$attendance"
      },
      {
        $lookup: {
          from: "students",
          localField: "attendance.student",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      {
        $unwind: "$studentInfo"
      },
      {
        $match: {
          "studentInfo.department": req.params.department
        }
      },
      {
        $group: {
          _id: {
            studentId: "$attendance.student",
            studentName: "$studentInfo.name",
            rollNo: "$studentInfo.rollNo",
            section: "$studentInfo.section"
          },
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: {
              $cond: [{ $eq: ["$attendance.present", true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          studentId: "$_id.studentId",
          studentName: "$_id.studentName",
          rollNo: "$_id.rollNo",
          section: "$_id.section",
          totalClasses: 1,
          presentClasses: 1,
          attendancePercentage: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$presentClasses", "$totalClasses"] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    // Get internal marks data
    const internalMarks = await Internal.aggregate([
      {
        $unwind: "$marks"
      },
      {
        $lookup: {
          from: "students",
          localField: "marks._id",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      {
        $unwind: "$studentInfo"
      },
      {
        $match: {
          "studentInfo.department": req.params.department
        }
      },
      {
        $lookup: {
          from: "papers",
          localField: "paper",
          foreignField: "_id",
          as: "paperInfo"
        }
      },
      {
        $unwind: "$paperInfo"
      },
      {
        $project: {
          _id: 0,
          studentId: "$marks._id",
          studentName: "$studentInfo.name",
          rollNo: "$studentInfo.rollNo",
          section: "$studentInfo.section",
          paperName: "$paperInfo.paper",
          semester: "$paperInfo.semester",
          test: "$marks.test",
          seminar: "$marks.seminar",
          assignment: "$marks.assignment",
          attendance: "$marks.attendance",
          total: "$marks.total"
        }
      }
    ]);

    res.json({
      teachers,
      students,
      papers,
      attendanceData,
      internalMarks,
      department: req.params.department
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching HOD dashboard data", error: error.message });
  }
});

// @desc Get HOD Dashboard Summary
// @route GET /staff/hod-summary/:department
// @access Private (HOD only)
const getHODSummary = asyncHandler(async (req, res) => {
  if (!req?.params?.department) {
    return res.status(400).json({ message: "Department parameter required" });
  }

  try {
    // Decode the department parameter
    const department = decodeURIComponent(req.params.department);
    
    // Count totals
    const totalTeachers = await Staff.countDocuments({ 
      department: department, 
      role: "teacher",
      approved: true 
    });
    
    const totalStudents = await Student.countDocuments({ 
      department: department 
    });
    
    const totalPapers = await Paper.countDocuments({ 
      department: department 
    });

    // Get section-wise student counts
    const sectionStats = await Student.aggregate([
      {
        $match: { department: req.params.department }
      },
      {
        $group: {
          _id: "$section",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Get semester-wise paper counts
    const semesterStats = await Paper.aggregate([
      {
        $match: { department: req.params.department }
      },
      {
        $group: {
          _id: "$semester",
          count: { $sum: 1 }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Calculate average attendance percentage
    const avgAttendance = await Attendance.aggregate([
      {
        $unwind: "$attendance"
      },
      {
        $lookup: {
          from: "students",
          localField: "attendance.student",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      {
        $unwind: "$studentInfo"
      },
      {
        $match: {
          "studentInfo.department": req.params.department
        }
      },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: {
              $cond: [{ $eq: ["$attendance.present", true] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          averageAttendance: {
            $round: [
              {
                $multiply: [
                  { $divide: ["$presentClasses", "$totalClasses"] },
                  100
                ]
              },
              2
            ]
          }
        }
      }
    ]);

    res.json({
      totalTeachers,
      totalStudents,
      totalPapers,
      sectionStats,
      semesterStats,
      averageAttendance: avgAttendance[0]?.averageAttendance || 0,
      department: req.params.department
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching HOD summary", error: error.message });
  }
});

// @desc Get All Staff
// @route GET /staff
// @access Private
const getAllStaff = asyncHandler(async (req, res) => {
  const staff = await Staff.find().select('-password').exec();
  res.json(staff);
});

// @desc Get Staff by Department
// @route GET /staff/list/:department
// @access Private
const getStaffByDepartment = asyncHandler(async (req, res) => {
  if (!req?.params?.department) {
    return res.status(400).json({ message: "Department parameter required" });
  }

  const staff = await Staff.find({ 
    department: req.params.department,
    role: { $in: ['teacher', 'HOD'] },
    approved: true
  }).select('-password').exec();

  res.json(staff);
});

// @desc Update Staff
// @route PATCH /staff/:id
// @access Private
const updateStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    return res.status(400).json({ message: "Staff ID required" });
  }

  const staff = await Staff.findById(id).exec();

  if (!staff) {
    return res.status(404).json({ message: "Staff not found" });
  }

  // Update the staff
  Object.assign(staff, updateData);
  const updatedStaff = await staff.save();

  res.json({
    message: "Staff updated successfully",
    staff: updatedStaff
  });
});

// @desc Delete Staff
// @route DELETE /staff/:id
// @access Private
const deleteStaff = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Staff ID required" });
  }

  const staff = await Staff.findById(id).exec();

  if (!staff) {
    return res.status(404).json({ message: "Staff not found" });
  }

  await staff.deleteOne();

  res.json({ message: "Staff deleted successfully" });
});

// @desc Get Unique Departments
// @route GET /staff/departments
// @access Public
const getDepartments = asyncHandler(async (req, res) => {
  try {
    // Get unique departments from both Staff and Student collections
    const staffDepartments = await Staff.distinct('department');
    const studentDepartments = await Student.distinct('department');
    
    // Combine and remove duplicates
    const allDepartments = [...new Set([...staffDepartments, ...studentDepartments])];
    
    // Filter out null/undefined values and sort
    const departments = allDepartments
      .filter(dept => dept && dept.trim() !== '')
      .sort();

    res.json({
      message: "Departments retrieved successfully",
      departments
    });
  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching departments", 
      error: error.message 
    });
  }
});

// @desc Generate Salary Report PDF
// @route POST /staff/generate-salary-report-pdf
// @access Private
const generateSalaryReportPDF = asyncHandler(async (req, res) => {
  const { generateSalaryReportPDF: generatePDF } = require('../services/salaryReportService');
  const fs = require('fs');
  
  try {
    const reportData = req.body;
    
    if (!reportData || !reportData.staffData) {
      return res.status(400).json({ message: "Report data is required" });
    }

    // Generate PDF
    const result = await generatePDF(reportData);
    
    if (result.success) {
      // Send PDF file as response
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
      
      const fileStream = fs.createReadStream(result.filepath);
      fileStream.pipe(res);
      
      // Clean up file after sending
      fileStream.on('end', () => {
        fs.unlink(result.filepath, (err) => {
          if (err) console.error('Error deleting temp PDF file:', err);
        });
      });
    } else {
      res.status(500).json({ message: "Failed to generate PDF report" });
    }
  } catch (error) {
    console.error('Error generating salary report PDF:', error);
    res.status(500).json({ 
      message: "Error generating PDF report", 
      error: error.message 
    });
  }
});

module.exports = {
  getStaff,
  getNewStaffs,
  getStaffList,
  getAllStaff,
  getStaffByDepartment,
  createNewStaff,
  sendAdminRegistrationOTP,
  approveStaff,
  updateStaff,
  deleteStaff,
  changeStaffPassword,
  updateProfilePhoto,
  deleteProfilePhoto,
  getHODDashboard,
  getHODSummary,
  getDepartments,
  generateSalaryReportPDF
};
