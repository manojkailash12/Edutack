const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const Staff = require('../models/Staff');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test';

async function createTestPaperForSection() {
  await mongoose.connect(MONGO_URI);
  const department = 'Computer Science and Engineering (CSE)';
  const year = '2025-2026';
  const section = 'SIGMA';
  const semester = 'VII';
  const paperName = 'Test Paper for SIGMA';

  // Find any teacher in the department
  const teacher = await Staff.findOne({ department, role: { $in: ['teacher', 'HOD'] } });
  if (!teacher) {
    console.log('No teacher found in department. Please create a teacher first.');
    await mongoose.disconnect();
    return;
  }

  // Check if paper already exists
  const existing = await Paper.findOne({ department, year, sections: section, paper: paperName });
  if (existing) {
    console.log('Test paper already exists for S5.');
    await mongoose.disconnect();
    return;
  }

  const paper = new Paper({
    department,
    year,
    semester,
    paper: paperName,
    sections: [section],
    teacher: teacher._id,
    students: [],
  });
  await paper.save();
  console.log('Test paper for S5 created successfully.');
  await mongoose.disconnect();
}

createTestPaperForSection().catch(err => {
  console.error('Error creating test paper:', err);
  process.exit(1);
}); 