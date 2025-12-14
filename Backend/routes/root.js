const express = require("express");
const router = express.Router();
const path = require("path");

router.get("^/$|/index(.html)?", (req, res) => {
  res.sendFile(path.join(__dirname, "..", "views", "index.html"));
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
    deployment: {
      backend: "Railway",
      frontend: "Netlify",
      database: "MongoDB Atlas"
    }
  });
});

module.exports = router;
