const { default: mongoose } = require("mongoose");
const Attendance = require("./../models/Attendance");
const asyncHandler = require("express-async-handler");
const Student = require("../models/Student");
const Paper = require("../models/Paper");
const TimeSchedule = require("../models/TimeSchedule");
const Staff = require("../models/Staff");
const SemesterSettings = require("../models/SemesterSettings");
const StudentLeave = require("../models/StudentLeave");
const AcademicCalendar = require("../models/AcademicCalendar");
const { generateAttendanceReportPDF } = require('../services/pdfService');
const cache = require('../utils/cache');

// @desc Add Attendance with Strict Time Validation
// @route POST /attendance
// @access Private
const createNewAttendance = asyncHandler(async (req, res) => {
  const { paper, date, section, students, teacherId } = req.body;

  console.log('=== CREATE ATTENDANCE REQUEST ===');
  console.log('Paper:', paper);
  console.log('Date:', date);
  console.log('Section:', section);
  console.log('Students count:', students?.length);
  console.log('Teacher ID:', teacherId);

  // Confirm Data
  if (!paper || !date || !students || !teacherId || !section) {
    console.log('Missing required fields');
    return res.status(400).json({ message: "All fields are required including section" });
  }

  // Check if the date is a holiday or Sunday
  const shouldHoldClasses = await AcademicCalendar.shouldHoldClasses(date);
  if (!shouldHoldClasses) {
    const isSunday = AcademicCalendar.isSunday(date);
    const holiday = await AcademicCalendar.isHoliday(date);
    
    let message = "Attendance cannot be marked today - ";
    if (isSunday) {
      message += "Sunday (Weekly Holiday)";
    } else if (holiday) {
      message += `Holiday: ${holiday.title}`;
    }
    
    console.log('Attendance blocked:', message);
    return res.status(400).json({ 
      message,
      isHoliday: true,
      holidayDetails: holiday,
      isSunday
    });
  }

  // Validate that the teacher actually teaches this paper and section
  const paperDoc = await Paper.findById(paper).select('teacher sections department year').lean();
  if (!paperDoc) {
    console.log('Paper not found:', paper);
    return res.status(404).json({ message: "Paper not found" });
  }
  
  console.log('Paper validation:', {
    paperTeacher: paperDoc.teacher,
    requestTeacher: teacherId,
    paperSections: paperDoc.sections,
    requestSection: section
  });
  
  // Teacher must match
  if (String(paperDoc.teacher) !== String(teacherId)) {
    console.log('Teacher mismatch');
    return res.status(403).json({ message: "You are not assigned to this paper" });
  }
  // Section must be part of this paper
  if (!Array.isArray(paperDoc.sections) || !paperDoc.sections.includes(section)) {
    console.log('Section validation failed');
    return res.status(400).json({ message: `Invalid section ${section} for this paper. Valid sections: ${paperDoc.sections?.join(', ') || 'none'}` });
  }

  // SEMESTER DATE VALIDATION - Check if attendance date is within semester range
  try {
    const attendanceDate = new Date(date);
    const currentYear = paperDoc.year || "2024-2025"; // Use paper's year or default
    
    // Get semester from paper (you might need to add semester field to Paper model)
    // For now, we'll check all active semester settings for the department
    const semesterSettings = await SemesterSettings.find({
      department: paperDoc.department,
      academicYear: currentYear,
      isActive: true
    });
    
    let isDateValid = false;
    let validSemesterInfo = null;
    
    for (const setting of semesterSettings) {
      if (attendanceDate >= setting.startDate && attendanceDate <= setting.endDate) {
        isDateValid = true;
        validSemesterInfo = setting;
        break;
      }
    }
    
    if (!isDateValid) {
      console.log('Date validation failed - outside semester range');
      if (semesterSettings.length === 0) {
        return res.status(400).json({ 
          message: "No semester dates configured. Please contact HOD to set semester start and end dates.",
          requiresSetup: true
        });
      } else {
        const dateRanges = semesterSettings.map(s => 
          `${s.semester}: ${s.startDate.toDateString()} to ${s.endDate.toDateString()}`
        ).join(', ');
        return res.status(400).json({ 
          message: `Attendance date ${attendanceDate.toDateString()} is outside semester range. Valid ranges: ${dateRanges}`,
          semesterRanges: semesterSettings.map(s => ({
            semester: s.semester,
            startDate: s.startDate,
            endDate: s.endDate
          }))
        });
      }
    }
    
    console.log('Date validation passed - within semester range:', validSemesterInfo?.semester);
  } catch (semesterError) {
    console.log('Semester validation error:', semesterError);
    return res.status(500).json({ message: "Error validating semester dates" });
  }

  // Check for existing attendance record for this paper, section, and date
  const existingAttendance = await Attendance.findOne({
    paper,
    date,
    section
  });

  if (existingAttendance) {
    return res.status(409).json({ message: "Attendance already exists for this paper, date, and section" });
  }

  // Enforce that only students registered in this paper's department/year and requested section are recorded
  const incoming = Array.isArray(students) ? students : [];
  const incomingIds = incoming
    .map(s => s.student)
    .filter(Boolean);

  let validIdSet = new Set();
  if (incomingIds.length > 0) {
    const registered = await Student.find({
      _id: { $in: incomingIds },
      department: paperDoc.department,
      year: paperDoc.year,
      section: section
    }).select('_id').lean();
    validIdSet = new Set(registered.map(r => String(r._id)));
  }

  // Process both registered students and manual entries
  const filteredStudents = incoming
    .filter(s => {
      // Include if it's a valid registered student OR a manual entry with rollNo and name
      return (s.student && validIdSet.has(String(s.student))) || 
             (!s.student && s.rollNo && s.name);
    })
    .map(s => ({
      student: s.student || null, // null for manual students
      rollNo: s.rollNo,
      name: s.name,
      status: s.status || 'present'
    }));

  console.log('Filtered students count:', filteredStudents.length);
  console.log('Valid registered IDs:', validIdSet.size);

  if (filteredStudents.length === 0) {
    console.log('No valid students after filtering');
    return res.status(400).json({ message: "No valid students provided (must be registered students or manual entries with rollNo and name)" });
  }

  // Check for approved student leaves on this date
  const attendanceDate = new Date(date);
  const approvedLeaves = await StudentLeave.find({
    status: 'Approved',
    startDate: { $lte: attendanceDate },
    endDate: { $gte: attendanceDate },
    department: paperDoc.department,
    section: section
  }).lean();

  console.log(`Found ${approvedLeaves.length} approved leaves for ${date} in ${paperDoc.department} section ${section}`);

  // Create a map of students on approved leave
  const studentsOnLeave = new Map();
  approvedLeaves.forEach(leave => {
    studentsOnLeave.set(leave.rollNo, {
      leaveType: leave.leaveType,
      reason: leave.reason
    });
  });

  // Update student statuses based on approved leaves
  const processedStudents = filteredStudents.map(student => {
    if (studentsOnLeave.has(student.rollNo)) {
      const leaveInfo = studentsOnLeave.get(student.rollNo);
      console.log(`Student ${student.rollNo} is on approved ${leaveInfo.leaveType} leave`);
      return {
        ...student,
        status: 'on_leave',
        leaveType: leaveInfo.leaveType,
        leaveReason: leaveInfo.reason
      };
    }
    return student;
  });

  // Count students automatically marked as on leave
  const studentsOnLeaveCount = processedStudents.filter(s => s.status === 'on_leave').length;

  const attendanceObj = {
    paper,
    date,
    section,
    students: processedStudents,
    teacherId
  };

  const attendance = await Attendance.create(attendanceObj);

  if (attendance) {
    // Invalidate department attendance cache when new attendance is added
    const cacheKey = `dept_attendance_${paperDoc.department}`;
    cache.delete(cacheKey);
    console.log(`🗑️ Invalidated cache for department: ${paperDoc.department}`);

    res.status(201).json({
      message: `Attendance added for ${date} Section ${section}`,
      recordedCount: processedStudents.length,
      studentsOnLeaveCount: studentsOnLeaveCount,
      attendance
    });
  } else {
    res.status(400).json({ message: "Invalid data received" });
  }
});

// @desc Get Students by Paper and Section for Attendance
// @route GET /attendance/students/:paperId/:section
// @access Private
const getStudentsByPaperAndSection = asyncHandler(async (req, res) => {
  const { paperId, section } = req.params;
  if (!paperId || !section) {
    return res.status(400).json({ message: "Paper ID and Section are required" });
  }
  try {
    const paper = await Paper.findById(paperId).select('department year sections').lean();
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }
    // Validate section belongs to paper
    if (!Array.isArray(paper.sections) || !paper.sections.includes(section)) {
      return res.status(400).json({ message: "Invalid section for this paper" });
    }
    // Fetch students registered in the paper's department/year and matching section
    const students = await Student.find({
      department: paper.department,
      year: paper.year,
      section: section
    }).select('name rollNo _id').lean();
    res.json(Array.isArray(students) ? students : []);
  } catch (err) {
    console.error("Error fetching students for attendance:", err);
    res.status(500).json({ message: "Error fetching students" });
  }
});

// @desc Get Teacher's Papers and Sections
// @route GET /attendance/teacher-papers/:teacherId
// @access Private
const getTeacherPapers = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  if (!teacherId) {
    return res.status(400).json({ message: "Teacher ID is required" });
  }
  
  try {
    const papers = await Paper.find({ teacher: teacherId })
      .select('paper sections department semester year')
      .lean();
    
    if (!papers?.length) {
      return res.status(404).json({ message: "No papers assigned to this teacher" });
    }
    
    res.json(papers);
  } catch (err) {
    res.status(500).json({ message: "Error fetching teacher papers" });
  }
});

// @desc Get Attendance Percentage for Student
// @route GET /attendance/percentage/:studentId
// @access Private
const getAttendancePercentage = asyncHandler(async (req, res) => {
  if (!req?.params?.studentId) {
    return res.status(400).json({ message: "Student ID required" });
  }

  try {
    const attendanceData = await Attendance.aggregate([
      {
        $unwind: "$students"
      },
      {
        $match: { "students.student": new mongoose.Types.ObjectId(req.params.studentId) }
      },
      {
        $group: {
          _id: null,
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: {
              $cond: [{ $eq: ["$students.status", "present"] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          _id: 0,
          totalClasses: 1,
          presentClasses: 1,
          absentClasses: { $subtract: ["$totalClasses", "$presentClasses"] },
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

    if (attendanceData.length === 0) {
      return res.json({
        totalClasses: 0,
        presentClasses: 0,
        absentClasses: 0,
        attendancePercentage: 0
      });
    }

    res.json(attendanceData[0]);
  } catch (error) {
    res.status(500).json({ message: "Error calculating attendance percentage", error: error.message });
  }
});

// @desc Get Department-wise Attendance Report
// @route GET /attendance/department-report/:department
// @access Private (HOD only)
const getDepartmentAttendanceReport = asyncHandler(async (req, res) => {
  if (!req?.params?.department) {
    return res.status(400).json({ message: "Department parameter required" });
  }

  try {
    const department = req.params.department;
    const cacheKey = `dept_attendance_${department}`;
    
    // Check cache first
    const cachedResult = cache.get(cacheKey);
    if (cachedResult) {
      console.log(`⚡ Serving cached attendance report for department: ${department}`);
      return res.json({
        ...cachedResult,
        fromCache: true,
        cachedAt: new Date().toISOString()
      });
    }

    console.log(`🚀 Fetching fresh attendance report for department: ${department}`);
    const startTime = Date.now();

    // Optimized single aggregation pipeline with facets for better performance
    const result = await Attendance.aggregate([
      {
        $unwind: "$students"
      },
      {
        $lookup: {
          from: "students",
          localField: "students.student",
          foreignField: "_id",
          as: "studentInfo",
          // Optimize lookup with pipeline to reduce data transfer
          pipeline: [
            {
              $match: {
                department: req.params.department
              }
            },
            {
              $project: {
                name: 1,
                rollNo: 1,
                section: 1,
                year: 1,
                department: 1
              }
            }
          ]
        }
      },
      {
        $unwind: "$studentInfo"
      },
      // Use facet to calculate all statistics in one pass
      {
        $facet: {
          // Individual student reports
          individualReport: [
            {
              $group: {
                _id: {
                  studentId: "$students.student",
                  studentName: "$studentInfo.name",
                  rollNo: "$studentInfo.rollNo",
                  section: "$studentInfo.section",
                  year: "$studentInfo.year"
                },
                totalClasses: { $sum: 1 },
                presentClasses: {
                  $sum: {
                    $cond: [{ $eq: ["$students.status", "present"] }, 1, 0]
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
                year: "$_id.year",
                totalClasses: 1,
                presentClasses: 1,
                absentClasses: { $subtract: ["$totalClasses", "$presentClasses"] },
                attendancePercentage: {
                  $round: [
                    {
                      $multiply: [
                        { 
                          $cond: [
                            { $eq: ["$totalClasses", 0] },
                            0,
                            { $divide: ["$presentClasses", "$totalClasses"] }
                          ]
                        },
                        100
                      ]
                    },
                    2
                  ]
                }
              }
            },
            {
              $sort: { section: 1, rollNo: 1 }
            }
          ],
          // Department statistics
          departmentStats: [
            {
              $group: {
                _id: null,
                totalClasses: { $sum: 1 },
                presentClasses: {
                  $sum: {
                    $cond: [{ $eq: ["$students.status", "present"] }, 1, 0]
                  }
                }
              }
            },
            {
              $project: {
                _id: 0,
                totalClasses: 1,
                presentClasses: 1,
                absentClasses: { $subtract: ["$totalClasses", "$presentClasses"] },
                averageAttendance: {
                  $round: [
                    {
                      $multiply: [
                        { 
                          $cond: [
                            { $eq: ["$totalClasses", 0] },
                            0,
                            { $divide: ["$presentClasses", "$totalClasses"] }
                          ]
                        },
                        100
                      ]
                    },
                    2
                  ]
                }
              }
            }
          ],
          // Section-wise statistics
          sectionStats: [
            {
              $group: {
                _id: "$studentInfo.section",
                totalClasses: { $sum: 1 },
                presentClasses: {
                  $sum: {
                    $cond: [{ $eq: ["$students.status", "present"] }, 1, 0]
                  }
                }
              }
            },
            {
              $project: {
                _id: 0,
                section: "$_id",
                totalClasses: 1,
                presentClasses: 1,
                absentClasses: { $subtract: ["$totalClasses", "$presentClasses"] },
                averageAttendance: {
                  $round: [
                    {
                      $multiply: [
                        { 
                          $cond: [
                            { $eq: ["$totalClasses", 0] },
                            0,
                            { $divide: ["$presentClasses", "$totalClasses"] }
                          ]
                        },
                        100
                      ]
                    },
                    2
                  ]
                }
              }
            },
            {
              $sort: { section: 1 }
            }
          ]
        }
      }
    ]);

    const endTime = Date.now();
    console.log(`⚡ Attendance report generated in ${endTime - startTime}ms`);

    // Extract results from facet
    const attendanceReport = result[0]?.individualReport || [];
    const departmentStats = result[0]?.departmentStats?.[0] || {
      totalClasses: 0,
      presentClasses: 0,
      absentClasses: 0,
      averageAttendance: 0
    };
    const sectionStats = result[0]?.sectionStats || [];

    const responseData = {
      attendanceReport, // Changed from individualReport to attendanceReport for frontend compatibility
      departmentStats,
      sectionStats,
      department: req.params.department,
      generatedAt: new Date().toISOString(),
      queryTime: `${endTime - startTime}ms`,
      fromCache: false
    };

    // Cache the result for 3 minutes (attendance data doesn't change frequently)
    cache.set(cacheKey, responseData, 3 * 60 * 1000);
    console.log(`💾 Cached attendance report for department: ${department}`);

    res.json(responseData);
  } catch (error) {
    console.error('❌ Error generating department attendance report:', error);
    res.status(500).json({ message: "Error generating department attendance report", error: error.message });
  }
});

// @desc Get Paper-wise Attendance Report
// @route GET /attendance/paper-report/:paperId
// @access Private
const getPaperAttendanceReport = asyncHandler(async (req, res) => {
  if (!req?.params?.paperId) {
    return res.status(400).json({ message: "Paper ID required" });
  }

  try {
    const paper = await Paper.findById(req.params.paperId).populate('students', 'name rollNo section');
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    const { section, name, minPercent, maxPercent, startDate, endDate } = req.query;
    let match = { "students.student": { $in: paper.students.map(s => s._id) } };
    if (startDate || endDate) {
      match.date = {};
      if (startDate) match.date.$gte = startDate;
      if (endDate) match.date.$lte = endDate;
    }

    let attendanceReport = await Attendance.aggregate([
      { $match: match },
      {
        $unwind: "$students"
      },
      {
        $lookup: {
          from: "students",
          localField: "students.student",
          foreignField: "_id",
          as: "studentInfo"
        }
      },
      { $unwind: "$studentInfo" },
      {
        $group: {
          _id: {
            studentId: "$students.student",
            studentName: "$studentInfo.name",
            rollNo: "$studentInfo.rollNo",
            section: "$studentInfo.section"
          },
          totalClasses: { $sum: 1 },
          presentClasses: {
            $sum: {
              $cond: [{ $eq: ["$students.status", "present"] }, 1, 0]
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
          absentClasses: { $subtract: ["$totalClasses", "$presentClasses"] },
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
      },
      { $sort: { section: 1, rollNo: 1 } }
    ]);
    // --- Filtering logic ---
    if (section) {
      attendanceReport = attendanceReport.filter(r => r.section === section);
    }
    if (name) {
      const nameLower = name.toLowerCase();
      attendanceReport = attendanceReport.filter(r => (r.studentName || '').toLowerCase().includes(nameLower));
    }
    if (minPercent !== undefined && minPercent !== '') {
      attendanceReport = attendanceReport.filter(r => parseFloat(r.attendancePercentage) >= parseFloat(minPercent));
    }
    if (maxPercent !== undefined && maxPercent !== '') {
      attendanceReport = attendanceReport.filter(r => parseFloat(r.attendancePercentage) <= parseFloat(maxPercent));
    }
    // --- End filtering logic ---

    res.json({
      paper: {
        _id: paper._id,
        paper: paper.paper,
        semester: paper.semester,
        year: paper.year,
        sections: paper.sections
      },
      attendanceReport,
      totalStudents: paper.students.length
    });
  } catch (error) {
    res.status(500).json({ message: "Error generating paper attendance report", error: error.message });
  }
});

// Add a new endpoint getStudentAttendanceSummary that returns attendance percentage per paper for a student.
const getStudentAttendanceSummary = asyncHandler(async (req, res) => {
  if (!req?.params?.studentId) {
    return res.status(400).json({ message: "Student ID required" });
  }
  try {
    // Aggregate attendance by paper for the student
    const summary = await Attendance.aggregate([
      { $unwind: "$students" },
      { $match: { "students.student": new mongoose.Types.ObjectId(req.params.studentId) } },
      {
        $group: {
          _id: "$paper",
          total: { $sum: 1 },
          present: {
            $sum: {
              $cond: [
                { $eq: ["$students.status", "present"] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: "papers",
          localField: "_id",
          foreignField: "_id",
          as: "paperInfo"
        }
      },
      { $unwind: "$paperInfo" },
      {
        $project: {
          paper: "$paperInfo.paper",
          percentage: {
            $cond: [
              { $eq: ["$total", 0] },
              0,
              { $round: [{ $multiply: [{ $divide: ["$present", "$total"] }, 100] }, 2] }
            ]
          }
        }
      }
    ]);
    res.json(summary);
  } catch (err) {
    res.status(500).json({ message: "Error generating student attendance summary", error: err.message });
  }
});

// @desc Get Multi-Paper Attendance Report (with filters)
// @route GET /attendance/paper-report
// @access Private
const getMultiPaperAttendanceReport = asyncHandler(async (req, res) => {
  const { paperIds, section, name, minPercent, maxPercent, startDate, endDate } = req.query;
  if (!paperIds) {
    return res.status(400).json({ message: "paperIds query parameter is required" });
  }
  const paperIdArr = paperIds.split(',').filter(Boolean);
  
  // Limit number of papers to prevent timeout
  if (paperIdArr.length > 3) {
    return res.status(400).json({ 
      message: "Too many papers selected. Please select maximum 3 papers at a time for better performance." 
    });
  }
  
  console.log(`Processing attendance report for ${paperIdArr.length} papers`);
  
  let allReports = [];
  for (const paperId of paperIdArr) {
    try {
      const paper = await Paper.findById(paperId).populate('students', 'name rollNo section');
      if (!paper) continue;
      let match = { "students.student": { $in: paper.students.map(s => s._id) } };
      if (startDate || endDate) {
        match.date = {};
        if (startDate) match.date.$gte = startDate;
        if (endDate) match.date.$lte = endDate;
      }
      // Optimize aggregation with indexes and limits
      let attendanceReport = await Attendance.aggregate([
        { $match: match },
        { $unwind: "$students" },
        // Add index hint for better performance
        { $match: { "students.student": { $exists: true } } },
        {
          $lookup: {
            from: "students",
            localField: "students.student",
            foreignField: "_id",
            as: "studentInfo",
            // Limit lookup fields for performance
            pipeline: [
              { $project: { name: 1, rollNo: 1, section: 1 } }
            ]
          }
        },
        { $unwind: "$studentInfo" },
        {
          $group: {
            _id: {
              studentId: "$students.student",
              studentName: "$studentInfo.name",
              rollNo: "$studentInfo.rollNo",
              section: "$studentInfo.section"
            },
            totalClasses: { $sum: 1 },
            presentClasses: {
              $sum: {
                $cond: [{ $eq: ["$students.status", "present"] }, 1, 0]
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
            absentClasses: { $subtract: ["$totalClasses", "$presentClasses"] },
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
        },
        { $sort: { section: 1, rollNo: 1 } }
      ]);
      // --- Filtering logic ---
      let filtered = attendanceReport;
      if (section) {
        filtered = filtered.filter(r => r.section === section);
      }
      if (name) {
        const nameLower = name.toLowerCase();
        filtered = filtered.filter(r => (r.studentName || '').toLowerCase().includes(nameLower));
      }
      if (minPercent !== undefined && minPercent !== '') {
        filtered = filtered.filter(r => parseFloat(r.attendancePercentage) >= parseFloat(minPercent));
      }
      if (maxPercent !== undefined && maxPercent !== '') {
        filtered = filtered.filter(r => parseFloat(r.attendancePercentage) <= parseFloat(maxPercent));
      }
      // --- End filtering logic ---
      allReports = allReports.concat(filtered.map(r => ({
        ...r,
        paper: paper.paper
      })));
    } catch (err) {
      // skip errors for individual papers
    }
  }
  res.json({ attendanceReport: allReports });
});

// @desc Get per-student attendance detail
// @route GET /attendance/student-detail
// @access Private
const getStudentAttendanceDetail = asyncHandler(async (req, res) => {
  const { studentId, paperId, section, startDate, endDate } = req.query;
  if (!studentId || !paperId) {
    return res.status(400).json({ message: "studentId and paperId are required" });
  }
  let match = { paper: paperId, "students.student": studentId };
  if (section) match.section = section;
  if (startDate || endDate) {
    match.date = {};
    if (startDate) match.date.$gte = startDate;
    if (endDate) match.date.$lte = endDate;
  }
  // Find all attendance records for this student in this paper/section/date range
  const records = await Attendance.find(match).sort({ date: 1 });
  // For each record, find the student's status
  const details = records.map(rec => {
    const stu = rec.students.find(s => (s.student?.toString?.() || s.student) === studentId);
    return {
      date: rec.date,
      status: stu ? stu.status : 'absent',
      rollNo: stu?.rollNo,
      name: stu?.name
    };
  });
  res.json({ details });
});

// @desc Check if attendance exists for paper, section, and date
// @route GET /attendance
// @access Private
const checkAttendanceExists = asyncHandler(async (req, res) => {
  const { paper, section, date } = req.query;
  
  if (!paper || !section || !date) {
    return res.status(400).json({ message: "Paper, section, and date are required" });
  }

  try {
    const existingAttendance = await Attendance.findOne({
      paper,
      section,
      date
    });

    res.json({ exists: !!existingAttendance });
  } catch (error) {
    res.status(500).json({ message: "Error checking attendance", error: error.message });
  }
});

// @desc Get Available Dates for Attendance Based on Timetable
// @route GET /attendance/available-dates/:teacherId/:paperId/:section
// @access Private
const getAvailableDatesForAttendance = asyncHandler(async (req, res) => {
  const { teacherId, paperId, section } = req.params;
  const { startDate, endDate } = req.query;
  
  if (!teacherId || !paperId || !section) {
    return res.status(400).json({ message: "Teacher ID, Paper ID, and Section are required" });
  }

  try {
    // Verify teacher teaches this paper
    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }
    
    if (paper.teacher.toString() !== teacherId) {
      return res.status(403).json({ message: "You are not assigned to this paper" });
    }
    
    if (!paper.sections.includes(section)) {
      return res.status(400).json({ message: "Invalid section for this paper" });
    }

    // Get timetable schedules for this paper, teacher, and section
    const timeSchedules = await TimeSchedule.find({
      paper: paperId,
      teacher: teacherId,
      section: section,
      isActive: true
    }).select('day hour department semester year').lean();

    if (timeSchedules.length === 0) {
      return res.json({ 
        availableDates: [],
        message: "No timetable found for this paper and section. Please contact admin to generate timetable first."
      });
    }

    // Get the academic year info from timetable
    const { department, semester, year } = timeSchedules[0];
    
    // Get semester settings to determine valid date range
    let rangeStart, rangeEnd;
    let semesterInfo = null;
    
    console.log('Looking for semester settings:', {
      department,
      semester,
      academicYear: year || "2024-2025"
    });
    
    try {
      const semesterSettings = await SemesterSettings.findOne({
        department: department,
        semester: semester,
        academicYear: year || "2024-2025",
        isActive: true
      });
      
      console.log('Found semester settings:', semesterSettings ? 'Yes' : 'No');
      
      if (semesterSettings) {
        rangeStart = startDate ? new Date(startDate) : semesterSettings.startDate;
        rangeEnd = endDate ? new Date(endDate) : semesterSettings.endDate;
        semesterInfo = {
          startDate: semesterSettings.startDate,
          endDate: semesterSettings.endDate,
          description: semesterSettings.description
        };
      } else {
        // Fallback to default academic year if no semester settings found
        const today = new Date();
        const currentYear = today.getFullYear();
        rangeStart = startDate ? new Date(startDate) : new Date(currentYear, 5, 1); // June 1st
        rangeEnd = endDate ? new Date(endDate) : new Date(currentYear + 1, 4, 31); // May 31st next year
      }
    } catch (semesterError) {
      console.log('Error fetching semester settings:', semesterError);
      // Fallback to default range
      const today = new Date();
      const currentYear = today.getFullYear();
      rangeStart = startDate ? new Date(startDate) : new Date(currentYear, 5, 1);
      rangeEnd = endDate ? new Date(endDate) : new Date(currentYear + 1, 4, 31);
    }
    
    // Generate all dates in the range that match timetable days
    const availableDates = [];
    const scheduledDays = timeSchedules.map(ts => ts.day);
    const uniqueScheduledDays = [...new Set(scheduledDays)];
    
    // Map day names to numbers (0 = Sunday, 1 = Monday, etc.)
    const dayNameToNumber = {
      'Sunday': 0, 'Monday': 1, 'Tuesday': 2, 'Wednesday': 3,
      'Thursday': 4, 'Friday': 5, 'Saturday': 6
    };
    
    const scheduledDayNumbers = uniqueScheduledDays.map(day => dayNameToNumber[day]).filter(num => num !== undefined);
    
    console.log('Date generation info:', {
      rangeStart: rangeStart.toDateString(),
      rangeEnd: rangeEnd.toDateString(),
      scheduledDays: uniqueScheduledDays,
      scheduledDayNumbers
    });
    
    // Generate dates with performance optimization
    const currentDate = new Date(rangeStart);
    const today = new Date();
    
    // Limit date range for better performance
    // Only generate dates for current semester (max 6 months)
    const maxFutureDate = new Date();
    maxFutureDate.setMonth(maxFutureDate.getMonth() + 6); // 6 months from now
    const effectiveEndDate = rangeEnd > maxFutureDate ? maxFutureDate : rangeEnd;
    
    // Also limit past dates (max 3 months back)
    const minPastDate = new Date();
    minPastDate.setMonth(minPastDate.getMonth() - 3);
    const effectiveStartDate = rangeStart < minPastDate ? minPastDate : rangeStart;
    
    console.log('Optimized date range:', {
      start: effectiveStartDate.toDateString(),
      end: effectiveEndDate.toDateString()
    });
    
    // Pre-fetch all attendance records for this paper/section to avoid N+1 queries
    const existingAttendanceRecords = await Attendance.find({
      paper: paperId,
      section: section,
      date: {
        $gte: effectiveStartDate.toISOString().split('T')[0],
        $lte: effectiveEndDate.toISOString().split('T')[0]
      }
    }).select('date').lean();
    
    const attendanceDatesSet = new Set(existingAttendanceRecords.map(record => record.date));
    
    // Generate dates efficiently
    const tempDate = new Date(effectiveStartDate);
    let dateCount = 0;
    const maxDates = 100; // Limit to prevent excessive generation
    
    while (tempDate <= effectiveEndDate && dateCount < maxDates) {
      const dayOfWeek = tempDate.getDay();
      
      if (scheduledDayNumbers.includes(dayOfWeek)) {
        const dateString = tempDate.toISOString().split('T')[0];
        const dayName = Object.keys(dayNameToNumber)[dayOfWeek];
        
        availableDates.push({
          date: dateString,
          dayName: dayName,
          hasAttendance: attendanceDatesSet.has(dateString),
          schedules: timeSchedules.filter(ts => ts.day === dayName)
        });
        
        dateCount++;
      }
      
      tempDate.setDate(tempDate.getDate() + 1);
    }
    
    console.log(`Generated ${availableDates.length} dates (limited for performance)`);
    
    // Sort by date (most recent first)
    availableDates.sort((a, b) => new Date(b.date) - new Date(a.date));
    
    res.json({
      availableDates,
      totalDates: availableDates.length,
      pendingDates: availableDates.filter(d => !d.hasAttendance).length,
      completedDates: availableDates.filter(d => d.hasAttendance).length,
      timetableInfo: {
        department,
        semester,
        year,
        scheduledDays: uniqueScheduledDays
      },
      semesterInfo: semesterInfo,
      dateRange: {
        start: rangeStart,
        end: rangeEnd
      }
    });
    
  } catch (error) {
    res.status(500).json({ message: "Error fetching available dates", error: error.message });
  }
});

// @desc Get Timetable-Based Papers for Teacher
// @route GET /attendance/timetable-papers/:teacherId
// @access Private
const getTimetableBasedPapers = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;
  
  if (!teacherId) {
    return res.status(400).json({ message: "Teacher ID is required" });
  }
  
  try {
    // Get papers from timetable (only papers that are actually scheduled)
    const timeSchedules = await TimeSchedule.find({
      teacher: teacherId,
      isActive: true
    }).populate('paper', 'paper semester year sections department').lean();
    
    if (timeSchedules.length === 0) {
      return res.json({
        papers: [],
        message: "No timetable found. Please contact admin to generate your timetable first."
      });
    }
    
    // Group by paper and extract unique papers with their scheduled sections
    const paperMap = new Map();
    
    timeSchedules.forEach(schedule => {
      const paperId = schedule.paper._id.toString();
      
      if (!paperMap.has(paperId)) {
        paperMap.set(paperId, {
          _id: schedule.paper._id,
          paper: schedule.paper.paper,
          semester: schedule.paper.semester,
          year: schedule.paper.year,
          department: schedule.paper.department,
          scheduledSections: new Set(),
          totalSchedules: 0,
          scheduledDays: new Set()
        });
      }
      
      const paperData = paperMap.get(paperId);
      paperData.scheduledSections.add(schedule.section);
      paperData.scheduledDays.add(schedule.day);
      paperData.totalSchedules++;
    });
    
    // Convert to array and format
    const papers = Array.from(paperMap.values()).map(paper => ({
      ...paper,
      scheduledSections: Array.from(paper.scheduledSections),
      scheduledDays: Array.from(paper.scheduledDays),
      sections: Array.from(paper.scheduledSections) // For compatibility
    }));
    
    res.json({
      papers,
      totalPapers: papers.length,
      message: papers.length > 0 ? "Papers loaded from timetable" : "No scheduled papers found"
    });
    
  } catch (error) {
    res.status(500).json({ message: "Error fetching timetable-based papers", error: error.message });
  }
});

// @desc Get All Students in a Section for a Teacher
// @route GET /attendance/teacher-section/:teacherId/:section
// @access Private
const getTeacherSectionStudents = asyncHandler(async (req, res) => {
  const { teacherId, section } = req.params;
  if (!teacherId || !section) {
    return res.status(400).json({ message: "Teacher ID and Section are required" });
  }
  
  try {
    // Get all papers taught by this teacher
    const papers = await Paper.find({ teacher: teacherId })
      .select('paper sections department semester year')
      .lean();
    
    if (!papers?.length) {
      return res.status(404).json({ message: "No papers assigned to this teacher" });
    }
    
    // Restrict strictly to sections this teacher actually teaches
    const papersWithSection = papers.filter(paper => Array.isArray(paper.sections) && paper.sections.includes(section));
    if (!papersWithSection.length) {
      return res.status(403).json({ message: "You do not teach this section" });
    }
    
    // Build allowed department/year pairs from the teacher's papers that include this section
    const allowedPairs = Array.from(new Set(papersWithSection.map(p => `${p.department}__${p.year}`)))
      .map(key => ({ department: key.split('__')[0], year: key.split('__')[1] }));

    // Query students only from those department/year pairs and this section
    const orFilters = allowedPairs.map(p => ({ department: p.department, year: p.year, section }));
    const students = await Student.find({ $or: orFilters })
      .select('name rollNo _id')
      .lean();
    
    // Also list this teacher's papers in this section (for UI context)
    const teacherPapers = papersWithSection.map(p => ({ _id: p._id, paper: p.paper }));

    // Additionally list all papers in this section for awareness
    const allPapersInSection = await Paper.find({ sections: section })
      .populate('teacher', 'name')
      .select('paper teacher sections')
      .lean();
    
    res.json({
      section,
      teacherPapers,
      allPapersInSection: allPapersInSection.map(p => ({ _id: p._id, paper: p.paper, teacher: p.teacher?.name || 'Not Assigned' })),
      students: Array.isArray(students) ? students : []
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching section students", error: err.message });
  }
});

// @desc Get All Content for Student by Section
// @route GET /attendance/student-content/:section
// @access Private (students)
const getStudentSectionContent = asyncHandler(async (req, res) => {
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
    }).populate('teacher', 'name').select('paper teacher sections').lean();
    
    if (!papers.length) {
      return res.status(404).json({ message: "No papers found for this section" });
    }
    
    res.json({
      section,
      department,
      year,
      papers: papers.map(p => ({
        _id: p._id,
        paper: p.paper,
        teacher: p.teacher?.name || 'Not Assigned',
        sections: p.sections
      }))
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching student content", error: err.message });
  }
});

// @desc Get All Students in a Section for HOD (any section)
// @route GET /attendance/hod-section/:section
// @access Private (HOD only)
const getHODSectionStudents = asyncHandler(async (req, res) => {
  const { section } = req.params;
  const { department, year } = req.query;
  
  if (!section || !department || !year) {
    return res.status(400).json({ message: "Section, department, and year are required" });
  }
  
  try {
    // Get ALL students registered in this section, department, and year
    const students = await Student.find({
      section: section,
      department: department,
      year: year
    }).select('name rollNo _id').lean();
    
    // Get ALL papers in this section
    const allPapersInSection = await Paper.find({
      department: department,
      year: year,
      sections: section
    }).populate('teacher', 'name').select('paper teacher sections').lean();
    
    res.json({
      section,
      department,
      year,
      allPapersInSection: allPapersInSection.map(p => ({ 
        _id: p._id, 
        paper: p.paper, 
        teacher: p.teacher?.name || 'Not Assigned' 
      })),
      students: Array.isArray(students) ? students : []
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching HOD section students", error: err.message });
  }
});

// @desc Download Colorful Attendance Report PDF
// @route GET /attendance/paper/:paperId/section/:section/pdf
// @access Private
const downloadAttendanceReportPDF = asyncHandler(async (req, res) => {
  const { paperId, section } = req.params;
  const { startDate, endDate } = req.query;
  
  if (!paperId || !section) {
    return res.status(400).json({ message: "Paper ID and section are required" });
  }

  try {
    // Get paper details
    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    // Get students in this section
    const students = await Student.find({
      course: paper.department,
      year: paper.year,
      section: section
    }).select('name rollNo').sort({ rollNo: 1 }).lean();

    // Get attendance records
    let attendanceQuery = { paper: paperId, section: section };
    if (startDate && endDate) {
      attendanceQuery.date = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    const attendanceRecords = await Attendance.find(attendanceQuery).lean();
    
    // Calculate attendance statistics
    const totalClasses = attendanceRecords.length;
    const studentsWithStats = students.map(student => {
      const presentCount = attendanceRecords.reduce((count, record) => {
        const studentAttendance = record.students.find(s => s.student.toString() === student._id.toString());
        return count + (studentAttendance?.status === 'present' ? 1 : 0);
      }, 0);
      
      return {
        ...student,
        present: presentCount,
        absent: totalClasses - presentCount,
        percentage: totalClasses > 0 ? ((presentCount / totalClasses) * 100).toFixed(1) : '0'
      };
    });

    const reportData = {
      paper,
      students: studentsWithStats,
      totalClasses,
      startDate: startDate || 'N/A',
      endDate: endDate || 'N/A',
      section
    };

    const filename = `Professional_Attendance_Report_${paper.paper.replace(/[^a-zA-Z0-9]/g, '_')}_${section}.pdf`;
    generateAttendanceReportPDF(res, reportData, filename);

  } catch (err) {
    console.error('Attendance PDF generation error:', err);
    res.status(500).json({ message: "Error generating attendance PDF report" });
  }
});

module.exports = {
  createNewAttendance,
  getStudentsByPaperAndSection,
  getTeacherPapers,
  getTeacherSectionStudents,
  getHODSectionStudents,
  getStudentSectionContent,
  getAttendancePercentage,
  getDepartmentAttendanceReport,
  getPaperAttendanceReport,
  getStudentAttendanceSummary,
  getMultiPaperAttendanceReport,
  getStudentAttendanceDetail,
  checkAttendanceExists,
  downloadAttendanceReportPDF,
  getAvailableDatesForAttendance,
  getTimetableBasedPapers,
};
