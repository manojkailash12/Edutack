const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
  },
  username: {
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
  role: {
    type: String,
    enum: ["teacher", "HOD"],
    default: "teacher",
  },
  approved: {
    type: Boolean,
    default: false,
  },
  profilePhoto: {
    type: String,
    default: null,
  },
  employeeId: {
    type: Number,
    unique: true,
    required: true,
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Staff", staffSchema);
