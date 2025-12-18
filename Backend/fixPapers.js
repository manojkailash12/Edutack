const mongoose = require('mongoose');
const Paper = require('./models/Paper');
const Staff = require('./models/Staff');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function fixPapers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Get valid teachers
    const teachers = await Staff.find({ role: { $in: ['teacher', 'HOD'] }, approved: true });
    console.log('Valid teachers:', teachers.map(t => `${t.name} (${t._id})`));

    // Find papers with invalid teacher IDs
    const papers = await Paper.find({});
    
    for (const paper of papers) {
      const teacherExists = await Staff.findById(paper.teacher);
      if (!teacherExists) {
        console.log(`\n❌ Paper "${paper.paper}" has invalid teacher ID: ${paper.teacher}`);
        
        // Assign to the first available teacher
        if (teachers.length > 0) {
          const newTeacher = teachers[0];
          paper.teacher = newTeacher._id;
          await paper.save();
          console.log(`✅ Fixed: Assigned to ${newTeacher.name} (${newTeacher._id})`);
        }
      } else {
        console.log(`✅ Paper "${paper.paper}" has valid teacher: ${teacherExists.name}`);
      }
    }

    console.log('\n=== FINAL STATE ===');
    const updatedPapers = await Paper.find({}).populate('teacher', 'name approved');
    updatedPapers.forEach(paper => {
      console.log(`${paper.paper}: ${paper.teacher?.name} (Approved: ${paper.teacher?.approved})`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

fixPapers();