const mongoose = require('mongoose');
const Student = require('../models/Student');
const Paper = require('../models/Paper');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function assignStudentsToPapers() {
  await mongoose.connect(MONGO_URI);
  const students = await Student.find();
  let totalAssigned = 0;
  for (const student of students) {
    const papers = await Paper.find({
      department: student.department,
      year: student.year,
      sections: student.section
    });
    for (const paper of papers) {
      if (!paper.students.includes(student._id)) {
        paper.students.push(student._id);
        await paper.save();
        totalAssigned++;
        console.log(`Assigned student ${student.name} (${student.rollNo}) to paper ${paper.paper}`);
      }
    }
  }
  await mongoose.disconnect();
  console.log(`Assignment complete. Total assignments made: ${totalAssigned}`);
}

assignStudentsToPapers().catch(err => {
  console.error('Error assigning students to papers:', err);
  process.exit(1);
}); 