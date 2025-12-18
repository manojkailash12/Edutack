const mongoose = require('mongoose');
const Paper = require('./models/Paper');
const Staff = require('./models/Staff');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function checkAndSeedData() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check existing papers
    const papers = await Paper.find({});
    console.log(`\n=== CURRENT DATABASE STATE ===`);
    console.log(`Total papers: ${papers.length}`);

    if (papers.length === 0) {
      console.log('\n❌ No papers found in database!');
      console.log('Need to seed data first.');
      
      // Check if teachers exist
      const teachers = await Staff.find({ role: { $in: ['teacher', 'HOD'] } });
      console.log(`Teachers available: ${teachers.length}`);
      
      if (teachers.length === 0) {
        console.log('❌ No teachers found! Please add teachers first.');
      } else {
        console.log('✅ Teachers found, ready to seed papers');
        console.log('Run: node seedPapers.js "Computer Science and Engineering (CSE)" VII');
      }
    } else {
      console.log('\n=== PAPERS BREAKDOWN ===');
      
      // Group by department, semester, year
      const breakdown = {};
      papers.forEach(paper => {
        const key = `${paper.department} | ${paper.semester} | ${paper.year}`;
        if (!breakdown[key]) {
          breakdown[key] = [];
        }
        breakdown[key].push(paper);
      });

      Object.entries(breakdown).forEach(([key, paperList]) => {
        console.log(`\n${key}: ${paperList.length} papers`);
        paperList.slice(0, 3).forEach(paper => {
          console.log(`  - ${paper.paper} (Teacher: ${paper.teacher ? '✅' : '❌'}, Sections: ${paper.sections?.join(',') || 'None'})`);
        });
        if (paperList.length > 3) {
          console.log(`  ... and ${paperList.length - 3} more`);
        }
      });

      console.log('\n=== UNIQUE VALUES ===');
      const departments = await Paper.distinct('department');
      const semesters = await Paper.distinct('semester');
      const years = await Paper.distinct('year');
      
      console.log(`Departments: ${departments.join(', ')}`);
      console.log(`Semesters: ${semesters.join(', ')}`);
      console.log(`Years: ${years.join(', ')}`);
    }

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkAndSeedData();