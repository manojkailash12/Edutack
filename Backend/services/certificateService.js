const Certificate = require('../models/Certificate');
const ExternalMarks = require('../models/ExternalMarks');
const Internal = require('../models/Internal');
const Student = require('../models/Student');
const Paper = require('../models/Paper');
const transporter = require('../config/emailConfig');
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class CertificateService {
  // Validate marks ranges and completeness
  validateMarks(internalMarks, externalMarks) {
    const errors = [];
    
    if (internalMarks < 0 || internalMarks > 60) {
      errors.push('Internal marks must be between 0 and 60');
    }
    
    if (externalMarks < 0 || externalMarks > 40) {
      errors.push('External marks must be between 0 and 40');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  }

  // Calculate grades based on total marks
  calculateGrade(totalMarks) {
    if (totalMarks >= 90) return "A+";
    else if (totalMarks >= 80) return "A";
    else if (totalMarks >= 70) return "B+";
    else if (totalMarks >= 60) return "B";
    else if (totalMarks >= 50) return "C";
    else return "F";
  }

  // Check if student is eligible for certificate generation
  async checkCertificateEligibility(studentId, academicYear, semester) {
    try {
      // Get all internal marks for the student
      const internalMarks = await Internal.find({
        'marks._id': studentId,
        academicYear,
        semester
      }).populate('paper');

      if (!internalMarks || internalMarks.length === 0) {
        return { eligible: false, reason: 'No internal marks found' };
      }

      // Check if external marks exist for all subjects
      const paperIds = internalMarks.map(internal => internal.paper._id);
      const externalMarks = await ExternalMarks.find({
        student: studentId,
        paper: { $in: paperIds },
        academicYear,
        semester
      });

      if (externalMarks.length !== paperIds.length) {
        return { 
          eligible: false, 
          reason: 'External marks missing for some subjects',
          missingSubjects: paperIds.length - externalMarks.length
        };
      }

      return { eligible: true, subjects: internalMarks.length };
    } catch (error) {
      throw new Error(`Error checking eligibility: ${error.message}`);
    }
  }

  // Generate certificate PDF matching university format exactly
  async generateCertificatePDF(certificateId) {
    try {
      const certificate = await Certificate.findById(certificateId)
        .populate('student')
        .populate('subjects.paper');

      if (!certificate) {
        throw new Error('Certificate not found');
      }

      const doc = new PDFDocument({ size: 'A4', margin: 40 });
      const filename = `certificate_${certificate.student.rollNo}_${certificate.academicYear}_${certificate.semester}.pdf`;
      
      // Production-ready directory handling
      const getCertificatesDir = () => {
        if (process.env.NODE_ENV === 'production') {
          const tmpDir = '/tmp/certificates';
          if (!fs.existsSync(tmpDir)) {
            fs.mkdirSync(tmpDir, { recursive: true });
          }
          return tmpDir;
        } else {
          const uploadsDir = path.join(__dirname, '../uploads/certificates');
          if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
          }
          return uploadsDir;
        }
      };

      const uploadsDir = getCertificatesDir();
      const filepath = path.join(uploadsDir, filename);

      console.log('=== BULLETPROOF PDF GENERATION ===');
      console.log('Environment:', process.env.NODE_ENV);
      console.log('Upload directory:', uploadsDir);
      console.log('File path:', filepath);
      console.log('Directory exists:', fs.existsSync(uploadsDir));

      const stream = fs.createWriteStream(filepath);
      doc.pipe(stream);

      // Page dimensions
      const pageWidth = doc.page.width;
      const margin = 40;
      const contentWidth = pageWidth - (margin * 2);

      // Header with EDUTRACK branding
      let currentY = 50;
      
      // EDUTRACK logo (orange circle)
      doc.lineWidth(3)
         .strokeColor('#FF6B35')
         .fillColor('#FF6B35')
         .circle(100, currentY + 25, 25)
         .fillAndStroke();
      
      // Add "ET" text in logo circle (white text)
      doc.fontSize(14)
         .fillColor('#FFFFFF')
         .font('Helvetica-Bold')
         .text('ET', 90, currentY + 18);

      // EDUTRACK name and details
      doc.fontSize(24)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('EDUTRACK', 150, currentY);
      
      doc.fontSize(12)
         .fillColor('#000000')
         .font('Helvetica')
         .text('Educational Management System', 150, currentY + 30)
         .text('Digital Learning & Assessment Platform', 150, currentY + 45);

      currentY += 90;

      // Title in black color - properly centered
      doc.fontSize(20)
         .fillColor('#000000')
         .font('Helvetica-Bold')
         .text('Online Result Sheet', margin, currentY, { 
           width: contentWidth, 
           align: 'center' 
         });

      currentY += 50;

      // Student information section
      const leftColX = margin;
      const rightColX = 350;
      
      // Roll number positioned independently at top right (fixed position)
      const rollNoX = pageWidth - margin - 150; // Fixed position from right edge
      const rollNoY = currentY;
      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica')
         .text('H.T. No:', rollNoX, rollNoY)
         .font('Helvetica-Bold')
         .text(certificate.student.rollNo, rollNoX + 45, rollNoY);
      
      // Student information (left side)
      doc.fontSize(10)
         .font('Helvetica')
         .text('Student Name:', leftColX, currentY)
         .font('Helvetica-Bold')
         .text(certificate.student.name.toUpperCase(), leftColX + 80, currentY);

      doc.font('Helvetica')
         .text('Branch:', leftColX, currentY + 15)
         .font('Helvetica-Bold')
         .text(certificate.student.department, leftColX + 80, currentY + 15);

      // Add Examination field
      const examText = this.getExaminationText(certificate.semester, certificate.academicYear);
      doc.font('Helvetica')
         .text('Examination:', leftColX, currentY + 30)
         .font('Helvetica-Bold')
         .text(examText, leftColX + 80, currentY + 30);

      // Student photo (positioned separately, slightly larger and moved left)
      const tableRightEdge = margin + contentWidth; // Table's right edge
      const photoWidth = 75; // Increased from 60 to 75
      const photoX = tableRightEdge - photoWidth - 25; // Moved further left (from -10 to -25)
      const photoY = currentY + 20; // Move photo down by 20 pixels from student info
      const photoHeight = 75;

      // Photo border
      doc.lineWidth(1)
         .strokeColor('#000000')
         .rect(photoX, photoY, photoWidth, photoHeight)
         .stroke();

      // Try to load student photo, use dummy if not available
      let photoPath = null;
      console.log('=== CERTIFICATE PHOTO DEBUG ===');
      console.log('Student ID:', certificate.student._id);
      console.log('Student name:', certificate.student.name);
      console.log('Student profilePhoto from DB:', certificate.student.profilePhoto);
      
      let hasValidPhoto = false;
      if (certificate.student.profilePhoto && certificate.student.profilePhoto.trim() !== '') {
        console.log('Student has profile photo data');
        
        // Check if it's base64 data
        if (certificate.student.profilePhoto.startsWith('data:image/')) {
          console.log('Profile photo is base64 data');
          hasValidPhoto = true;
        } else {
          // Legacy file path - try to find file
          const normalizedPhoto = certificate.student.profilePhoto.replace(/\\/g, '/');
          console.log('Legacy photo path:', normalizedPhoto);
          
          if (normalizedPhoto.startsWith('uploads/')) {
            photoPath = path.join(__dirname, '..', normalizedPhoto);
          } else {
            photoPath = path.join(__dirname, '../uploads/profile-photos', normalizedPhoto);
          }
          
          hasValidPhoto = fs.existsSync(photoPath);
          console.log('Legacy photo file exists:', hasValidPhoto);
        }
      } else {
        console.log('No profile photo found for student, will use dummy photo');
      }

      if (hasValidPhoto) {
        try {
          if (certificate.student.profilePhoto.startsWith('data:image/')) {
            // Handle base64 image
            const base64Data = certificate.student.profilePhoto.split(',')[1];
            const imageBuffer = Buffer.from(base64Data, 'base64');
            
            doc.image(imageBuffer, photoX + 2, photoY + 2, { 
              width: photoWidth - 4, 
              height: photoHeight - 4
            });
          } else if (photoPath && fs.existsSync(photoPath)) {
            // Handle legacy file path
            doc.image(photoPath, photoX + 2, photoY + 2, { 
              width: photoWidth - 4, 
              height: photoHeight - 4
            });
          } else {
            this.drawDummyPhoto(doc, photoX, photoY, photoWidth, photoHeight);
          }
        } catch (err) {
          console.log('Error loading image:', err.message);
          // If image fails to load, show dummy
          this.drawDummyPhoto(doc, photoX, photoY, photoWidth, photoHeight);
        }
      } else {
        // Draw dummy photo
        this.drawDummyPhoto(doc, photoX, photoY, photoWidth, photoHeight);
      }

      currentY += 100;

      // Marks table
      const tableX = margin;
      const tableWidth = contentWidth;
      const rowHeight = 25;
      
      // Table headers - Matching reference format exactly with Month Year column
      const totalAvailableWidth = contentWidth;
      const colWidths = [
        Math.floor(totalAvailableWidth * 0.06), // S.No - 6%
        Math.floor(totalAvailableWidth * 0.12), // Course Code - 12%
        Math.floor(totalAvailableWidth * 0.30), // Course Title - 30%
        Math.floor(totalAvailableWidth * 0.12), // Grade Secured - 12%
        Math.floor(totalAvailableWidth * 0.10), // Grade Points - 10%
        Math.floor(totalAvailableWidth * 0.08), // Result - 8%
        Math.floor(totalAvailableWidth * 0.08), // Credits - 8%
        Math.floor(totalAvailableWidth * 0.14)  // Month Year - 14%
      ];
      
      // Adjust last column to ensure exact fit
      const totalCalculated = colWidths.reduce((sum, width) => sum + width, 0);
      colWidths[colWidths.length - 1] += (totalAvailableWidth - totalCalculated);
      
      const headers = ['S.No', 'Course Code', 'Course Title', 'Grade Secured', 'Grade Points', 'Result', 'Credits', 'Month Year'];

      // Header row with orange theme
      doc.lineWidth(0.5)
         .rect(tableX, currentY, tableWidth, rowHeight)
         .fillAndStroke('#FF6B35', '#FF6B35');

      let colX = tableX;
      headers.forEach((header, i) => {
        // Draw column separator lines
        if (i > 0) {
          doc.lineWidth(0.5)
             .strokeColor('#FFFFFF')
             .moveTo(colX, currentY)
             .lineTo(colX, currentY + rowHeight)
             .stroke();
        }
        
        doc.fontSize(7)
           .fillColor('#FFFFFF')
           .font('Helvetica-Bold')
           .text(header, colX + 2, currentY + 6, { 
             width: colWidths[i] - 4, 
             align: 'center' 
           });
        colX += colWidths[i];
      });

      currentY += rowHeight;

      // Data rows
      certificate.subjects.forEach((subject, index) => {
        // Row background with orange theme
        const bgColor = index % 2 === 0 ? '#FFFFFF' : '#FFF4F0';
        const borderColor = '#FFB894';
        doc.lineWidth(0.5)
           .rect(tableX, currentY, tableWidth, rowHeight)
           .fillAndStroke(bgColor, borderColor);

        // Calculate grade points and result
        const gradePoints = this.calculateGradePoints(subject.grade);
        const credits = subject.paper.credits || 3; // Use actual credits from paper
        const result = subject.grade === 'F' ? 'FAIL' : 'PASS';

        colX = tableX;
        // Use actual subject code from paper
        const courseCode = subject.paper.subjectCode || this.generateCourseCode(subject.paper.paper, index);
        
        // Updated row data matching reference format
        const monthYear = new Date().toLocaleDateString('en-GB', { month: '2-digit', year: 'numeric' });
        const rowData = [
          (index + 1).toString(),
          courseCode,
          subject.paper.paper,
          subject.grade,
          gradePoints.toString(),
          result,
          credits.toString(),
          monthYear
        ];

        rowData.forEach((data, i) => {
          // Draw column separator lines
          if (i > 0) {
            doc.lineWidth(0.5)
               .strokeColor(borderColor)
               .moveTo(colX, currentY)
               .lineTo(colX, currentY + rowHeight)
               .stroke();
          }
          
          // Use black color for all text
          const isGradeColumn = i === 3; // Grade Secured column
          const isResultColumn = i === 5; // Result column (now index 5)
          let textColor = '#000000';
          
          // Determine alignment based on column and text length
          let alignment = 'center'; // Default center alignment
          if (i === 2) { // Course title column
            // Center align if 6 characters or less, left align if longer
            alignment = data.length <= 6 ? 'center' : 'left';
          }
          
          doc.fontSize(7)
             .fillColor(textColor)
             .font((isGradeColumn || isResultColumn) ? 'Helvetica-Bold' : 'Helvetica')
             .text(data, colX + 2, currentY + 6, { 
               width: colWidths[i] - 4, 
               align: alignment
             });
          colX += colWidths[i];
        });

        currentY += rowHeight;
      });

      // Integrated summary row as part of main table (like reference)
      // Calculate totals
      const totalSubjects = certificate.subjects.length;
      const passedSubjects = certificate.subjects.filter(subject => subject.grade !== 'F').length;
      const totalCredits = certificate.subjects.reduce((sum, subject) => {
        return sum + (subject.paper.credits || 3);
      }, 0);
      const totalGradePoints = certificate.subjects.reduce((sum, subject) => {
        const credits = subject.paper.credits || 3;
        return sum + (this.calculateGradePoints(subject.grade) * credits);
      }, 0);
      const sgpa = (totalGradePoints / totalCredits).toFixed(2);

      // Summary row as part of the main table
      const summaryRowHeight = 25;
      const borderColor = '#FFB894';
      
      // Draw summary row with same table styling
      doc.lineWidth(0.5)
         .rect(tableX, currentY, tableWidth, summaryRowHeight)
         .fillAndStroke('#FFFFFF', borderColor);

      // Summary row content using same column structure
      let summaryColX = tableX;
      
      // Span first 3 columns for "Course Registered : X"
      const span1Width = colWidths[0] + colWidths[1] + colWidths[2];
      doc.fontSize(9)
         .fillColor('#000000')
         .font('Helvetica')
         .text('Course Registered :', summaryColX + 5, currentY + 8);
      doc.font('Helvetica-Bold')
         .text(totalSubjects.toString(), summaryColX + 100, currentY + 8);
      
      // Draw separator after first span
      summaryColX += span1Width;
      doc.lineWidth(0.5)
         .strokeColor(borderColor)
         .moveTo(summaryColX, currentY)
         .lineTo(summaryColX, currentY + summaryRowHeight)
         .stroke();

      // "Appeared : X" in next column
      doc.font('Helvetica')
         .text('Appeared :', summaryColX + 5, currentY + 8);
      doc.font('Helvetica-Bold')
         .text(totalSubjects.toString(), summaryColX + 50, currentY + 8);
      summaryColX += colWidths[3];
      
      // Draw separator
      doc.lineWidth(0.5)
         .strokeColor(borderColor)
         .moveTo(summaryColX, currentY)
         .lineTo(summaryColX, currentY + summaryRowHeight)
         .stroke();

      // "Passed : X" in next column
      doc.font('Helvetica')
         .text('Passed :', summaryColX + 5, currentY + 8);
      doc.font('Helvetica-Bold')
         .text(passedSubjects.toString(), summaryColX + 45, currentY + 8);
      summaryColX += colWidths[4];
      
      // Draw separator
      doc.lineWidth(0.5)
         .strokeColor(borderColor)
         .moveTo(summaryColX, currentY)
         .lineTo(summaryColX, currentY + summaryRowHeight)
         .stroke();

      // "Total Credits : X" spanning last columns
      doc.font('Helvetica')
         .text('Total Credits :', summaryColX + 5, currentY + 8);
      doc.font('Helvetica-Bold')
         .text(totalCredits.toString(), summaryColX + 70, currentY + 8);

      currentY += summaryRowHeight + 20;

      // SGPA and CGPA section below the unified table - reduce spacing to prevent CGPA wrapping
      const summaryLeftX = margin;
      const summaryRightX = pageWidth / 2 + 30;
      
      // SGPA on left side
      doc.fontSize(10)
         .fillColor('#000000')
         .font('Helvetica')
         .text('Semester Grade Point Average (SGPA) :', summaryLeftX, currentY);
      doc.font('Helvetica-Bold')
         .fillColor('#000000')
         .text(sgpa, summaryLeftX + 180, currentY);

      // CGPA on right side - same Y position, shortened text to prevent wrapping
      doc.font('Helvetica')
         .fillColor('#000000')
         .text('Cumulative Grade Point Average (CGPA): ', summaryRightX, currentY);
      doc.font('Helvetica-Bold')
         .fillColor('#000000')
         .text(sgpa, summaryRightX + 200, currentY); // CGPA value after colon

      // Footer section - position with more spacing from SGPA/CGPA
      currentY += 80; // Increased from 40 to 80 for more space
      
      // Green signature above Academic Controller
      const signatureX = pageWidth - margin - 120;
      const signatureY = currentY;
      
      // Draw realistic green signature
      doc.lineWidth(1.5)
         .strokeColor('#228B22')
         // First part of signature - flowing curve
         .moveTo(signatureX, signatureY + 5)
         .bezierCurveTo(signatureX + 15, signatureY - 5, signatureX + 25, signatureY + 8, signatureX + 35, signatureY + 2)
         .bezierCurveTo(signatureX + 45, signatureY - 3, signatureX + 55, signatureY + 10, signatureX + 70, signatureY + 5)
         // Second part - loop
         .moveTo(signatureX + 25, signatureY + 8)
         .bezierCurveTo(signatureX + 30, signatureY + 15, signatureX + 35, signatureY + 12, signatureX + 40, signatureY + 8)
         // Third part - ending flourish
         .moveTo(signatureX + 70, signatureY + 5)
         .bezierCurveTo(signatureX + 80, signatureY - 2, signatureX + 85, signatureY + 8, signatureX + 95, signatureY + 3)
         .stroke();
      
      currentY += 30; // Increased from 20 to 30 for more space between signature and text
      
      doc.fontSize(8)
         .fillColor('#000000')
         .font('Helvetica')
         .text(`Generated on: ${new Date().toLocaleDateString('en-GB')}`, margin, currentY)
         .text('Academic Controller', pageWidth - margin - 100, currentY);

      doc.end();

      return new Promise((resolve, reject) => {
        stream.on('finish', () => {
          resolve(filepath);
        });
        stream.on('error', reject);
      });

    } catch (error) {
      throw new Error(`Error generating PDF: ${error.message}`);
    }
  }

  // Helper function to draw dummy photo
  drawDummyPhoto(doc, x, y, width, height) {
    // Gray background
    doc.rect(x + 2, y + 2, width - 4, height - 4)
       .fill('#F3F4F6');
    
    // Simple person icon
    const centerX = x + width / 2;
    const centerY = y + height / 2;
    
    // Head circle
    doc.lineWidth(2)
       .strokeColor('#9CA3AF')
       .circle(centerX, centerY - 15, 12)
       .stroke();
    
    // Body
    doc.lineWidth(2)
       .strokeColor('#9CA3AF')
       .moveTo(centerX - 15, centerY + 20)
       .lineTo(centerX - 8, centerY + 5)
       .lineTo(centerX + 8, centerY + 5)
       .lineTo(centerX + 15, centerY + 20)
       .stroke();
  }

  // Helper function to calculate grade points
  calculateGradePoints(grade) {
    const gradeMap = {
      'A+': 10, 'A': 9, 'B+': 8, 'B': 7, 'C+': 6, 'C': 5, 'D': 4, 'F': 0
    };
    return gradeMap[grade] || 0;
  }

  // Helper function to generate course code from paper name
  generateCourseCode(paperName, index) {
    // Common subject abbreviations
    const codeMap = {
      'CRT': 'CRT101',
      'BDA': 'BDA201', 
      'SQT': 'SQT301',
      'MAP': 'MAP401',
      'SIE': 'SIE501',
      'DSA': 'DSA101',
      'OOP': 'OOP201',
      'DBMS': 'DBMS301',
      'CN': 'CN401',
      'OS': 'OS501',
      'SE': 'SE601',
      'AI': 'AI701',
      'ML': 'ML801'
    };

    // Check if paper name matches any known abbreviation
    const upperPaper = paperName.toUpperCase();
    for (const [abbr, code] of Object.entries(codeMap)) {
      if (upperPaper.includes(abbr)) {
        return code;
      }
    }

    // Generate generic code based on first letters and index
    const words = paperName.split(' ');
    let code = '';
    words.forEach(word => {
      if (word.length > 0) {
        code += word.charAt(0).toUpperCase();
      }
    });
    
    // Ensure code is at least 3 characters
    if (code.length < 3) {
      code = code.padEnd(3, 'X');
    }
    
    // Add number based on index
    const number = (index + 1) * 100 + 1;
    return `${code}${number}`;
  }

  // Send certificate via email
  async sendCertificateEmail(certificateId, customEmail = null, customMessage = null) {
    try {
      console.log('=== CERTIFICATE EMAIL SERVICE DEBUG ===');
      console.log('Certificate ID:', certificateId);
      
      const certificate = await Certificate.findById(certificateId)
        .populate('student');

      if (!certificate) {
        throw new Error('Certificate not found');
      }
      
      if (!certificate.certificatePath) {
        throw new Error('Certificate PDF not found');
      }
      
      console.log('Certificate found:', {
        id: certificate._id,
        studentName: certificate.student.name,
        studentEmail: certificate.student.email,
        pdfPath: certificate.certificatePath
      });

      const recipientEmail = customEmail || certificate.student.email;
      
      if (!recipientEmail) {
        throw new Error('No email address found for student');
      }
      
      console.log('Recipient email:', recipientEmail);
      
      const personalMessage = customMessage ? `<p><em>${customMessage}</em></p>` : '';
      
      // Check if PDF file exists
      const fs = require('fs');
      if (!fs.existsSync(certificate.certificatePath)) {
        throw new Error(`Certificate PDF file not found at path: ${certificate.certificatePath}`);
      }
      
      console.log('PDF file exists, preparing email...');

      const mailOptions = {
        from: process.env.EMAIL_USER || 'libroflow8@gmail.com',
        to: recipientEmail,
        subject: `Academic Certificate - ${certificate.academicYear} ${certificate.semester}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background: linear-gradient(135deg, #1E40AF, #8B5CF6); color: white; padding: 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 24px;">EDUTRACK</h1>
              <p style="margin: 5px 0 0 0; opacity: 0.9;">Educational Management System</p>
            </div>
            
            <div style="padding: 30px; background: #f8f9fa;">
              <h2 style="color: #1E40AF; margin-bottom: 20px;">Academic Certificate</h2>
              
              <p>Dear ${certificate.student.name},</p>
              
              ${personalMessage}
              
              <p>Please find attached your academic certificate for <strong>${certificate.academicYear} ${certificate.semester}</strong>.</p>
              
              <div style="background: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #FF6B35;">
                <h3 style="color: #FF6B35; margin-top: 0;">Academic Performance Summary</h3>
                <ul style="list-style: none; padding: 0;">
                  <li style="padding: 5px 0;"><strong>Overall Grade:</strong> <span style="color: #FF6B35; font-weight: bold;">${certificate.overallGrade}</span></li>
                  <li style="padding: 5px 0;"><strong>Total Subjects:</strong> ${certificate.subjects.length}</li>
                </ul>
              </div>
              
              <p style="color: #6B7280; font-size: 14px;">
                This certificate is digitally generated and contains your complete academic performance for the specified semester.
              </p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #E5E7EB;">
                <p>Best regards,<br>
                <strong>EDUTRACK Academic Team</strong></p>
              </div>
            </div>
            
            <div style="background: #1F2937; color: white; padding: 15px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">This is an automated email. Please do not reply to this message.</p>
              <p style="margin: 5px 0 0 0; opacity: 0.8;">Generated on ${new Date().toLocaleDateString()}</p>
            </div>
          </div>
        `,
        attachments: [
          {
            filename: `certificate_${certificate.student.rollNo}_${certificate.academicYear}_${certificate.semester}.pdf`,
            path: certificate.certificatePath
          }
        ]
      };

      console.log('Sending email with options:', {
        from: mailOptions.from,
        to: mailOptions.to,
        subject: mailOptions.subject,
        attachmentCount: mailOptions.attachments.length
      });
      
      // Simplified email sending for production reliability
      console.log('Attempting to send email...');
      
      try {
        // Test transporter connection first
        await transporter.verify();
        console.log('Email transporter verified successfully');
        
        // Send email with extended timeout for production
        const info = await transporter.sendMail(mailOptions);
        console.log('Email sent successfully:', info.messageId);
        
        return info;
      } catch (emailError) {
        console.error('Email sending failed:', emailError);
        throw emailError;
      }
      
      const info = await this.sendEmailWithRetry(mailOptions);
      
      console.log('Email sent successfully:', {
        messageId: info.messageId,
        response: info.response
      });
      
      // Update certificate status only if sending to student's registered email
      if (!customEmail) {
        certificate.emailSent = true;
        certificate.emailSentDate = new Date();
        certificate.status = 'distributed';
        await certificate.save();
        console.log('Certificate status updated to distributed');
      }

      return {
        success: true,
        messageId: info.messageId,
        timestamp: new Date(),
        sentTo: recipientEmail
      };

    } catch (error) {
      throw new Error(`Error sending email: ${error.message}`);
    }
  }

  // Email sending with retry mechanism
  async sendEmailWithRetry(mailOptions, maxRetries = 3) {
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Email attempt ${attempt}/${maxRetries}`);
        
        // Verify connection before sending
        await transporter.verify();
        
        // Send email
        const info = await transporter.sendMail(mailOptions);
        console.log(`Email sent successfully on attempt ${attempt}`);
        return info;
        
      } catch (error) {
        console.error(`Email attempt ${attempt} failed:`, error.message);
        
        if (attempt === maxRetries) {
          throw new Error(`Email failed after ${maxRetries} attempts: ${error.message}`);
        }
        
        // Wait before retry (exponential backoff)
        const delay = Math.pow(2, attempt) * 1000; // 2s, 4s, 8s
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // Helper function to convert semester number to examination format
  getExaminationText(semester, academicYear) {
    // Convert semester number to year and semester format
    // Semester 1,2 = I Year, Semester 3,4 = II Year, etc.
    let semesterNum;
    
    // Handle both string and number inputs
    if (typeof semester === 'string') {
      // Extract number from strings like "Semester 7" or just "7"
      semesterNum = parseInt(semester.replace(/\D/g, '')) || 1;
    } else {
      semesterNum = parseInt(semester) || 1;
    }
    
    const year = Math.ceil(semesterNum / 2);
    const semesterInYear = semesterNum % 2 === 0 ? 'II' : 'I';
    
    // Convert year number to Roman numerals
    const yearRoman = ['I', 'II', 'III', 'IV', 'V', 'VI'][year - 1] || 'I';
    
    return `${yearRoman} Year ${semesterInYear} Semester (R 22)`;
  }
}

module.exports = new CertificateService();