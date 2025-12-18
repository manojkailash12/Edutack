const mongoose = require('mongoose');
const Student = require('../models/Student');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function updateStudentYear() {
  await mongoose.connect(MONGO_URI);
  // Update this to the student's rollNo or email
  const rollNo = '2211CS010399';
  const newYear = '2025-2026';

  const student = await Student.findOne({ rollNo });
  if (!student) {
    console.log('Student not found.');
    await mongoose.disconnect();
    return;
  }
  student.year = newYear;
  await student.save();
  console.log(`Updated year for ${student.name} (${student.rollNo}) to ${newYear}`);
  await mongoose.disconnect();
}

updateStudentYear().catch(err => {
  console.error('Error updating student year:', err);
  process.exit(1);
}); 