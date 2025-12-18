const AcademicCalendar = require('../models/AcademicCalendar');
const asyncHandler = require('express-async-handler');

// @desc Get all academic calendar events
// @route GET /academic-calendar
// @access Public (all roles can view)
const getAcademicCalendar = asyncHandler(async (req, res) => {
  try {
    const { year, month, type } = req.query;
    
    let filter = { isActive: true };
    
    // Filter by year and month if provided
    if (year && month) {
      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);
      filter.$or = [
        { startDate: { $gte: startDate, $lte: endDate } },
        { endDate: { $gte: startDate, $lte: endDate } },
        { startDate: { $lte: startDate }, endDate: { $gte: endDate } }
      ];
    }
    
    // Filter by type if provided
    if (type) {
      filter.type = type;
    }
    
    const events = await AcademicCalendar.find(filter)
      .populate('createdBy', 'name')
      .sort({ startDate: 1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching academic calendar', error: error.message });
  }
});

// @desc Create new academic calendar event
// @route POST /academic-calendar
// @access Private (Admin only)
const createAcademicEvent = asyncHandler(async (req, res) => {
  try {
    const { title, description, startDate, endDate, type, isRecurring, recurringType, createdBy } = req.body;
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }
    
    const event = new AcademicCalendar({
      title,
      description,
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      type,
      isRecurring: isRecurring || false,
      recurringType: recurringType || 'weekly',
      createdBy: createdBy || '000000000000000000000000' // Default ObjectId if not provided
    });
    
    const savedEvent = await event.save();
    await savedEvent.populate('createdBy', 'name');
    
    res.status(201).json(savedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Error creating academic event', error: error.message });
  }
});

// @desc Update academic calendar event
// @route PUT /academic-calendar/:id
// @access Private (Admin only)
const updateAcademicEvent = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const { title, description, startDate, endDate, type, isRecurring, recurringType } = req.body;
    
    // Validate dates
    if (new Date(startDate) > new Date(endDate)) {
      return res.status(400).json({ message: 'Start date cannot be after end date' });
    }
    
    const event = await AcademicCalendar.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Academic event not found' });
    }
    
    // Update fields
    event.title = title;
    event.description = description;
    event.startDate = new Date(startDate);
    event.endDate = new Date(endDate);
    event.type = type;
    event.isRecurring = isRecurring || false;
    event.recurringType = recurringType || 'weekly';
    
    const updatedEvent = await event.save();
    await updatedEvent.populate('createdBy', 'name');
    
    res.json(updatedEvent);
  } catch (error) {
    res.status(500).json({ message: 'Error updating academic event', error: error.message });
  }
});

// @desc Delete academic calendar event
// @route DELETE /academic-calendar/:id
// @access Private (Admin only)
const deleteAcademicEvent = asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    
    const event = await AcademicCalendar.findById(id);
    
    if (!event) {
      return res.status(404).json({ message: 'Academic event not found' });
    }
    
    // Soft delete by setting isActive to false
    event.isActive = false;
    await event.save();
    
    res.json({ message: 'Academic event deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting academic event', error: error.message });
  }
});

// @desc Check if a specific date is a holiday
// @route GET /academic-calendar/check-holiday/:date
// @access Public
const checkHoliday = asyncHandler(async (req, res) => {
  try {
    const { date } = req.params;
    const checkDate = new Date(date);
    
    // Check if it's Sunday
    const isSunday = AcademicCalendar.isSunday(checkDate);
    
    // Check if it's a holiday
    const holiday = await AcademicCalendar.isHoliday(checkDate);
    
    // Check if classes should be held
    const shouldHoldClasses = await AcademicCalendar.shouldHoldClasses(checkDate);
    
    res.json({
      date: checkDate,
      isSunday,
      isHoliday: !!holiday,
      holidayDetails: holiday,
      shouldHoldClasses
    });
  } catch (error) {
    res.status(500).json({ message: 'Error checking holiday status', error: error.message });
  }
});

// @desc Get events for a specific date range
// @route GET /academic-calendar/range/:startDate/:endDate
// @access Public
const getEventsInRange = asyncHandler(async (req, res) => {
  try {
    const { startDate, endDate } = req.params;
    
    const events = await AcademicCalendar.find({
      isActive: true,
      $or: [
        { startDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { endDate: { $gte: new Date(startDate), $lte: new Date(endDate) } },
        { startDate: { $lte: new Date(startDate) }, endDate: { $gte: new Date(endDate) } }
      ]
    })
    .populate('createdBy', 'name')
    .sort({ startDate: 1 });
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching events in range', error: error.message });
  }
});

// @desc Get upcoming events (next 30 days)
// @route GET /academic-calendar/upcoming
// @access Public
const getUpcomingEvents = asyncHandler(async (req, res) => {
  try {
    const today = new Date();
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(today.getDate() + 30);
    
    const events = await AcademicCalendar.find({
      isActive: true,
      startDate: { $gte: today, $lte: thirtyDaysFromNow }
    })
    .populate('createdBy', 'name')
    .sort({ startDate: 1 })
    .limit(10);
    
    res.json(events);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching upcoming events', error: error.message });
  }
});

module.exports = {
  getAcademicCalendar,
  createAcademicEvent,
  updateAcademicEvent,
  deleteAcademicEvent,
  checkHoliday,
  getEventsInRange,
  getUpcomingEvents
};