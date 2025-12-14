const express = require("express");
const router = express.Router();
const semesterController = require("../controllers/semesterController");

// Get semester settings for a department
router.get("/settings/:department", semesterController.getSemesterSettings);

// Create or update semester settings (HOD only)
router.post("/settings", semesterController.createOrUpdateSemesterSettings);

// Delete semester settings (HOD only)
router.delete("/settings/:id", semesterController.deleteSemesterSettings);

// Validate if a date is within semester range
router.get("/validate-date/:department/:semester", semesterController.validateAttendanceDate);

// Get current active semester for department
router.get("/current/:department", semesterController.getCurrentSemester);

module.exports = router;