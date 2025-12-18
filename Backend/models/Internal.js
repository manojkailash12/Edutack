const mongoose = require("mongoose");

// Internal Result of Students
const internalSchema = new mongoose.Schema({
  paper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paper",
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
  },
  marks: [
    {
      _id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Student",
        required: true,
      },
      rollNo: String,
      name: String,
      midMarks: {
        type: Number,
        required: true,
      },
      lab: {
        type: Number,
        required: true,
      },
      assignmentQuiz: {
        type: Number,
        required: true,
      },
      attendance: {
        type: Number,
        required: true,
      },
      total: {
        type: Number,
        required: true,
      },
    },
  ],
}, {
  timestamps: true,
});

// Indexes for efficient querying
internalSchema.index({ paper: 1, academicYear: 1, semester: 1 });
internalSchema.index({ "marks._id": 1 });

module.exports = mongoose.model("Internal", internalSchema);
