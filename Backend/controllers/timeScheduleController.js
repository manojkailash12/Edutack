const asyncHandler = require("express-async-handler");
const TimeSchedule = require("../models/TimeSchedule");
const Paper = require("../models/Paper");
const Staff = require("../models/Staff");

// @desc Get All Time Schedules
// @route GET /time-schedule
// @access Private
const getAllTimeSchedules = asyncHandler(async (req, res) => {
  const timeSchedules = await TimeSchedule.find()
    .populate('paper', 'paper semester')
    .populate('teacher', 'name')
    .populate('createdBy', 'name')
    .sort({ day: 1, hour: 1, section: 1 })
    .exec();

  res.json(timeSchedules);
});

// @desc Get Time Schedules by Department
// @route GET /time-schedule/department/:department
// @access Private
const getTimeSchedulesByDepartment = asyncHandler(async (req, res) => {
  if (!req?.params?.department) {
    return res.status(400).json({ message: "Department parameter required" });
  }

  const timeSchedules = await TimeSchedule.find({ 
    department: req.params.department,
    isActive: true 
  })
    .populate('paper', 'paper semester')
    .populate('teacher', 'name')
    .populate('createdBy', 'name')
    .sort({ day: 1, hour: 1, section: 1 })
    .exec();

  res.json(timeSchedules);
});

// @desc Get Time Schedules by Teacher
// @route GET /time-schedule/teacher/:teacherId
// @access Private
const getTimeSchedulesByTeacher = asyncHandler(async (req, res) => {
  const teacherId = req?.params?.teacherId;
  
  if (!teacherId) {
    return res.status(400).json({ message: "Teacher ID required" });
  }

  console.log(`=== FETCHING TIMETABLE FOR TEACHER: ${teacherId} ===`);
  const startTime = Date.now();

  try {
    const timeSchedules = await TimeSchedule.find({ 
      teacher: teacherId,
      isActive: true 
    })
      .populate('paper', 'paper semester')
      .select('paper day hour section room semester isActive')
      .sort({ day: 1, hour: 1, section: 1 })
      .lean() // Use lean() for better performance
      .exec();

    const endTime = Date.now();
    console.log(`Timetable query completed in ${endTime - startTime}ms, found ${timeSchedules.length} schedules`);

    res.json(timeSchedules);
  } catch (error) {
    console.error('Error fetching teacher timetable:', error);
    res.status(500).json({ message: "Error fetching timetable", error: error.message });
  }
});

// @desc Get Current Time Slot for Teacher
// @route GET /time-schedule/current/:teacherId
// @access Private
const getCurrentTimeSlot = asyncHandler(async (req, res) => {
  if (!req?.params?.teacherId) {
    return res.status(400).json({ message: "Teacher ID required" });
  }

  const now = new Date();
  const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
  const currentHour = Math.floor(now.getHours() / 4) + 1; // Convert 24h to 6-hour slots

  const currentTimeSlots = await TimeSchedule.find({
    teacher: req.params.teacherId,
    day: currentDay,
    hour: currentHour.toString(),
    isActive: true
  })
    .populate('paper', 'paper semester')
    .populate('teacher', 'name')
    .exec();

  res.json(currentTimeSlots);
});

// @desc Add Time Schedule
// @route POST /time-schedule
// @access Private (HOD only)
const addTimeSchedule = asyncHandler(async (req, res) => {
  const { department, semester, year, day, hour, paper, teacher, section, room } = req.body;

  // Confirm Data
  if (!department || !semester || !year || !day || !hour || !paper || !teacher || !section) {
    return res.status(400).json({ message: "All fields are required" });
  }

  // Check if teacher exists and is approved
  const teacherExists = await Staff.findById(teacher);
  if (!teacherExists || teacherExists.role !== 'teacher' || !teacherExists.approved) {
    return res.status(400).json({ message: "Invalid teacher selected" });
  }

  // Check if paper exists
  const paperExists = await Paper.findById(paper);
  if (!paperExists) {
    return res.status(400).json({ message: "Invalid paper selected" });
  }

  // Check for conflicts (same time slot for same section)
  const conflicts = await TimeSchedule.find({
    department,
    semester,
    year,
    day,
    hour,
    section,
    isActive: true
  });

  if (conflicts.length > 0) {
    return res.status(409).json({ 
      message: "Time slot conflict detected for this section",
      conflicts: conflicts.map(c => ({
        paper: c.paper,
        section: c.section,
        teacher: c.teacher
      }))
    });
  }

  const timeScheduleObj = {
    department,
    semester,
    year,
    day,
    hour,
    paper,
    teacher,
    section,
    room: room || "Not Assigned",
    createdBy: req.user._id
  };

  const timeSchedule = await TimeSchedule.create(timeScheduleObj);

  if (timeSchedule) {
    res.status(201).json({
      message: `Time schedule added for ${day} Hour ${hour} Section ${section}`,
      timeSchedule
    });
  } else {
    res.status(400).json({ message: "Invalid data received" });
  }
});

// @desc Generate Complete Timetable for All Sections
// @route POST /time-schedule/generate/:department/:semester/:year
// @access Private (HOD only)
const generateCompleteTimetable = asyncHandler(async (req, res) => {
  const { department, semester, year } = req.params;

  if (!department || !semester || !year) {
    return res.status(400).json({ message: "Department, semester, and year required" });
  }

  // Decode URL parameters and normalize
  const clean = (str) => (str ? decodeURIComponent(str).replace(/\s+/g, ' ').trim() : '');
  const departmentClean = clean(department);
  const semesterClean = clean(semester);
  const yearClean = clean(year);
  
  // Find papers with exact match
  const papers = await Paper.find({ 
    department: departmentClean,
    semester: semesterClean,
    year: yearClean
  }).populate('teacher', 'name approved');

  if (papers.length === 0) {
    return res.status(400).json({ 
      message: `No papers found for ${department} department, semester ${semester}, and year ${year}.`,
      searchedFor: { departmentClean, semesterClean, yearClean }
    });
  }

  // Only use papers with valid teacher and at least one section
  const validPapers = papers.filter(paper => paper.teacher && paper.teacher.approved && Array.isArray(paper.sections) && paper.sections.length > 0);
  
  if (validPapers.length === 0) {
    const paperDetails = papers.map(p => ({
      paper: p.paper,
      hasTeacher: !!p.teacher,
      teacherApproved: p.teacher?.approved,
      teacherName: p.teacher?.name,
      sections: p.sections,
      sectionsValid: Array.isArray(p.sections) && p.sections.length > 0
    }));
    return res.status(400).json({ 
      message: "No valid papers with assigned teacher and sections found for timetable generation.",
      paperDetails,
      requirements: {
        needsTeacher: true,
        needsApprovedTeacher: true,
        needsSections: true
      }
    });
  }

  // Define allSections as all unique sections from validPapers
  const allSections = Array.from(new Set(validPapers.flatMap(p => p.sections)));
  
  // Timetable grid - Define days and hours first
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = ['1', '2', '3', '4'];

  // Validate that we have enough papers for each section
  const sectionPaperCount = {};
  allSections.forEach(section => {
    sectionPaperCount[section] = validPapers.filter(paper => paper.sections.includes(section)).length;
  });
  
  // Check if any section has insufficient papers
  const insufficientSections = allSections.filter(section => sectionPaperCount[section] === 0);
  
  if (insufficientSections.length > 0) {
    return res.status(400).json({ 
      message: `No papers found for sections: ${insufficientSections.join(', ')}. Please assign papers to these sections first.`,
      insufficientSections,
      sectionPaperCount
    });
  }
  
  // Warn if any section has very few papers (less than 3)
  const lowPaperSections = allSections.filter(section => sectionPaperCount[section] < 3);
  let warnings = [];
  if (lowPaperSections.length > 0) {
    warnings.push(`Sections with limited papers (may have repeated subjects): ${lowPaperSections.map(s => `${s}(${sectionPaperCount[s]} papers)`).join(', ')}`);
  }
    
  // Remove all previous schedules for this department/semester/year
  await TimeSchedule.deleteMany({ department: departmentClean, semester: semesterClean, year: yearClean });

  let generatedSchedules = [];
  let skippedSlots = [];

  // For each section, for each day/hour, assign a paper/teacher
  // Track for each section/day which papers are already used
  // Track for each day/hour which teachers are already assigned (across sections)
  const sectionDayUsedPapers = {};
  const dayHourUsedTeachers = {};

  for (const section of allSections) {
    sectionDayUsedPapers[section] = {};
    for (const day of days) {
      sectionDayUsedPapers[section][day] = new Set();
    }
  }
  for (const day of days) {
    dayHourUsedTeachers[day] = {};
    for (const hour of hours) {
      dayHourUsedTeachers[day][hour] = new Set();
    }
  }

  // Optimized algorithm with batch creation to prevent timeouts
  const schedulesToCreate = [];
  const paperUsageCount = {};
  validPapers.forEach(paper => {
    paperUsageCount[paper._id.toString()] = 0;
  });
  
  for (const day of days) {
    for (const hour of hours) {
      for (const section of allSections) {
        let assignedPaper = null;
        
        // Get papers available for this section
        const sectionPapers = validPapers.filter(paper => paper.sections.includes(section));
        
        if (sectionPapers.length === 0) {
          skippedSlots.push({ section, day, hour, reason: "No papers available for this section" });
          continue;
        }
        
        // Priority 1: Find papers not used today and teacher not assigned at this time
        let availablePapers = sectionPapers.filter(paper =>
          !sectionDayUsedPapers[section][day].has(paper._id.toString()) &&
          !dayHourUsedTeachers[day][hour].has(paper.teacher._id.toString())
        );
        
        if (availablePapers.length > 0) {
          // Sort by usage count to prefer less-used papers
          availablePapers.sort((a, b) => paperUsageCount[a._id.toString()] - paperUsageCount[b._id.toString()]);
          assignedPaper = availablePapers[0];
        } else {
          // Priority 2: Allow teacher conflicts but avoid same paper on same day
          availablePapers = sectionPapers.filter(paper =>
            !sectionDayUsedPapers[section][day].has(paper._id.toString())
          );
          
          if (availablePapers.length > 0) {
            availablePapers.sort((a, b) => paperUsageCount[a._id.toString()] - paperUsageCount[b._id.toString()]);
            assignedPaper = availablePapers[0];
          } else {
            // Priority 3: Last resort - assign least used paper
            sectionPapers.sort((a, b) => paperUsageCount[a._id.toString()] - paperUsageCount[b._id.toString()]);
            assignedPaper = sectionPapers[0];
          }
        }
        
        // Prepare schedule for batch creation
        if (assignedPaper) {
          schedulesToCreate.push({
            department: departmentClean,
            semester: semesterClean,
            year: yearClean,
            day,
            hour,
            paper: assignedPaper._id,
            teacher: assignedPaper.teacher._id,
            section,
            createdBy: req.user._id
          });
          
          // Update tracking
          sectionDayUsedPapers[section][day].add(assignedPaper._id.toString());
          dayHourUsedTeachers[day][hour].add(assignedPaper.teacher._id.toString());
          paperUsageCount[assignedPaper._id.toString()]++;
        } else {
          skippedSlots.push({ section, day, hour, reason: "No papers available for this section" });
        }
      }
    }
  }
  
  // Batch create all schedules at once for better performance
  try {
    generatedSchedules = await TimeSchedule.insertMany(schedulesToCreate, { ordered: false });
  } catch (err) {
    // If batch insert fails, try individual inserts
    for (const scheduleData of schedulesToCreate) {
      try {
        const newSchedule = await TimeSchedule.create(scheduleData);
        generatedSchedules.push(newSchedule);
      } catch (individualErr) {
        skippedSlots.push({ 
          section: scheduleData.section, 
          day: scheduleData.day, 
          hour: scheduleData.hour, 
          error: individualErr.message 
        });
      }
    }
  }

  // Calculate statistics
  const totalPossibleSlots = allSections.length * days.length * hours.length;
  const filledSlots = generatedSchedules.length;
  const coveragePercentage = ((filledSlots / totalPossibleSlots) * 100).toFixed(1);
  
  let responseMessage = `Timetable generated: ${filledSlots}/${totalPossibleSlots} slots filled (${coveragePercentage}% coverage)`;
  
  if (skippedSlots.length > 0) {
    responseMessage += `. ${skippedSlots.length} slots could not be filled.`;
  }
  
  res.status(201).json({
    message: responseMessage,
    generatedCount: filledSlots,
    totalSlots: totalPossibleSlots,
    coveragePercentage: parseFloat(coveragePercentage),
    sections: allSections,
    sectionPaperCount,
    warnings,
    schedules: generatedSchedules,
    skippedSlots: skippedSlots.length > 0 ? skippedSlots : undefined
  });
});

// @desc Get Complete Timetable by Section
// @route GET /time-schedule/section/:department/:semester/:year/:section
// @access Private
const getTimetableBySection = asyncHandler(async (req, res) => {
  const { department, semester, year, section } = req.params;

  if (!department || !semester || !year || !section) {
    return res.status(400).json({ message: "All parameters required" });
  }

  const timeSchedules = await TimeSchedule.find({
    department,
    semester,
    year,
    section,
    isActive: true
  })
    .populate('paper', 'paper semester')
    .populate('teacher', 'name')
    .sort({ day: 1, hour: 1 })
    .exec();

  // Create timetable matrix for this section
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = ['1', '2', '3', '4'];
  
  const timetable = {};
  
  days.forEach(day => {
    timetable[day] = {};
    hours.forEach(hour => {
      const schedule = timeSchedules.find(ts => ts.day === day && ts.hour === hour);
      timetable[day][hour] = schedule || null;
    });
  });

  res.json({
    department,
    semester,
    year,
    section,
    timetable,
    timeSchedules
  });
});

// @desc Update Time Schedule
// @route PATCH /time-schedule/:id
// @access Private (HOD only)
const updateTimeSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { department, semester, year, day, hour, paper, teacher, section, room, isActive } = req.body;

  if (!id) {
    return res.status(400).json({ message: "Time schedule ID required" });
  }

  const timeSchedule = await TimeSchedule.findById(id).exec();

  if (!timeSchedule) {
    return res.status(404).json({ message: "Time schedule not found" });
  }

  // Check for conflicts if updating time/section
  if (day && hour && section) {
    const conflicts = await TimeSchedule.find({
      _id: { $ne: id },
      department: department || timeSchedule.department,
      semester: semester || timeSchedule.semester,
      year: year || timeSchedule.year,
      day: day,
      hour: hour,
      section: section,
      isActive: true
    });

    if (conflicts.length > 0) {
      return res.status(409).json({ 
        message: "Time slot conflict detected for this section",
        conflicts: conflicts.map(c => ({
          paper: c.paper,
          section: c.section,
          teacher: c.teacher
        }))
      });
    }
  }

  // Update fields
  if (department) timeSchedule.department = department;
  if (semester) timeSchedule.semester = semester;
  if (year) timeSchedule.year = year;
  if (day) timeSchedule.day = day;
  if (hour) timeSchedule.hour = hour;
  if (paper) timeSchedule.paper = paper;
  if (teacher) timeSchedule.teacher = teacher;
  if (section) timeSchedule.section = section;
  if (room !== undefined) timeSchedule.room = room;
  if (isActive !== undefined) timeSchedule.isActive = isActive;

  const updatedTimeSchedule = await timeSchedule.save();

  res.json({
    message: "Time schedule updated successfully",
    timeSchedule: updatedTimeSchedule
  });
});

// @desc Delete Time Schedule
// @route DELETE /time-schedule/:id
// @access Private (HOD only)
const deleteTimeSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Time schedule ID required" });
  }

  const timeSchedule = await TimeSchedule.findById(id).exec();

  if (!timeSchedule) {
    return res.status(404).json({ message: "Time schedule not found" });
  }

  await timeSchedule.deleteOne();

  res.json({ message: "Time schedule deleted successfully" });
});

// @desc Get Time Schedule by ID
// @route GET /time-schedule/:id
// @access Private
const getTimeSchedule = asyncHandler(async (req, res) => {
  const { id } = req.params;

  if (!id) {
    return res.status(400).json({ message: "Time schedule ID required" });
  }

  const timeSchedule = await TimeSchedule.findById(id)
    .populate('paper', 'paper semester')
    .populate('teacher', 'name')
    .populate('createdBy', 'name')
    .exec();

  if (!timeSchedule) {
    return res.status(404).json({ message: "Time schedule not found" });
  }

  res.json(timeSchedule);
});

// @desc Get Available Papers for Teacher
// @route GET /time-schedule/available-papers/:teacherId
// @access Private
const getAvailablePapersForTeacher = asyncHandler(async (req, res) => {
  if (!req?.params?.teacherId) {
    return res.status(400).json({ message: "Teacher ID required" });
  }

  const papers = await Paper.find({ teacher: req.params.teacherId })
    .select('paper semester year sections')
    .exec();

  res.json(papers);
});

// @desc Get Timetable View (Matrix Format)
// @route GET /time-schedule/timetable/:department/:semester/:year
// @access Private
const getTimetableView = asyncHandler(async (req, res) => {
  const { department, semester, year } = req.params;

  if (!department || !semester || !year) {
    return res.status(400).json({ message: "Department, semester, and year required" });
  }

  // Decode URL parameters
  const departmentClean = decodeURIComponent(department).replace(/\s+/g, ' ').trim();
  const semesterClean = decodeURIComponent(semester).replace(/\s+/g, ' ').trim();
  const yearClean = decodeURIComponent(year).replace(/\s+/g, ' ').trim();
  
  console.log('Getting timetable view for:', { departmentClean, semesterClean, yearClean });

  const timeSchedules = await TimeSchedule.find({
    department: departmentClean,
    semester: semesterClean,
    year: yearClean,
    isActive: true
  })
    .populate('paper', 'paper')
    .populate('teacher', 'name')
    .sort({ day: 1, hour: 1, section: 1 })
    .exec();

  // Create timetable matrix for all sections
  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  const hours = ['1', '2', '3', '4'];
  const sections = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'];
  
  const timetable = {};
  
  sections.forEach(section => {
    timetable[section] = {};
    days.forEach(day => {
      timetable[section][day] = {};
      hours.forEach(hour => {
        const schedule = timeSchedules.find(ts => 
          ts.section === section && ts.day === day && ts.hour === hour
        );
        timetable[section][day][hour] = schedule || null;
      });
    });
  });

  res.json({
    department: departmentClean,
    semester: semesterClean,
    year: yearClean,
    timetable,
    timeSchedules
  });
});

// @desc Notify Teachers of Timetable Changes
// @route POST /time-schedule/notify-changes/:department
// @access Private (HOD only)
const notifyTimetableChanges = asyncHandler(async (req, res) => {
  const { department } = req.params;

  if (!department) {
    return res.status(400).json({ message: "Department parameter required" });
  }

  try {

    // Get recent timetable changes (last 24 hours)
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);

    const recentChanges = await TimeSchedule.find({
      department,
      updatedAt: { $gte: yesterday }
    }).populate('teacher', 'name email');

    // Group changes by teacher
    const changesByTeacher = {};
    recentChanges.forEach(change => {
      const teacherId = change.teacher._id.toString();
      if (!changesByTeacher[teacherId]) {
        changesByTeacher[teacherId] = {
          teacher: change.teacher,
          changes: []
        };
      }
      changesByTeacher[teacherId].changes.push({
        day: change.day,
        hour: change.hour,
        section: change.section,
        paper: change.paper,
        room: change.room,
        action: change.createdAt.getTime() === change.updatedAt.getTime() ? 'added' : 'updated'
      });
    });

    res.json({
      message: "Timetable change notifications processed",
      teachersNotified: Object.keys(changesByTeacher).length,
      changesByTeacher
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error processing timetable change notifications", 
      error: error.message 
    });
  }
});

// @desc Get Timetable Change History
// @route GET /time-schedule/changes/:teacherId
// @access Private
const getTimetableChanges = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  if (!teacherId) {
    return res.status(400).json({ message: "Teacher ID required" });
  }

  try {
    // Get timetable changes for this teacher in the last 7 days
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);

    const changes = await TimeSchedule.find({
      teacher: teacherId,
      updatedAt: { $gte: weekAgo }
    })
    .populate('paper', 'paper semester')
    .sort({ updatedAt: -1 })
    .exec();

    res.json({
      teacherId,
      changes,
      totalChanges: changes.length
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching timetable changes", 
      error: error.message 
    });
  }
});

// @desc Update Time Schedule with Change Tracking
// @route PATCH /time-schedule/:id
// @access Private (HOD only)
const updateTimeScheduleWithTracking = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    return res.status(400).json({ message: "Time schedule ID required" });
  }

  try {
    const timeSchedule = await TimeSchedule.findById(id).exec();

    if (!timeSchedule) {
      return res.status(404).json({ message: "Time schedule not found" });
    }

    // Store original data for change tracking
    const originalData = {
      day: timeSchedule.day,
      hour: timeSchedule.hour,
      paper: timeSchedule.paper,
      teacher: timeSchedule.teacher,
      section: timeSchedule.section,
      room: timeSchedule.room
    };

    // Update the time schedule
    Object.assign(timeSchedule, updateData);
    timeSchedule.updatedAt = new Date();
    
    const updatedTimeSchedule = await timeSchedule.save();

    // Populate the response
    await updatedTimeSchedule.populate('paper', 'paper semester');
    await updatedTimeSchedule.populate('teacher', 'name');

    // Check if there were significant changes
    const hasChanges = Object.keys(originalData).some(key => 
      originalData[key]?.toString() !== updateData[key]?.toString()
    );

    if (hasChanges) {
      // Log the change for notification purposes
      console.log(`Timetable change detected for teacher ${updatedTimeSchedule.teacher._id}:`, {
        original: originalData,
        updated: updateData
      });
    }

    res.json({
      message: "Time schedule updated successfully",
      timeSchedule: updatedTimeSchedule,
      hasChanges
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error updating time schedule", 
      error: error.message 
    });
  }
});

// @desc Get Current Time Slots with Real-time Updates
// @route GET /time-schedule/current/:teacherId
// @access Private
const getCurrentTimeSlotsWithUpdates = asyncHandler(async (req, res) => {
  const { teacherId } = req.params;

  if (!teacherId) {
    return res.status(400).json({ message: "Teacher ID required" });
  }

  try {
    const now = new Date();
    const currentDay = now.toLocaleDateString('en-US', { weekday: 'long' });
    const hour = now.getHours();
    const minute = now.getMinutes();
    let currentHour = null;
    // Custom timetable slot mapping - 4 hours with lunch break
    if ((hour === 9 && minute >= 30) || (hour === 10 && minute < 20)) {
      currentHour = '1'; // 9:30-10:20 (Morning 1st hour)
    } else if ((hour === 10 && minute >= 20) || (hour === 11 && minute < 10)) {
      currentHour = '2'; // 10:20-11:10 (Morning 2nd hour)
    } else if ((hour === 13 && minute >= 20) || (hour === 14 && minute < 10)) {
      currentHour = '3'; // 1:20-2:10 (Afternoon 1st hour)
    } else if ((hour === 14 && minute >= 10) || (hour === 15 && minute < 0)) {
      currentHour = '4'; // 2:10-3:00 (Afternoon 2nd hour)
    }

    // Get all active time slots for this teacher
    const timeSchedules = await TimeSchedule.find({ 
      teacher: teacherId,
      isActive: true 
    })
    .populate('paper', 'paper semester')
    .populate('teacher', 'name')
    .sort({ day: 1, hour: 1, section: 1 })
    .exec();

    // Filter current time slots (today's schedule and current hour)
    const currentTimeSlots = timeSchedules.filter(schedule => 
      schedule.day === currentDay && schedule.hour === currentHour
    );

    // Add metadata about updates
    const lastUpdate = timeSchedules.length > 0 
      ? Math.max(...timeSchedules.map(ts => ts.updatedAt.getTime()))
      : null;

    res.json({
      currentTimeSlots,
      allTimeSlots: timeSchedules,
      currentDay,
      currentHour,
      lastUpdate: lastUpdate ? new Date(lastUpdate) : null,
      totalSlots: timeSchedules.length
    });

  } catch (error) {
    res.status(500).json({ 
      message: "Error fetching current time slots", 
      error: error.message 
    });
  }
});

module.exports = {
  getAllTimeSchedules,
  getTimeSchedulesByDepartment,
  getTimeSchedulesByTeacher,
  getCurrentTimeSlot,
  addTimeSchedule,
  generateCompleteTimetable,
  getTimetableBySection,
  updateTimeSchedule,
  deleteTimeSchedule,
  getTimeSchedule,
  getAvailablePapersForTeacher,
  getTimetableView,
  notifyTimetableChanges,
  getTimetableChanges,
  updateTimeScheduleWithTracking,
  getCurrentTimeSlotsWithUpdates
};
