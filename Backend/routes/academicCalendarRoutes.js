const express = require('express');
const router = express.Router();
const {
  getAcademicCalendar,
  createAcademicEvent,
  updateAcademicEvent,
  deleteAcademicEvent,
  checkHoliday,
  getEventsInRange,
  getUpcomingEvents
} = require('../controllers/academicCalendarController');

// Get all events (with optional filters)
router.get('/', getAcademicCalendar);

// Get upcoming events
router.get('/upcoming', getUpcomingEvents);

// Check if a specific date is a holiday
router.get('/check-holiday/:date', checkHoliday);

// Get events in a date range
router.get('/range/:startDate/:endDate', getEventsInRange);

// Create new event
router.post('/', createAcademicEvent);

// Update event
router.put('/:id', updateAcademicEvent);

// Delete event
router.delete('/:id', deleteAcademicEvent);

module.exports = router;