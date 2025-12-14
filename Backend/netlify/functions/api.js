const express = require('express');
const serverless = require('serverless-http');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();

// Import your existing routes
const authRoutes = require('../../routes/authRoutes');
const paperRoutes = require('../../routes/paperRoutes');
const notesRoutes = require('../../routes/notesRoutes');
const staffRoutes = require('../../routes/staffRoutes');
const studentRoutes = require('../../routes/studentRoutes');
const attendanceRoutes = require('../../routes/attendanceRoutes');
const internalRoutes = require('../../routes/internalRoutes');
const assignmentRoutes = require('../../routes/assignmentRoutes');
const quizRoutes = require('../../routes/quizRoutes');
const timeScheduleRoutes = require('../../routes/timeScheduleRoutes');
const semesterRoutes = require('../../routes/semesterRoutes');
const userRoutes = require('../../routes/userRoutes');
const subjectRoutes = require('../../routes/subjectRoutes');

// Import database connection
require('../../config/dbConn');

const app = express();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' 
    ? true // Allow all origins in production (Netlify handles this securely)
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Routes (no /api prefix needed - Netlify handles this)
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
  res.json({ status: 'OK', message: 'Edutack API is running on Netlify Functions' });
});

// Debug route to check if API is working
app.get('/', (req, res) => {
  res.json({ 
    message: 'Edutack API is working!', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV 
  });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports.handler = serverless(app);