const { default: mongoose } = require("mongoose");
const StaffAttendance = require("../models/StaffAttendance");
const Staff = require("../models/Staff");
const StaffLeave = require("../models/StaffLeave");
const AcademicCalendar = require("../models/AcademicCalendar");
const asyncHandler = require("express-async-handler");

// @desc Mark Staff Attendance (Self Check-in)
// @route POST /staff-attendance/checkin
// @access Private (Staff)
const staffCheckIn = asyncHandler(async (req, res) => {
  const { staffId, attendanceMethod, location, notes } = req.body;
  
  if (!staffId) {
    return res.status(400).json({ message: "Staff ID is required" });
  }

  try {
    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Check if today is a holiday or Sunday
    const shouldHoldClasses = await AcademicCalendar.shouldHoldClasses(today);
    if (!shouldHoldClasses) {
      const isSunday = AcademicCalendar.isSunday(today);
      const holiday = await AcademicCalendar.isHoliday(today);
      
      let message = "Attendance not allowed today - ";
      if (isSunday) {
        message += "Sunday (Weekly Holiday)";
      } else if (holiday) {
        message += `Holiday: ${holiday.title}`;
      }
      
      return res.status(400).json({ 
        message,
        isHoliday: true,
        holidayDetails: holiday,
        isSunday
      });
    }

    // Check if attendance already exists for today
    const existingAttendance = await StaffAttendance.findOne({
      staffId,
      date: today
    });

    if (existingAttendance) {
      if (existingAttendance.checkInTime) {
        return res.status(409).json({ 
          message: "Already checked in today",
          attendance: existingAttendance
        });
      }
    }

    // Determine status based on check-in time
    const workStartTime = new Date();
    workStartTime.setHours(9, 0, 0, 0); // 9:00 AM
    
    let status = 'present';
    if (now > workStartTime) {
      const lateThreshold = new Date(workStartTime);
      lateThreshold.setMinutes(lateThreshold.getMinutes() + 35); // 35 minutes grace period (until 9:35 AM)
      
      if (now > lateThreshold) {
        status = 'late';
      }
    }

    const attendanceData = {
      staffId,
      employeeId: staff.employeeId,
      staffName: staff.name,
      department: staff.department,
      date: today,
      checkInTime: now,
      status,
      attendanceMethod: attendanceMethod || 'manual',
      location: location || null,
      notes: notes || null
    };

    let attendance;
    if (existingAttendance) {
      // Update existing record
      attendance = await StaffAttendance.findByIdAndUpdate(
        existingAttendance._id,
        attendanceData,
        { new: true }
      );
    } else {
      // Create new record
      attendance = await StaffAttendance.create(attendanceData);
    }

    res.status(201).json({
      message: `Successfully checked in at ${now.toLocaleTimeString()}`,
      attendance,
      status
    });

  } catch (error) {
    res.status(500).json({ message: "Error marking attendance", error: error.message });
  }
});

// @desc Mark Staff Check-out
// @route PUT /staff-attendance/checkout
// @access Private (Staff)
const staffCheckOut = asyncHandler(async (req, res) => {
  const { staffId, notes } = req.body;
  
  if (!staffId) {
    return res.status(400).json({ message: "Staff ID is required" });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    const now = new Date();

    // Check if today is a holiday or Sunday
    const shouldHoldClasses = await AcademicCalendar.shouldHoldClasses(today);
    if (!shouldHoldClasses) {
      const isSunday = AcademicCalendar.isSunday(today);
      const holiday = await AcademicCalendar.isHoliday(today);
      
      let message = "Checkout not allowed today - ";
      if (isSunday) {
        message += "Sunday (Weekly Holiday)";
      } else if (holiday) {
        message += `Holiday: ${holiday.title}`;
      }
      
      return res.status(400).json({ 
        message,
        isHoliday: true,
        holidayDetails: holiday,
        isSunday
      });
    }

    const attendance = await StaffAttendance.findOne({
      staffId,
      date: today
    });

    if (!attendance) {
      return res.status(404).json({ message: "No check-in record found for today" });
    }

    if (attendance.checkOutTime) {
      return res.status(409).json({ 
        message: "Already checked out today",
        attendance
      });
    }

    // Calculate working hours
    const workingHours = attendance.checkInTime ? 
      (now - attendance.checkInTime) / (1000 * 60 * 60) : 0;

    // Determine if it's a half-day based on working hours
    // Full day = 9 hours, Half day = less than 9 hours
    const FULL_DAY_HOURS = 9;
    const HALF_DAY_THRESHOLD = 4.5; // Less than half of full day hours
    
    let finalStatus = attendance.status;
    if (workingHours < HALF_DAY_THRESHOLD) {
      finalStatus = 'half-day';
    } else if (workingHours < FULL_DAY_HOURS && attendance.status === 'present') {
      // If less than 9 hours but more than 4.5 hours, keep as present but note incomplete hours
      finalStatus = attendance.status;
    }

    console.log('Checkout calculation:', {
      staffName: attendance.staffName,
      checkInTime: attendance.checkInTime,
      checkOutTime: now,
      workingHours: Math.round(workingHours * 100) / 100,
      previousStatus: attendance.status,
      finalStatus
    });

    const updatedAttendance = await StaffAttendance.findByIdAndUpdate(
      attendance._id,
      {
        checkOutTime: now,
        workingHours: Math.round(workingHours * 100) / 100, // Round to 2 decimal places
        status: finalStatus,
        notes: notes || attendance.notes
      },
      { new: true }
    );

    res.json({
      message: `Successfully checked out at ${now.toLocaleTimeString()}`,
      attendance: updatedAttendance,
      workingHours: Math.round(workingHours * 100) / 100,
      status: finalStatus,
      isHalfDay: finalStatus === 'half-day'
    });

  } catch (error) {
    res.status(500).json({ message: "Error checking out", error: error.message });
  }
});

// @desc HOD Mark Staff Attendance
// @route POST /staff-attendance/hod-mark
// @access Private (HOD only)
const hodMarkAttendance = asyncHandler(async (req, res) => {
  const { staffId, date, status, notes, checkInTime, checkOutTime, workingHours } = req.body;
  const { hodId } = req.body; // HOD's staff ID
  
  if (!staffId || !date || !status || !hodId) {
    return res.status(400).json({ message: "Staff ID, date, status, and HOD ID are required" });
  }

  try {
    // Verify HOD permissions
    const hod = await Staff.findById(hodId);
    if (!hod || hod.role !== 'HOD') {
      return res.status(403).json({ message: "Only HOD can mark staff attendance" });
    }

    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      return res.status(404).json({ message: "Staff not found" });
    }

    // Check if staff is in same department as HOD
    if (staff.department !== hod.department) {
      return res.status(403).json({ message: "You can only mark attendance for staff in your department" });
    }

    // Check for existing attendance
    const existingAttendance = await StaffAttendance.findOne({
      staffId,
      date
    });

    const attendanceData = {
      staffId,
      employeeId: staff.employeeId,
      staffName: staff.name,
      department: staff.department,
      date,
      status,
      attendanceMethod: 'hod-marked',
      notes: notes || null,
      markedBy: hodId,
      checkInTime: checkInTime ? new Date(checkInTime) : null,
      checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
      workingHours: workingHours || 0
    };

    let attendance;
    if (existingAttendance) {
      attendance = await StaffAttendance.findByIdAndUpdate(
        existingAttendance._id,
        attendanceData,
        { new: true }
      ).populate('markedBy', 'name');
    } else {
      attendance = await StaffAttendance.create(attendanceData);
      attendance = await StaffAttendance.findById(attendance._id).populate('markedBy', 'name');
    }

    res.status(201).json({
      message: `Attendance marked for ${staff.name} on ${date}`,
      attendance
    });

  } catch (error) {
    res.status(500).json({ message: "Error marking attendance", error: error.message });
  }
});

// @desc Get Staff Attendance History
// @route GET /staff-attendance/history/:staffId
// @access Private (Staff/HOD)
const getStaffAttendanceHistory = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { startDate, endDate, month, year } = req.query;
  
  if (!staffId) {
    return res.status(400).json({ message: "Staff ID is required" });
  }

  try {
    let dateFilter = {};
    
    if (month && year) {
      // Get specific month data
      const startOfMonth = `${year}-${month.padStart(2, '0')}-01`;
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
      dateFilter = {
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      };
    } else if (startDate && endDate) {
      dateFilter = {
        date: {
          $gte: startDate,
          $lte: endDate
        }
      };
    } else {
      // Default to current month
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = now.getFullYear().toString();
      const startOfMonth = `${currentYear}-${currentMonth}-01`;
      const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0];
      dateFilter = {
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      };
    }

    const attendance = await StaffAttendance.find({
      staffId,
      ...dateFilter
    }).populate('markedBy', 'name').sort({ date: -1 });

    // Calculate statistics
    const totalDays = attendance.length;
    const presentDays = attendance.filter(a => ['present', 'late'].includes(a.status)).length;
    const absentDays = attendance.filter(a => a.status === 'absent').length;
    const lateDays = attendance.filter(a => a.status === 'late').length;
    const leaveDays = attendance.filter(a => a.status === 'on-leave').length;
    const halfDays = attendance.filter(a => a.status === 'half-day').length;
    
    const totalWorkingHours = attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);
    const averageWorkingHours = totalDays > 0 ? totalWorkingHours / totalDays : 0;

    res.json({
      attendance,
      statistics: {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        halfDays,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        averageWorkingHours: Math.round(averageWorkingHours * 100) / 100,
        attendancePercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      }
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching attendance history", error: error.message });
  }
});

// @desc Get Monthly Leave Statistics for Staff
// @route GET /staff-attendance/leave-stats/:staffId
// @access Private (Staff)
const getMonthlyLeaveStats = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  const { year } = req.query;
  
  if (!staffId) {
    return res.status(400).json({ message: "Staff ID is required" });
  }

  try {
    const targetYear = year || new Date().getFullYear();
    
    // Get monthly leave statistics
    const monthlyStats = await StaffLeave.aggregate([
      {
        $match: {
          staffId: new mongoose.Types.ObjectId(staffId),
          $expr: {
            $eq: [{ $year: "$startDate" }, parseInt(targetYear)]
          }
        }
      },
      {
        $group: {
          _id: { $month: "$startDate" },
          totalLeaves: { $sum: 1 },
          approvedLeaves: {
            $sum: { $cond: [{ $eq: ["$status", "Approved"] }, 1, 0] }
          },
          pendingLeaves: {
            $sum: { $cond: [{ $eq: ["$status", "Pending"] }, 1, 0] }
          },
          rejectedLeaves: {
            $sum: { $cond: [{ $eq: ["$status", "Rejected"] }, 1, 0] }
          },
          totalDays: {
            $sum: {
              $add: [
                { $divide: [{ $subtract: ["$endDate", "$startDate"] }, 86400000] },
                1
              ]
            }
          }
        }
      },
      {
        $sort: { _id: 1 }
      }
    ]);

    // Create array for all 12 months
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    const yearlyStats = monthNames.map((month, index) => {
      const monthData = monthlyStats.find(stat => stat._id === index + 1);
      return {
        month,
        monthNumber: index + 1,
        totalLeaves: monthData?.totalLeaves || 0,
        approvedLeaves: monthData?.approvedLeaves || 0,
        pendingLeaves: monthData?.pendingLeaves || 0,
        rejectedLeaves: monthData?.rejectedLeaves || 0,
        totalDays: Math.round(monthData?.totalDays || 0)
      };
    });

    // Calculate yearly totals
    const yearlyTotals = {
      totalLeaves: monthlyStats.reduce((sum, stat) => sum + stat.totalLeaves, 0),
      approvedLeaves: monthlyStats.reduce((sum, stat) => sum + stat.approvedLeaves, 0),
      pendingLeaves: monthlyStats.reduce((sum, stat) => sum + stat.pendingLeaves, 0),
      rejectedLeaves: monthlyStats.reduce((sum, stat) => sum + stat.rejectedLeaves, 0),
      totalDays: Math.round(monthlyStats.reduce((sum, stat) => sum + stat.totalDays, 0))
    };

    res.json({
      year: targetYear,
      monthlyStats: yearlyStats,
      yearlyTotals
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching leave statistics", error: error.message });
  }
});

// @desc Get Department Staff Attendance Report (HOD)
// @route GET /staff-attendance/department-report/:department
// @access Private (HOD only)
const getDepartmentStaffAttendanceReport = asyncHandler(async (req, res) => {
  const { department } = req.params;
  const { date, month, year } = req.query;
  
  if (!department) {
    return res.status(400).json({ message: "Department is required" });
  }

  try {
    let dateFilter = {};
    
    if (date) {
      dateFilter = { date };
    } else if (month && year) {
      const startOfMonth = `${year}-${month.padStart(2, '0')}-01`;
      const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];
      dateFilter = {
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      };
    } else {
      // Default to current month
      const now = new Date();
      const currentMonth = (now.getMonth() + 1).toString().padStart(2, '0');
      const currentYear = now.getFullYear().toString();
      const startOfMonth = `${currentYear}-${currentMonth}-01`;
      const endOfMonth = new Date(currentYear, now.getMonth() + 1, 0).toISOString().split('T')[0];
      dateFilter = {
        date: {
          $gte: startOfMonth,
          $lte: endOfMonth
        }
      };
    }

    // Get all staff in department
    const departmentStaff = await Staff.find({ department }).select('name employeeId');
    
    // Get attendance data
    const attendanceData = await StaffAttendance.find({
      department,
      ...dateFilter
    }).populate('markedBy', 'name').sort({ date: -1, staffName: 1 });

    // Group by staff
    const staffAttendanceMap = {};
    departmentStaff.forEach(staff => {
      staffAttendanceMap[staff._id.toString()] = {
        staffInfo: staff,
        attendance: [],
        statistics: {
          totalDays: 0,
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          leaveDays: 0,
          halfDays: 0,
          totalWorkingHours: 0,
          attendancePercentage: 0
        }
      };
    });

    // Populate attendance data
    attendanceData.forEach(record => {
      const staffId = record.staffId.toString();
      if (staffAttendanceMap[staffId]) {
        staffAttendanceMap[staffId].attendance.push(record);
      }
    });

    // Calculate statistics for each staff
    Object.values(staffAttendanceMap).forEach(staffData => {
      const attendance = staffData.attendance;
      const totalDays = attendance.length;
      const presentDays = attendance.filter(a => ['present', 'late'].includes(a.status)).length;
      const absentDays = attendance.filter(a => a.status === 'absent').length;
      const lateDays = attendance.filter(a => a.status === 'late').length;
      const leaveDays = attendance.filter(a => a.status === 'on-leave').length;
      const halfDays = attendance.filter(a => a.status === 'half-day').length;
      const totalWorkingHours = attendance.reduce((sum, a) => sum + (a.workingHours || 0), 0);

      staffData.statistics = {
        totalDays,
        presentDays,
        absentDays,
        lateDays,
        leaveDays,
        halfDays,
        totalWorkingHours: Math.round(totalWorkingHours * 100) / 100,
        attendancePercentage: totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0
      };
    });

    // Calculate department statistics
    const allAttendance = Object.values(staffAttendanceMap).flatMap(staff => staff.attendance);
    const departmentStats = {
      totalStaff: departmentStaff.length,
      totalRecords: allAttendance.length,
      presentRecords: allAttendance.filter(a => ['present', 'late'].includes(a.status)).length,
      absentRecords: allAttendance.filter(a => a.status === 'absent').length,
      lateRecords: allAttendance.filter(a => a.status === 'late').length,
      leaveRecords: allAttendance.filter(a => a.status === 'on-leave').length,
      averageAttendance: allAttendance.length > 0 ? 
        Math.round((allAttendance.filter(a => ['present', 'late'].includes(a.status)).length / allAttendance.length) * 100) : 0
    };

    res.json({
      department,
      dateFilter,
      staffAttendance: Object.values(staffAttendanceMap),
      departmentStats
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching department attendance report", error: error.message });
  }
});

// @desc Calculate Attendance-Based Salary
// @route POST /staff-attendance/calculate-salary
// @access Private (Admin only)
const calculateAttendanceBasedSalary = asyncHandler(async (req, res) => {
  const { staffId, month, year } = req.body;
  
  console.log('=== CALCULATE SALARY REQUEST ===');
  console.log('Staff ID:', staffId);
  console.log('Month:', month);
  console.log('Year:', year);
  
  if (!staffId || !month || !year) {
    console.log('Missing required parameters');
    return res.status(400).json({ message: "Staff ID, month, and year are required" });
  }

  try {
    // Get staff details
    const staff = await Staff.findById(staffId);
    if (!staff) {
      console.log('Staff not found:', staffId);
      return res.status(404).json({ message: "Staff not found" });
    }

    console.log('Staff found:', staff.name, 'Salary Type:', staff.salaryType);

    if (staff.salaryType !== 'attendance-based') {
      console.log('Staff is not on attendance-based salary:', staff.salaryType);
      return res.status(400).json({ message: "Staff is not on attendance-based salary" });
    }

    // Get attendance data for the month
    const startOfMonth = `${year}-${month.toString().padStart(2, '0')}-01`;
    const endOfMonth = new Date(year, month, 0).toISOString().split('T')[0];

    const attendanceRecords = await StaffAttendance.find({
      staffId,
      date: {
        $gte: startOfMonth,
        $lte: endOfMonth
      }
    });

    console.log('Date range:', startOfMonth, 'to', endOfMonth);
    console.log('Found attendance records:', attendanceRecords.length);

    // Calculate working days and hours
    const presentDays = attendanceRecords.filter(record => 
      ['present', 'late'].includes(record.status)
    ).length;

    const totalWorkingHours = attendanceRecords.reduce((sum, record) => 
      sum + (record.workingHours || 0), 0
    );

    const leaveDays = attendanceRecords.filter(record => 
      record.status === 'on-leave'
    ).length;

    // Calculate salary based on attendance - PRIORITIZE HOURS-BASED CALCULATION
    let calculatedSalary = 0;
    const baseSalary = staff.baseSalary || 0;
    const dailyRate = staff.dailyRate || 0;
    const hourlyRate = staff.hourlyRate || 0;
    const minimumWorkingDays = staff.minimumWorkingDays || 22;

    console.log('Salary Calculation Method Selection:', {
      totalWorkingHours,
      hourlyRate,
      dailyRate,
      baseSalary,
      presentDays,
      leaveDays
    });

    // Method 1: Hourly rate calculation (HIGHEST PRIORITY - most accurate)
    if (hourlyRate > 0 && totalWorkingHours > 0) {
      calculatedSalary = totalWorkingHours * hourlyRate;
      console.log('Using Method 1 - Hourly Rate:', totalWorkingHours, '*', hourlyRate, '=', calculatedSalary);
    }
    // Method 2: Daily rate but calculated based on actual hours worked
    else if (dailyRate > 0) {
      // Calculate equivalent days based on hours (9 hours = 1 full day)
      const equivalentDays = totalWorkingHours / 9;
      const leaveHours = leaveDays * 9; // Assume full day leave = 9 hours
      const leaveEquivalentDays = leaveHours / 9;
      calculatedSalary = (equivalentDays * dailyRate) + (leaveEquivalentDays * dailyRate * 0.5); // Half pay for leave
      console.log('Using Method 2 - Daily Rate with Hours:', equivalentDays, '*', dailyRate, '+ leave bonus =', calculatedSalary);
    }
    // Method 3: Base salary calculated proportionally based on actual hours
    else if (baseSalary > 0) {
      // Calculate based on actual hours worked vs expected hours
      const expectedMonthlyHours = minimumWorkingDays * 9; // 9 hours per day
      const actualHoursIncludingLeave = totalWorkingHours + (leaveDays * 9 * 0.5); // Half credit for leave days
      const hoursPercentage = Math.min(actualHoursIncludingLeave / expectedMonthlyHours, 1); // Cap at 100%
      calculatedSalary = baseSalary * hoursPercentage;
      console.log('Using Method 3 - Base Salary with Hours:', baseSalary, '*', hoursPercentage, '=', calculatedSalary);
    }

    // Check for perfect attendance bonus (no late, no leave, no absent, no half-day)
    const lateRecords = attendanceRecords.filter(record => record.status === 'late').length;
    const leaveRecords = attendanceRecords.filter(record => record.status === 'on-leave').length;
    const absentRecords = attendanceRecords.filter(record => record.status === 'absent').length;
    const halfDayRecords = attendanceRecords.filter(record => record.status === 'half-day').length;
    
    const isPerfectAttendance = lateRecords === 0 && leaveRecords === 0 && absentRecords === 0 && halfDayRecords === 0 && presentDays > 0;
    
    // Add Rs. 1500 bonus for perfect attendance (no late, no leave, no absent)
    if (isPerfectAttendance) {
      calculatedSalary += 1500; // Rs. 1500 perfect attendance bonus
      console.log('Perfect attendance bonus applied: Rs. 1500');
    } else {
      console.log('Perfect attendance bonus not applicable:', {
        lateRecords,
        leaveRecords,
        absentRecords,
        halfDayRecords,
        presentDays
      });
    }

    console.log('Salary calculation results:');
    console.log('Present Days:', presentDays);
    console.log('Base Salary:', baseSalary);
    console.log('Daily Rate:', dailyRate);
    console.log('Hourly Rate:', hourlyRate);
    console.log('Calculated Salary:', Math.round(calculatedSalary));

    // Update staff salary
    await Staff.findByIdAndUpdate(staffId, { salary: Math.round(calculatedSalary) });

    res.json({
      staffId,
      staffName: staff.name,
      month,
      year,
      attendanceStats: {
        presentDays,
        totalWorkingHours,
        leaveDays,
        lateRecords,
        leaveRecords,
        absentRecords,
        halfDayRecords,
        attendancePercentage: Math.round((presentDays / minimumWorkingDays) * 100),
        isPerfectAttendance
      },
      salaryCalculation: {
        baseSalary,
        dailyRate,
        hourlyRate,
        calculatedSalary: Math.round(calculatedSalary),
        perfectAttendanceBonus: isPerfectAttendance ? 1500 : 0,
        bonusApplied: isPerfectAttendance
      }
    });

  } catch (error) {
    console.error('Error calculating salary:', error);
    res.status(500).json({ message: "Error calculating salary", error: error.message });
  }
});

// @desc Get Today's Attendance Status
// @route GET /staff-attendance/today/:staffId
// @access Private (Staff)
const getTodayAttendanceStatus = asyncHandler(async (req, res) => {
  const { staffId } = req.params;
  
  if (!staffId) {
    return res.status(400).json({ message: "Staff ID is required" });
  }

  try {
    const today = new Date().toISOString().split('T')[0];
    
    const todayAttendance = await StaffAttendance.findOne({
      staffId,
      date: today
    }).populate('markedBy', 'name');

    const staff = await Staff.findById(staffId).select('name employeeId department');

    res.json({
      staff,
      today: today,
      attendance: todayAttendance,
      hasCheckedIn: !!todayAttendance?.checkInTime,
      hasCheckedOut: !!todayAttendance?.checkOutTime,
      canCheckIn: !todayAttendance?.checkInTime,
      canCheckOut: !!todayAttendance?.checkInTime && !todayAttendance?.checkOutTime
    });

  } catch (error) {
    res.status(500).json({ message: "Error fetching today's attendance", error: error.message });
  }
});

// @desc Test endpoint
// @route GET /staff-attendance/test
// @access Private
const testEndpoint = asyncHandler(async (req, res) => {
  res.json({
    message: 'Staff attendance API is working!',
    timestamp: new Date().toISOString(),
    routes: [
      'GET /staff-attendance/test',
      'GET /staff-attendance/today/:staffId',
      'GET /staff-attendance/history/:staffId',
      'POST /staff-attendance/checkin',
      'PUT /staff-attendance/checkout'
    ]
  });
});

// @desc Auto-mark staff as half-day if no checkout by end of day
// @route POST /staff-attendance/auto-mark-half-day
// @access Private (Admin/System)
const autoMarkHalfDay = asyncHandler(async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    // Find all attendance records for today that have check-in but no check-out
    const incompleteAttendance = await StaffAttendance.find({
      date: today,
      checkInTime: { $ne: null },
      checkOutTime: null,
      status: { $in: ['present', 'late'] } // Only for present/late staff
    });

    console.log(`Found ${incompleteAttendance.length} incomplete attendance records for ${today}`);

    const updatedRecords = [];
    
    for (const attendance of incompleteAttendance) {
      // Auto-checkout at end of day and mark as half-day
      const autoCheckoutTime = endOfDay;
      const workingHours = attendance.checkInTime ? 
        (autoCheckoutTime - attendance.checkInTime) / (1000 * 60 * 60) : 0;

      const updatedAttendance = await StaffAttendance.findByIdAndUpdate(
        attendance._id,
        {
          checkOutTime: autoCheckoutTime,
          workingHours: Math.round(workingHours * 100) / 100,
          status: 'half-day',
          notes: (attendance.notes || '') + ' [Auto-marked as half-day - no checkout]'
        },
        { new: true }
      );

      updatedRecords.push({
        staffName: attendance.staffName,
        employeeId: attendance.employeeId,
        workingHours: Math.round(workingHours * 100) / 100,
        autoCheckoutTime: autoCheckoutTime
      });

      console.log(`Auto-marked ${attendance.staffName} as half-day (${Math.round(workingHours * 100) / 100} hours)`);
    }

    res.json({
      message: `Auto-marked ${updatedRecords.length} staff as half-day`,
      date: today,
      updatedRecords
    });

  } catch (error) {
    console.error('Error auto-marking half-day:', error);
    res.status(500).json({ message: "Error auto-marking half-day", error: error.message });
  }
});

module.exports = {
  staffCheckIn,
  staffCheckOut,
  hodMarkAttendance,
  getStaffAttendanceHistory,
  getMonthlyLeaveStats,
  getDepartmentStaffAttendanceReport,
  getTodayAttendanceStatus,
  calculateAttendanceBasedSalary,
  autoMarkHalfDay,
  testEndpoint
};