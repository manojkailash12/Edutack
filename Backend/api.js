// Comprehensive serverless API for Vercel deployment
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Create directories for serverless environment
const createDirectories = () => {
  try {
    const directories = ['/tmp/certificates', '/tmp/payslips', '/tmp/reports', '/tmp/profile-photos', '/tmp/notes', '/tmp/assignments'];
    directories.forEach(dir => {
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
    });
    console.log('✅ Directories created successfully');
  } catch (error) {
    console.log('⚠️ Directory creation failed:', error.message);
    // Continue without failing - directories will be created on demand
  }
};

// Initialize directories
createDirectories();

// Connect to MongoDB
let isConnected = false;

const connectDB = async () => {
  if (isConnected) return;
  
  try {
    const dbUri = process.env.MONGODB_URI;
    await mongoose.connect(dbUri, {
      serverSelectionTimeoutMS: 30000,
      socketTimeoutMS: 60000,
      connectTimeoutMS: 30000,
      family: 4,
      bufferCommands: false,
      maxPoolSize: 10,
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
    });
    isConnected = true;
    console.log("✅ Connected to MongoDB Atlas successfully");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    throw err;
  }
};

module.exports = async (req, res) => {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  try {
    // Connect to database
    await connectDB();

    // Parse URL to get the path
    const url = new URL(req.url, `http://${req.headers.host}`);
    const path = url.pathname;
    
    console.log('Request path:', path, 'Method:', req.method);

    // Health check endpoint
    if (path === '/' || path === '/health') {
      return res.status(200).json({
        status: 'OK',
        message: 'Edutack API is running on Vercel',
        timestamp: new Date().toISOString(),
        environment: 'production',
        mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
        path: path,
        method: req.method
      });
    }

    // Staff login endpoint
    if (path === '/auth/login/staff' && req.method === 'POST') {
      const Staff = require('./models/Staff');
      const bcrypt = require('bcrypt');
      const Login = require('./models/Login');
      
      const { username, employeeId, email, password } = req.body;

      if ((!username && !employeeId && !email) || !password) {
        return res.status(400).json({ message: "Username, Employee ID, or Email and password are required" });
      }
      
      // Find staff by username, employeeId, or email
      let query = {};
      if (email) {
        query = { email };
      } else if (username) {
        query = { username };
      } else {
        query = { employeeId };
      }
      
      const staff = await Staff.findOne(query).exec();

      if (!staff) {
        return res.status(404).json({ message: "User not found" });
      }
      if (staff.role === 'teacher' && !staff.approved) {
        return res.status(403).json({ message: "User not approved by HOD" });
      }
      if (!staff.role) {
        return res.status(418).json({ message: "User not Approved" });
      }

      const match = await bcrypt.compare(password, staff.password);
      if (!match) return res.status(401).json({ message: "Incorrect Password" });
      
      // Track login
      await Login.create({ userId: staff._id, role: 'staff' });
      
      return res.status(200).json({
        _id: staff.id,
        name: staff.name,
        role: staff.role,
        userType: 'staff',
        department: staff.department,
        employeeId: staff.employeeId,
      });
    }

    // Student login endpoint
    if (path === '/auth/login/student' && req.method === 'POST') {
      const Student = require('./models/Student');
      const bcrypt = require('bcrypt');
      const Login = require('./models/Login');
      
      const { rollNo, email, password } = req.body;

      if ((!rollNo && !email) || !password) {
        return res.status(400).json({ message: "Roll No or Email and password are required" });
      }
      
      // Find student by rollNo or email
      const query = email ? { email } : { rollNo };
      const student = await Student.findOne(query).exec();

      if (!student) {
        return res.status(404).json({ message: "User not found" });
      }

      const match = await bcrypt.compare(password, student.password);
      if (!match) return res.status(401).json({ message: "Incorrect Password" });
      
      // Track login
      await Login.create({ userId: student._id, role: 'student' });
      
      return res.status(200).json({
        _id: student.id,
        name: student.name,
        department: student.department,
        year: student.year,
        section: student.section,
        rollNo: student.rollNo,
        role: "student",
        userType: "student"
      });
    }

    // Test staff model loading
    if (path === '/test-staff-model' && req.method === 'GET') {
      try {
        const Staff = require('./models/Staff');
        return res.json({ 
          message: "Staff model loaded successfully",
          modelName: Staff.modelName
        });
      } catch (error) {
        console.error('Staff model load error:', error);
        return res.status(500).json({ 
          message: "Error loading Staff model", 
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Get all staff endpoint
    if (path === '/staff' && req.method === 'GET') {
      try {
        const Staff = require('./models/Staff');
        const staff = await Staff.find().select('-password').lean();
        return res.json(staff);
      } catch (error) {
        console.error('Staff fetch error:', error);
        return res.status(500).json({ 
          message: "Error fetching staff", 
          error: error.message,
          stack: error.stack
        });
      }
    }

    // Get all students endpoint
    if (path === '/student/all' && req.method === 'GET') {
      const Student = require('./models/Student');
      
      try {
        const students = await Student.find().select('-password').lean();
        return res.json(students);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching students", 
          error: error.message 
        });
      }
    }

    // Get all papers endpoint
    if (path === '/paper/all' && req.method === 'GET') {
      const Paper = require('./models/Paper');
      
      try {
        const papers = await Paper.find().lean();
        return res.json(papers);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching papers", 
          error: error.message 
        });
      }
    }

    // Get papers for staff
    if (path.startsWith('/paper/staff/') && req.method === 'GET') {
      const Paper = require('./models/Paper');
      const staffId = path.split('/')[3];
      
      try {
        const papers = await Paper.find({ teacher: staffId }).lean();
        return res.json(papers);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching staff papers", 
          error: error.message 
        });
      }
    }

    // Get papers for student
    if (path.startsWith('/paper/student/') && req.method === 'GET') {
      const Paper = require('./models/Paper');
      const Student = require('./models/Student');
      const studentId = path.split('/')[3];
      
      try {
        const student = await Student.findById(studentId);
        if (!student) {
          return res.status(404).json({ message: "Student not found" });
        }
        
        const papers = await Paper.find({ 
          department: student.department,
          year: student.year,
          section: student.section
        }).lean();
        
        return res.json(papers);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching student papers", 
          error: error.message 
        });
      }
    }

    // Staff departments endpoint
    if (path === '/staff/departments' && req.method === 'GET') {
      const Staff = require('./models/Staff');
      const Student = require('./models/Student');
      
      try {
        const staffDepartments = await Staff.distinct('department');
        const studentDepartments = await Student.distinct('department');
        
        const allDepartments = [...new Set([...staffDepartments, ...studentDepartments])];
        const departments = allDepartments
          .filter(dept => dept && dept.trim() !== '')
          .sort();

        return res.json({
          message: "Departments retrieved successfully",
          departments
        });
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching departments", 
          error: error.message 
        });
      }
    }

    // Additional essential endpoints

    // Get staff by department
    if (path.startsWith('/staff/department/') && req.method === 'GET') {
      const Staff = require('./models/Staff');
      const department = decodeURIComponent(path.split('/')[3]);
      
      try {
        const staff = await Staff.find({ department }).select('-password').lean();
        return res.json(staff);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching staff by department", 
          error: error.message 
        });
      }
    }

    // HOD Dashboard endpoints
    if (path.startsWith('/staff/hod-dashboard/') && req.method === 'GET') {
      const Staff = require('./models/Staff');
      const Student = require('./models/Student');
      const Paper = require('./models/Paper');
      const Internal = require('./models/Internal');
      const Attendance = require('./models/Attendance');
      
      const department = decodeURIComponent(path.split('/')[3]);
      
      try {
        const [teachers, students, papers, internalMarks, attendanceData] = await Promise.all([
          Staff.find({ department, role: { $in: ['teacher', 'HOD'] } }).select('-password').lean(),
          Student.find({ department }).lean(),
          Paper.find({ department }).populate('teacher', 'name').lean(),
          Internal.find().populate('paper', 'paper semester department').lean(),
          Attendance.find().populate('paper', 'paper department').lean()
        ]);

        // Process internal marks for this department
        const departmentInternalMarks = [];
        internalMarks.forEach(internal => {
          if (internal.paper?.department === department) {
            internal.marks.forEach(mark => {
              departmentInternalMarks.push({
                studentId: mark._id,
                rollNo: mark.rollNo,
                studentName: mark.name,
                section: students.find(s => s._id.toString() === mark._id.toString())?.section || 'Unknown',
                paperName: internal.paper?.paper,
                semester: internal.paper?.semester,
                test: mark.midMarks || 0,
                seminar: mark.lab || 0,
                assignment: mark.assignmentQuiz || 0,
                attendance: mark.attendance || 0,
                total: mark.total || 0
              });
            });
          }
        });

        // Process attendance data for this department
        const attendanceSummary = {};
        attendanceData.forEach(attendanceRecord => {
          if (attendanceRecord.paper?.department === department) {
            attendanceRecord.students.forEach(studentRecord => {
              const key = `${studentRecord.student}-${studentRecord.rollNo}`;
              if (!attendanceSummary[key]) {
                attendanceSummary[key] = {
                  studentId: studentRecord.student,
                  rollNo: studentRecord.rollNo,
                  studentName: studentRecord.name,
                  section: attendanceRecord.section,
                  totalClasses: 0,
                  presentClasses: 0
                };
              }
              attendanceSummary[key].totalClasses++;
              if (studentRecord.status === 'present') {
                attendanceSummary[key].presentClasses++;
              }
            });
          }
        });

        const attendanceReport = Object.values(attendanceSummary).map(summary => ({
          ...summary,
          attendancePercentage: summary.totalClasses > 0 
            ? Math.round((summary.presentClasses / summary.totalClasses) * 100)
            : 0
        }));

        return res.json({
          teachers,
          students,
          papers,
          internalMarks: departmentInternalMarks,
          attendanceData: attendanceReport
        });
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching HOD dashboard data", 
          error: error.message 
        });
      }
    }

    // HOD Summary endpoints
    if (path.startsWith('/staff/hod-summary/') && req.method === 'GET') {
      const Staff = require('./models/Staff');
      const Student = require('./models/Student');
      const Paper = require('./models/Paper');
      const Attendance = require('./models/Attendance');
      
      const department = decodeURIComponent(path.split('/')[3]);
      
      try {
        const [teachers, students, papers, attendanceData] = await Promise.all([
          Staff.find({ department, role: { $in: ['teacher', 'HOD'] } }).lean(),
          Student.find({ department }).lean(),
          Paper.find({ department }).lean(),
          Attendance.find().populate('paper', 'department').lean()
        ]);

        // Calculate section stats
        const sectionStats = students.reduce((acc, student) => {
          const section = student.section || 'Unknown';
          acc[section] = (acc[section] || 0) + 1;
          return acc;
        }, {});

        const sectionStatsArray = Object.entries(sectionStats).map(([section, count]) => ({
          _id: section,
          count
        }));

        // Calculate semester stats
        const semesterStats = papers.reduce((acc, paper) => {
          const semester = paper.semester || 'Unknown';
          acc[semester] = (acc[semester] || 0) + 1;
          return acc;
        }, {});

        const semesterStatsArray = Object.entries(semesterStats).map(([semester, count]) => ({
          _id: semester,
          count
        }));

        // Calculate average attendance for department
        let totalAttendancePercentage = 0;
        let studentCount = 0;

        const attendanceSummary = {};
        attendanceData.forEach(attendanceRecord => {
          if (attendanceRecord.paper?.department === department) {
            attendanceRecord.students.forEach(studentRecord => {
              const studentId = studentRecord.student.toString();
              if (!attendanceSummary[studentId]) {
                attendanceSummary[studentId] = { total: 0, present: 0 };
              }
              attendanceSummary[studentId].total++;
              if (studentRecord.status === 'present') {
                attendanceSummary[studentId].present++;
              }
            });
          }
        });

        Object.values(attendanceSummary).forEach(summary => {
          if (summary.total > 0) {
            totalAttendancePercentage += (summary.present / summary.total) * 100;
            studentCount++;
          }
        });

        const averageAttendance = studentCount > 0 
          ? Math.round(totalAttendancePercentage / studentCount)
          : 0;

        return res.json({
          totalTeachers: teachers.length,
          totalStudents: students.length,
          totalPapers: papers.length,
          averageAttendance,
          sectionStats: sectionStatsArray,
          semesterStats: semesterStatsArray
        });
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching HOD summary data", 
          error: error.message 
        });
      }
    }

    // Certificates dashboard endpoint
    if (path === '/certificates/dashboard' && req.method === 'GET') {
      const Student = require('./models/Student');
      const ExternalMarks = require('./models/ExternalMarks');
      
      try {
        const totalStudents = await Student.countDocuments();
        const studentsWithMarks = await ExternalMarks.distinct('student');
        const eligibleForCertificate = studentsWithMarks.length;
        
        return res.json({
          totalStudents,
          eligibleForCertificate,
          pendingStudents: totalStudents - eligibleForCertificate,
          generatedCertificates: 0
        });
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching certificate dashboard data", 
          error: error.message 
        });
      }
    }

    // Staff attendance endpoints
    if (path === '/staff-attendance/check-in' && req.method === 'POST') {
      const StaffAttendance = require('./models/StaffAttendance');
      const { staffId } = req.body;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const existingRecord = await StaffAttendance.findOne({
          staffId: staffId,
          date: today
        });

        if (existingRecord) {
          return res.status(400).json({ message: 'Already checked in today' });
        }

        const attendance = new StaffAttendance({
          staffId: staffId,
          date: today,
          checkInTime: new Date(),
          status: 'present'
        });

        await attendance.save();
        return res.json({ message: 'Checked in successfully', attendance });
      } catch (error) {
        return res.status(500).json({ 
          message: "Error checking in", 
          error: error.message 
        });
      }
    }

    if (path === '/staff-attendance/check-out' && req.method === 'POST') {
      const StaffAttendance = require('./models/StaffAttendance');
      const { staffId } = req.body;
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const attendance = await StaffAttendance.findOne({
          staffId: staffId,
          date: today
        });

        if (!attendance) {
          return res.status(400).json({ message: 'No check-in record found for today' });
        }

        if (attendance.checkOutTime) {
          return res.status(400).json({ message: 'Already checked out today' });
        }

        attendance.checkOutTime = new Date();
        
        // Calculate working hours
        const checkInTime = new Date(attendance.checkInTime);
        const checkOutTime = new Date(attendance.checkOutTime);
        const workingHours = (checkOutTime - checkInTime) / (1000 * 60 * 60);
        attendance.workingHours = Math.max(0, workingHours);

        await attendance.save();
        return res.json({ message: 'Checked out successfully', attendance });
      } catch (error) {
        return res.status(500).json({ 
          message: "Error checking out", 
          error: error.message 
        });
      }
    }

    // Get staff attendance status
    if (path.startsWith('/staff-attendance/status/') && req.method === 'GET') {
      const StaffAttendance = require('./models/StaffAttendance');
      const staffId = path.split('/')[3];
      
      try {
        const today = new Date().toISOString().split('T')[0];
        const attendance = await StaffAttendance.findOne({
          staffId: staffId,
          date: today
        });

        return res.json({ attendance });
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching attendance status", 
          error: error.message 
        });
      }
    }

    // Payslip endpoints
    if (path.startsWith('/payslips/staff/') && req.method === 'GET') {
      const Payslip = require('./models/Payslip');
      const staffId = path.split('/')[3];
      
      try {
        const payslips = await Payslip.find({ staffId: staffId })
          .populate('staffId', 'name employeeId')
          .sort({ month: -1, year: -1 })
          .lean();
        
        return res.json(payslips);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching payslips", 
          error: error.message 
        });
      }
    }

    // Get all payslips (for admin)
    if (path === '/payslips/all' && req.method === 'GET') {
      const Payslip = require('./models/Payslip');
      
      try {
        const url = new URL(req.url, `http://${req.headers.host}`);
        const year = url.searchParams.get('year');
        const month = url.searchParams.get('month');
        const department = url.searchParams.get('department');
        
        let query = {};
        if (year && year !== 'all') query.year = parseInt(year);
        if (month && month !== 'all') query.month = parseInt(month);
        
        const payslips = await Payslip.find(query)
          .populate('staffId', 'name employeeId department')
          .sort({ year: -1, month: -1 })
          .lean();
        
        // Filter by department if specified
        let filteredPayslips = payslips;
        if (department && department !== 'all') {
          filteredPayslips = payslips.filter(p => p.staffId?.department === department);
        }
        
        // Transform data to match frontend expectations
        const transformedPayslips = filteredPayslips.map(payslip => ({
          ...payslip,
          staffName: payslip.staffName || payslip.staffId?.name,
          employeeId: payslip.employeeId || payslip.staffId?.employeeId,
          department: payslip.department || payslip.staffId?.department
        }));
        
        return res.json(transformedPayslips);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching all payslips", 
          error: error.message 
        });
      }
    }

    // Download payslip
    if (path.startsWith('/payslips/') && path.endsWith('/download') && req.method === 'GET') {
      const Payslip = require('./models/Payslip');
      const payslipId = path.split('/')[2];
      
      try {
        const payslip = await Payslip.findById(payslipId);
        if (!payslip) {
          return res.status(404).json({ message: 'Payslip not found' });
        }
        
        // Generate PDF using payslip service
        const payslipService = require('./services/payslipService');
        const pdfBuffer = await payslipService.generatePayslipPDF(payslip);
        
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="payslip_${payslip.staffName}_${payslip.month}_${payslip.year}.pdf"`);
        return res.send(pdfBuffer);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error downloading payslip", 
          error: error.message 
        });
      }
    }

    // Email payslip
    if (path.startsWith('/payslips/') && path.endsWith('/email') && req.method === 'POST') {
      const Payslip = require('./models/Payslip');
      const payslipId = path.split('/')[2];
      
      try {
        const payslip = await Payslip.findById(payslipId).populate('staffId', 'email name');
        if (!payslip) {
          return res.status(404).json({ message: 'Payslip not found' });
        }
        
        // Send email using payslip service
        const payslipService = require('./services/payslipService');
        await payslipService.emailPayslip(payslip);
        
        return res.json({ message: 'Payslip emailed successfully' });
      } catch (error) {
        return res.status(500).json({ 
          message: "Error emailing payslip", 
          error: error.message 
        });
      }
    }

    // Certificate endpoints
    if (path.startsWith('/certificates/student/') && req.method === 'GET') {
      const Certificate = require('./models/Certificate');
      const studentId = path.split('/')[3];
      
      try {
        const certificates = await Certificate.find({ student: studentId })
          .populate('student', 'name rollNo')
          .sort({ createdAt: -1 })
          .lean();
        
        return res.json(certificates);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching certificates", 
          error: error.message 
        });
      }
    }

    // Internal marks endpoints
    if (path.startsWith('/internal/') && req.method === 'GET') {
      const Internal = require('./models/Internal');
      const paperId = path.split('/')[2];
      
      try {
        const internalMarks = await Internal.find({ paper: paperId })
          .populate('paper', 'paper semester')
          .lean();
        
        return res.json(internalMarks);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching internal marks", 
          error: error.message 
        });
      }
    }

    // Assignments endpoints
    if (path.startsWith('/assignments/') && req.method === 'GET') {
      const Assignment = require('./models/Assignment');
      const paperId = path.split('/')[2];
      
      try {
        const assignments = await Assignment.find({ paper: paperId })
          .populate('paper', 'paper')
          .lean();
        
        return res.json(assignments);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching assignments", 
          error: error.message 
        });
      }
    }

    // Quizzes endpoints
    if (path.startsWith('/quizzes/') && req.method === 'GET') {
      const Quiz = require('./models/Quiz');
      const paperId = path.split('/')[2];
      
      try {
        const quizzes = await Quiz.find({ paper: paperId })
          .populate('paper', 'paper')
          .lean();
        
        return res.json(quizzes);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching quizzes", 
          error: error.message 
        });
      }
    }

    // Attendance endpoints
    if (path.startsWith('/attendance/') && req.method === 'GET') {
      const Attendance = require('./models/Attendance');
      
      if (path.includes('/paper/')) {
        // Get attendance for a specific paper
        const paperId = path.split('/')[3];
        try {
          const attendance = await Attendance.find({ paper: paperId })
            .populate('paper', 'paper')
            .lean();
          
          return res.json(attendance);
        } catch (error) {
          return res.status(500).json({ 
            message: "Error fetching attendance", 
            error: error.message 
          });
        }
      }
    }

    // Feedback endpoints
    if (path.startsWith('/feedback/') && req.method === 'GET') {
      const Feedback = require('./models/Feedback');
      
      try {
        let query = {};
        if (path.includes('/student/')) {
          const studentId = path.split('/')[3];
          query.student = studentId;
        } else if (path.includes('/paper/')) {
          const paperId = path.split('/')[3];
          query.paper = paperId;
        }
        
        const feedback = await Feedback.find(query)
          .populate('student', 'name rollNo')
          .populate('paper', 'paper')
          .lean();
        
        return res.json(feedback);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching feedback", 
          error: error.message 
        });
      }
    }

    // Leave endpoints
    if (path.startsWith('/leave/') && req.method === 'GET') {
      const StaffLeave = require('./models/StaffLeave');
      const StudentLeave = require('./models/StudentLeave');
      
      try {
        if (path.includes('/staff/')) {
          const staffId = path.split('/')[3];
          const leaves = await StaffLeave.find({ staff: staffId })
            .populate('staff', 'name employeeId')
            .lean();
          return res.json(leaves);
        } else if (path.includes('/student/')) {
          const studentId = path.split('/')[3];
          const leaves = await StudentLeave.find({ student: studentId })
            .populate('student', 'name rollNo')
            .lean();
          return res.json(leaves);
        }
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching leave requests", 
          error: error.message 
        });
      }
    }

    // Academic calendar endpoints
    if (path.startsWith('/academic-calendar') && req.method === 'GET') {
      const AcademicCalendar = require('./models/AcademicCalendar');
      
      try {
        const events = await AcademicCalendar.find().lean();
        return res.json(events);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching academic calendar", 
          error: error.message 
        });
      }
    }

    // OTP endpoints
    if (path.startsWith('/otp/') && req.method === 'POST') {
      const otpService = require('./services/otpService');
      
      try {
        if (path.includes('/send')) {
          const { email, type } = req.body;
          await otpService.sendOTP(email, type);
          return res.json({ message: 'OTP sent successfully' });
        } else if (path.includes('/verify')) {
          const { email, otp } = req.body;
          const isValid = await otpService.verifyOTP(email, otp);
          return res.json({ valid: isValid });
        }
      } catch (error) {
        return res.status(500).json({ 
          message: "Error with OTP operation", 
          error: error.message 
        });
      }
    }

    // For other endpoints, return 404
    return res.status(404).json({
      message: 'Endpoint not found',
      path: path,
      method: req.method,
      availableEndpoints: [
        'GET /',
        'GET /health',
        'POST /auth/login/staff',
        'POST /auth/login/student',
        'GET /staff',
        'GET /student/all',
        'GET /paper/all',
        'GET /paper/staff/:id',
        'GET /paper/student/:id',
        'GET /staff/departments',
        'GET /staff/hod-dashboard/:department',
        'GET /staff/hod-summary/:department',
        'GET /certificates/dashboard',
        'GET /certificates/student/:id',
        'GET /payslips/all',
        'GET /payslips/staff/:id',
        'GET /payslips/:id/download',
        'POST /payslips/:id/email',
        'GET /internal/:paperId',
        'GET /assignments/:paperId',
        'GET /quizzes/:paperId',
        'GET /attendance/paper/:paperId',
        'GET /feedback/student/:id',
        'GET /leave/staff/:id',
        'GET /academic-calendar',
        'POST /otp/send',
        'POST /otp/verify',
        'POST /staff-attendance/check-in',
        'POST /staff-attendance/check-out',
        'GET /staff-attendance/status/:id'
      ]
    });

  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};