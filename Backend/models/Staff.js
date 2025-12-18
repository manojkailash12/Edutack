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
    enum: ["teacher", "HOD", "admin"],
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
  salary: {
    type: Number,
    default: 0,
  },
  baseSalary: {
    type: Number,
    default: 0,
  },
  salaryType: {
    type: String,
    enum: ["fixed", "attendance-based"],
    default: "fixed",
  },
  dailyRate: {
    type: Number,
    default: 0,
  },
  hourlyRate: {
    type: Number,
    default: 0,
  },
  minimumWorkingDays: {
    type: Number,
    default: 22, // Standard working days per month
  },
  minimumWorkingHours: {
    type: Number,
    default: 9, // Standard working hours per day (updated from 8 to 9)
  },
  joiningDate: {
    type: Date,
    default: Date.now,
  },
  qualification: {
    type: String,
    default: "",
  },
  experience: {
    type: Number,
    default: 0,
  },
  phoneNumber: {
    type: String,
    default: "",
  },
  address: {
    type: String,
    default: "",
  },
}, {
  timestamps: true,
});

module.exports = mongoose.model("Staff", staffSchema);
