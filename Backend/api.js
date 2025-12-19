// Comprehensive serverless API for Vercel deployment
require('dotenv').config();
const mongoose = require('mongoose');
const path = require('path');
const fs = require('fs');

// Create directories for serverless environment
const createDirectories = () => {
  const directories = ['/tmp/certificates', '/tmp/payslips', '/tmp/reports', '/tmp/profile-photos', '/tmp/notes', '/tmp/assignments'];
  directories.forEach(dir => {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  });
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

    // Get all staff endpoint
    if (path === '/staff' && req.method === 'GET') {
      const Staff = require('./models/Staff');
      
      try {
        const staff = await Staff.find().select('-password').lean();
        return res.json(staff);
      } catch (error) {
        return res.status(500).json({ 
          message: "Error fetching staff", 
          error: error.message 
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

    // Try to delegate to Express app for complex routes
    try {
      const express = require('express');
      const app = express();
      
      // Middleware
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ extended: true, limit: '50mb' }));

      // Import routes with error handling
      const routes = [
        { path: '/staff', file: './routes/staffRoutes' },
        { path: '/certificates', file: './routes/certificateRoutes' },
        { path: '/payslips', file: './routes/payslipRoutes' },
        { path: '/attendance', file: './routes/attendanceRoutes' },
        { path: '/assignments', file: './routes/assignmentRoutes' },
        { path: '/quizzes', file: './routes/quizRoutes' },
        { path: '/internal', file: './routes/internalRoutes' },
        { path: '/feedback', file: './routes/feedbackRoutes' },
        { path: '/leave', file: './routes/leaveRoutes' },
        { path: '/staff-attendance', file: './routes/staffAttendanceRoutes' },
        { path: '/otp', file: './routes/otpRoutes' }
      ];

      routes.forEach(route => {
        try {
          const routeHandler = require(route.file);
          app.use(route.path, routeHandler);
        } catch (err) {
          console.log(`Route ${route.path} not available:`, err.message);
        }
      });

      // Handle the request with Express app
      return new Promise((resolve) => {
        const mockRes = {
          ...res,
          end: (data) => {
            if (data) res.end(data);
            else res.end();
            resolve();
          }
        };
        
        app(req, mockRes, () => {
          // If no route matched, continue to fallback
          resolve();
        });
      });

    } catch (expressError) {
      console.log('Express routing failed, using manual fallback');
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
        '... and more via Express routes'
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