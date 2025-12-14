const express = require("express");
const router = express.Router();
const subjectController = require("./../controllers/paperController");

router.route("/").post(subjectController.addSubject);
router.route("/staff/:staffId").get(subjectController.getSubjectsStaff);
router.route("/manage/:studentId").get(subjectController.getAllSubjects);
router.route("/students/:subjectId").get(subjectController.getStudentsList);
router.route("/student/:studentId").get(subjectController.getSubjectsStudent);

router
  .route("/:subjectId")
  .get(subjectController.getSubject)
  .patch(subjectController.updateStudents)
  .delete(subjectController.deleteSubject);

module.exports = router;
