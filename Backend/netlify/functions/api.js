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
    ? ['https://your-netlify-app.netlify.app'] // Replace with your actual Netlify URL
    : ['http://localhost:3000'],
  credentials: true
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/paper', paperRoutes);
app.use('/api/notes', notesRoutes);
app.use('/api/staff', staffRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/internal', internalRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/quizzes', quizRoutes);
app.use('/api/time-schedule', timeScheduleRoutes);
app.use('/api/semester', semesterRoutes);
app.use('/api/user', userRoutes);
app.use('/api/subject', subjectRoutes);

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Edutack API is running on Netlify Functions' });
});

// Error handling
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

module.exports.handler = serverless(app);