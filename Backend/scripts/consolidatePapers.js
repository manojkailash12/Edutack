const mongoose = require('mongoose');
const Paper = require('../models/Paper');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function consolidatePapers() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('✅ Connected to MongoDB');

    // Find all papers grouped by teacher, department, semester, year, and paper name
    const papers = await Paper.find({}).populate('teacher', 'name').lean();
    
    // Group papers by teacher + subject combination
    const groupedPapers = {};
    
    papers.forEach(paper => {
      const key = `${paper.teacher?._id}-${paper.department}-${paper.semester}-${paper.year}-${paper.paper}`;
      
      if (!groupedPapers[key]) {
        groupedPapers[key] = [];
      }
      groupedPapers[key].push(paper);
    });

    console.log(`📊 Found ${Object.keys(groupedPapers).length} unique teacher-subject combinations`);

    let consolidatedCount = 0;
    let deletedCount = 0;

    // Process each group
    for (const [key, paperGroup] of Object.entries(groupedPapers)) {
      if (paperGroup.length > 1) {
        console.log(`\n🔄 Consolidating ${paperGroup.length} papers for: ${paperGroup[0].paper} (Teacher: ${paperGroup[0].teacher?.name})`);
        
        // Combine all sections
        const allSections = [];
        const allStudents = new Set();
        
        paperGroup.forEach(paper => {
          paper.sections.forEach(section => {
            if (!allSections.includes(section)) {
              allSections.push(section);
            }
          });
          
          paper.students.forEach(studentId => {
            allStudents.add(studentId.toString());
          });
        });

        // Keep the first paper and update it with all sections and students
        const masterPaper = paperGroup[0];
        
        await Paper.findByIdAndUpdate(masterPaper._id, {
          sections: allSections,
          students: Array.from(allStudents).map(id => new mongoose.Types.ObjectId(id))
        });

        console.log(`  ✅ Updated master paper with sections: ${allSections.join(', ')}`);
        console.log(`  ✅ Combined ${allStudents.size} unique students`);

        // Delete the duplicate papers
        const duplicateIds = paperGroup.slice(1).map(p => p._id);
        await Paper.deleteMany({ _id: { $in: duplicateIds } });
        
        console.log(`  🗑️  Deleted ${duplicateIds.length} duplicate papers`);
        
        consolidatedCount++;
        deletedCount += duplicateIds.length;
      }
    }

    console.log(`\n🎉 Consolidation complete!`);
    console.log(`📈 Consolidated ${consolidatedCount} teacher-subject combinations`);
    console.log(`🗑️  Deleted ${deletedCount} duplicate papers`);
    console.log(`📊 Total papers after consolidation: ${papers.length - deletedCount}`);

    // Verify the results
    const finalPapers = await Paper.find({}).populate('teacher', 'name').lean();
    console.log(`\n📋 Final paper count: ${finalPapers.length}`);
    
    // Show consolidated papers
    console.log('\n📚 Consolidated Papers:');
    finalPapers.forEach(paper => {
      console.log(`  - ${paper.paper} (${paper.teacher?.name || 'No Teacher'}) - Sections: ${paper.sections.join(', ')} - Students: ${paper.students.length}`);
    });

  } catch (error) {
    console.error('❌ Error consolidating papers:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Run the consolidation
consolidatePapers();