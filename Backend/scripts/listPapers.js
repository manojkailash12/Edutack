const mongoose = require('mongoose');
const Paper = require('../models/Paper');
const Staff = require('../models/Staff');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function listPapers() {
  await mongoose.connect(MONGO_URI);
  const papers = await Paper.find({}).populate('teacher', 'name').lean();
  if (!papers.length) {
    console.log('No papers found in the database.');
  } else {
    console.log('Papers in the database:');
    papers.forEach(p => {
      console.log(`- Paper: ${p.paper}\n  Year: ${p.year}\n  Department: ${p.department}\n  Sections: ${p.sections.join(', ')}\n  Teacher: ${p.teacher?.name || '-'}\n`);
    });
  }
  await mongoose.disconnect();
}

listPapers().catch(err => {
  console.error('Error listing papers:', err);
  process.exit(1);
}); 