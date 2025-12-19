// Complete serverless API for Vercel deployment
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

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

// Create Express app
const app = express();

// Middleware
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Connect to database on startup
connectDB();

// Import all route handlers
const authRoutes = require('./routes/authRoutes');
const paperRoutes = require('./routes/paperRoutes');
const notesRoutes = require('./routes/notesRoutes');
const internalRoutes = require('./routes/internalRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const timeScheduleRoutes = require('./routes/timeScheduleRoutes');
const staffRoutes = require('./routes/staffRoutes');
const studentRoutes = require('./routes/studentRoutes');
const userRoutes = require('./routes/userRoutes');
const assignmentRoutes = require('./routes/assignmentRoutes');
const quizRoutes = require('./routes/quizRoutes');
const semesterRoutes = require('./routes/semesterRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const leaveRoutes = require('./routes/leaveRoutes');
const staffAttendanceRoutes = require('./routes/staffAttendanceRoutes');
const certificateRoutes = require('./routes/certificateRoutes');
const payslipRoutes = require('./routes/payslipRoutes');
const academicCalendarRoutes = require('./routes/academicCalendarRoutes');
const healthRoutes = require('./routes/healthRoutes');
const otpRoutes = require('./routes/otpRoutes');

// Health check endpoint
app.get('/', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Edutack API is running on Vercel',
    timestamp: new Date().toISOString(),
    environment: 'production',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// File serving endpoints for serverless
app.get('/assignments/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join('/tmp/assignments', filename);
  
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ message: 'File not found' });
  }
  
  const ext = path.extname(filename).toLowerCase();
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.doc': 'application/msword',
    '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    '.txt': 'text/plain',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.gif': 'image/gif'
  };
  
  const mimeType = mimeTypes[ext] || 'application/octet-stream';
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.sendFile(filePath);
});

// Use all routes
app.use('/auth', authRoutes);
app.use('/paper', paperRoutes);
app.use('/notes', notesRoutes);
app.use('/internal', internalRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/time-schedule', timeScheduleRoutes);
app.use('/staff', staffRoutes);
app.use('/student', studentRoutes);
app.use('/users', userRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/quizzes', quizRoutes);
app.use('/semester', semesterRoutes);
app.use('/feedback', feedbackRoutes);
app.use('/leave', leaveRoutes);
app.use('/staff-attendance', staffAttendanceRoutes);
app.use('/certificates', certificateRoutes);
app.use('/payslips', payslipRoutes);
app.use('/academic-calendar', academicCalendarRoutes);
app.use('/health', healthRoutes);
app.use('/otp', otpRoutes);

// 404 handler
app.all('*', (req, res) => {
  res.status(404).json({ 
    message: '404 Not Found', 
    path: req.path,
    method: req.method
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: err.message 
  });
});

// Main serverless function handler
module.exports = async (req, res) => {
  try {
    // Ensure database connection
    await connectDB();
    
    // Handle the request with Express app
    return app(req, res);
  } catch (error) {
    console.error('Serverless function error:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
};