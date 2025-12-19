// Hybrid serverless API for Vercel deployment
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

// Main serverless function handler
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

    // Try to use Express app for complex routes
    try {
      const express = require('express');
      const app = express();
      
      // Middleware
      app.use(express.json({ limit: '50mb' }));
      app.use(express.urlencoded({ extended: true, limit: '50mb' }));

      // Import and use routes with error handling
      try {
        const authRoutes = require('./routes/authRoutes');
        app.use('/auth', authRoutes);
      } catch (err) {
        console.log('Auth routes not available:', err.message);
      }

      try {
        const staffRoutes = require('./routes/staffRoutes');
        app.use('/staff', staffRoutes);
      } catch (err) {
        console.log('Staff routes not available:', err.message);
      }

      try {
        const studentRoutes = require('./routes/studentRoutes');
        app.use('/student', studentRoutes);
      } catch (err) {
        console.log('Student routes not available:', err.message);
      }

      try {
        const paperRoutes = require('./routes/paperRoutes');
        app.use('/paper', paperRoutes);
      } catch (err) {
        console.log('Paper routes not available:', err.message);
      }

      try {
        const certificateRoutes = require('./routes/certificateRoutes');
        app.use('/certificates', certificateRoutes);
      } catch (err) {
        console.log('Certificate routes not available:', err.message);
      }

      try {
        const payslipRoutes = require('./routes/payslipRoutes');
        app.use('/payslips', payslipRoutes);
      } catch (err) {
        console.log('Payslip routes not available:', err.message);
      }

      try {
        const attendanceRoutes = require('./routes/attendanceRoutes');
        app.use('/attendance', attendanceRoutes);
      } catch (err) {
        console.log('Attendance routes not available:', err.message);
      }

      try {
        const assignmentRoutes = require('./routes/assignmentRoutes');
        app.use('/assignments', assignmentRoutes);
      } catch (err) {
        console.log('Assignment routes not available:', err.message);
      }

      try {
        const quizRoutes = require('./routes/quizRoutes');
        app.use('/quizzes', quizRoutes);
      } catch (err) {
        console.log('Quiz routes not available:', err.message);
      }

      try {
        const internalRoutes = require('./routes/internalRoutes');
        app.use('/internal', internalRoutes);
      } catch (err) {
        console.log('Internal routes not available:', err.message);
      }

      try {
        const feedbackRoutes = require('./routes/feedbackRoutes');
        app.use('/feedback', feedbackRoutes);
      } catch (err) {
        console.log('Feedback routes not available:', err.message);
      }

      try {
        const leaveRoutes = require('./routes/leaveRoutes');
        app.use('/leave', leaveRoutes);
      } catch (err) {
        console.log('Leave routes not available:', err.message);
      }

      try {
        const staffAttendanceRoutes = require('./routes/staffAttendanceRoutes');
        app.use('/staff-attendance', staffAttendanceRoutes);
      } catch (err) {
        console.log('Staff attendance routes not available:', err.message);
      }

      try {
        const otpRoutes = require('./routes/otpRoutes');
        app.use('/otp', otpRoutes);
      } catch (err) {
        console.log('OTP routes not available:', err.message);
      }

      try {
        const healthRoutes = require('./routes/healthRoutes');
        app.use('/health', healthRoutes);
      } catch (err) {
        console.log('Health routes not available:', err.message);
      }

      // Handle the request with Express app
      return new Promise((resolve) => {
        app(req, res, () => {
          // If no route matched, fall back to manual handling
          resolve();
        });
      });

    } catch (expressError) {
      console.log('Express app failed, falling back to manual routing:', expressError.message);
    }

    // Fallback: Manual route handling for critical endpoints
    
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

    // For other endpoints, return 404 with available endpoints
    return res.status(404).json({
      message: 'Endpoint not found',
      path: path,
      method: req.method,
      note: 'This is a hybrid serverless API. Some routes may be handled by Express, others manually.',
      availableEndpoints: [
        'GET /',
        'GET /health',
        'POST /auth/login/staff',
        'POST /auth/login/student',
        'GET /staff',
        'GET /student/all',
        'GET /paper/all',
        '... and many more via Express routes'
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