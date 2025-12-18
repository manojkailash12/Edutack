const Payslip = require('../models/Payslip');
const Staff = require('../models/Staff');
const StaffAttendance = require('../models/StaffAttendance');
const { generatePayslipPDF, sendPayslipEmail } = require('../services/payslipService');
const asyncHandler = require('express-async-handler');
const path = require('path');
const fs = require('fs');

// Generate payslip for a staff member
const generatePayslip = asyncHandler(async (req, res) => {
  const { staffId, month, year, generatedBy } = req.body;

  if (!staffId || !month || !year || !generatedBy) {
    return res.status(400).json({ 
      message: 'Staff ID, month, year, and generatedBy are required' 
    });
  }

  try {
    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: 'Staff not found' });
    }

    // Check if payslip already exists
    const existingPayslip = await Payslip.findOne({ staffId, month, year });
    if (existingPayslip) {
      return res.status(409).json({ 
        message: 'Payslip already exists for this month and year',
        existingPayslip: {
          id: existingPayslip._id,
          status: existingPayslip.status,
          createdAt: existingPayslip.createdAt,
          netSalary: existingPayslip.netSalary
        },
        options: {
          regenerate: true,
          view: true,
          download: true
        }
      });
    }

    // Calculate attendance data for the month
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
    
    const attendanceRecords = await StaffAttendance.find({
      staffId,
      date: { $gte: startDate, $lte: endDate }
    });

    const workingDays = endDate.getDate();
    const presentDays = attendanceRecords.filter(record => 
      ['present', 'late'].includes(record.status)
    ).length;
    const absentDays = workingDays - presentDays;
    const totalWorkingHours = attendanceRecords.reduce((sum, record) => 
      sum + (record.workingHours || 0), 0
    );

    // Calculate salary based on type
    let basicSalary = 0;
    console.log('Main Payslip Salary Calculation Debug:', {
      staffName: staff.name,
      salaryType: staff.salaryType,
      dailyRate: staff.dailyRate,
      hourlyRate: staff.hourlyRate,
      baseSalary: staff.baseSalary,
      salary: staff.salary,
      presentDays,
      totalWorkingHours,
      workingDays
    });
    
    if (staff.salaryType === 'attendance-based') {
      // First check if there's a pre-calculated salary (from calculateAttendanceBasedSalary)
      if (staff.salary && staff.salary > 0) {
        basicSalary = staff.salary;
        console.log('Main: Using pre-calculated attendance-based salary:', basicSalary);
      } else {
        // Priority 1: Use hourly rate with actual working hours (most accurate)
        if (staff.hourlyRate && totalWorkingHours > 0) {
          basicSalary = staff.hourlyRate * totalWorkingHours;
          console.log('Main: Using hourly rate calculation:', staff.hourlyRate, '*', totalWorkingHours, '=', basicSalary);
        }
        // Priority 2: Use daily rate but calculate based on actual hours worked
        else if (staff.dailyRate && staff.dailyRate > 0) {
          // Calculate equivalent days based on hours (9 hours = 1 full day)
          const equivalentDays = totalWorkingHours / 9;
          basicSalary = staff.dailyRate * equivalentDays;
          console.log('Main: Using daily rate with hours calculation:', staff.dailyRate, '*', equivalentDays, '(', totalWorkingHours, '/9) =', basicSalary);
        }
        // Priority 3: Use base salary proportionally based on hours
        else if (staff.baseSalary && staff.baseSalary > 0) {
          // Calculate hourly rate from base salary and use actual hours
          const totalMonthlyHours = workingDays * 9; // 9 hours per day
          const hourlyRateFromBase = staff.baseSalary / totalMonthlyHours;
          basicSalary = hourlyRateFromBase * totalWorkingHours;
          console.log('Main: Using base salary hourly calculation:', hourlyRateFromBase, '*', totalWorkingHours, '=', basicSalary);
        }
        // Fallback: Old method (present days)
        else {
          basicSalary = (staff.baseSalary / workingDays) * presentDays;
          console.log('Main: Fallback to present days calculation:', staff.baseSalary, '/', workingDays, '*', presentDays, '=', basicSalary);
        }
      }
    } else {
      basicSalary = staff.salary || staff.baseSalary || 0;
      console.log('Main: Using fixed salary:', basicSalary);
    }

    // Check for perfect attendance bonus
    const lateRecords = attendanceRecords.filter(record => record.status === 'late').length;
    const leaveRecords = attendanceRecords.filter(record => record.status === 'on-leave').length;
    const absentRecords = attendanceRecords.filter(record => record.status === 'absent').length;
    const halfDayRecords = attendanceRecords.filter(record => record.status === 'half-day').length;
    
    // Perfect attendance: no late, no leave, no absent, no half-day days
    const isPerfectAttendance = lateRecords === 0 && leaveRecords === 0 && absentRecords === 0 && halfDayRecords === 0 && presentDays > 0;
    const perfectAttendanceBonus = isPerfectAttendance ? 1500 : 0;
    
    console.log('Perfect Attendance Check (Main):', {
      staffName: staff.name,
      presentDays,
      lateRecords,
      leaveRecords,
      absentRecords,
      halfDayRecords,
      isPerfectAttendance,
      bonus: perfectAttendanceBonus
    });

    // Calculate allowances, deductions, etc.
    const allowances = basicSalary * 0.1; // 10% allowances
    const overtime = 0; // Can be calculated based on extra hours
    const bonus = perfectAttendanceBonus; // Perfect attendance bonus

    const totalEarnings = basicSalary + allowances + overtime + bonus;

    // Calculate deductions
    const tax = totalEarnings * 0.05; // 5% tax
    const providentFund = basicSalary * 0.06; // 6% PF (reduced from 12%)
    const insurance = 0; // Insurance is free (no deduction)
    const other = 0;

    const totalDeductions = tax + providentFund + insurance + other;
    const netSalary = totalEarnings - totalDeductions;

    // Create payslip data
    const payslipData = {
      staffId,
      staffName: staff.name,
      employeeId: staff.employeeId,
      department: staff.department,
      month,
      year,
      salaryDetails: {
        baseSalary: staff.baseSalary || staff.salary || 0,
        salaryType: staff.salaryType,
        dailyRate: staff.dailyRate || 0,
        hourlyRate: staff.hourlyRate || 0,
        workingDays,
        presentDays,
        absentDays,
        totalWorkingHours
      },
      earnings: {
        basicSalary,
        allowances,
        overtime,
        bonus,
        totalEarnings
      },
      deductions: {
        tax,
        providentFund,
        insurance,
        other,
        totalDeductions
      },
      netSalary,
      generatedBy,
      status: 'generated'
    };
    
    console.log('Final Payslip Data:', {
      staffName: payslipData.staffName,
      basicSalary: payslipData.earnings.basicSalary,
      totalEarnings: payslipData.earnings.totalEarnings,
      netSalary,
      salaryDetails: payslipData.salaryDetails
    });

    // Generate PDF
    const pdfResult = await generatePayslipPDF(payslipData);
    if (!pdfResult.success) {
      throw new Error('Failed to generate PDF');
    }

    // Save payslip to database
    payslipData.pdfPath = pdfResult.relativePath;
    const payslip = new Payslip(payslipData);
    await payslip.save();

    // Send email if staff has email
    if (staff.email) {
      const emailResult = await sendPayslipEmail(payslipData, pdfResult.filepath, staff.email);
      if (emailResult.success) {
        payslip.emailSent = true;
        payslip.emailSentAt = new Date();
        payslip.status = 'sent';
        await payslip.save();
      }
    }

    res.status(201).json({
      message: 'Payslip generated successfully',
      payslip: {
        id: payslip._id,
        staffName: payslip.staffName,
        month: payslip.month,
        year: payslip.year,
        netSalary: payslip.netSalary,
        pdfPath: payslip.pdfPath,
        emailSent: payslip.emailSent,
        status: payslip.status
      }
    });

  } catch (error) {
    console.error('Error generating payslip:', error);
    res.status(500).json({ 
      message: 'Error generating payslip', 
      error: error.message 
    });
  }
});

// Generate payslips for all staff
const generateAllPayslips = asyncHandler(async (req, res) => {
  const { month, year, generatedBy } = req.body;

  if (!month || !year || !generatedBy) {
    return res.status(400).json({ 
      message: 'Month, year, and generatedBy are required' 
    });
  }

  try {
    const allStaff = await Staff.find({ approved: true });
    const results = [];
    const errors = [];

    for (const staff of allStaff) {
      try {
        // Check if payslip already exists
        const existingPayslip = await Payslip.findOne({ 
          staffId: staff._id, 
          month, 
          year 
        });
        
        if (existingPayslip) {
          results.push({
            staffId: staff._id,
            staffName: staff.name,
            status: 'already_exists',
            message: 'Payslip already exists'
          });
          continue;
        }

        // Generate payslip (reuse logic from generatePayslip)
        const payslipResult = await generateSinglePayslip(staff, month, year, generatedBy);
        results.push({
          staffId: staff._id,
          staffName: staff.name,
          status: 'success',
          payslipId: payslipResult.id,
          netSalary: payslipResult.netSalary
        });

      } catch (error) {
        errors.push({
          staffId: staff._id,
          staffName: staff.name,
          error: error.message
        });
      }
    }

    res.json({
      message: 'Bulk payslip generation completed',
      totalStaff: allStaff.length,
      successful: results.filter(r => r.status === 'success').length,
      alreadyExists: results.filter(r => r.status === 'already_exists').length,
      errors: errors.length,
      results,
      errorDetails: errors
    });

  } catch (error) {
    console.error('Error generating all payslips:', error);
    res.status(500).json({ 
      message: 'Error generating payslips', 
      error: error.message 
    });
  }
});

// Helper function to generate single payslip
const generateSinglePayslip = async (staff, month, year, generatedBy) => {
  try {
    console.log('Generating payslip for:', staff.name, month, year);
    
    // Calculate attendance data
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0);
  
  const attendanceRecords = await StaffAttendance.find({
    staffId: staff._id,
    date: { $gte: startDate, $lte: endDate }
  });

  const workingDays = endDate.getDate();
  const presentDays = attendanceRecords.filter(record => 
    ['present', 'late'].includes(record.status)
  ).length;
  const absentDays = workingDays - presentDays;
  const totalWorkingHours = attendanceRecords.reduce((sum, record) => 
    sum + (record.workingHours || 0), 0
  );

  // Calculate salary
  let basicSalary = 0;
  console.log('Salary Calculation Debug:', {
    staffName: staff.name,
    salaryType: staff.salaryType,
    dailyRate: staff.dailyRate,
    hourlyRate: staff.hourlyRate,
    baseSalary: staff.baseSalary,
    salary: staff.salary,
    presentDays,
    totalWorkingHours,
    workingDays
  });
  
  if (staff.salaryType === 'attendance-based') {
    // First check if there's a pre-calculated salary (from calculateAttendanceBasedSalary)
    if (staff.salary && staff.salary > 0) {
      basicSalary = staff.salary;
      console.log('Using pre-calculated attendance-based salary:', basicSalary);
    } else {
      // Priority 1: Use hourly rate with actual working hours (most accurate)
      if (staff.hourlyRate && totalWorkingHours > 0) {
        basicSalary = staff.hourlyRate * totalWorkingHours;
        console.log('Using hourly rate calculation:', staff.hourlyRate, '*', totalWorkingHours, '=', basicSalary);
      }
      // Priority 2: Use daily rate but calculate based on actual hours worked
      else if (staff.dailyRate && staff.dailyRate > 0) {
        // Calculate equivalent days based on hours (9 hours = 1 full day)
        const equivalentDays = totalWorkingHours / 9;
        basicSalary = staff.dailyRate * equivalentDays;
        console.log('Using daily rate with hours calculation:', staff.dailyRate, '*', equivalentDays, '(', totalWorkingHours, '/9) =', basicSalary);
      }
      // Priority 3: Use base salary proportionally based on hours
      else if (staff.baseSalary && staff.baseSalary > 0) {
        // Calculate hourly rate from base salary and use actual hours
        const totalMonthlyHours = workingDays * 9; // 9 hours per day
        const hourlyRateFromBase = staff.baseSalary / totalMonthlyHours;
        basicSalary = hourlyRateFromBase * totalWorkingHours;
        console.log('Using base salary hourly calculation:', hourlyRateFromBase, '*', totalWorkingHours, '=', basicSalary);
      }
      // Fallback: Old method (present days)
      else {
        basicSalary = (staff.baseSalary / workingDays) * presentDays;
        console.log('Fallback to present days calculation:', staff.baseSalary, '/', workingDays, '*', presentDays, '=', basicSalary);
      }
    }
  } else {
    basicSalary = staff.salary || staff.baseSalary || 0;
    console.log('Using fixed salary:', basicSalary);
  }

  // Check for perfect attendance bonus
  const lateRecords = attendanceRecords.filter(record => record.status === 'late').length;
  const leaveRecords = attendanceRecords.filter(record => record.status === 'on-leave').length;
  const absentRecords = attendanceRecords.filter(record => record.status === 'absent').length;
  const halfDayRecords = attendanceRecords.filter(record => record.status === 'half-day').length;
  
  // Perfect attendance: no late, no leave, no absent, no half-day days
  const isPerfectAttendance = lateRecords === 0 && leaveRecords === 0 && absentRecords === 0 && halfDayRecords === 0 && presentDays > 0;
  const perfectAttendanceBonus = isPerfectAttendance ? 1500 : 0;
  
  console.log('Perfect Attendance Check:', {
    staffName: staff.name,
    presentDays,
    lateRecords,
    leaveRecords,
    absentRecords,
    halfDayRecords,
    isPerfectAttendance,
    bonus: perfectAttendanceBonus
  });

  const allowances = basicSalary * 0.1;
  const overtime = 0;
  const bonus = perfectAttendanceBonus;
  const totalEarnings = basicSalary + allowances + overtime + bonus;
  const tax = totalEarnings * 0.05;
  const providentFund = basicSalary * 0.06; // 6% PF (reduced from 12%)
  const insurance = 0; // Insurance is free (no deduction)
  const totalDeductions = tax + providentFund + insurance;
  const netSalary = totalEarnings - totalDeductions;

  const payslipData = {
    staffId: staff._id,
    staffName: staff.name,
    employeeId: staff.employeeId,
    department: staff.department,
    month,
    year,
    salaryDetails: {
      baseSalary: staff.baseSalary || staff.salary || 0,
      salaryType: staff.salaryType,
      dailyRate: staff.dailyRate || 0,
      hourlyRate: staff.hourlyRate || 0,
      workingDays,
      presentDays,
      absentDays,
      totalWorkingHours
    },
    earnings: {
      basicSalary,
      allowances,
      overtime,
      bonus,
      totalEarnings
    },
    deductions: {
      tax,
      providentFund,
      insurance,
      other: 0,
      totalDeductions
    },
    netSalary,
    generatedBy,
    status: 'generated'
  };

  // Generate PDF
  const pdfResult = await generatePayslipPDF(payslipData);
  payslipData.pdfPath = pdfResult.relativePath;

  // Save to database
  const payslip = new Payslip(payslipData);
  await payslip.save();

  // Send email
  if (staff.email) {
    const emailResult = await sendPayslipEmail(payslipData, pdfResult.filepath, staff.email);
    if (emailResult.success) {
      payslip.emailSent = true;
      payslip.emailSentAt = new Date();
      payslip.status = 'sent';
      await payslip.save();
    }
  }

  console.log('Payslip generated successfully:', payslip._id, 'Net Salary:', payslip.netSalary);
  
  return {
    id: payslip._id,
    netSalary: payslip.netSalary
  };
  
  } catch (error) {
    console.error('Error in generateSinglePayslip:', error);
    throw error;
  }
};

// Get payslips for a staff member
const getStaffPayslips = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { year } = req.query;

  try {
    let query = { staffId };
    if (year) {
      query.year = parseInt(year);
    }

    const payslips = await Payslip.find(query)
      .sort({ year: -1, month: -1 })
      .select('-__v');

    res.json(payslips);
  } catch (error) {
    console.error('Error fetching staff payslips:', error);
    res.status(500).json({ 
      message: 'Error fetching payslips', 
      error: error.message 
    });
  }
});

// Get all payslips (Admin only)
const getAllPayslips = asyncHandler(async (req, res) => {
  const { month, year, department } = req.query;

  try {
    let query = {};
    if (month) query.month = parseInt(month);
    if (year) query.year = parseInt(year);
    if (department) query.department = department;

    const payslips = await Payslip.find(query)
      .sort({ year: -1, month: -1, staffName: 1 })
      .select('-__v');

    res.json(payslips);
  } catch (error) {
    console.error('Error fetching all payslips:', error);
    res.status(500).json({ 
      message: 'Error fetching payslips', 
      error: error.message 
    });
  }
});

// Download payslip PDF
const downloadPayslip = asyncHandler(async (req, res) => {
  const { payslipId } = req.params;

  try {
    console.log('=== PAYSLIP DOWNLOAD DEBUG ===');
    console.log('Payslip ID:', payslipId);
    console.log('Environment:', process.env.NODE_ENV);

    const payslip = await Payslip.findById(payslipId);
    if (!payslip) {
      console.log('Payslip not found in database');
      return res.status(404).json({ message: 'Payslip not found' });
    }

    console.log('Payslip found:', {
      id: payslip._id,
      pdfPath: payslip.pdfPath,
      staffId: payslip.staffId
    });

    // Handle different path formats for production vs development
    let filePath;
    if (payslip.pdfPath) {
      if (path.isAbsolute(payslip.pdfPath)) {
        filePath = payslip.pdfPath;
      } else {
        filePath = path.join(__dirname, '..', payslip.pdfPath);
      }
    } else {
      console.log('No PDF path found, regenerating payslip...');
      // If no PDF path, regenerate the payslip
      const { generatePayslipPDF } = require('../services/payslipService');
      const pdfPath = await generatePayslipPDF(payslip);
      payslip.pdfPath = pdfPath;
      await payslip.save();
      filePath = pdfPath;
    }

    console.log('Checking file path:', filePath);
    
    if (!fs.existsSync(filePath)) {
      console.log('File not found, attempting to regenerate...');
      
      try {
        // Regenerate the PDF
        const { generatePayslipPDF } = require('../services/payslipService');
        const newPdfPath = await generatePayslipPDF(payslip);
        payslip.pdfPath = newPdfPath;
        await payslip.save();
        filePath = newPdfPath;
        
        console.log('PDF regenerated at:', filePath);
      } catch (regenError) {
        console.error('Failed to regenerate PDF:', regenError);
        return res.status(500).json({ 
          message: 'Payslip file not found and could not be regenerated',
          error: regenError.message 
        });
      }
    }

    const filename = `payslip_${payslip.employeeId}_${payslip.month}_${payslip.year}.pdf`;
    
    console.log('Sending file:', filename);
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    
    const fileStream = fs.createReadStream(filePath);
    fileStream.on('error', (streamError) => {
      console.error('File stream error:', streamError);
      if (!res.headersSent) {
        res.status(500).json({ message: 'Error reading payslip file' });
      }
    });
    
    fileStream.pipe(res);

  } catch (error) {
    console.error('Error downloading payslip:', error);
    res.status(500).json({ 
      message: 'Error downloading payslip', 
      error: error.message 
    });
  }
});

// Resend payslip email
const resendPayslipEmail = asyncHandler(async (req, res) => {
  const { payslipId } = req.params;

  try {
    const payslip = await Payslip.findById(payslipId);
    if (!payslip) {
      return res.status(404).json({ message: 'Payslip not found' });
    }

    const staff = await Staff.findById(payslip.staffId);
    if (!staff || !staff.email) {
      return res.status(400).json({ message: 'Staff email not found' });
    }

    const filePath = path.join(__dirname, '..', payslip.pdfPath);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ message: 'Payslip file not found' });
    }

    const emailResult = await sendPayslipEmail(payslip, filePath, staff.email);
    
    if (emailResult.success) {
      payslip.emailSent = true;
      payslip.emailSentAt = new Date();
      await payslip.save();
      
      res.json({ message: 'Payslip email sent successfully' });
    } else {
      res.status(500).json({ 
        message: 'Failed to send email', 
        error: emailResult.error 
      });
    }

  } catch (error) {
    console.error('Error resending payslip email:', error);
    res.status(500).json({ 
      message: 'Error resending email', 
      error: error.message 
    });
  }
});

// Regenerate existing payslip
const regeneratePayslip = asyncHandler(async (req, res) => {
  const { staffId, month, year, generatedBy } = req.body;

  console.log('=== REGENERATE PAYSLIP REQUEST ===');
  console.log('Staff ID:', staffId);
  console.log('Month:', month);
  console.log('Year:', year);
  console.log('Generated By:', generatedBy);

  if (!staffId || !month || !year || !generatedBy) {
    return res.status(400).json({ 
      message: 'Staff ID, month, year, and generatedBy are required' 
    });
  }

  try {
    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      console.log('Staff not found:', staffId);
      return res.status(404).json({ message: 'Staff not found' });
    }

    console.log('Staff found:', staff.name);

    // Find and delete existing payslip
    const existingPayslip = await Payslip.findOneAndDelete({ staffId, month, year });
    if (!existingPayslip) {
      console.log('No existing payslip found for:', staffId, month, year);
      return res.status(404).json({ 
        message: 'No existing payslip found to regenerate' 
      });
    }

    console.log('Existing payslip deleted:', existingPayslip._id);

    // Generate new payslip using the same logic as generatePayslip
    console.log('Generating new payslip...');
    const payslipResult = await generateSinglePayslip(staff, month, year, generatedBy);
    console.log('New payslip generated:', payslipResult.id);

    res.status(201).json({
      message: 'Payslip regenerated successfully',
      payslip: payslipResult,
      previousPayslip: {
        id: existingPayslip._id,
        netSalary: existingPayslip.netSalary,
        createdAt: existingPayslip.createdAt
      }
    });

  } catch (error) {
    console.error('Error regenerating payslip:', error);
    res.status(500).json({ 
      message: 'Error regenerating payslip', 
      error: error.message 
    });
  }
});

module.exports = {
  generatePayslip,
  generateAllPayslips,
  regeneratePayslip,
  getStaffPayslips,
  getAllPayslips,
  downloadPayslip,
  resendPayslipEmail
};