const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

// Create payslips directory if it doesn't exist
const payslipsDir = path.join('/tmp/uploads/payslips');
if (!fs.existsSync(payslipsDir)) {
  fs.mkdirSync(payslipsDir, { recursive: true });
}

// Email transporter configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// Helper function to format currency with Rs.
const formatCurrency = (amount) => {
  return `Rs. ${amount.toLocaleString('en-IN', { 
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
    useGrouping: true
  })}`;
};

const generatePayslipPDF = async (payslipData) => {
  return new Promise((resolve, reject) => {
    try {
      const doc = new PDFDocument({ margin: 50 });
      
      // Generate filename
      const filename = `payslip_${payslipData.employeeId}_${payslipData.month}_${payslipData.year}.pdf`;
      const filepath = path.join(payslipsDir, filename);
      
      // Pipe PDF to file
      doc.pipe(fs.createWriteStream(filepath));

      // Header
      doc.fontSize(20)
         .fillColor('#FF6B35')
         .text('EDUTRACK', 50, 50)
         .fontSize(12)
         .fillColor('#000000')
         .text('Educational Management System', 50, 75)
         .text('Digital Learning & Assessment Platform', 50, 90);

      // Title
      doc.fontSize(18)
         .fillColor('#000000')
         .text('SALARY SLIP', 250, 50, { align: 'center' });

      // Month and Year
      const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                         'July', 'August', 'September', 'October', 'November', 'December'];
      doc.fontSize(14)
         .text(`For the month of ${monthNames[payslipData.month - 1]} ${payslipData.year}`, 250, 75, { align: 'center' });

      // Employee Details Box
      doc.rect(50, 120, 500, 100)
         .stroke('#FF6B35');

      doc.fontSize(12)
         .fillColor('#000000')
         .text('Employee Details', 60, 130, { underline: true });

      // Employee info in two columns
      doc.text(`Name: ${payslipData.staffName}`, 60, 150)
         .text(`Employee ID: ${payslipData.employeeId}`, 60, 170)
         .text(`Department: ${payslipData.department}`, 60, 190);

      doc.text(`Salary Type: ${payslipData.salaryDetails.salaryType === 'fixed' ? 'Fixed' : 'Attendance-Based'}`, 380, 150)
         .text(`Working Days: ${payslipData.salaryDetails.workingDays}`, 380, 170)
         .text(`Present Days: ${payslipData.salaryDetails.presentDays}`, 380, 190);

      // Salary Details Table
      let yPosition = 250;
      
      // Table Header
      doc.rect(50, yPosition, 500, 25)
         .fillAndStroke('#FF6B35', '#FF6B35');
      
      doc.fillColor('#FFFFFF')
         .fontSize(12)
         .text('EARNINGS', 60, yPosition + 8)
         .text('AMOUNT (Rs.)', 200, yPosition + 8)
         .text('DEDUCTIONS', 300, yPosition + 8)
         .text('AMOUNT (Rs.)', 450, yPosition + 8);

      yPosition += 25;

      // Earnings and Deductions
      console.log('PDF Generation - Payslip Data:', {
        staffName: payslipData.staffName,
        basicSalary: payslipData.earnings.basicSalary,
        totalEarnings: payslipData.earnings.totalEarnings,
        netSalary: payslipData.netSalary,
        presentDays: payslipData.salaryDetails.presentDays,
        dailyRate: payslipData.salaryDetails.dailyRate
      });
      
      const bonusLabel = payslipData.earnings.bonus > 0 ? 'Perfect Attendance Bonus' : 'Bonus';
      const earnings = [
        ['Basic Salary', payslipData.earnings.basicSalary],
        ['Allowances', payslipData.earnings.allowances],
        ['Overtime', payslipData.earnings.overtime],
        [bonusLabel, payslipData.earnings.bonus]
      ];

      const deductions = [
        ['Tax', payslipData.deductions.tax],
        ['Provident Fund', payslipData.deductions.providentFund],
        ['Insurance (Free)', 0], // Insurance is free, always show as 0
        ['Other', payslipData.deductions.other]
      ];

      doc.fillColor('#000000');
      
      for (let i = 0; i < Math.max(earnings.length, deductions.length); i++) {
        // Alternate row colors
        if (i % 2 === 0) {
          doc.rect(50, yPosition, 500, 20)
             .fillAndStroke('#F8F9FA', '#E9ECEF');
        } else {
          doc.rect(50, yPosition, 500, 20)
             .stroke('#E9ECEF');
        }

        doc.fillColor('#000000');

        // Earnings
        if (i < earnings.length) {
          doc.text(earnings[i][0], 60, yPosition + 5)
             .text(formatCurrency(earnings[i][1]), 200, yPosition + 5);
        }

        // Deductions
        if (i < deductions.length) {
          doc.text(deductions[i][0], 300, yPosition + 5)
             .text(formatCurrency(deductions[i][1]), 450, yPosition + 5);
        }

        yPosition += 20;
      }

      // Total row
      doc.rect(50, yPosition, 500, 25)
         .fillAndStroke('#FF6B35', '#FF6B35');

      doc.fillColor('#FFFFFF')
         .fontSize(12)
         .text('TOTAL EARNINGS', 60, yPosition + 8)
         .text(formatCurrency(payslipData.earnings.totalEarnings), 200, yPosition + 8)
         .text('TOTAL DEDUCTIONS', 300, yPosition + 8)
         .text(formatCurrency(payslipData.deductions.totalDeductions), 450, yPosition + 8);

      yPosition += 40;

      // Net Salary
      doc.rect(50, yPosition, 500, 30)
         .fillAndStroke('#28A745', '#28A745');

      doc.fillColor('#FFFFFF')
         .fontSize(14)
         .text('NET SALARY', 60, yPosition + 10)
         .text(formatCurrency(payslipData.netSalary), 400, yPosition + 10);

      yPosition += 50;

      // Footer
      doc.fillColor('#666666')
         .fontSize(10)
         .text('This is a computer-generated payslip and does not require a signature.', 50, yPosition)
         .text(`Generated on: ${new Date().toLocaleDateString('en-IN')}`, 50, yPosition + 15)
         .text('EDUTRACK - Educational Management System', 50, yPosition + 30);

      // Finalize PDF
      doc.end();

      doc.on('end', () => {
        resolve({
          success: true,
          filename,
          filepath,
          relativePath: `uploads/payslips/${filename}`
        });
      });

      doc.on('error', (error) => {
        reject(error);
      });

    } catch (error) {
      reject(error);
    }
  });
};

const sendPayslipEmail = async (payslipData, pdfPath, recipientEmail) => {
  try {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                       'July', 'August', 'September', 'October', 'November', 'December'];
    
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: recipientEmail,
      subject: `Payslip for ${monthNames[payslipData.month - 1]} ${payslipData.year} - EDUTRACK`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #FF6B35, #FF8C42); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">EDUTRACK</h1>
            <p style="color: white; margin: 5px 0;">Educational Management System</p>
          </div>
          
          <div style="padding: 20px; background-color: #f8f9fa;">
            <h2 style="color: #333;">Salary Slip - ${monthNames[payslipData.month - 1]} ${payslipData.year}</h2>
            
            <p>Dear ${payslipData.staffName},</p>
            
            <p>Please find attached your salary slip for ${monthNames[payslipData.month - 1]} ${payslipData.year}.</p>
            
            <div style="background: white; padding: 15px; border-radius: 5px; margin: 20px 0;">
              <h3 style="color: #FF6B35; margin-top: 0;">Salary Summary</h3>
              <table style="width: 100%; border-collapse: collapse;">
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Employee ID:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${payslipData.employeeId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Department:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">${payslipData.department}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Earnings:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">Rs. ${payslipData.earnings.totalEarnings.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true })}</td>
                </tr>
                <tr>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;"><strong>Total Deductions:</strong></td>
                  <td style="padding: 8px; border-bottom: 1px solid #eee;">Rs. ${payslipData.deductions.totalDeductions.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true })}</td>
                </tr>
                <tr style="background-color: #e8f5e8;">
                  <td style="padding: 8px; font-weight: bold;"><strong>Net Salary:</strong></td>
                  <td style="padding: 8px; font-weight: bold; color: #28a745;">Rs. ${payslipData.netSalary.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 0, useGrouping: true })}</td>
                </tr>
              </table>
            </div>
            
            <p>If you have any questions regarding your salary slip, please contact the HR department.</p>
            
            <p>Best regards,<br>
            EDUTRACK Administration</p>
          </div>
          
          <div style="background-color: #333; color: white; padding: 15px; text-align: center; font-size: 12px;">
            <p>This is an automated email. Please do not reply to this email.</p>
            <p>© ${new Date().getFullYear()} EDUTRACK - Educational Management System</p>
          </div>
        </div>
      `,
      attachments: [
        {
          filename: path.basename(pdfPath),
          path: pdfPath
        }
      ]
    };

    const result = await transporter.sendMail(mailOptions);
    return {
      success: true,
      messageId: result.messageId
    };
  } catch (error) {
    console.error('Error sending payslip email:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  generatePayslipPDF,
  sendPayslipEmail
};