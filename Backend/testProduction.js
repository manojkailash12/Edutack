// Comprehensive production testing suite
const mongoose = require('mongoose');
const transporter = require('./config/emailConfig');
const otpService = require('./services/otpService');
const { generatePayslipPDF } = require('./services/payslipService');
const certificateService = require('./services/certificateService');

async function runProductionTests() {
  console.log('🚀 STARTING COMPREHENSIVE PRODUCTION TESTS');
  console.log('==========================================');
  
  const results = {
    database: false,
    email: false,
    otp: false,
    payslip: false,
    certificate: false,
    fileSystem: false
  };

  // Test 1: Database Connection
  console.log('\n📊 Testing Database Connection...');
  try {
    if (!process.env.MONGODB_URI) {
      throw new Error('MONGODB_URI not set');
    }
    
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Database connected successfully');
    
    // Test query
    const collections = await mongoose.connection.db.listCollections().toArray();
    console.log(`✅ Found ${collections.length} collections`);
    results.database = true;
    
  } catch (error) {
    console.error('❌ Database test failed:', error.message);
  }

  // Test 2: Email Configuration
  console.log('\n📧 Testing Email Configuration...');
  try {
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      throw new Error('Email credentials not set');
    }
    
    await transporter.verify();
    console.log('✅ Email transporter verified');
    
    // Send test email
    const testEmail = {
      from: process.env.EMAIL_USER,
      to: 'manojkailash1@gmail.com', // Replace with your email
      subject: 'EDUTRACK Production Test - Email Service',
      html: `
        <h2>✅ Email Service Working!</h2>
        <p>This email confirms that the EDUTRACK email service is working in production.</p>
        <p><strong>Test Details:</strong></p>
        <ul>
          <li>Environment: ${process.env.NODE_ENV}</li>
          <li>Timestamp: ${new Date().toISOString()}</li>
          <li>Server: Render</li>
        </ul>
      `
    };
    
    const info = await transporter.sendMail(testEmail);
    console.log('✅ Test email sent:', info.messageId);
    results.email = true;
    
  } catch (error) {
    console.error('❌ Email test failed:', error.message);
  }

  // Test 3: OTP Service
  console.log('\n🔐 Testing OTP Service...');
  try {
    const otpResult = await otpService.sendOTP('manojkailash1@gmail.com', 'test', 
      '<h3>🧪 OTP Service Test</h3><p>This OTP confirms the OTP service is working in production.</p>');
    
    console.log('✅ OTP sent successfully');
    console.log('Token:', otpResult.token.substring(0, 8) + '...');
    console.log('Expires in:', otpResult.expiresIn, 'seconds');
    results.otp = true;
    
  } catch (error) {
    console.error('❌ OTP test failed:', error.message);
  }

  // Test 4: File System Access
  console.log('\n📁 Testing File System Access...');
  try {
    const fs = require('fs');
    const path = require('path');
    
    // Test temp directory
    const testDir = process.env.NODE_ENV === 'production' ? '/tmp/test' : './test';
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Test file write
    const testFile = path.join(testDir, 'test.txt');
    fs.writeFileSync(testFile, 'Production test file');
    
    // Test file read
    const content = fs.readFileSync(testFile, 'utf8');
    if (content === 'Production test file') {
      console.log('✅ File system read/write working');
      results.fileSystem = true;
    }
    
    // Cleanup
    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
    
  } catch (error) {
    console.error('❌ File system test failed:', error.message);
  }

  // Test 5: Payslip PDF Generation
  console.log('\n💰 Testing Payslip PDF Generation...');
  try {
    const testPayslipData = {
      staffName: 'Test User',
      employeeId: 'TEST001',
      department: 'Computer Science',
      month: 12,
      year: 2025,
      salaryDetails: {
        salaryType: 'fixed',
        workingDays: 22,
        presentDays: 20,
        dailyRate: 1000
      },
      earnings: {
        basicSalary: 20000,
        allowances: 2000,
        overtime: 0,
        bonus: 1000,
        totalEarnings: 23000
      },
      deductions: {
        tax: 2000,
        providentFund: 1000,
        insurance: 0,
        other: 0,
        totalDeductions: 3000
      },
      netSalary: 20000
    };
    
    const pdfResult = await generatePayslipPDF(testPayslipData);
    console.log('✅ Payslip PDF generated:', pdfResult.filename);
    
    // Verify file exists
    const fs = require('fs');
    if (fs.existsSync(pdfResult.filepath)) {
      console.log('✅ PDF file verified on disk');
      results.payslip = true;
      
      // Cleanup test file
      fs.unlinkSync(pdfResult.filepath);
    }
    
  } catch (error) {
    console.error('❌ Payslip PDF test failed:', error.message);
  }

  // Test 6: Certificate Service
  console.log('\n🎓 Testing Certificate Service...');
  try {
    // Test grade calculation
    const grade = certificateService.calculateGrade(85);
    if (grade === 'A') {
      console.log('✅ Grade calculation working');
    }
    
    // Test marks validation
    const validation = certificateService.validateMarks(45, 35);
    if (validation.isValid) {
      console.log('✅ Marks validation working');
      results.certificate = true;
    }
    
  } catch (error) {
    console.error('❌ Certificate service test failed:', error.message);
  }

  // Test Results Summary
  console.log('\n🎯 PRODUCTION TEST RESULTS');
  console.log('==========================');
  
  const testNames = {
    database: 'Database Connection',
    email: 'Email Service',
    otp: 'OTP Service',
    payslip: 'Payslip Generation',
    certificate: 'Certificate Service',
    fileSystem: 'File System Access'
  };
  
  let passedTests = 0;
  const totalTests = Object.keys(results).length;
  
  for (const [test, passed] of Object.entries(results)) {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`${status} ${testNames[test]}`);
    if (passed) passedTests++;
  }
  
  console.log(`\n📊 Overall Score: ${passedTests}/${totalTests} tests passed`);
  
  if (passedTests === totalTests) {
    console.log('🎉 ALL TESTS PASSED! Production is ready!');
  } else {
    console.log('⚠️  Some tests failed. Check the logs above.');
  }
  
  // Environment Summary
  console.log('\n🔧 ENVIRONMENT SUMMARY');
  console.log('======================');
  console.log('NODE_ENV:', process.env.NODE_ENV);
  console.log('EMAIL_USER:', process.env.EMAIL_USER ? 'SET' : 'MISSING');
  console.log('EMAIL_PASS:', process.env.EMAIL_PASS ? 'SET' : 'MISSING');
  console.log('MONGODB_URI:', process.env.MONGODB_URI ? 'SET' : 'MISSING');
  console.log('Memory Usage:', Math.round(process.memoryUsage().heapUsed / 1024 / 1024), 'MB');
  console.log('Uptime:', Math.round(process.uptime()), 'seconds');
  
  process.exit(passedTests === totalTests ? 0 : 1);
}

// Run tests
runProductionTests().catch(error => {
  console.error('💥 Test suite crashed:', error);
  process.exit(1);
});