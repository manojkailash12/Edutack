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
  // Timeout settings - Extended for production reliability
  connectionTimeout: 120000, // 2 minutes
  greetingTimeout: 60000,    // 1 minute
  socketTimeout: 120000,     // 2 minutes
  // Security settings
  secure: true,
  requireTLS: true
});

module.exports = transporter;