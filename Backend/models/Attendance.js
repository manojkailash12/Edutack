const mongoose = require("mongoose");

// Attendance of Students
const attendanceSchema = new mongoose.Schema(
  {
    paper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Paper",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    section: {
      type: String,
      required: true,
    },
    teacherId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: true,
    },
    students: [
      {
        student: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Student",
        },
        rollNo: {
          type: String,
        },
        name: {
          type: String,
        },
        status: {
          type: String,
          enum: ["present", "absent", "on_leave"],
          default: "present",
        },
        leaveType: {
          type: String,
        },
        leaveReason: {
          type: String,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Attendance", attendanceSchema);
