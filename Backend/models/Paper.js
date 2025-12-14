const mongoose = require("mongoose");

// Individual Paper in a Course
const paperSchema = new mongoose.Schema({
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
  paper: {
    type: String,
    required: true,
  },
  sections: {
    type: [String],
    enum: ['ALPHA','BETA','GAMMA','DELTA','SIGMA','OMEGA','ZETA','EPSILON'],
    required: true
  },
  students: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Student",
      default: [],
    },
  ],
  teacher: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Staff",
  },
});

module.exports = mongoose.model("Paper", paperSchema);
