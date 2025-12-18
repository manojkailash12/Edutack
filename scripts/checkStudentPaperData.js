// Usage: node scripts/checkStudentPaperData.js
const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

const Student = require('../Backend/models/Student');
const Paper = require('../Backend/models/Paper');

async function main() {
  await mongoose.connect(MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true });

  const papers = await Paper.find({});
  const students = await Student.find({});

  // Check for students with no matching paper
  console.log('--- Students with no matching paper ---');
  let foundMismatch = false;
  for (const student of students) {
    const matchingPaper = papers.find(paper =>
      paper.department === student.department &&
      paper.year === student.year &&
      paper.sections.includes(student.section)
    );
    if (!matchingPaper) {
      foundMismatch = true;
      console.log(`Student: ${student.name} (${student.rollNo}) | Dept: ${student.department} | Year: ${student.year} | Section: ${student.section}`);
    }
  }
  if (!foundMismatch) console.log('All students have a matching paper.');

  // Check for papers with sections that have no matching students
  console.log('\n--- Papers with sections that have no matching students ---');
  let foundPaperMismatch = false;
  for (const paper of papers) {
    for (const section of paper.sections) {
      const matchingStudent = students.find(student =>
        student.department === paper.department &&
        student.year === paper.year &&
        student.section === section
      );
      if (!matchingStudent) {
        foundPaperMismatch = true;
        console.log(`Paper: ${paper.paper} | Dept: ${paper.department} | Year: ${paper.year} | Section: ${section}`);
      }
    }
  }
  if (!foundPaperMismatch) console.log('All paper sections have at least one matching student.');

  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Error running check:', err);
  process.exit(1);
}); 