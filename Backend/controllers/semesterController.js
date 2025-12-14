const asyncHandler = require("express-async-handler");
const SemesterSettings = require("../models/SemesterSettings");
const Staff = require("../models/Staff");

// @desc Get semester settings for a department
// @route GET /semester/settings/:department
// @access Private (HOD/Admin)
const getSemesterSettings = asyncHandler(async (req, res) => {
  const { department } = req.params;
  const { academicYear } = req.query;
  
  try {
    let query = { department, isActive: true };
    if (academicYear) {
      query.academicYear = academicYear;
    }
    
    const settings = await SemesterSettings.find(query)
      .populate('createdBy', 'name')
      .populate('updatedBy', 'name')
      .sort({ semester: 1 });
    
    res.json({
      settings,
      count: settings.length
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching semester settings", error: error.message });
  }
});

// @desc Create or update semester settings
// @route POST /semester/settings
// @access Private (HOD only)
const createOrUpdateSemesterSettings = asyncHandler(async (req, res) => {
  const { department, academicYear, semester, startDate, endDate, description } = req.body;
  const { userId } = req.body; // This should come from auth middleware in real app
  
  if (!department || !academicYear || !semester || !startDate || !endDate) {
    return res.status(400).json({ message: "All required fields must be provided" });
  }
  
  // Verify user is HOD of the department
  const staff = await Staff.findById(userId);
  if (!staff || staff.role !== 'HOD' || staff.department !== department) {
    return res.status(403).json({ message: "Only HODs can manage semester settings for their department" });
  }
  
  try {
    // Check if settings already exist
    const existingSettings = await SemesterSettings.findOne({
      department,
      academicYear,
      semester
    });
    
    if (existingSettings) {
      // Update existing settings
      existingSettings.startDate = new Date(startDate);
      existingSettings.endDate = new Date(endDate);
      existingSettings.description = description || "";
      existingSettings.updatedBy = userId;
      
      await existingSettings.save();
      
      res.json({
        message: "Semester settings updated successfully",
        settings: existingSettings
      });
    } else {
      // Create new settings
      const newSettings = new SemesterSettings({
        department,
        academicYear,
        semester,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        description: description || "",
        createdBy: userId
      });
      
      await newSettings.save();
      
      res.status(201).json({
        message: "Semester settings created successfully",
        settings: newSettings
      });
    }
  } catch (error) {
    if (error.message.includes('End date must be after start date')) {
      res.status(400).json({ message: "End date must be after start date" });
    } else {
      res.status(500).json({ message: "Error saving semester settings", error: error.message });
    }
  }
});

// @desc Delete semester settings
// @route DELETE /semester/settings/:id
// @access Private (HOD only)
const deleteSemesterSettings = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { userId } = req.body;
  
  try {
    const settings = await SemesterSettings.findById(id);
    if (!settings) {
      return res.status(404).json({ message: "Semester settings not found" });
    }
    
    // Verify user is HOD of the department
    const staff = await Staff.findById(userId);
    if (!staff || staff.role !== 'HOD' || staff.department !== settings.department) {
      return res.status(403).json({ message: "Only HODs can delete semester settings for their department" });
    }
    
    await SemesterSettings.findByIdAndDelete(id);
    
    res.json({ message: "Semester settings deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting semester settings", error: error.message });
  }
});

// @desc Check if a date is within semester range
// @route GET /semester/validate-date/:department/:semester
// @access Private
const validateAttendanceDate = asyncHandler(async (req, res) => {
  const { department, semester } = req.params;
  const { date, academicYear } = req.query;
  
  if (!date) {
    return res.status(400).json({ message: "Date is required" });
  }
  
  try {
    const checkDate = new Date(date);
    const currentYear = academicYear || "2024-2025"; // Default academic year
    
    const settings = await SemesterSettings.findOne({
      department,
      semester,
      academicYear: currentYear,
      isActive: true
    });
    
    if (!settings) {
      return res.json({
        isValid: false,
        message: "No semester settings found for this department and semester",
        requiresSetup: true
      });
    }
    
    const isValid = checkDate >= settings.startDate && checkDate <= settings.endDate;
    
    res.json({
      isValid,
      message: isValid 
        ? "Date is within semester range" 
        : `Date must be between ${settings.startDate.toDateString()} and ${settings.endDate.toDateString()}`,
      semesterStart: settings.startDate,
      semesterEnd: settings.endDate,
      settings
    });
  } catch (error) {
    res.status(500).json({ message: "Error validating date", error: error.message });
  }
});

// @desc Get current active semester for department
// @route GET /semester/current/:department
// @access Private
const getCurrentSemester = asyncHandler(async (req, res) => {
  const { department } = req.params;
  const { academicYear } = req.query;
  
  try {
    const currentDate = new Date();
    const currentYear = academicYear || "2024-2025";
    
    const activeSemester = await SemesterSettings.findOne({
      department,
      academicYear: currentYear,
      isActive: true,
      startDate: { $lte: currentDate },
      endDate: { $gte: currentDate }
    }).populate('createdBy', 'name');
    
    if (!activeSemester) {
      return res.json({
        activeSemester: null,
        message: "No active semester found for current date"
      });
    }
    
    res.json({
      activeSemester,
      message: "Active semester found"
    });
  } catch (error) {
    res.status(500).json({ message: "Error finding active semester", error: error.message });
  }
});

module.exports = {
  getSemesterSettings,
  createOrUpdateSemesterSettings,
  deleteSemesterSettings,
  validateAttendanceDate,
  getCurrentSemester
};