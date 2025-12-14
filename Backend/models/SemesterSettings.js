const mongoose = require("mongoose");

/**
 * SemesterSettings Model - Controls semester date ranges for attendance
 * Only HODs can set these dates
 */
const semesterSettingsSchema = new mongoose.Schema({
  department: {
    type: String,
    required: true,
  },
  academicYear: {
    type: String,
    required: true, // e.g., "2024-2025"
  },
  semester: {
    type: String,
    enum: ['I','II','III','IV','V','VI','VII','VIII'],
    required: true,
  },
  startDate: {
    type: Date,
    required: true,
  },
  endDate: {
    type: Date,
    required: true,
  },
  isActive: {
    type: Boolean,
    default: true,
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true,
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
  },
  description: {
    type: String,
    default: "",
  }
}, {
  timestamps: true
});

// Compound index to ensure unique semester settings per department/year/semester
semesterSettingsSchema.index({ 
  department: 1, 
  academicYear: 1, 
  semester: 1 
}, { unique: true });

// Validation: End date must be after start date
semesterSettingsSchema.pre('save', function(next) {
  if (this.endDate <= this.startDate) {
    next(new Error('End date must be after start date'));
  } else {
    next();
  }
});

module.exports = mongoose.model("SemesterSettings", semesterSettingsSchema);