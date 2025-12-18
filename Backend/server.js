require("dotenv").config();
const express = require("express");
const cors = require("cors");
const path = require("path");
const fs = require("fs");

// Create uploads and assets directories if they don't exist
const uploadsDir = path.join(__dirname, 'uploads');
const profilePhotosDir = path.join(uploadsDir, 'profile-photos');
const certificatesDir = path.join(uploadsDir, 'certificates');
const assetsDir = path.join(__dirname, 'assets');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}
if (!fs.existsSync(profilePhotosDir)) {
  fs.mkdirSync(profilePhotosDir);
}
if (!fs.existsSync(certificatesDir)) {
  fs.mkdirSync(certificatesDir);
}
if (!fs.existsSync(assetsDir)) {
  fs.mkdirSync(assetsDir);
}

const app = express();
const { logger, logEvents } = require("./middleware/logger");
const errorHandler = require("./middleware/errorHandler");
const cookieParser = require("cookie-parser");
const corsOptions = require("./config/corsOptions");
const connectDB = require("./config/dbConn");
const mongoose = require("mongoose");

const PORT = process.env.PORT || 3500;

connectDB();

app.use(logger);

app.use(cors(corsOptions));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(cookieParser());

// Serve static files from uploads directory
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Serve static files from public directory with proper MIME types
app.use("/", express.static("public", {
  setHeaders: (res, path) => {
    const ext = require('path').extname(path).toLowerCase();
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
    
    if (mimeTypes[ext]) {
      res.setHeader('Content-Type', mimeTypes[ext]);
    }
  }
}));

// Serve assignment files with proper MIME types (only for files with extensions)
app.get('/assignments/files/:filename', (req, res) => {
  const filename = req.params.filename;
  const filePath = path.join(__dirname, 'public/assignments', filename);
  
  console.log(`Serving assignment file: ${filename} from ${filePath}`);
  
  // Check if file exists
  if (!fs.existsSync(filePath)) {
    console.log(`File not found: ${filePath}`);
    return res.status(404).json({ message: 'File not found' });
  }
  
  // Get file extension
  const ext = path.extname(filename).toLowerCase();
  
  // Set appropriate MIME type based on file extension
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
  
  console.log(`Setting MIME type for ${filename}: ${mimeType}`);
  
  // Set headers
  res.setHeader('Content-Type', mimeType);
  res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
  res.setHeader('Cache-Control', 'no-cache');
  
  // Send file
  res.sendFile(filePath, (err) => {
    if (err) {
      console.error(`Error sending file ${filename}:`, err);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error serving file' });
      }
    } else {
      console.log(`Successfully served file: ${filename}`);
    }
  });
});

app.use("/", require("./routes/root"));

app.use("/auth", require("./routes/authRoutes"));
app.use("/paper", require("./routes/paperRoutes"));
app.use("/notes", require("./routes/notesRoutes"));
app.use("/internal", require("./routes/internalRoutes"));
app.use("/attendance", require("./routes/attendanceRoutes"));
app.use("/time-schedule", require("./routes/timeScheduleRoutes"));
app.use("/staff", require("./routes/staffRoutes"));
app.use("/student", require("./routes/studentRoutes"));
app.use("/users", require("./routes/userRoutes"));
app.use("/assignments", require("./routes/assignmentRoutes"));
app.use("/quizzes", require("./routes/quizRoutes"));
app.use("/semester", require("./routes/semesterRoutes"));
app.use("/feedback", require("./routes/feedbackRoutes"));
app.use("/leave", require("./routes/leaveRoutes"));
app.use("/staff-attendance", require("./routes/staffAttendanceRoutes"));
app.use("/certificates", require("./routes/certificateRoutes"));
app.use("/payslips", require("./routes/payslipRoutes"));
app.use("/academic-calendar", require("./routes/academicCalendarRoutes"));

// Health check endpoint
app.get("/health", (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Edutack API is running',
    timestamp: new Date().toISOString()
  });
});

app.all("*", (req, res) => {
  res.status(404);
  if (req.accepts("json")) {
    res.json({ message: "404 Not Found", details: "No paths found" });
  } else {
    res.type("txt").send("404 Not Found");
  }
});

app.use(errorHandler);

// For local development
if (process.env.NODE_ENV !== 'production') {
  mongoose.connection.once("open", () => {
    console.log("Connected to MongoDB");
    app.listen(PORT, () => console.log(`server running on PORT ${PORT}`));
  });
}

mongoose.connection.on("error", (err) => {
  console.log(err);
  logEvents(
    `${err.no}:${err.code}\t${err.syscall}\t${err.hostname}`,
    "mongoErrLog.log"
  );
});

mongoose.connection.on("uncaughtException", function (err) {
  console.log(err);
});

// Export app for serverless deployment
module.exports = app;
