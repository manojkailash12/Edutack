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
  const { username, name, email, department, password, role } = req.body;

  // Confirm Data
  if (!username || !name || !email || !department || !password || !role) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check for Duplicate Username
  const duplicateUsername = await Staff.findOne({ username }).lean().exec();
  if (duplicateUsername) {
    return res.status(409).json({ message: "Duplicate Username" });
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
    approved: role === 'HOD',
  };

  // Create and Store New staff
  const staff = await Staff.create(staffObj);

  if (staff) {
    res.status(201).json({ message: `New Staff ${username} Registered`, employeeId: staff.employeeId });
  } else {
    res.status(400).json({ message: "Invalid data received" });
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

    // Update profile photo URL
    staff.profilePhoto = req.file.path;
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

module.exports = {
  getStaff,
  getNewStaffs,
  getStaffList,
  getAllStaff,
  getStaffByDepartment,
  createNewStaff,
  approveStaff,
  updateStaff,
  deleteStaff,
  changeStaffPassword,
  updateProfilePhoto,
  deleteProfilePhoto,
  getHODDashboard,
  getHODSummary
};
