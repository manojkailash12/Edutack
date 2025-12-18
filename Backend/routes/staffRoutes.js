const express = require("express");
const staffController = require("../controllers/staffController");
const multer = require("multer");
const path = require("path");

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, '/tmp/uploads/profile-photos/');
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

router.route("/").get(staffController.getAllStaff).post(staffController.createNewStaff);

router.route("/departments").get(staffController.getDepartments);

router.route("/admin-registration-otp").post(staffController.sendAdminRegistrationOTP);

router.route("/approve/:department").get(staffController.getNewStaffs);

router.route("/hod-dashboard/:department").get(staffController.getHODDashboard);

router.route("/hod-summary/:department").get(staffController.getHODSummary);

router.route("/list/:department").get(staffController.getStaffByDepartment);

router.route("/:id")
  .get(staffController.getStaff)
  .patch(staffController.updateStaff)
  .delete(staffController.deleteStaff);

router.route("/:id/change-password").patch(staffController.changeStaffPassword);

router.route("/:id/profile-photo")
  .patch(upload.single('profilePhoto'), staffController.updateProfilePhoto)
  .delete(staffController.deleteProfilePhoto);

router.route("/generate-salary-report-pdf").post(staffController.generateSalaryReportPDF);

module.exports = router;
