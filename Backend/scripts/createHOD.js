// Backend/scripts/createHOD.js
const mongoose = require('mongoose');
const Staff = require('../models/Staff');
const bcrypt = require('bcrypt');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/Edutack';

async function createHOD() {
  await mongoose.connect(MONGO_URI);
  const existing = await Staff.findOne({ role: 'HOD', department: 'Computer Science and Engineering (CSE)' });
  if (existing) {
    console.log('HOD already exists:', existing._id.toString());
    process.exit(0);
  }
  const hashedPwd = await bcrypt.hash('yourpassword', 10);
  const staffObj = {
    employeeId: 1,
    username: 'hod',
    name: 'HOD',
    email: 'hod@example.com',
    department: 'Computer Science and Engineering (CSE)',
    password: hashedPwd,
    role: 'HOD',
    approved: true,
  };
  const hod = await Staff.create(staffObj);
  console.log('Created HOD:', hod._id.toString());
  process.exit(0);
}

createHOD(); 