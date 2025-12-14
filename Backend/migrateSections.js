// Migration script to update section names from S1-S8 to Greek letters
const mongoose = require('mongoose');
const Student = require('./models/Student');
const Paper = require('./models/Paper');
const TimeSchedule = require('./models/TimeSchedule');
const Assignment = require('./models/Assignment');
const Quiz = require('./models/Quiz');
const Notes = require('./models/Notes');
const Attendance = require('./models/Attendance');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/';

// Section mapping
const sectionMapping = {
  'S1': 'ALPHA',
  'S2': 'BETA',
  'S3': 'GAMMA',
  'S4': 'DELTA',
  'S5': 'SIGMA',
  'S6': 'OMEGA',
  'S7': 'ZETA',
  'S8': 'EPSILON'
};

async function migrateSections() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Update Students collection
    console.log('Updating Students collection...');
    for (const [oldSection, newSection] of Object.entries(sectionMapping)) {
      const result = await Student.updateMany(
        { section: oldSection },
        { $set: { section: newSection } }
      );
      console.log(`Updated ${result.modifiedCount} students from ${oldSection} to ${newSection}`);
    }

    // Update Papers collection - sections array
    console.log('Updating Papers collection...');
    const papers = await Paper.find({});
    for (const paper of papers) {
      let updated = false;
      const newSections = paper.sections.map(section => {
        if (sectionMapping[section]) {
          updated = true;
          return sectionMapping[section];
        }
        return section;
      });
      
      if (updated) {
        await Paper.findByIdAndUpdate(paper._id, { sections: newSections });
        console.log(`Updated paper ${paper.paper} sections: ${paper.sections.join(', ')} -> ${newSections.join(', ')}`);
      }
    }

    // Update TimeSchedule collection
    console.log('Updating TimeSchedule collection...');
    for (const [oldSection, newSection] of Object.entries(sectionMapping)) {
      const result = await TimeSchedule.updateMany(
        { section: oldSection },
        { $set: { section: newSection } }
      );
      console.log(`Updated ${result.modifiedCount} time schedules from ${oldSection} to ${newSection}`);
    }

    // Update Assignment collection
    console.log('Updating Assignment collection...');
    for (const [oldSection, newSection] of Object.entries(sectionMapping)) {
      const result = await Assignment.updateMany(
        { section: oldSection },
        { $set: { section: newSection } }
      );
      console.log(`Updated ${result.modifiedCount} assignments from ${oldSection} to ${newSection}`);
    }

    // Update Quiz collection
    console.log('Updating Quiz collection...');
    for (const [oldSection, newSection] of Object.entries(sectionMapping)) {
      const result = await Quiz.updateMany(
        { section: oldSection },
        { $set: { section: newSection } }
      );
      console.log(`Updated ${result.modifiedCount} quizzes from ${oldSection} to ${newSection}`);
    }

    // Update Notes collection
    console.log('Updating Notes collection...');
    for (const [oldSection, newSection] of Object.entries(sectionMapping)) {
      const result = await Notes.updateMany(
        { section: oldSection },
        { $set: { section: newSection } }
      );
      console.log(`Updated ${result.modifiedCount} notes from ${oldSection} to ${newSection}`);
    }

    // Update Attendance collection
    console.log('Updating Attendance collection...');
    for (const [oldSection, newSection] of Object.entries(sectionMapping)) {
      const result = await Attendance.updateMany(
        { section: oldSection },
        { $set: { section: newSection } }
      );
      console.log(`Updated ${result.modifiedCount} attendance records from ${oldSection} to ${newSection}`);
    }

    console.log('Migration completed successfully!');
    await mongoose.disconnect();
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

// Run the migration
migrateSections();