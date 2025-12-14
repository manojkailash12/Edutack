const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  rollNo: {
    type: String,
    required: true,
    unique: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  department: {
    type: String,
    required: true,
  },
  section: {
    type: String,
    enum: ['ALPHA','BETA','GAMMA','DELTA','SIGMA','OMEGA','ZETA','EPSILON'],
    required: true,
  },
  year: {
    type: String,
    required: true,
  },
  profilePhoto: {
    type: String,
    default: null,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Student", studentSchema);
