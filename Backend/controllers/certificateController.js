const Certificate = require('../models/Certificate');
const ExternalMarks = require('../models/ExternalMarks');
const Internal = require('../models/Internal');
const Student = require('../models/Student');
const Paper = require('../models/Paper');
const certificateService = require('../services/certificateService');

// Submit internal marks (Staff function)
const submitInternalMarks = async (req, res) => {
  try {
    const { paperId, academicYear, semester, marks } = req.body;
    const staffId = req.body.staffId; // Pass staffId in request body

    // Validate marks
    for (const mark of marks) {
      const total = mark.midMarks + mark.lab + mark.assignmentQuiz + mark.attendance;
      if (total > 60) {
        return res.status(400).json({ 
          message: `Total internal marks for ${mark.name} exceeds 60. Current total: ${total}` 
        });
      }
      mark.total = total;
    }

    // Check if internal marks already exist
    const existingInternal = await Internal.findOne({
      paper: paperId,
      academicYear,
      semester
    });

    if (existingInternal) {
      // Update existing marks
      existingInternal.marks = marks;
      await existingInternal.save();
    } else {
      // Create new internal marks record
      const internal = new Internal({
        paper: paperId,
        academicYear,
        semester,
        marks
      });
      await internal.save();
    }

    // Send notification to admin (you can implement notification system)
    // For now, just return success

    res.status(200).json({
      message: 'Internal marks submitted successfully',
      data: { paperId, academicYear, semester, marksCount: marks.length }
    });

  } catch (error) {
    console.error('Error submitting internal marks:', error);
    res.status(500).json({ message: 'Error submitting internal marks', error: error.message });
  }
};

// Add external marks (Admin function)
const addExternalMarks = async (req, res) => {
  try {
    const { paperId, studentId, externalMarks, academicYear, semester } = req.body;
    const adminId = req.body.adminId; // Pass adminId in request body

    // Validate external marks
    const validation = certificateService.validateMarks(0, externalMarks);
    if (!validation.isValid) {
      return res.status(400).json({ message: validation.errors.join(', ') });
    }

    // Check if external marks already exist
    const existingExternal = await ExternalMarks.findOne({
      paper: paperId,
      student: studentId,
      academicYear,
      semester
    });

    if (existingExternal) {
      // Update existing marks
      existingExternal.externalMarks = externalMarks;
      existingExternal.addedBy = adminId;
      existingExternal.addedDate = new Date();
      await existingExternal.save();
    } else {
      // Create new external marks record
      const external = new ExternalMarks({
        paper: paperId,
        student: studentId,
        externalMarks,
        addedBy: adminId,
        academicYear,
        semester
      });
      await external.save();
    }

    res.status(200).json({
      message: 'External marks added successfully',
      data: { paperId, studentId, externalMarks, academicYear, semester }
    });

  } catch (error) {
    console.error('Error adding external marks:', error);
    res.status(500).json({ message: 'Error adding external marks', error: error.message });
  }
};

// Get external marks for a student
const getStudentExternalMarks = async (req, res) => {
  try {
    const { studentId } = req.params;
    const { academicYear, semester } = req.query;

    if (!studentId) {
      return res.status(400).json({ message: 'Student ID is required' });
    }

    const externalMarks = await ExternalMarks.find({
      student: studentId,
      academicYear: academicYear || "2025-2026",
      semester: semester || "Semester 1"
    }).populate('paper', 'paper code');

    res.status(200).json({
      message: 'External marks retrieved successfully',
      data: externalMarks
    });

  } catch (error) {
    console.error('Error retrieving external marks:', error);
    res.status(500).json({ message: 'Error retrieving external marks', error: error.message });
  }
};

// Generate certificate
const generateCertificate = async (req, res) => {
  try {
    const { studentId, academicYear, semester } = req.body;

    // Check eligibility
    const eligibility = await certificateService.checkCertificateEligibility(studentId, academicYear, semester);
    if (!eligibility.eligible) {
      return res.status(400).json({ message: eligibility.reason });
    }

    console.log('=== CERTIFICATE GENERATION DEBUG ===');
    console.log('Student ID:', studentId);
    console.log('Academic Year:', academicYear);
    console.log('Semester:', semester);

    // Get internal marks
    const internalMarks = await Internal.find({
      'marks._id': studentId,
      academicYear,
      semester
    }).populate('paper');

    console.log('Internal marks found:', internalMarks.length);
    internalMarks.forEach(internal => {
      const studentMark = internal.marks.find(mark => mark._id.toString() === studentId);
      console.log('- Paper:', internal.paper?.paper, 'Student total:', studentMark?.total);
    });

    // Get external marks
    const paperIds = internalMarks.map(internal => internal.paper._id);
    const externalMarks = await ExternalMarks.find({
      student: studentId,
      paper: { $in: paperIds },
      academicYear,
      semester
    });

    console.log('External marks found:', externalMarks.length);
    externalMarks.forEach(external => {
      console.log('- Paper:', external.paper, 'External marks:', external.externalMarks);
    });

    // Prepare subjects data
    const subjects = [];
    for (const internal of internalMarks) {
      const studentMark = internal.marks.find(mark => mark._id.toString() === studentId);
      const external = externalMarks.find(ext => ext.paper.toString() === internal.paper._id.toString());
      
      console.log('Processing paper:', internal.paper?.paper);
      console.log('- Student mark found:', !!studentMark, studentMark?.total);
      console.log('- External mark found:', !!external, external?.externalMarks);
      
      if (studentMark && external) {
        subjects.push({
          paper: internal.paper._id,
          internalMarks: studentMark.total,
          externalMarks: external.externalMarks,
          totalMarks: studentMark.total + external.externalMarks,
          grade: certificateService.calculateGrade(studentMark.total + external.externalMarks)
        });
        console.log('- Subject added to certificate');
      } else {
        console.log('- Subject NOT added - missing marks');
      }
    }

    console.log('Total subjects for certificate:', subjects.length);

    // Check if certificate already exists
    let certificate = await Certificate.findOne({
      student: studentId,
      academicYear,
      semester
    });

    if (certificate) {
      // Update existing certificate
      certificate.subjects = subjects;
      certificate.status = 'generated';
      certificate.generatedDate = new Date();
    } else {
      // Create new certificate
      certificate = new Certificate({
        student: studentId,
        academicYear,
        semester,
        subjects
      });
    }

    await certificate.save();

    // Refresh certificate with latest student data before PDF generation
    await certificate.populate('student');
    console.log('Student data for certificate generation:', {
      id: certificate.student._id,
      name: certificate.student.name,
      profilePhoto: certificate.student.profilePhoto
    });

    // Generate PDF
    const pdfPath = await certificateService.generateCertificatePDF(certificate._id);
    certificate.certificatePath = pdfPath;
    certificate.status = 'generated';
    await certificate.save();

    // Send email (non-blocking - don't wait for email to complete)
    let emailSent = false;
    let emailError = null;
    try {
      console.log('=== EMAIL SENDING DEBUG ===');
      console.log('Certificate ID:', certificate._id);
      console.log('Student email:', certificate.student.email);
      
      // Send email with production-friendly timeout
      const emailTimeout = process.env.NODE_ENV === 'production' ? 45000 : 15000; // 45s in production
      const emailPromise = certificateService.sendCertificateEmail(certificate._id);
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error(`Email timeout after ${emailTimeout/1000} seconds`)), emailTimeout)
      );
      
      const emailResult = await Promise.race([emailPromise, timeoutPromise]);
      console.log('Email sent successfully:', emailResult);
      emailSent = true;
    } catch (error) {
      emailError = error.message;
      console.error('=== EMAIL ERROR ===');
      console.error('Error message:', error.message);
      console.error('Full error:', error);
      console.warn('Email sending failed, but certificate was generated successfully');
      // Don't fail the entire operation if email fails
    }

    res.status(200).json({
      message: emailSent ? 'Certificate generated and sent successfully' : 'Certificate generated successfully (email failed)',
      data: {
        certificateId: certificate._id,
        pdfPath,
        emailSent,
        emailError: emailError || null,
        studentEmail: certificate.student.email
      }
    });

  } catch (error) {
    console.error('Error generating certificate:', error);
    res.status(500).json({ message: 'Error generating certificate', error: error.message });
  }
};

// Get student certificates
const getStudentCertificates = async (req, res) => {
  try {
    const studentId = req.params.studentId; // Require studentId in params

    const certificates = await Certificate.find({ student: studentId })
      .populate('student', 'name rollNo department section profilePhoto')
      .populate('subjects.paper', 'paper')
      .sort({ generatedDate: -1 });

    res.status(200).json({
      message: 'Certificates retrieved successfully',
      data: certificates
    });

  } catch (error) {
    console.error('Error retrieving certificates:', error);
    res.status(500).json({ message: 'Error retrieving certificates', error: error.message });
  }
};

// Get certificates for staff view (Staff function)
const getStaffCertificateView = async (req, res) => {
  try {
    const { academicYear, semester, department, section, staffId } = req.query;

    // Build filter query for students
    const studentFilter = {};
    if (department) studentFilter.department = department;
    if (section) studentFilter.section = section;

    // Get filtered students
    const students = await Student.find(studentFilter).select('_id');
    const studentIds = students.map(s => s._id);

    // Get certificates for these students
    const certificateFilter = {
      student: { $in: studentIds },
      academicYear: academicYear || "2025-2026",
      semester: semester || "Semester 1",
      status: { $in: ['generated', 'distributed'] } // Only show completed certificates
    };

    const certificates = await Certificate.find(certificateFilter)
      .populate('student', 'name rollNo department section profilePhoto')
      .populate('subjects.paper', 'paper')
      .sort({ generatedDate: -1 });

    res.status(200).json({
      message: 'Staff certificate view retrieved successfully',
      data: certificates
    });

  } catch (error) {
    console.error('Error retrieving staff certificate view:', error);
    res.status(500).json({ message: 'Error retrieving staff certificate view', error: error.message });
  }
};

// Download certificate PDF
const downloadCertificate = async (req, res) => {
  try {
    const { certificateId } = req.params;

    const certificate = await Certificate.findById(certificateId);
    if (!certificate || !certificate.certificatePath) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    const fs = require('fs');
    if (!fs.existsSync(certificate.certificatePath)) {
      return res.status(404).json({ message: 'Certificate file not found' });
    }

    res.download(certificate.certificatePath, `certificate_${certificate._id}.pdf`);

  } catch (error) {
    console.error('Error downloading certificate:', error);
    res.status(500).json({ message: 'Error downloading certificate', error: error.message });
  }
};

// Get departments and sections (Admin function)
const getDepartmentsAndSections = async (req, res) => {
  try {
    // Get unique departments from students
    const departments = await Student.distinct('department');
    
    // Get sections from Student schema enum
    const sections = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'];

    // Get unique academic years from internal marks and certificates
    const academicYearsFromInternal = await Internal.distinct('academicYear');
    const academicYearsFromCertificates = await Certificate.distinct('academicYear');
    const allAcademicYears = [...new Set([...academicYearsFromInternal, ...academicYearsFromCertificates])];
    
    // If no academic years found, provide default
    const academicYears = allAcademicYears.length > 0 ? allAcademicYears.sort().reverse() : ['2025-2026', '2024-2025', '2023-2024'];

    res.status(200).json({
      message: 'Departments, sections, and academic years retrieved successfully',
      data: {
        departments: departments.sort(),
        sections: sections.sort(),
        academicYears: academicYears
      }
    });

  } catch (error) {
    console.error('Error retrieving departments and sections:', error);
    res.status(500).json({ message: 'Error retrieving departments and sections', error: error.message });
  }
};

// Get certificate dashboard (Admin function)
const getCertificateDashboard = async (req, res) => {
  try {
    const { academicYear, semester, department, section } = req.query;

    // Build filter query for students
    const studentFilter = {};
    if (department) studentFilter.department = department;
    if (section) studentFilter.section = section;

    // Get filtered students
    const students = await Student.find(studentFilter).select('name rollNo department section');
    const eligibleStudents = [];
    const pendingStudents = [];

    for (const student of students) {
      const eligibility = await certificateService.checkCertificateEligibility(
        student._id, 
        academicYear || "2025-2026", 
        semester || "Semester 1"
      );
      
      if (eligibility.eligible) {
        // Get internal marks details for this student
        const internalMarks = await Internal.find({
          'marks._id': student._id,
          academicYear: academicYear || "2025-2026",
          semester: semester || "Semester 1"
        }).populate('paper', 'paper code');

        const studentSubjects = [];
        for (const internal of internalMarks) {
          const studentMark = internal.marks.find(mark => mark._id.toString() === student._id.toString());
          if (studentMark) {
            studentSubjects.push({
              paperId: internal.paper._id,
              paperName: internal.paper.paper,
              paperCode: internal.paper.code,
              internalMarks: studentMark.total
            });
          }
        }

        eligibleStudents.push({
          ...student.toObject(),
          subjects: studentSubjects
        });
      } else {
        // Get internal marks details for pending students too
        const internalMarks = await Internal.find({
          'marks._id': student._id,
          academicYear: academicYear || "2025-2026",
          semester: semester || "Semester 1"
        }).populate('paper', 'paper code');

        const studentSubjects = [];
        for (const internal of internalMarks) {
          const studentMark = internal.marks.find(mark => mark._id.toString() === student._id.toString());
          if (studentMark) {
            studentSubjects.push({
              paperId: internal.paper._id,
              paperName: internal.paper.paper,
              paperCode: internal.paper.code,
              internalMarks: studentMark.total
            });
          }
        }

        pendingStudents.push({
          ...student.toObject(),
          reason: eligibility.reason,
          missingSubjects: eligibility.missingSubjects || 0,
          subjects: studentSubjects
        });
      }
    }

    // Get certificate statistics with filters
    const certificateFilter = {
      academicYear: academicYear || "2025-2026",
      semester: semester || "Semester 1"
    };

    // If department/section filters are applied, we need to filter certificates by student
    let totalCertificates, distributedCertificates;
    
    if (department || section) {
      const studentIds = students.map(s => s._id);
      certificateFilter.student = { $in: studentIds };
    }

    totalCertificates = await Certificate.countDocuments(certificateFilter);
    distributedCertificates = await Certificate.countDocuments({
      ...certificateFilter,
      status: 'distributed'
    });

    res.status(200).json({
      message: 'Dashboard data retrieved successfully',
      data: {
        statistics: {
          totalStudents: students.length,
          eligibleStudents: eligibleStudents.length,
          pendingStudents: pendingStudents.length,
          totalCertificates,
          distributedCertificates
        },
        eligibleStudents,
        pendingStudents
      }
    });

  } catch (error) {
    console.error('Error retrieving dashboard data:', error);
    res.status(500).json({ message: 'Error retrieving dashboard data', error: error.message });
  }
};

// Email certificate to student
const emailCertificate = async (req, res) => {
  try {
    const { certificateId, email, message } = req.body;

    if (!certificateId || !email) {
      return res.status(400).json({ message: 'Certificate ID and email are required' });
    }

    // Get certificate
    const certificate = await Certificate.findById(certificateId)
      .populate('student', 'name rollNo department section profilePhoto')
      .populate('subjects.paper', 'paper');

    if (!certificate) {
      return res.status(404).json({ message: 'Certificate not found' });
    }

    // Send email with custom message
    await certificateService.sendCertificateEmail(certificateId, email, message);

    // Update certificate email status
    certificate.emailSent = true;
    certificate.emailSentDate = new Date();
    await certificate.save();

    res.status(200).json({
      message: 'Certificate sent to email successfully',
      data: { certificateId, email }
    });

  } catch (error) {
    console.error('Error sending certificate email:', error);
    res.status(500).json({ message: 'Error sending certificate email', error: error.message });
  }
};

// Batch generate certificates
const batchGenerateCertificates = async (req, res) => {
  try {
    const { studentIds, academicYear, semester } = req.body;

    const results = [];
    const errors = [];

    for (const studentId of studentIds) {
      try {
        // Check eligibility
        const eligibility = await certificateService.checkCertificateEligibility(studentId, academicYear, semester);
        if (!eligibility.eligible) {
          errors.push({ studentId, error: eligibility.reason });
          continue;
        }

        // Generate certificate (reuse logic from generateCertificate)
        const internalMarks = await Internal.find({
          'marks._id': studentId,
          academicYear,
          semester
        }).populate('paper');

        const paperIds = internalMarks.map(internal => internal.paper._id);
        const externalMarks = await ExternalMarks.find({
          student: studentId,
          paper: { $in: paperIds },
          academicYear,
          semester
        });

        const subjects = [];
        for (const internal of internalMarks) {
          const studentMark = internal.marks.find(mark => mark._id.toString() === studentId);
          const external = externalMarks.find(ext => ext.paper.toString() === internal.paper._id.toString());
          
          if (studentMark && external) {
            subjects.push({
              paper: internal.paper._id,
              internalMarks: studentMark.total,
              externalMarks: external.externalMarks,
              totalMarks: studentMark.total + external.externalMarks,
              grade: certificateService.calculateGrade(studentMark.total + external.externalMarks)
            });
          }
        }

        let certificate = await Certificate.findOne({
          student: studentId,
          academicYear,
          semester
        });

        if (certificate) {
          certificate.subjects = subjects;
          certificate.status = 'generated';
          certificate.generatedDate = new Date();
        } else {
          certificate = new Certificate({
            student: studentId,
            academicYear,
            semester,
            subjects
          });
        }

        await certificate.save();

        const pdfPath = await certificateService.generateCertificatePDF(certificate._id);
        certificate.certificatePath = pdfPath;
        certificate.status = 'generated';
        await certificate.save();

        // Try to send email with timeout
        let emailSent = false;
        try {
          const emailPromise = certificateService.sendCertificateEmail(certificate._id);
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Email timeout')), 10000)
          );
          
          await Promise.race([emailPromise, timeoutPromise]);
          emailSent = true;
        } catch (emailError) {
          console.warn(`Email failed for student ${studentId}:`, emailError.message);
        }

        results.push({ studentId, certificateId: certificate._id, success: true, emailSent });

      } catch (error) {
        errors.push({ studentId, error: error.message });
      }
    }

    res.status(200).json({
      message: 'Batch certificate generation completed',
      data: {
        successful: results.length,
        failed: errors.length,
        results,
        errors
      }
    });

  } catch (error) {
    console.error('Error in batch certificate generation:', error);
    res.status(500).json({ message: 'Error in batch certificate generation', error: error.message });
  }
};

module.exports = {
  submitInternalMarks,
  addExternalMarks,
  getStudentExternalMarks,
  generateCertificate,
  getStudentCertificates,
  getStaffCertificateView,
  downloadCertificate,
  emailCertificate,
  getDepartmentsAndSections,
  getCertificateDashboard,
  batchGenerateCertificates
};