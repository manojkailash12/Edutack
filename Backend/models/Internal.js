const mongoose = require("mongoose");

// Internal Result of Students
const internalSchema = new mongoose.Schema({
  paper: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Paper",
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
});

module.exports = mongoose.model("Internal", internalSchema);
