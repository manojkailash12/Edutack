const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const Staff = require('../models/Staff');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test';

async function createTestPapersForAllSections() {
  await mongoose.connect(MONGO_URI);
  const department = 'Computer Science and Engineering (CSE)';
  const year = '2025-2026';
  const semester = 'VII';
  const sections = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'];

  // Find any teacher in the department
  const teacher = await Staff.findOne({ department, role: { $in: ['teacher', 'HOD'] } });
  if (!teacher) {
    console.log('No teacher found in department. Please create a teacher first.');
    await mongoose.disconnect();
    return;
  }

  for (const section of sections) {
    const paperName = `Test Paper for ${section}`;
    // Check if paper already exists
    const existing = await Paper.findOne({ department, year, sections: section, paper: paperName });
    if (existing) {
      console.log(`Test paper already exists for ${section}.`);
      continue;
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
    console.log(`Test paper for ${section} created successfully.`);
  }
  await mongoose.disconnect();
  console.log('Test papers for all sections created.');
}

createTestPapersForAllSections().catch(err => {
  console.error('Error creating test papers:', err);
  process.exit(1);
}); 