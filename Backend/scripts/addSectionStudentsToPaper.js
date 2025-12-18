// Script to add all students in the database to a paper's students array
const mongoose = require('mongoose');
const Student = require('../models/Student');
const Paper = require('../models/Paper');

// === CONFIGURE THESE ===
const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority'; // <-- set your DB name
const PAPER_ID = 'YOUR_PAPER_ID_HERE'; // <-- set your paper ObjectId
// =======================

async function addAllStudentsToPaper(paperId) {
  await mongoose.connect(MONGO_URI);

  // Find all students (no section filter)
  const students = await Student.find({});
  if (!students.length) {
    console.log('No students found in the database.');
    await mongoose.disconnect();
    return;
  }

  // Get their IDs
  const studentIds = students.map(s => s._id);

  // Add them to the paper's students array (no duplicates)
  const paper = await Paper.findById(paperId);
  if (!paper) {
    console.log('Paper not found');
    await mongoose.disconnect();
    return;
  }

  // Merge and deduplicate
  const merged = Array.from(new Set([...(paper.students || []), ...studentIds]));

  paper.students = merged;
  await paper.save();

  console.log(`Added ${studentIds.length} students to paper ${paper.paper} (${paper._id})`);
  await mongoose.disconnect();
}

addAllStudentsToPaper(PAPER_ID); 