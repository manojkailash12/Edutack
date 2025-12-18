const mongoose = require("mongoose");

const externalMarksSchema = new mongoose.Schema({
  paper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paper",
    required: true
  },
  student: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Student",
    required: true
  },
  externalMarks: {
    type: Number,
    min: 0,
    max: 40,
    required: true
  },
  addedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
    required: true
  },
  addedDate: {
    type: Date,
    default: Date.now
  },
  academicYear: {
    type: String,
    required: true,
    default: "2025-2026"
  },
  semester: {
    type: String,
    required: true,
    enum: ["Semester 1", "Semester 2", "Semester 3", "Semester 4", "Semester 5", "Semester 6", "Semester 7", "Semester 8"]
  }
}, {
  timestamps: true,
});

// Indexes for efficient querying
externalMarksSchema.index({ paper: 1, student: 1, academicYear: 1, semester: 1 }, { unique: true });
externalMarksSchema.index({ addedBy: 1 });
externalMarksSchema.index({ addedDate: -1 });

module.exports = mongoose.model("ExternalMarks", externalMarksSchema);