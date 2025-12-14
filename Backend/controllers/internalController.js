const { default: mongoose } = require("mongoose");
const Internal = require("./../models/Internal");
const Student = require("../models/Student");
const Paper = require("../models/Paper");
const asyncHandler = require("express-async-handler");
const ExcelJS = require('exceljs');
// Try to import PDF service, with fallback
let generateStudentReportPDF, generateClassReportPDF;
try {
  const pdfService = require('../services/pdfService');
  generateStudentReportPDF = pdfService.generateStudentReportPDF;
  generateClassReportPDF = pdfService.generateClassReportPDF;
} catch (err) {
  console.error('PDF Service import error:', err);
  // Fallback functions will be defined below
}

const fs = require('fs');
const path = require('path');

// Fallback PDF generation functions if service is not available
const fallbackGenerateStudentReportPDF = (res, student, subjects, filename) => {
  try {
    // Check if PDFKit is available
    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (pdfkitError) {
      console.error('PDFKit not available:', pdfkitError);
      return res.status(500).json({ message: 'PDF generation library not available' });
    }
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    // Simple PDF generation
    doc.fontSize(20).text('EDUTRACK - Student Report', 50, 50);
    doc.fontSize(14).text(`Student: ${student.name}`, 50, 80);
    doc.fontSize(12).text(`Roll No: ${student.rollNo}`, 50, 100);
    doc.fontSize(12).text(`Department: ${student.department}`, 50, 120);
    
    let yPos = 160;
    doc.fontSize(14).text('Internal Marks:', 50, yPos);
    yPos += 30;
    
    if (subjects && subjects.length > 0) {
      subjects.forEach((subject, index) => {
        doc.fontSize(10).text(`${index + 1}. ${subject.paper}: ${subject.total || 0}/60`, 50, yPos);
        yPos += 20;
      });
    } else {
      doc.fontSize(10).text('No marks available', 50, yPos);
    }
    
    doc.end();
  } catch (error) {
    console.error('Fallback PDF generation error:', error);
    res.status(500).json({ message: 'PDF generation failed' });
  }
};

const fallbackGenerateClassReportPDF = (res, paper, students, filename) => {
  try {
    // Check if PDFKit is available
    let PDFDocument;
    try {
      PDFDocument = require('pdfkit');
    } catch (pdfkitError) {
      console.error('PDFKit not available:', pdfkitError);
      return res.status(500).json({ message: 'PDF generation library not available' });
    }
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    doc.pipe(res);

    // Simple PDF generation
    doc.fontSize(20).text('EDUTRACK - Class Report', 50, 50);
    doc.fontSize(14).text(`Subject: ${paper.paper}`, 50, 80);
    doc.fontSize(12).text(`Department: ${paper.department}`, 50, 100);
    
    let yPos = 140;
    doc.fontSize(14).text('Student Marks:', 50, yPos);
    yPos += 30;
    
    if (students && students.length > 0) {
      students.forEach((student, index) => {
        doc.fontSize(10).text(`${index + 1}. ${student.rollNo} - ${student.name}: ${student.total || 0}/60`, 50, yPos);
        yPos += 20;
        if (yPos > 700) {
          doc.addPage();
          yPos = 50;
        }
      });
    } else {
      doc.fontSize(10).text('No students found', 50, yPos);
    }
    
    doc.end();
  } catch (error) {
    console.error('Fallback PDF generation error:', error);
    res.status(500).json({ message: 'PDF generation failed' });
  }
};

// Use fallback functions if main service is not available
if (!generateStudentReportPDF) {
  generateStudentReportPDF = fallbackGenerateStudentReportPDF;
}
if (!generateClassReportPDF) {
  generateClassReportPDF = fallbackGenerateClassReportPDF;
}


// @desc Get Internal Result
// @route GET /internal/:paper
// @access Everyone
const getInternal = asyncHandler(async (req, res) => {
  if (!req?.params?.paper) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Params Missing" });
  }
  const internal = await Internal.findOne({
    paper: req.params.paper,
  }).exec();
  if (!internal) {
    return res.status(404).json({
      message: "No Existing Record(s) found. Add New Record.",
    });
  }
  res.json(internal);
});

// @desc Get Internal Result
// @route GET /internal/student/:studentId
// @access Everyone
const getInternalStudent = asyncHandler(async (req, res) => {
  if (!req?.params?.studentId) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Params Missing" });
  }
  const internal = await Internal.aggregate([
    {
      $lookup: {
        from: "paper",
        localField: "paper",
        foreignField: "_id",
        as: "paper",
      },
    },
    {
      $unwind: "$paper",
    },
    {
      $project: {
        marks: {
          $filter: {
            input: "$marks",
            as: "mark",
            cond: {
              $eq: [
                "$$mark._id",
                new mongoose.Types.ObjectId(req.params.studentId),
              ],
            },
          },
        },
        "paper.paper": 1,
      },
    },
    {
      $unwind: "$marks",
    },
  ]);
  if (!internal.length) {
    return res.status(404).json({
      message: "No Records Found.",
    });
  }
  res.json(internal);
});

// @desc Get Internal Marks for a specific student and paper
// @route GET /internal/student/:studentId/paper/:paperId
// @access Private
const getStudentInternalMarks = asyncHandler(async (req, res) => {
  const { studentId, paperId } = req.params;
  
  if (!studentId || !paperId) {
    return res.status(400).json({ message: "Student ID and Paper ID are required" });
  }

  try {
    const internal = await Internal.findOne({
      paper: paperId,
      "marks._id": studentId
    }).lean();

    if (!internal) {
      // Always return a default marks object if not found
      return res.json({
        midMarks: 0,
        lab: 0,
        assignmentQuiz: 0,
        attendance: 0,
        total: 0
      });
    }

    const studentMarks = internal.marks.find(mark => mark._id.toString() === studentId);
    res.json(studentMarks || {
      midMarks: 0,
      lab: 0,
      assignmentQuiz: 0,
      attendance: 0,
      total: 0
    });
  } catch (err) {
    res.status(500).json({ message: "Error fetching student marks" });
  }
});

// @desc Save/Update Internal Marks for a specific student and paper
// @route POST /internal/student/:studentId/paper/:paperId
// @access Private
const saveStudentInternalMarks = asyncHandler(async (req, res) => {
  const { studentId, paperId } = req.params;
  const { midMarks, lab, assignmentQuiz, attendance, total, name, rollNo } = req.body;
  
  if (!studentId || !paperId) {
    return res.status(400).json({ message: "Student ID and Paper ID are required" });
  }

  // Validate marks according to 60-point system
  const validationErrors = [];
  if (midMarks > 30) validationErrors.push("Mid marks cannot exceed 30");
  if (lab > 10) validationErrors.push("Lab marks cannot exceed 10");
  if (assignmentQuiz > 10) validationErrors.push("Assignment/Quiz marks cannot exceed 10");
  if (attendance > 10) validationErrors.push("Attendance marks cannot exceed 10");
  if (total > 60) validationErrors.push("Total marks cannot exceed 60");
  
  if (midMarks < 0 || lab < 0 || assignmentQuiz < 0 || attendance < 0) {
    validationErrors.push("Marks cannot be negative");
  }
  
  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      message: "Validation errors found", 
      errors: validationErrors 
    });
  }

  try {
    let internal = await Internal.findOne({ paper: paperId });
    
    if (!internal) {
      internal = new Internal({
        paper: paperId,
        marks: []
      });
    }

    const existingMarkIndex = internal.marks.findIndex(
      mark => mark._id.toString() === studentId
    );

    const markData = {
      _id: studentId,
      rollNo: rollNo || "",
      name: name || "",
      midMarks: midMarks || 0,
      lab: lab || 0,
      assignmentQuiz: assignmentQuiz || 0,
      attendance: attendance || 0,
      total: total || 0
    };

    if (existingMarkIndex >= 0) {
      internal.marks[existingMarkIndex] = markData;
    } else {
      internal.marks.push(markData);
    }

    await internal.save();
    res.json({ message: "Internal marks saved successfully" });
  } catch (err) {
    res.status(500).json({ message: "Error saving internal marks" });
  }
});

// @desc Download Internal Marks Excel Report
// @route GET /internal/paper/:paperId/download/:section?
// @access Private
const downloadInternalMarksReport = asyncHandler(async (req, res) => {
  const { paperId, section } = req.params;
  
  if (!paperId) {
    return res.status(400).json({ message: "Paper ID is required" });
  }

  try {
    // Get paper details
    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    // Get students for the paper and section
    let studentsQuery = { course: paper.department };
    if (section) {
      studentsQuery.section = section;
    }
    
    const students = await Student.find(studentsQuery)
      .select('name rollNo section')
      .sort({ rollNo: 1 })
      .lean();

    // Get internal marks for the paper
    const internal = await Internal.findOne({ paper: paperId }).lean();

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Internal Marks');

    // Add headers
    worksheet.columns = [
      { header: 'S.No', key: 'sno', width: 8 },
      { header: 'Roll No', key: 'rollNo', width: 15 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Section', key: 'section', width: 12 },
      { header: 'Mid Marks', key: 'midMarks', width: 12 },
      { header: 'Assignment', key: 'assignmentMarks', width: 12 },
      { header: 'Quiz Marks', key: 'quizMarks', width: 12 },
      { header: 'Attendance', key: 'attendanceMarks', width: 12 },
      { header: 'Total', key: 'totalMarks', width: 12 }
    ];

    // Style headers
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE6E6FA' }
    };

    // Add data rows
    students.forEach((student, index) => {
      const studentMarks = internal?.marks?.find(
        mark => mark.student.toString() === student._id.toString()
      ) || {
        midMarks: 0,
        assignmentMarks: 0,
        quizMarks: 0,
        attendanceMarks: 0,
        totalMarks: 0
      };

      worksheet.addRow({
        sno: index + 1,
        rollNo: student.rollNo,
        name: student.name,
        section: student.section,
        midMarks: studentMarks.midMarks,
        assignmentMarks: studentMarks.assignmentMarks,
        quizMarks: studentMarks.quizMarks,
        attendanceMarks: studentMarks.attendanceMarks,
        totalMarks: studentMarks.totalMarks
      });
    });

    // Add summary row
    const totalRow = worksheet.addRow({
      sno: '',
      rollNo: '',
      name: 'TOTAL',
      section: '',
      midMarks: { formula: `SUM(E2:E${students.length + 1})` },
      assignmentMarks: { formula: `SUM(F2:F${students.length + 1})` },
      quizMarks: { formula: `SUM(G2:G${students.length + 1})` },
      attendanceMarks: { formula: `SUM(H2:H${students.length + 1})` },
      totalMarks: { formula: `SUM(I2:I${students.length + 1})` }
    });
    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFFFFACD' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=Internal_Marks_${paper.paper}_${section || 'All'}.xlsx`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) {
    res.status(500).json({ message: "Error generating report" });
  }
});

// @desc Add Internal
// @route POST /Internal
// @access Private
const addInternal = asyncHandler(async (req, res) => {
  const { paper, marks } = req.body;
  // Confirm Data
  if (!paper || !marks) {
    return res
      .status(400)
      .json({ message: "Incomplete Request: Fields Missing" });
  }
  // Check for Duplicates
  const duplicate = await Internal.findOne({
    paper: req.params.paper,
  })
    .lean()
    .exec();
  if (duplicate) {
    return res.status(409).json({ message: "Internal record already exists" });
  }

  const InternalObj = {
    paper,
    marks,
  };
  // Create and Store New Internal Record
  const record = await Internal.create(InternalObj);
  if (record) {
    res.status(201).json({
      message: `Internal Record  Added`,
    });
  } else {
    res.status(400).json({ message: "Invalid data received" });
  }
});

// @desc Update Internal
// @route PATCH /Internal
// @access Private
const updateInternal = asyncHandler(async (req, res) => {
  const { id, paper, marks } = req.body;

  // Confirm Data
  if (!id || !paper || !marks) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Find Record
  const record = await Internal.findById(id).exec();
  if (!record) {
    return res.status(404).json({ message: "Internal record doesn't exist" });
  }

  // Check for duplicate
  const duplicate = await Internal.findOne({
    paper: req.params.paper,
  })
    .lean()
    .exec();

  // Allow Updates to original
  if (duplicate && duplicate?._id.toString() !== id) {
    return res.status(409).json({ message: "Duplicate Username" });
  }
  record.paper = paper;
  record.marks = marks;
  const save = await record.save();
  if (save) {
    res.json({
      message: ` Internal Record Updated`,
    });
  } else {
    res.json({ message: "Save Failed" });
  }
});

// @desc Delete Internal Record
// @route DELETE /Internal Record
// @access Private
const deleteInternal = asyncHandler(async (req, res) => {
  const id = req.params.paper;

  if (!id) {
    return res.status(400).json({ message: "Internal ID required" });
  }

  const record = await Internal.findById(id).exec();
  if (!record) {
    return res.status(404).json({ message: "Internal Record not found" });
  }

  await record.deleteOne();
  res.json({
    message: `Internal Record deleted`,
  });
});

// @desc Save all manual marks for a paper
// @route POST /internal/paper/:paperId/manual
// @access Private
const saveManualMarks = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  const { marks } = req.body;
  if (!paperId || !Array.isArray(marks)) {
    return res.status(400).json({ message: "Paper ID and marks array are required" });
  }
  
  // Validate marks according to 60-point system
  const validationErrors = [];
  marks.forEach((mark, index) => {
    if (mark.midMarks > 30) {
      validationErrors.push(`Row ${index + 1}: Mid marks cannot exceed 30`);
    }
    if (mark.lab > 10) {
      validationErrors.push(`Row ${index + 1}: Lab marks cannot exceed 10`);
    }
    if (mark.assignmentQuiz > 10) {
      validationErrors.push(`Row ${index + 1}: Assignment/Quiz marks cannot exceed 10`);
    }
    if (mark.attendance > 10) {
      validationErrors.push(`Row ${index + 1}: Attendance marks cannot exceed 10`);
    }
    if (mark.total > 60) {
      validationErrors.push(`Row ${index + 1}: Total marks cannot exceed 60`);
    }
    
    // Validate negative marks
    if (mark.midMarks < 0 || mark.lab < 0 || mark.assignmentQuiz < 0 || mark.attendance < 0) {
      validationErrors.push(`Row ${index + 1}: Marks cannot be negative`);
    }
  });
  
  if (validationErrors.length > 0) {
    return res.status(400).json({ 
      message: "Validation errors found", 
      errors: validationErrors 
    });
  }
  
  let internal = await Internal.findOne({ paper: paperId });
  if (!internal) {
    internal = new Internal({ paper: paperId, marks: [] });
  }
  internal.marks = marks;
  await internal.save();
  res.json({ message: "Manual marks saved successfully" });
});

// @desc Get all manual marks for a paper
// @route GET /internal/paper/:paperId/manual
// @access Private
const getManualMarks = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  if (!paperId) {
    return res.status(400).json({ message: "Paper ID is required" });
  }
  const internal = await Internal.findOne({ paper: paperId }).lean();
  res.json(internal ? internal.marks : []);
});

// @desc Download manual marks as Excel
// @route GET /internal/paper/:paperId/manual/download
// @access Private
const downloadManualMarksExcel = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  if (!paperId) {
    return res.status(400).json({ message: "Paper ID is required" });
  }
  const paper = await Paper.findById(paperId);
  if (!paper) {
    return res.status(404).json({ message: "Paper not found" });
  }
  const internal = await Internal.findOne({ paper: paperId }).lean();
  const marks = internal ? internal.marks : [];
  const ExcelJS = require('exceljs');
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Internal Marks');
  
  // Add EDUTRACK title at the top with enhanced styling
  worksheet.mergeCells('A1:I1');
  worksheet.getCell('A1').value = 'EDUTRACK - Educational Management System';
  worksheet.getCell('A1').font = { bold: true, size: 22, color: { argb: 'FFFFFFFF' } };
  worksheet.getCell('A1').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A1').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' } // Deep blue color
  };
  worksheet.getCell('A1').border = {
    top: { style: 'thick', color: { argb: 'FF1E40AF' } },
    left: { style: 'thick', color: { argb: 'FF1E40AF' } },
    bottom: { style: 'thick', color: { argb: 'FF1E40AF' } },
    right: { style: 'thick', color: { argb: 'FF1E40AF' } }
  };
  
  // Add Internal Marks Report subtitle
  worksheet.mergeCells('A2:I2');
  worksheet.getCell('A2').value = 'Internal Marks Report';
  worksheet.getCell('A2').font = { bold: true, size: 14, color: { argb: 'FF1E40AF' } };
  worksheet.getCell('A2').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A2').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFE0E7FF' } // Light blue background
  };
  worksheet.getCell('A2').border = {
    top: { style: 'medium', color: { argb: 'FF1E40AF' } },
    left: { style: 'medium', color: { argb: 'FF1E40AF' } },
    bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
    right: { style: 'medium', color: { argb: 'FF1E40AF' } }
  };
  
  // Add subject info
  worksheet.mergeCells('A3:I3');
  worksheet.getCell('A3').value = `Subject: ${paper.paper}`;
  worksheet.getCell('A3').font = { bold: true, size: 12, color: { argb: 'FF374151' } };
  worksheet.getCell('A3').alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getCell('A3').fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFF3F4F6' } // Light gray background
  };
  worksheet.getCell('A3').border = {
    top: { style: 'medium', color: { argb: 'FF1E40AF' } },
    left: { style: 'medium', color: { argb: 'FF1E40AF' } },
    bottom: { style: 'medium', color: { argb: 'FF1E40AF' } },
    right: { style: 'medium', color: { argb: 'FF1E40AF' } }
  };
  
  // Set row heights for title rows
  worksheet.getRow(1).height = 30;
  worksheet.getRow(2).height = 25;
  worksheet.getRow(3).height = 20;
  
  // Add empty row
  worksheet.addRow([]);
  
  // Define columns starting from row 4
  worksheet.columns = [
    { header: 'S.No', key: 'sno', width: 8 },
    { header: 'Roll No', key: 'rollNo', width: 15 },
    { header: 'Name', key: 'name', width: 30 },
    { header: 'Subject', key: 'subject', width: 20 },
    { header: 'Mid Marks (30)', key: 'midMarks', width: 15 },
    { header: 'Lab (10)', key: 'lab', width: 12 },
    { header: 'Assignment/Quiz (10)', key: 'assignmentQuiz', width: 18 },
    { header: 'Attendance (10)', key: 'attendance', width: 15 },
    { header: 'Total (60)', key: 'total', width: 12 }
  ];
  
  // Style the header row (row 5)
  const headerRow = worksheet.getRow(5);
  headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  headerRow.fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FF1E40AF' } // Deep blue background
  };
  headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
  headerRow.height = 22;
  
  // Add blue borders to header
  headerRow.eachCell((cell) => {
    cell.border = {
      top: { style: 'thick', color: { argb: 'FF1E40AF' } },
      left: { style: 'thick', color: { argb: 'FF1E40AF' } },
      bottom: { style: 'thick', color: { argb: 'FF1E40AF' } },
      right: { style: 'thick', color: { argb: 'FF1E40AF' } }
    };
  });
  
  // Add data rows starting from row 5
  marks.forEach((row, idx) => {
    const dataRow = worksheet.addRow({
      sno: idx + 1,
      rollNo: row.rollNo,
      name: row.name,
      subject: row.subject,
      midMarks: row.midMarks,
      lab: row.lab,
      assignmentQuiz: row.assignmentQuiz,
      attendance: row.attendance,
      total: row.total
    });
    
    // Style data rows
    dataRow.height = 20;
    dataRow.alignment = { horizontal: 'center', vertical: 'middle' };
    
    // Neat alternating row colors
    if (idx % 2 === 0) {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFF8FAFC' } // Very light blue-gray
      };
    } else {
      dataRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FFFFFFFF' } // White
      };
    }
    
    // Add blue borders to each cell
    dataRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thin', color: { argb: 'FF3B82F6' } },
        left: { style: 'thin', color: { argb: 'FF3B82F6' } },
        bottom: { style: 'thin', color: { argb: 'FF3B82F6' } },
        right: { style: 'thin', color: { argb: 'FF3B82F6' } }
      };
    });
    
    // Left align name column
    dataRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
    dataRow.getCell(4).alignment = { horizontal: 'left', vertical: 'middle' };
    
    // Color-code total column based on performance (60-point system)
    const totalCell = dataRow.getCell(9);
    const totalMarks = row.total || 0;
    totalCell.font = { bold: true };
    
    if (totalMarks >= 55) {
      // A+ grade - Green
      totalCell.font.color = { argb: 'FF10B981' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFECFDF5' } };
    } else if (totalMarks >= 50) {
      // A grade - Blue
      totalCell.font.color = { argb: 'FF3B82F6' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEFF6FF' } };
    } else if (totalMarks >= 45) {
      // B+ grade - Purple
      totalCell.font.color = { argb: 'FF8B5CF6' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F3FF' } };
    } else if (totalMarks >= 40) {
      // B grade - Indigo
      totalCell.font.color = { argb: 'FF6366F1' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFEEF2FF' } };
    } else if (totalMarks >= 36) {
      // C grade - Orange
      totalCell.font.color = { argb: 'FFF59E0B' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF3C7' } };
    } else {
      // F grade - Red
      totalCell.font.color = { argb: 'FFEF4444' };
      totalCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF2F2' } };
    }
  });
  
  // Add summary row if there are marks
  if (marks.length > 0) {
    const summaryRow = worksheet.addRow({
      sno: '',
      rollNo: '',
      name: 'SUMMARY',
      subject: '',
      midMarks: { formula: `AVERAGE(E5:E${4 + marks.length})` },
      lab: { formula: `AVERAGE(F5:F${4 + marks.length})` },
      assignmentQuiz: { formula: `AVERAGE(G5:G${4 + marks.length})` },
      attendance: { formula: `AVERAGE(H5:H${4 + marks.length})` },
      total: { formula: `AVERAGE(I5:I${4 + marks.length})` }
    });
    
    // Style summary row
    summaryRow.font = { bold: true, color: { argb: 'FF1E40AF' } };
    summaryRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFDBEAFE' } // Light blue background
    };
    summaryRow.alignment = { horizontal: 'center', vertical: 'middle' };
    summaryRow.height = 22;
    
    // Add blue borders to summary row
    summaryRow.eachCell((cell) => {
      cell.border = {
        top: { style: 'thick', color: { argb: 'FF1E40AF' } },
        left: { style: 'thick', color: { argb: 'FF1E40AF' } },
        bottom: { style: 'thick', color: { argb: 'FF1E40AF' } },
        right: { style: 'thick', color: { argb: 'FF1E40AF' } }
      };
    });
  }
  
  // Add outer table border to ensure all edges are visible
  const tableRange = `A4:I${4 + marks.length + (marks.length > 0 ? 1 : 0)}`;
  const tableArea = worksheet.getCell(tableRange.split(':')[0]).address + ':' + worksheet.getCell(tableRange.split(':')[1]).address;
  
  // Apply table formatting to the entire range
  for (let row = 4; row <= 4 + marks.length + (marks.length > 0 ? 1 : 0); row++) {
    for (let col = 1; col <= 9; col++) {
      const cell = worksheet.getCell(row, col);
      if (!cell.border) {
        cell.border = {
          top: { style: 'medium', color: { argb: 'FF000000' } },
          left: { style: 'medium', color: { argb: 'FF000000' } },
          bottom: { style: 'medium', color: { argb: 'FF000000' } },
          right: { style: 'medium', color: { argb: 'FF000000' } }
        };
      }
    }
  }
  
  // Set print options for better table appearance
  worksheet.pageSetup = {
    paperSize: 9, // A4
    orientation: 'landscape',
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: {
      left: 0.7,
      right: 0.7,
      top: 0.75,
      bottom: 0.75,
      header: 0.3,
      footer: 0.3
    }
  };
  
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', `attachment; filename=Internal_Marks_${paper.paper}.xlsx`);
  await workbook.xlsx.write(res);
  res.end();
});





// @desc Download Student Individual Report PDF
// @route GET /internal/student/:studentId/pdf
// @access Private
const downloadStudentReportPDF = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  const { paperId } = req.query; // Get paperId from query parameters
  
  if (!studentId) {
    return res.status(400).json({ message: "Student ID is required" });
  }

  try {
    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get internal marks for this student (optionally filtered by paper)
    const matchCondition = { "marks._id": new mongoose.Types.ObjectId(studentId) };
    if (paperId) {
      matchCondition.paper = new mongoose.Types.ObjectId(paperId);
    }
    
    const internals = await Internal.aggregate([
      { $match: matchCondition },
      {
        $lookup: {
          from: "papers",
          localField: "paper",
          foreignField: "_id",
          as: "paperInfo"
        }
      },
      { $unwind: "$paperInfo" },
      {
        $project: {
          paper: "$paperInfo.paper",
          department: "$paperInfo.department",
          semester: "$paperInfo.semester",
          marks: {
            $filter: {
              input: "$marks",
              cond: { $eq: ["$$this._id", new mongoose.Types.ObjectId(studentId)] }
            }
          }
        }
      },
      { $unwind: "$marks" }
    ]);

    // Also try the simple populate approach
    const populateQuery = { "marks._id": studentId };
    if (paperId) {
      populateQuery.paper = paperId;
    }
    const populateInternals = await Internal.find(populateQuery).populate('paper');

    // Format the data for PDF generation
    let subjects = [];
    
    // Use populate results instead of aggregation results
    const internalsToProcess = populateInternals.length > 0 ? populateInternals : internals;
    
    // Process each internal record
    for (const internal of internalsToProcess) {
      
      // Find the student's marks in this internal record
      // For aggregation result, internal.marks is already the filtered student mark
      // For populate result, we need to find the student in the marks array
      let studentMark = null;
      
      if (Array.isArray(internal.marks)) {
        // This is from populate - find the student in the marks array
        studentMark = internal.marks.find(m => m._id.toString() === studentId);
      } else if (internal.marks && internal.marks._id) {
        // This is from aggregation - marks is already the student's mark
        studentMark = internal.marks;
      }
      
      if (studentMark) {
        // Handle both aggregation result and populate result
        let paperName, department, semester;
        
        if (internal.paper && typeof internal.paper === 'string') {
          // This is from aggregation - paper info is in root level
          paperName = internal.paper;
          department = internal.department;
          semester = internal.semester;
        } else if (internal.paper && internal.paper.paper) {
          // This is from populate - paper is an object
          paperName = internal.paper.paper;
          department = internal.paper.department;
          semester = internal.paper.semester;
        } else {
          // Fallback
          paperName = 'Unknown Paper';
          department = student.course;
          semester = 'N/A';
        }
        
        subjects.push({
          paper: paperName,
          subject: paperName,
          department: department || student.course,
          semester: semester || 'N/A',
          marks: studentMark,
          midMarks: studentMark.midMarks || 0,
          lab: studentMark.lab || 0,
          assignmentQuiz: studentMark.assignmentQuiz || 0,
          attendance: studentMark.attendance || 0,
          total: studentMark.total || 0
        });
      }
    }

    // Check if no subjects found and try direct query as fallback
    if (subjects.length === 0) {
      const fallbackQuery = { "marks._id": studentId };
      if (paperId) {
        fallbackQuery.paper = paperId;
      }
      const directCheck = await Internal.find(fallbackQuery);
      if (directCheck.length > 0) {
        // Extract marks for this student from each internal record
        for (const internal of directCheck) {
          const studentMark = internal.marks.find(m => m._id.toString() === studentId);
          if (studentMark) {
            // Get paper info separately
            const paper = await Paper.findById(internal.paper);
            
            subjects.push({
              paper: paper?.paper || 'Internal Marks',
              subject: paper?.paper || 'Internal Marks',
              department: paper?.department || student.course,
              semester: paper?.semester || 'N/A',
              marks: studentMark,
              midMarks: studentMark.midMarks,
              lab: studentMark.lab,
              assignmentQuiz: studentMark.assignmentQuiz,
              attendance: studentMark.attendance,
              total: studentMark.total
            });
          }
        }
      }
    }

    // Validate student data structure for PDF generation
    const validatedStudent = {
      name: student.name || 'Unknown Student',
      rollNo: student.rollNo || 'N/A',
      section: student.section || 'N/A',
      course: student.course || student.department || 'N/A',
      department: student.course || student.department || 'N/A'
    };

    // Generate student PDF using the service
    const filename = `Professional_Student_Report_${student.rollNo || 'student'}.pdf`;
    
    // Try to generate PDF with error handling
    try {
      generateStudentReportPDF(res, validatedStudent, subjects, filename);
    } catch (pdfError) {
      console.error('PDF generation function error:', pdfError);
      // Use fallback if main function fails
      fallbackGenerateStudentReportPDF(res, validatedStudent, subjects, filename);
    }

  } catch (err) {
    console.error('Student PDF generation error:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ 
      message: "Error generating student PDF report",
      error: err.message 
    });
  }
});

// @desc Download Student All Papers Internal Marks PDF Report
// @route GET /internal/student/:studentId/pdf/all
// @access Private
const downloadStudentAllPapersReportPDF = asyncHandler(async (req, res) => {
  const { studentId } = req.params;
  
  if (!studentId) {
    return res.status(400).json({ message: "Student ID is required" });
  }

  try {
    // Get student details
    const student = await Student.findById(studentId);
    if (!student) {
      return res.status(404).json({ message: "Student not found" });
    }

    // Get all internal marks for this student across all papers
    const populateInternals = await Internal.find({ "marks._id": studentId }).populate('paper');

    // Format the data for PDF generation
    let subjects = [];
    
    // Process each internal record
    for (const internal of populateInternals) {
      // Find the student's marks in this internal record
      const studentMark = internal.marks.find(m => m._id.toString() === studentId);
      
      if (studentMark) {
        
        const paperName = internal.paper?.paper || 'Unknown Paper';
        const department = internal.paper?.department || student.course;
        const semester = internal.paper?.semester || 'N/A';
        
        subjects.push({
          paper: paperName,
          subject: paperName,
          department: department,
          semester: semester,
          marks: studentMark,
          midMarks: studentMark.midMarks || 0,
          lab: studentMark.lab || 0,
          assignmentQuiz: studentMark.assignmentQuiz || 0,
          attendance: studentMark.attendance || 0,
          total: studentMark.total || 0
        });
      }
    }

    // Generate comprehensive student PDF with all papers
    const filename = `All_Papers_Report_${student.rollNo}.pdf`;
    generateStudentReportPDF(res, student, subjects, filename);

  } catch (err) {
    console.error('All Papers Student PDF generation error:', err);
    res.status(500).json({ message: "Error generating all papers PDF report" });
  }
});

// @desc Download Class Internal Marks PDF Report
// @route GET /internal/paper/:paperId/pdf
// @access Private
const downloadClassReportPDF = asyncHandler(async (req, res) => {
  const { paperId } = req.params;
  const { section } = req.query;
  
  if (!paperId) {
    return res.status(400).json({ message: "Paper ID is required" });
  }

  try {
    // Get paper details
    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: "Paper not found" });
    }

    // Get internal marks for the paper
    const internal = await Internal.findOne({ paper: paperId }).lean();
    
    if (!internal || !internal.marks || internal.marks.length === 0) {
      return res.status(404).json({ message: "No marks found for this paper" });
    }

    // Filter by section if provided
    let marks = internal.marks;
    if (section) {
      marks = marks.filter(mark => mark.section === section);
    }

    // Sort by roll number
    marks.sort((a, b) => {
      const rollA = a.rollNo || "";
      const rollB = b.rollNo || "";
      return rollA.localeCompare(rollB);
    });

    // Validate marks data structure for PDF generation
    const validatedMarks = marks.map(mark => ({
      rollNo: mark.rollNo || '',
      name: mark.name || '',
      midMarks: mark.midMarks || 0,
      lab: mark.lab || 0,
      assignmentQuiz: mark.assignmentQuiz || 0,
      attendance: mark.attendance || 0,
      total: mark.total || 0
    }));

    // Generate PDF
    const filename = `Professional_Internal_Marks_${paper.paper.replace(/[^a-zA-Z0-9]/g, '_')}_${section || 'All'}.pdf`;
    
    // Try to generate PDF with error handling
    try {
      generateClassReportPDF(res, paper, validatedMarks, filename);
    } catch (pdfError) {
      console.error('PDF generation function error:', pdfError);
      // Use fallback if main function fails
      fallbackGenerateClassReportPDF(res, paper, validatedMarks, filename);
    }

  } catch (err) {
    console.error('Class PDF generation error:', err);
    console.error('Error details:', err.stack);
    res.status(500).json({ 
      message: "Error generating class PDF report",
      error: err.message 
    });
  }
});

// @desc Download Sample Colorful PDF (for demo)
// @route GET /internal/paper/sample/pdf
// @access Public
const downloadSamplePDF = asyncHandler(async (req, res) => {
  try {
    // Generate sample data for demonstration
    const samplePaper = {
      paper: "Sample Subject - Advanced Programming",
      department: "Computer Science and Engineering (CSE)",
      year: "2024-2025",
      semester: "VII"
    };

    const sampleMarks = [
      { rollNo: "221TCS010001", name: "John Doe", midMarks: 28, lab: 9, assignmentQuiz: 8, attendance: 10, total: 55 },
      { rollNo: "221TCS010002", name: "Jane Smith", midMarks: 25, lab: 8, assignmentQuiz: 7, attendance: 9, total: 49 },
      { rollNo: "221TCS010003", name: "Bob Johnson", midMarks: 22, lab: 7, assignmentQuiz: 6, attendance: 8, total: 43 }
    ];

    // Generate PDF with sample data
    const filename = 'Sample_Professional_Internal_Marks_Report.pdf';
    generateClassReportPDF(res, samplePaper, sampleMarks, filename);
  } catch (err) {
    console.error('Sample PDF generation error:', err);
    res.status(500).json({ message: "Error generating sample PDF report" });
  }
});

// @desc Download Sample Student PDF (for demo)
// @route GET /internal/student/sample/pdf
// @access Public
const downloadSampleStudentPDF = asyncHandler(async (req, res) => {
  try {
    // Generate sample student data
    const sampleStudent = {
      name: "John Doe",
      rollNo: "221TCS010001",
      section: "ALPHA",
      department: "Computer Science and Engineering (CSE)",
      year: "2024-2025"
    };

    const sampleSubjects = [
      { paper: "Advanced Programming", midMarks: 28, lab: 9, assignmentQuiz: 8, attendance: 10, total: 55 },
      { paper: "Database Systems", midMarks: 25, lab: 8, assignmentQuiz: 7, attendance: 9, total: 49 },
      { paper: "Software Engineering", midMarks: 22, lab: 7, assignmentQuiz: 6, attendance: 8, total: 43 }
    ];

    const filename = 'Sample_Professional_Student_Report.pdf';
    
    // Use fallback function for testing
    fallbackGenerateStudentReportPDF(res, sampleStudent, sampleSubjects, filename);
  } catch (err) {
    console.error('Sample student PDF generation error:', err);
    res.status(500).json({ message: "Error generating sample student PDF report" });
  }
});

// @desc Test PDF Generation
// @route GET /internal/test/pdf
// @access Public
const testPDFGeneration = asyncHandler(async (req, res) => {
  try {
    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument();
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=test.pdf');
    doc.pipe(res);

    doc.fontSize(20).text('PDF Test Successful!', 50, 50);
    doc.fontSize(12).text('This is a test PDF generated by EDUTRACK', 50, 80);
    doc.fontSize(10).text(`Generated at: ${new Date().toLocaleString()}`, 50, 100);
    
    doc.end();
  } catch (err) {
    console.error('Test PDF generation error:', err);
    res.status(500).json({ message: "PDF test failed", error: err.message });
  }
});

module.exports = {
  getInternal,
  getInternalStudent,
  addInternal,
  updateInternal,
  deleteInternal,
  getStudentInternalMarks,
  saveStudentInternalMarks,
  downloadInternalMarksReport,
  saveManualMarks,
  getManualMarks,
  downloadManualMarksExcel,
  downloadStudentReportPDF,
  downloadStudentAllPapersReportPDF,
  downloadClassReportPDF,
  downloadSamplePDF,
  downloadSampleStudentPDF,
  testPDFGeneration,
};
