// Production debugging script
const mongoose = require('mongoose');
const transporter = require('./config/emailConfig');

async function debugProduction() {
  console.log('=== PRODUCTION DEBUGGING ===');
  console.log('Environment:', process.env.NODE_ENV);
  console.log('Port:', process.env.PORT);
  
  // Check environment variables
  console.log('\n=== ENVIRONMENT VARIABLES ===');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'MISSING');
  console.log('EMAIL_USER:', process.env.EMAIL_USER || 'NOT SET');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'MISSING');
  
  // Test database connection
  console.log('\n=== DATABASE CONNECTION ===');
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
    
    // Test a simple query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
  }
  
  // Test email configuration
  console.log('\n=== EMAIL CONFIGURATION ===');
  try {
    await transporter.verify();
    console.log('✅ Email configuration verified');
    
    // Send test email
    const testEmail = {
      from: process.env.EMAIL_USER,
      to: 'manojkailash12@gmail.com', // Replace with your email
      subject: 'Production Debug Test',
      text: `Production debug test at ${new Date().toISOString()}`
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent:', info.messageId);
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }
  
  // Memory usage
  console.log('\n=== MEMORY USAGE ===');
  const memUsage = process.memoryUsage();
  console.log('RSS:', Math.round(memUsage.rss / 1024 / 1024), 'MB');
  console.log('Heap Total:', Math.round(memUsage.heapTotal / 1024 / 1024), 'MB');
  console.log('Heap Used:', Math.round(memUsage.heapUsed / 1024 / 1024), 'MB');
  
  console.log('\n=== DEBUG COMPLETE ===');
  process.exit(0);
}

debugProduction().catch(console.error);