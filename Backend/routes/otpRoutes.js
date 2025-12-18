const express = require('express');
const router = express.Router();
const otpService = require('../services/otpService');
const asyncHandler = require('express-async-handler');

// Send OTP
router.post('/send', asyncHandler(async (req, res) => {
  const { email, purpose, customMessage } = req.body;

  if (!email) {
    return res.status(400).json({ 
      success: false, 
      message: 'Email is required' 
    });
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({ 
      success: false, 
      message: 'Invalid email format' 
    });
  }

  try {
    const result = await otpService.sendOTP(email, purpose, customMessage);
    
    res.json({
      success: true,
      message: result.message,
      token: result.token,
      expiresIn: result.expiresIn
    });

  } catch (error) {
    console.error('OTP send error:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Verify OTP
router.post('/verify', asyncHandler(async (req, res) => {
  const { token, otp } = req.body;

  if (!token || !otp) {
    return res.status(400).json({ 
      success: false, 
      message: 'Token and OTP are required' 
    });
  }

  try {
    const result = otpService.verifyOTP(token, otp);
    
    res.json({
      success: true,
      message: result.message,
      email: result.email,
      purpose: result.purpose
    });

  } catch (error) {
    console.error('OTP verify error:', error);
    res.status(400).json({
      success: false,
      message: error.message
    });
  }
}));

// Get OTP statistics (for debugging - admin only)
router.get('/stats', asyncHandler(async (req, res) => {
  try {
    const stats = otpService.getStats();
    res.json({
      success: true,
      stats
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

// Clear expired OTPs (admin only)
router.post('/clear-expired', asyncHandler(async (req, res) => {
  try {
    const result = otpService.clearExpired();
    res.json({
      success: true,
      message: `Cleared ${result.cleared} expired OTPs`,
      remaining: result.remaining
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
}));

module.exports = router;