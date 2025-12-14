const mongoose = require("mongoose");

/**
 * TimeSchedule Model - 4-Hour Daily Schedule
 * 
 * Daily Schedule:
 * Hour 1: 9:30 - 10:20 (Morning 1st period)
 * Hour 2: 10:20 - 11:10 (Morning 2nd period)
 * Lunch Break: 12:20 - 1:20 (1 hour break)
 * Hour 3: 1:20 - 2:10 (Afternoon 1st period)
 * Hour 4: 2:10 - 3:00 (Afternoon 2nd period)
 */
const timeScheduleSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
  },
  semester: {
    type: String,
    enum: ['I','II','III','IV','V','VI','VII','VIII'],
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  day: {
    type: String,
    enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
    required: true,
  },
  hour: {
    type: String,
    enum: ['1', '2', '3', '4'], // 4-hour system: 1-2 (morning), lunch break 12:20-1:20, 3-4 (afternoon)
    required: true,
  },
  paper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paper",
    required: true,
  },
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
  section: {
    type: String,
    enum: ['ALPHA','BETA','GAMMA','DELTA','SIGMA','OMEGA','ZETA','EPSILON'],
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true
  }
}, {
  timestamps: true
});

// Compound index to ensure unique time slots per section
timeScheduleSchema.index({ 
  department: 1, 
  semester: 1, 
  year: 1, 
  day: 1, 
  hour: 1, 
  section: 1 
}, { unique: true });

module.exports = mongoose.model("TimeSchedule", timeScheduleSchema);
