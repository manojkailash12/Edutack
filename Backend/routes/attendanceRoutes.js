const express = require("express");
const router = express.Router();
const attendanceController = require("./../controllers/attendanceController");

// TODO Student Side
router.get("/", attendanceController.checkAttendanceExists);
router.get("/teacher-papers/:teacherId", attendanceController.getTeacherPapers);
router.get("/timetable-papers/:teacherId", attendanceController.getTimetableBasedPapers);
router.get("/available-dates/:teacherId/:paperId/:section", attendanceController.getAvailableDatesForAttendance);
router.get("/teacher-section/:teacherId/:section", attendanceController.getTeacherSectionStudents);
router.get("/hod-section/:section", attendanceController.getHODSectionStudents);
router.get("/student-content/:section", attendanceController.getStudentSectionContent);
router.get("/students/:paperId/:section", attendanceController.getStudentsByPaperAndSection);
router.route("/percentage/:studentId").get(attendanceController.getAttendancePercentage);
router.route("/department-report/:department").get(attendanceController.getDepartmentAttendanceReport);
router.route("/paper-report/:paperId").get(attendanceController.getPaperAttendanceReport);
router.get("/paper-report", attendanceController.getMultiPaperAttendanceReport);
router.get("/student-summary/:studentId", attendanceController.getStudentAttendanceSummary);
router.get("/student-detail", attendanceController.getStudentAttendanceDetail);
router.post("/", attendanceController.createNewAttendance);

// Colorful PDF Reports
router.get("/paper/:paperId/section/:section/pdf", attendanceController.downloadAttendanceReportPDF);

module.exports = router;
