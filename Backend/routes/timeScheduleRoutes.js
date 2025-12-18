const express = require("express");
const timeScheduleController = require("../controllers/timeScheduleController");
const Paper = require("../models/Paper");
const fakeHOD = require("../middleware/fakeHOD"); // Add this line

const router = express.Router();

// Get all time schedules
router.route("/").get(timeScheduleController.getAllTimeSchedules);

// Get time schedules by department
router.route("/department/:department").get(timeScheduleController.getTimeSchedulesByDepartment);

// Get time schedules by teacher
router.route("/teacher/:teacherId").get(timeScheduleController.getTimeSchedulesByTeacher);

// Get current time slots for teacher
router.route("/current/:teacherId").get(timeScheduleController.getCurrentTimeSlotsWithUpdates);

// Get available papers for teacher
router.route("/available-papers/:teacherId").get(timeScheduleController.getAvailablePapersForTeacher);

// Add new time schedule (HOD only)
router.route("/").post(fakeHOD, timeScheduleController.addTimeSchedule);

// Generate complete timetable (HOD only) - New enhanced version
router.post("/generate", fakeHOD, timeScheduleController.generateTimetable);

// Generate complete timetable (HOD only) - Legacy version
router.post(
  "/generate/:department/:semester/:year",
  fakeHOD,
  timeScheduleController.generateCompleteTimetable
);

// Get timetable by section
router.route("/section/:department/:semester/:year/:section").get(timeScheduleController.getTimetableBySection);

// Get timetable view
router.route("/timetable/:department/:semester/:year").get(timeScheduleController.getTimetableView);

// Notify teachers of timetable changes (HOD only)
router.route("/notify-changes/:department").post(fakeHOD, timeScheduleController.notifyTimetableChanges);

// Get timetable changes for teacher
router.route("/changes/:teacherId").get(timeScheduleController.getTimetableChanges);

// Update time schedule with tracking (HOD only)
router.route("/:id").patch(fakeHOD, timeScheduleController.updateTimeScheduleWithTracking);

// Delete time schedule (HOD only)
router.route("/:id").delete(fakeHOD, timeScheduleController.deleteTimeSchedule);

// Get time schedule by ID
router.route("/:id").get(timeScheduleController.getTimeSchedule);

// Create single time schedule (HOD only)
router.post("/single", fakeHOD, timeScheduleController.createTimeSchedule);

// Get timetable statistics
router.route("/stats/:department").get(timeScheduleController.getTimetableStats);

// Debug endpoint to list all papers for a department, semester, and year
router.get("/debug/list-papers/:department/:semester/:year", async (req, res) => {
  const { department, semester, year } = req.params;
  try {
    const papers = await Paper.find({ department, semester, year });
    res.json({ count: papers.length, papers });
  } catch (err) {
    res.status(500).json({ message: "Error fetching papers", error: err.message });
  }
});

// Debug endpoint to list all papers in the database
router.get("/debug/list-all-papers", async (req, res) => {
  try {
    const papers = await Paper.find({});
    res.json({ count: papers.length, papers });
  } catch (err) {
    res.status(500).json({ message: "Error fetching papers", error: err.message });
  }
});

// Debug endpoint to list all unique values for department, semester, and year in the papers collection
// Filter departments to only show Computer Science and Engineering for timetable
router.get("/debug/list-unique-paper-fields", async (req, res) => {
  try {
    const Paper = require("../models/Paper");
    const allDepartments = await Paper.distinct("department");
    
    // Filter to only show Computer Science and Engineering related departments for timetable
    const timetableDepartments = allDepartments.filter(dept => 
      dept === 'Computer Science and Engineering' || 
      dept === 'Computer Science and Engineering (CSE)' ||
      dept === 'CSE' ||
      dept === 'Computer Science'
    );
    
    // If no CSE departments found, default to Computer Science and Engineering
    const departments = timetableDepartments.length > 0 ? timetableDepartments : ['Computer Science and Engineering'];
    
    const semesters = await Paper.distinct("semester");
    const years = await Paper.distinct("year");
    res.json({ departments, semesters, years });
  } catch (err) {
    res.status(500).json({ message: "Error fetching unique fields", error: err.message });
  }
});

// Debug endpoint to log the type and value of department, semester, and year for every paper
router.get("/debug/log-paper-fields", async (req, res) => {
  try {
    const Paper = require("../models/Paper");
    const papers = await Paper.find({});
    const fields = papers.map(p => ({
      id: p._id,
      department: { value: p.department, type: typeof p.department },
      semester: { value: p.semester, type: typeof p.semester },
      year: { value: p.year, type: typeof p.year }
    }));
    res.json({ count: papers.length, fields });
  } catch (err) {
    res.status(500).json({ message: "Error logging paper fields", error: err.message });
  }
});

module.exports = router;
