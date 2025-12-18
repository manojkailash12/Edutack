// Environment variables checker for production deployment
console.log('=== ENVIRONMENT VARIABLES CHECK ===');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'MISSING');
console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'MISSING');
console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'MISSING');

// Test email configuration
const nodemailer = require('nodemailer');

async function testEmailConfig() {
  try {
    const transporter = nodemailer.createTransporter({
      service: 'gmail',
      auth: {
        user: process.env.EMAIL_USER || 'libroflow8@gmail.com',
        pass: process.env.EMAIL_PASS || 'rkwvnraapvhezena'
      }
    });

    console.log('Testing email connection...');
    await transporter.verify();
    console.log('✅ Email configuration is working');
    
    return true;
  } catch (error) {
    console.error('❌ Email configuration failed:', error.message);
    return false;
  }
}

testEmailConfig();