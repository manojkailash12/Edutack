const mongoose = require('mongoose');
const Paper = require('./models/Paper');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function checkPapers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const papers = await Paper.find({});
    console.log(`Found ${papers.length} papers:`);
    
    papers.forEach((paper, index) => {
      console.log(`\n${index + 1}. ${paper.paper}`);
      console.log(`   Department: "${paper.department}"`);
      console.log(`   Semester: "${paper.semester}"`);
      console.log(`   Year: "${paper.year}"`);
      console.log(`   Teacher ID: ${paper.teacher || 'None'}`);
      console.log(`   Sections: [${paper.sections?.join(', ') || 'None'}]`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkPapers();