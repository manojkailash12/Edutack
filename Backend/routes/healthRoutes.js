const express = require('express');
const router = express.Router();
const transporter = require('../config/emailConfig');
const mongoose = require('mongoose');

// Basic health check
router.get('/', (req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime()
  });
});

// Detailed health check
router.get('/detailed', async (req, res) => {
  const health = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    uptime: process.uptime(),
    checks: {}
  };

  // Database check
  try {
    if (mongoose.connection.readyState === 1) {
      health.checks.database = { status: 'OK', message: 'Connected' };
    } else {
      health.checks.database = { status: 'ERROR', message: 'Not connected' };
      health.status = 'ERROR';
    }
  } catch (error) {
    health.checks.database = { status: 'ERROR', message: error.message };
    health.status = 'ERROR';
  }

  // Email check
  try {
    await transporter.verify();
    health.checks.email = { status: 'OK', message: 'Email service available' };
  } catch (error) {
    health.checks.email = { status: 'ERROR', message: error.message };
    health.status = 'ERROR';
  }

  // Environment variables check
  const requiredEnvVars = ['MONGODB_URI', 'EMAIL_USER', 'EMAIL_PASS'];
  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length === 0) {
    health.checks.environment = { status: 'OK', message: 'All required variables set' };
  } else {
    health.checks.environment = { 
      status: 'ERROR', 
      message: `Missing variables: ${missingVars.join(', ')}` 
    };
    health.status = 'ERROR';
  }

  // Memory check
  const memUsage = process.memoryUsage();
  health.checks.memory = {
    status: 'OK',
    usage: {
      rss: `${Math.round(memUsage.rss / 1024 / 1024)}MB`,
      heapTotal: `${Math.round(memUsage.heapTotal / 1024 / 1024)}MB`,
      heapUsed: `${Math.round(memUsage.heapUsed / 1024 / 1024)}MB`
    }
  };

  res.json(health);
});

// Test email endpoint
router.post('/test-email', async (req, res) => {
  try {
    const { to } = req.body;
    
    if (!to) {
      return res.status(400).json({ error: 'Email address required' });
    }

    const testMailOptions = {
      from: process.env.EMAIL_USER || 'libroflow8@gmail.com',
      to: to,
      subject: 'EDUTRACK Production Test Email',
      html: `
        <h2>Production Email Test</h2>
        <p>This is a test email from EDUTRACK production server.</p>
        <p>Timestamp: ${new Date().toISOString()}</p>
        <p>Environment: ${process.env.NODE_ENV}</p>
      `
    };

    const info = await transporter.sendMail(testMailOptions);
    
    res.json({
      success: true,
      messageId: info.messageId,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;