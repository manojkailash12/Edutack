// Comprehensive seeding script for semesters VI, VII, VIII
const mongoose = require('mongoose');
const Staff = require('./models/Staff');
const Student = require('./models/Student');
const Paper = require('./models/Paper');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

const department = 'Computer Science and Engineering (CSE)';
const sections = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'];

// Different subjects for each semester
const semesterSubjects = {
  'VI': ['DSA', 'OOP', 'DBMS', 'CN', 'OS', 'SE'],
  'VII': ['DL', 'BDA', 'SQT', 'MAP', 'CRT', 'SIE'], // VII semester subjects
  'VIII': ['AI', 'ML', 'CC', 'IOT', 'CS', 'BC']
};

async function createPapers() {
  console.log('Creating papers for all semesters...');
  
  // Get existing teachers
  const teachers = await Staff.find({ department, role: 'teacher' });
  const hod = await Staff.findOne({ department, role: 'HOD' });
  
  if (!teachers.length && !hod) {
    throw new Error('No teachers found in the database. Please create teachers first.');
  }
  
  const allTeachers = hod ? [hod, ...teachers] : teachers;
  console.log(`Found ${allTeachers.length} teachers: ${allTeachers.map(t => t.name).join(', ')}`);
  
  for (const semester of Object.keys(semesterSubjects)) {
    const paperNames = semesterSubjects[semester];
    console.log(`\n=== Creating papers for semester ${semester} ===`);
    console.log(`Subjects: ${paperNames.join(', ')}`);
    
    // Assign one subject per teacher with 2-3 sections
    const teacherAssignments = [];
    
    // First teacher gets 3 sections, others get 2 sections
    for (let i = 0; i < Math.min(allTeachers.length, paperNames.length); i++) {
      const teacher = allTeachers[i];
      const paperName = paperNames[i];
      const sectionsCount = i === 0 ? 3 : 2; // First teacher gets 3 sections, others get 2
      
      // Assign sections to this teacher
      const assignedSections = [];
      for (let j = 0; j < sectionsCount; j++) {
        const sectionIndex = (i * 2 + j) % sections.length; // Distribute sections evenly
        assignedSections.push(sections[sectionIndex]);
      }
      
      teacherAssignments.push({
        teacher,
        paperName,
        sections: assignedSections
      });
      
      console.log(`${teacher.name} will teach ${paperName} for sections: ${assignedSections.join(', ')}`);
    }
    
    for (const assignment of teacherAssignments) {
      const { teacher, paperName, sections: assignedSections } = assignment;
      
      for (const section of assignedSections) {
        const students = await Student.find({ department: department, section });
        console.log(`Found ${students.length} students in section ${section}`);
        
        const fullPaperName = `${paperName} - ${section} - Sem ${semester}`;
        
        // Check if paper already exists
        const existingPaper = await Paper.findOne({
          department,
          semester,
          paper: fullPaperName,
          sections: section
        });
        
        if (existingPaper) {
          console.log(`Paper already exists: ${fullPaperName}`);
          continue;
        }
        
        const paper = new Paper({
          department,
          semester,
          year: '2024',
          paper: fullPaperName,
          sections: [section],
          students: students.map(s => s._id),
          teacher: teacher._id
        });
        
        await paper.save();
        console.log(`✅ Created paper: ${fullPaperName} for teacher ${teacher.name}`);
      }
    }
  }
}

async function seed() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');
    
    // Only create papers, don't clear existing data
    console.log('Creating papers for existing teachers...');
    
    // Create papers
    await createPapers();
    
    console.log('\n✅ Paper creation complete!');
    console.log('\n📚 Semester-wise Subjects Created:');
    for (const [semester, subjects] of Object.entries(semesterSubjects)) {
      console.log(`Semester ${semester}: ${subjects.join(', ')}`);
    }
    console.log('\n🎯 Teachers can now:');
    console.log('- Create notes, assignments, and quizzes through the app');
    console.log('- Manage internal marks for their assigned sections');
    console.log('- View submissions and grade students');
    
  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seed(); 