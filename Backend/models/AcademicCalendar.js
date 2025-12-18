const mongoose = require('mongoose');

const academicCalendarSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  startDate: {
    type: Date,
    required: true
  },
  endDate: {
    type: Date,
    required: true
  },
  type: {
    type: String,
    enum: ['holiday', 'exam', 'event', 'break'],
    default: 'holiday'
  },
  isRecurring: {
    type: Boolean,
    default: false
  },
  recurringType: {
    type: String,
    enum: ['weekly', 'monthly', 'yearly'],
    default: 'weekly'
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Index for efficient date queries
academicCalendarSchema.index({ startDate: 1, endDate: 1 });
academicCalendarSchema.index({ type: 1 });

// Method to check if a date falls within this event
academicCalendarSchema.methods.isDateInEvent = function(date) {
  const checkDate = new Date(date);
  return checkDate >= this.startDate && checkDate <= this.endDate;
};

// Static method to get events for a specific date
academicCalendarSchema.statics.getEventsForDate = function(date) {
  const checkDate = new Date(date);
  return this.find({
    isActive: true,
    startDate: { $lte: checkDate },
    endDate: { $gte: checkDate }
  });
};

// Static method to check if a date is a holiday
academicCalendarSchema.statics.isHoliday = function(date) {
  const checkDate = new Date(date);
  return this.findOne({
    isActive: true,
    type: 'holiday',
    startDate: { $lte: checkDate },
    endDate: { $gte: checkDate }
  });
};

// Static method to check if it's Sunday
academicCalendarSchema.statics.isSunday = function(date) {
  const checkDate = new Date(date);
  return checkDate.getDay() === 0; // Sunday is 0
};

// Static method to check if classes should be held (not holiday, not Sunday)
academicCalendarSchema.statics.shouldHoldClasses = async function(date) {
  const checkDate = new Date(date);
  
  // Check if it's Sunday
  if (this.isSunday(checkDate)) {
    return false;
  }
  
  // Check if it's a holiday
  const holiday = await this.isHoliday(checkDate);
  if (holiday) {
    return false;
  }
  
  return true;
};

module.exports = mongoose.model('AcademicCalendar', academicCalendarSchema);