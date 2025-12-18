const express = require("express");
const router = express.Router();
const internalController = require("./../controllers/internalController");

//? Student Side
// get result of every course
router.route("/student/:studentId").get(internalController.getInternalStudent);

// Get internal marks for specific student and paper
router.route("/student/:studentId/paper/:paperId")
  .get(internalController.getStudentInternalMarks)
  .post(internalController.saveStudentInternalMarks);

// Download internal marks Excel report
router.route("/paper/:paperId/download/:section?").get(internalController.downloadInternalMarksReport);

// PDF Reports
router.get("/student/:studentId/pdf", internalController.downloadStudentReportPDF);
router.get("/student/:studentId/pdf/all", internalController.downloadStudentAllPapersReportPDF);
router.get("/paper/:paperId/pdf", internalController.downloadClassReportPDF);
router.get("/paper/sample/pdf", internalController.downloadSamplePDF);
router.get("/student/sample/pdf", internalController.downloadSampleStudentPDF);
router.get("/test/pdf", internalController.testPDFGeneration);

// Manual marks entry routes
router.post("/paper/:paperId/manual", internalController.saveManualMarks);
router.get("/paper/:paperId/manual", internalController.getManualMarks);
router.get("/paper/:paperId/manual/download", internalController.downloadManualMarksExcel);

// Admin route - Get all internal marks
router.get("/all", internalController.getAllInternalMarks);

router
  .route("/:paper")
  .get(internalController.getInternal)
  .post(internalController.addInternal)
  .patch(internalController.updateInternal)
  .delete(internalController.deleteInternal);

module.exports = router;
