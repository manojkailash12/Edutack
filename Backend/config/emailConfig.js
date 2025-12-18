const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'libroflow8@gmail.com',
    pass: process.env.EMAIL_PASS || 'rkwvnraapvhezena'
  },
  // Production-specific settings for 100% reliability
  pool: true,
  maxConnections: 5,
  maxMessages: 100,
  rateDelta: 20000,
  rateLimit: 5,
  // Timeout settings
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000,     // 60 seconds
  // Security settings
  secure: true,
  requireTLS: true
});

module.exports = transporter;