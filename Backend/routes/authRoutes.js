const express = require("express");
const router = express.Router();
const authController = require("./../controllers/authController");
const transporter = require('../config/emailConfig');

router.route("/login/staff").post(authController.staffLogin);
router.route("/login/student").post(authController.studentLogin);
router.route("/change-password").post(authController.changePassword);
router.route("/forgot-password").post(authController.forgotPassword);
router.route("/reset-password").post(authController.resetPassword);
router.route("/register/send-otp").post(authController.sendRegistrationOTP);
router.route("/register/verify-otp").post(authController.verifyOTPAndRegister);
router.post('/test-email', async (req, res) => {
  try {
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'libroflow8@gmail.com',
      to: process.env.EMAIL_USER || 'libroflow8@gmail.com',
      subject: 'Test Email from Edutack',
      html: `
        <div style="font-family: Arial, sans-serif;">
          <h2 style="color: #7c3aed;">Edutack Email Test</h2>
          <p>This is a test email to verify your email configuration is working correctly.</p>
          <p>If you receive this email, your Gmail configuration is set up properly!</p>
        </div>
      `
    });
    res.json({ message: 'Test email sent successfully!' });
  } catch (err) {
    console.error('Email send error:', err);
    res.status(500).json({ message: 'Failed to send test email', error: err.message, full: err });
  }
});

// Debug endpoint to check existing users
router.get('/debug-users', async (req, res) => {
  try {
    const Staff = require('../models/Staff');
    const Student = require('../models/Student');
    
    const staffCount = await Staff.countDocuments();
    const studentCount = await Student.countDocuments();
    
    const sampleStaff = await Staff.findOne().select('name email username').lean();
    const sampleStudent = await Student.findOne().select('name email rollNo').lean();
    
    res.json({
      staffCount,
      studentCount,
      sampleStaff,
      sampleStudent
    });
  } catch (err) {
    res.status(500).json({ message: 'Error fetching debug info', error: err.message });
  }
});

//? Incase of JWT
//   .route("/logout")
//   .post(authController.logout);

module.exports = router;
