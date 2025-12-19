const express = require("express");
const router = express.Router();
const path = require("path");

router.get("^/$|/index(.html)?", (req, res) => {
  res.json({
    message: "🎓 EDUTRACK API Server",
    status: "✅ Running Successfully",
    version: "1.0.0",
    environment: process.env.NODE_ENV || "development",
    timestamp: new Date().toISOString(),
    endpoints: {
      api_info: "/api",
      health_check: "/health",
      authentication: "/auth",
      papers: "/paper",
      assignments: "/assignments",
      quizzes: "/quizzes",
      attendance: "/attendance",
      staff: "/staff",
      students: "/student",
      certificates: "/certificates",
      payslips: "/payslips"
    },
    note: "This is the backend API for local development."
  });
});

// API info endpoint
router.get("/api", (req, res) => {
  res.json({
    name: "Edutack API",
    description: "College Management System Backend",
    version: "1.0.0",
    status: "✅ Running",
    database: "Connected to MongoDB Atlas",
    environment: process.env.NODE_ENV || "development",
    endpoints: {
      auth: "/auth - Authentication (login/register)",
      quizzes: "/quizzes - Quiz management", 
      assignments: "/assignments - Assignment system",
      attendance: "/attendance - Attendance tracking",
      papers: "/paper - Subject/Paper management",
      notes: "/notes - Notes system",
      internal: "/internal - Internal marks",
      staff: "/staff - Staff management",
      student: "/student - Student management"
    },
    development: {
      backend: "http://localhost:3500",
      frontend: "http://localhost:3000",
      database: "MongoDB Atlas"
    }
  });
});

module.exports = router;
