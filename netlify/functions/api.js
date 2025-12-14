const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');

// Set environment variables for production
process.env.NODE_ENV = 'production';

// Import database connection
require('../../Backend/config/dbConn');

// Import routes
const authRoutes = require('../../Backend/routes/authRoutes');
const paperRoutes = require('../../Backend/routes/paperRoutes');
const notesRoutes = require('../../Backend/routes/notesRoutes');
const staffRoutes = require('../../Backend/routes/staffRoutes');
const studentRoutes = require('../../Backend/routes/studentRoutes');
const attendanceRoutes = require('../../Backend/routes/attendanceRoutes');
const internalRoutes = require('../../Backend/routes/internalRoutes');
const assignmentRoutes = require('../../Backend/routes/assignmentRoutes');
const quizRoutes = require('../../Backend/routes/quizRoutes');
const timeScheduleRoutes = require('../../Backend/routes/timeScheduleRoutes');
const semesterRoutes = require('../../Backend/routes/semesterRoutes');
const userRoutes = require('../../Backend/routes/userRoutes');
const subjectRoutes = require('../../Backend/routes/subjectRoutes');

const app = express();

// CORS - Allow all origins for Netlify
app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
}));

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Add request logging
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, req.body);
  next();
});

// Health check route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Edutack API is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    path: req.path
  });
});

// API Routes (without /api prefix - Netlify handles this)
app.use('/auth', authRoutes);
app.use('/paper', paperRoutes);
app.use('/notes', notesRoutes);
app.use('/staff', staffRoutes);
app.use('/student', studentRoutes);
app.use('/attendance', attendanceRoutes);
app.use('/internal', internalRoutes);
app.use('/assignments', assignmentRoutes);
app.use('/quizzes', quizRoutes);
app.use('/time-schedule', timeScheduleRoutes);
app.use('/semester', semesterRoutes);
app.use('/user', userRoutes);
app.use('/subject', subjectRoutes);

// Health check
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Edutack API is running on Netlify Functions',
    mongodb: process.env.MONGODB_URI ? 'Connected' : 'Not configured'
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error('API Error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
  });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    message: 'API endpoint not found',
    path: req.originalUrl,
    method: req.method
  });
});

module.exports.handler = serverless(app);