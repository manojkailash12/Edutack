const mongoose = require('mongoose');

const staffAttendanceSchema = new mongoose.Schema({
  staffId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    required: true
  },
  employeeId: {
    type: String,
    required: true
  },
  staffName: {
    type: String,
    required: true
  },
  department: {
    type: String,
    required: true
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  checkInTime: {
    type: Date,
    default: null
  },
  checkOutTime: {
    type: Date,
    default: null
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'late', 'half-day', 'on-leave'],
    default: 'absent'
  },
  attendanceMethod: {
    type: String,
    enum: ['manual', 'face-scan', 'hod-marked'],
    default: 'manual'
  },
  location: {
    type: String,
    default: null
  },
  notes: {
    type: String,
    maxlength: 200,
    default: null
  },
  markedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Staff',
    default: null // null if self-marked, staffId if marked by HOD
  },
  workingHours: {
    type: Number,
    default: 0 // in hours
  },
  isHoliday: {
    type: Boolean,
    default: false
  },
  leaveReference: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'StaffLeave',
    default: null
  }
}, {
  timestamps: true
});

// Compound index for efficient queries
staffAttendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
staffAttendanceSchema.index({ department: 1, date: 1 });
staffAttendanceSchema.index({ date: 1 });

module.exports = mongoose.model('StaffAttendance', staffAttendanceSchema);