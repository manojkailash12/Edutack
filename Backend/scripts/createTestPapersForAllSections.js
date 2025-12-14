const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const Staff = require('../models/Staff');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test';

async function createTestPapersForAllSections() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected.');
    const department = 'Computer Science and Engineering (CSE)';
    const year = '2025-2026';
    const semester = 'VII';
    const sections = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'];

    // Find any teacher in the department
    console.log('Looking for a teacher in department:', department);
    const teacher = await Staff.findOne({ department, role: { $in: ['teacher', 'HOD'] } });
    if (!teacher) {
      console.log('No teacher found in department. Please create a teacher first.');
      await mongoose.disconnect();
      return;
    }
    console.log('Using teacher:', teacher.name, teacher._id.toString());

    for (const section of sections) {
      const paperName = `Test Paper for ${section}`;
      try {
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
      } catch (err) {
        console.error(`Error creating paper for section ${section}:`, err);
      }
    }
    await mongoose.disconnect();
    console.log('Test papers for all sections created.');
  } catch (err) {
    console.error('Fatal error:', err);
    process.exit(1);
  }
}

createTestPapersForAllSections(); 