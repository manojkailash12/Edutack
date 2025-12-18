const mongoose = require('mongoose');
const Paper = require('./models/Paper');
const Staff = require('./models/Staff');
const TimeSchedule = require('./models/TimeSchedule');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function testGeneration() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const department = "Computer Science and Engineering (CSE)";
    const semester = "VII";
    const year = "2025-2026";

    console.log(`Testing generation for: ${department} | ${semester} | ${year}`);

    // Test the same logic as the controller
    const papers = await Paper.find({ 
      department,
      semester,
      year
    }).populate('teacher', 'name approved');

    console.log(`\nFound ${papers.length} papers:`);
    papers.forEach(paper => {
      console.log(`- ${paper.paper}: Teacher=${paper.teacher?.name}, Approved=${paper.teacher?.approved}, Sections=${paper.sections?.length}`);
    });

    // Filter valid papers
    const validPapers = papers.filter(paper => 
      paper.teacher && 
      paper.teacher.approved && 
      Array.isArray(paper.sections) && 
      paper.sections.length > 0
    );

    console.log(`\nValid papers: ${validPapers.length}`);
    
    if (validPapers.length > 0) {
      const allSections = Array.from(new Set(validPapers.flatMap(p => p.sections)));
      console.log(`Sections: ${allSections.join(', ')}`);
      
      const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const hours = ['1', '2', '3', '4'];
      const totalSlots = allSections.length * days.length * hours.length;
      
      console.log(`Total slots needed: ${totalSlots}`);
      console.log('✅ Ready for timetable generation!');
      
      // Clean up any existing schedules
      const deleted = await TimeSchedule.deleteMany({ department, semester, year });
      console.log(`Cleaned up ${deleted.deletedCount} existing schedules`);
      
    } else {
      console.log('❌ No valid papers found for generation');
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testGeneration();