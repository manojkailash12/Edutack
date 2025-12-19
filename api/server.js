// Express app setup for Vercel serverless function
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');

// Import middleware and config
const { logger } = require('../Backend/middleware/logger');
const errorHandler = require('../Backend/middleware/errorHandler');
const corsOptions = require('../Backend/config/corsOptions');
const connectDB = require('../Backend/config/dbConn');

const app = express();

// Connect to MongoDB (only if not already connected)
if (mongoose.connection.readyState === 0) {
  connectDB();
}

// Middleware
app.use(logger);
app.use(cors(corsOptions));
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());

// Create necessary directories for serverless environment
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

// Routes
app.use("/", require("../Backend/routes/root"));
app.use("/auth", require("../Backend/routes/authRoutes"));
app.use("/paper", require("../Backend/routes/paperRoutes"));
app.use("/notes", require("../Backend/routes/notesRoutes"));
app.use("/internal", require("../Backend/routes/internalRoutes"));
app.use("/attendance", require("../Backend/routes/attendanceRoutes"));
app.use("/time-schedule", require("../Backend/routes/timeScheduleRoutes"));
app.use("/staff", require("../Backend/routes/staffRoutes"));
app.use("/student", require("../Backend/routes/studentRoutes"));
app.use("/users", require("../Backend/routes/userRoutes"));
app.use("/assignments", require("../Backend/routes/assignmentRoutes"));
app.use("/quizzes", require("../Backend/routes/quizRoutes"));
app.use("/semester", require("../Backend/routes/semesterRoutes"));
app.use("/feedback", require("../Backend/routes/feedbackRoutes"));
app.use("/leave", require("../Backend/routes/leaveRoutes"));
app.use("/staff-attendance", require("../Backend/routes/staffAttendanceRoutes"));
app.use("/certificates", require("../Backend/routes/certificateRoutes"));
app.use("/payslips", require("../Backend/routes/payslipRoutes"));
app.use("/academic-calendar", require("../Backend/routes/academicCalendarRoutes"));
app.use("/health", require("../Backend/routes/healthRoutes"));
app.use("/otp", require("../Backend/routes/otpRoutes"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Edutack API is running on Vercel',
    timestamp: new Date().toISOString(),
    environment: 'production',
    mongodb: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected'
  });
});

// 404 handler
app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("json")) {
    res.json({ message: "404 Not Found", details: "No paths found", url: req.url });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

// Error handler
app.use(errorHandler);

module.exports = app;