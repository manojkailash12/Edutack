const Staff = require("./../models/Staff");
const Student = require("./../models/Student");
const asyncHandler = require("express-async-handler");
const bcrypt = require("bcrypt");
const Login = require("../models/Login");
const transporter = require('../config/emailConfig');
const crypto = require('crypto');

// In-memory store for OTPs (for demo; use DB in production)
const otpStore = {};
const registrationOtpStore = {};

// @desc Auth Login
// @route POST /auth/login/staff
// @access Public
const staffLogin = asyncHandler(async (req, res) => {
  const { username, employeeId, email, password } = req.body;

  if ((!username && !employeeId && !email) || !password) {
    return res.status(400).json({ message: "Username, Employee ID, or Email and password are required" });
  }
  
  // Find staff by username, employeeId, or email
  let query = {};
  if (email) {
    query = { email };
  } else if (username) {
    query = { username };
  } else {
    query = { employeeId };
  }
  
  const staff = await Staff.findOne(query).exec();

  if (!staff) {
    return res.status(404).json({ message: "User not found" });
  }
  if (staff.role === 'teacher' && !staff.approved) {
    return res.status(403).json({ message: "User not approved by HOD" });
  }
  if (!staff.role) {
    return res.status(418).json({ message: "User not Approved" });
  }

  const match = await bcrypt.compare(password, staff.password);
  if (!match) return res.status(401).json({ message: "Incorrect Password" });
  else {
    // Track login
    await Login.create({ userId: staff._id, role: 'staff' });
    res.status(200).json({
      _id: staff.id,
      name: staff.name,
      role: staff.role,
      userType: 'staff', // Add userType for frontend compatibility
      department: staff.department,
      employeeId: staff.employeeId,
    });
  }
});

// @desc Auth Login
// @route POST /auth/login/student
// @access Public
const studentLogin = asyncHandler(async (req, res) => {
  const { rollNo, email, password } = req.body;

  if ((!rollNo && !email) || !password) {
    return res.status(400).json({ message: "Roll No or Email and password are required" });
  }
  
  // Find student by rollNo or email
  const query = email ? { email } : { rollNo };
  const student = await Student.findOne(query).exec();

  if (!student) {
    return res.status(404).json({ message: "User not found" });
  }

  const match = await bcrypt.compare(password, student.password);
  if (!match) return res.status(401).json({ message: "Incorrect Password" });
  else {
    // Track login
    await Login.create({ userId: student._id, role: 'student' });
    res.status(200).json({
      _id: student.id,
      name: student.name,
      department: student.department,
      year: student.year,
      section: student.section,
      rollNo: student.rollNo,
      role: "student",
      userType: "student" // Add userType for frontend compatibility
    });
  }
});

// // @desc Auth Logout
// // @route POST /auth/logout
// // @access Public
// const logout = asyncHandler(async (req, res) => {});

const changePassword = async (req, res) => {
  const { userId, role, oldPassword, newPassword } = req.body;
  if (!userId || !role || !oldPassword || !newPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }
  let user;
  if (role === "student") {
    user = await Student.findById(userId);
  } else {
    user = await Staff.findById(userId);
  }
  if (!user) return res.status(404).json({ message: "User not found" });

  const match = await bcrypt.compare(oldPassword, user.password);
  if (!match) return res.status(401).json({ message: "Old password is incorrect" });

  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  res.json({ message: "Password changed successfully" });
};

// @desc Request password reset (send OTP)
// @route POST /auth/forgot-password
// @access Public
const forgotPassword = asyncHandler(async (req, res) => {
  const { email, role, username, rollNo } = req.body;
  if (!email || !role) {
    return res.status(400).json({ message: 'Email and role are required' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  
  // Validate additional credentials based on role
  if (role === 'student' && !rollNo) {
    return res.status(400).json({ message: 'Roll number is required for student accounts' });
  }
  if (role === 'staff' && !username) {
    return res.status(400).json({ message: 'Username is required for staff accounts' });
  }
  
  let user;
  if (role === 'student') {
    // Find student by both email and rollNo for verification
    user = await Student.findOne({ email, rollNo });
    if (!user) {
      return res.status(404).json({ message: 'Email and roll number combination not found. Please verify your details.' });
    }
  } else {
    // Find staff by both email and username for verification
    user = await Staff.findOne({ email, username });
    if (!user) {
      return res.status(404).json({ message: 'Email and username combination not found. Please verify your details.' });
    }
  }
  
  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  otpStore[email] = { 
    otp, 
    expires: Date.now() + 10 * 60 * 1000, // 10 min expiry
    role,
    userId: user._id,
    verified: true // Mark as verified since we matched email + username/rollNo
  };
  
  try {
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'libroflow8@gmail.com',
      to: email,
      subject: 'Password Reset OTP - Edutack',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Edutack - Password Reset</h2>
          <p>Hello <strong>${user.name}</strong>,</p>
          <p>You have requested to reset your password for your ${role} account.</p>
          <p><strong>Account Details:</strong></p>
          <ul style="background-color: #f9fafb; padding: 15px; border-radius: 5px;">
            <li>Email: ${email}</li>
            <li>${role === 'student' ? 'Roll Number' : 'Username'}: ${role === 'student' ? rollNo : username}</li>
            <li>Role: ${role.charAt(0).toUpperCase() + role.slice(1)}</li>
          </ul>
          <p>Please use the following OTP to reset your password:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #7c3aed; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
          </div>
          <p><strong>This OTP is valid for 10 minutes only.</strong></p>
          <p>If you didn't request this password reset, please ignore this email and your password will remain unchanged.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from Edutack. Please do not reply to this email.</p>
        </div>
      `
    });
    res.json({ 
      message: `OTP sent successfully to ${email}`,
      userDetails: {
        name: user.name,
        email: email,
        role: role,
        identifier: role === 'student' ? rollNo : username
      }
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: 'Failed to send OTP email. Please try again later.' });
  }
});

// @desc Reset password using OTP
// @route POST /auth/reset-password
// @access Public
const resetPassword = asyncHandler(async (req, res) => {
  const { email, role, otp, newPassword } = req.body;
  if (!email || !role || !otp || !newPassword) {
    return res.status(400).json({ message: 'All fields are required' });
  }
  
  const record = otpStore[email];
  if (!record || record.otp !== otp || record.expires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }
  
  // Verify the role matches what was used during OTP generation
  if (record.role !== role) {
    return res.status(400).json({ message: 'Invalid role for this reset request' });
  }
  
  // Verify the user was properly verified during OTP generation
  if (!record.verified || !record.userId) {
    return res.status(400).json({ message: 'Invalid reset request. Please start the process again.' });
  }
  
  let user;
  if (role === 'student') {
    user = await Student.findById(record.userId);
  } else {
    user = await Staff.findById(record.userId);
  }
  
  if (!user) {
    return res.status(404).json({ message: 'User not found' });
  }
  
  // Update password
  user.password = await bcrypt.hash(newPassword, 10);
  await user.save();
  
  // Clean up OTP store
  delete otpStore[email];
  
  res.json({ 
    message: 'Password reset successful! You can now login with your new password.',
    userDetails: {
      name: user.name,
      role: role
    }
  });
});

// @desc Send OTP for registration
// @route POST /auth/register/send-otp
// @access Public
const sendRegistrationOTP = asyncHandler(async (req, res) => {
  const { email, role } = req.body;
  
  if (!email || !role) {
    return res.status(400).json({ message: 'Email and role are required' });
  }
  
  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: 'Please enter a valid email address' });
  }
  
  // Check if user already exists
  let existingUser;
  if (role === 'student') {
    existingUser = await Student.findOne({ email });
  } else if (role === 'staff') {
    existingUser = await Staff.findOne({ email });
  } else {
    return res.status(400).json({ message: 'Invalid role. Must be student or staff' });
  }
  
  if (existingUser) {
    return res.status(409).json({ message: 'User with this email already exists' });
  }
  
  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  registrationOtpStore[email] = { 
    otp, 
    expires: Date.now() + 10 * 60 * 1000, // 10 min expiry
    role,
    verified: false
  };
  
  try {
    // Send email
    await transporter.sendMail({
      from: process.env.EMAIL_USER || 'libroflow8@gmail.com',
      to: email,
      subject: 'Registration OTP - Edutack',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #7c3aed;">Welcome to Edutack!</h2>
          <p>Thank you for registering as a <strong>${role}</strong> on Edutack.</p>
          <p>Please use the following OTP to verify your email and complete your registration:</p>
          <div style="background-color: #f3f4f6; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px;">
            <h1 style="color: #7c3aed; font-size: 32px; margin: 0; letter-spacing: 4px;">${otp}</h1>
          </div>
          <p><strong>This OTP is valid for 10 minutes only.</strong></p>
          <p>If you didn't request this registration, please ignore this email.</p>
          <hr style="margin: 20px 0;">
          <p style="color: #6b7280; font-size: 12px;">This is an automated email from Edutack. Please do not reply to this email.</p>
        </div>
      `
    });
    
    res.json({ 
      message: `OTP sent successfully to ${email}`,
      email: email,
      role: role
    });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ message: 'Failed to send OTP email. Please try again later.' });
  }
});

// @desc Verify OTP and register user
// @route POST /auth/register/verify-otp
// @access Public
const verifyOTPAndRegister = asyncHandler(async (req, res) => {
  const { email, otp, role, userData } = req.body;
  
  if (!email || !otp || !role || !userData) {
    return res.status(400).json({ message: 'Email, OTP, role, and user data are required' });
  }
  
  // Check OTP
  const record = registrationOtpStore[email];
  if (!record || record.otp !== otp || record.expires < Date.now()) {
    return res.status(400).json({ message: 'Invalid or expired OTP' });
  }
  
  if (record.role !== role) {
    return res.status(400).json({ message: 'Role mismatch' });
  }
  
  try {
    let newUser;
    
    if (role === 'student') {
      // Validate required student fields
      const { name, rollNo, password, department, section, year } = userData;
      if (!name || !rollNo || !password || !department || !section || !year) {
        return res.status(400).json({ 
          message: 'Name, roll number, password, department, section, and year are required for student registration' 
        });
      }
      
      // Check if rollNo already exists
      const existingStudent = await Student.findOne({ rollNo });
      if (existingStudent) {
        return res.status(409).json({ message: 'Student with this roll number already exists' });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create student
      newUser = await Student.create({
        name,
        rollNo,
        email,
        password: hashedPassword,
        department,
        section,
        year
      });
      
    } else if (role === 'staff') {
      // Validate required staff fields
      const { name, username, password, department, employeeId, role: staffRole } = userData;
      if (!name || !username || !password || !department || !employeeId) {
        return res.status(400).json({ 
          message: 'Name, username, password, department, and employee ID are required for staff registration' 
        });
      }
      
      // Check if username or employeeId already exists
      const existingStaff = await Staff.findOne({ 
        $or: [{ username }, { employeeId }] 
      });
      if (existingStaff) {
        return res.status(409).json({ 
          message: 'Staff with this username or employee ID already exists' 
        });
      }
      
      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);
      
      // Create staff (teachers need HOD approval)
      newUser = await Staff.create({
        name,
        username,
        email,
        password: hashedPassword,
        department,
        employeeId,
        role: staffRole || 'teacher',
        approved: staffRole === 'HOD' ? true : false // HOD auto-approved, teachers need approval
      });
    }
    
    // Clean up OTP store
    delete registrationOtpStore[email];
    
    res.status(201).json({ 
      message: `${role === 'student' ? 'Student' : 'Staff member'} registered successfully!`,
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: role,
        ...(role === 'student' ? { rollNo: newUser.rollNo } : { username: newUser.username, employeeId: newUser.employeeId }),
        ...(role === 'staff' && newUser.role === 'teacher' ? { approved: newUser.approved, message: 'Account created but requires HOD approval' } : {})
      }
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0];
      return res.status(409).json({ message: `${field} already exists` });
    }
    res.status(500).json({ message: 'Registration failed. Please try again.' });
  }
});

module.exports = {
  staffLogin,
  studentLogin,
  changePassword,
  forgotPassword,
  resetPassword,
  sendRegistrationOTP,
  verifyOTPAndRegister
};
