const express = require("express");
const studentController = require("../controllers/studentController");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/profile-photos/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'profile-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024 // 5MB limit
  },
  fileFilter: function (req, file, cb) {
    // Accept only image files
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

const router = express.Router();

router.route("/").get(studentController.getAllStudents).post(studentController.createNewStudent);

router.route("/list/:department").get(studentController.getStudentsByDepartment);

router.route("/section/:section").get(studentController.getStudentsBySection);

router.route("/papers/:studentId").get(studentController.getTeacherPapersForStudents);

router.route("/paper/:paperId/:section").get(studentController.getStudentsByPaperAndSection);

router.route("/:id")
  .get(studentController.getStudent)
  .patch(studentController.updateStudent)
  .delete(studentController.deleteStudent);

router.route("/:id/change-password").patch(studentController.changeStudentPassword);

router.route("/:id/profile-photo")
  .patch(upload.single('profilePhoto'), studentController.updateProfilePhoto)
  .delete(studentController.deleteProfilePhoto);

module.exports = router;
