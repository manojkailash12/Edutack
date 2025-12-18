// Usage: node seedPapers.js <department> [semester]
const mongoose = require('mongoose');
const Staff = require('./models/Staff');
const Student = require('./models/Student');
const Paper = require('./models/Paper');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority'; // Atlas connection
const department = process.argv[2] || 'Computer Science and Engineering (CSE)';
const semester = process.argv[3] || 'VII'; // Default to VII, can be VI, VII, or VIII
const sections = ['ALPHA','BETA','GAMMA','DELTA','SIGMA','OMEGA','ZETA','EPSILON'];

// Semester-specific subjects
const semesterSubjects = {
  'VI': ['DSA', 'OOP', 'DBMS', 'CN', 'OS', 'SE'],
  'VII': ['DL', 'BDA', 'SQT', 'MAP', 'CRT', 'SIE'], // VII semester subjects
  'VIII': ['AI', 'ML', 'CC', 'IOT', 'CS', 'BC']
};

// Validate semester
const validSemesters = ['VI', 'VII', 'VIII'];
if (!validSemesters.includes(semester)) {
  console.error('Invalid semester. Please use VI, VII, or VIII');
  process.exit(1);
}

const paperNames = semesterSubjects[semester];

async function seed() {
  await mongoose.connect(MONGO_URI);
  const teachers = await Staff.find({ department, role: { $in: ['teacher', 'HOD'] } });
  if (!teachers.length) throw new Error('No teachers found');
  
  console.log(`Creating papers for semester ${semester} with subjects: ${paperNames.join(', ')}`);
  console.log(`Found ${teachers.length} teachers: ${teachers.map(t => t.name).join(', ')}`);
  
  // Assign one subject per teacher with 2-3 sections
  const teacherAssignments = [];
  
  // First teacher gets 3 sections, others get 2 sections
  for (let i = 0; i < Math.min(teachers.length, paperNames.length); i++) {
      const teacher = teachers[i];
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
        const fullPaperName = paperName + ' - ' + section + ' - Sem ' + semester;
      
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
          year: '2025-2026',
          paper: fullPaperName,
        sections: [section], // Use sections array instead of single section
          students: [], // Let the automatic assignment handle this
          teacher: teacher._id,
        });
        await paper.save();
        
        // Automatically assign students to this paper
        const matchingStudents = await Student.find({
          department: department,
          year: paper.year,
          section: section
        }).select('_id');

        if (matchingStudents.length > 0) {
          paper.students = matchingStudents.map(s => s._id);
          await paper.save();
          console.log(`✅ Created paper ${fullPaperName} for teacher ${teacher.name} section ${section} semester ${semester} with ${matchingStudents.length} students auto-assigned`);
        } else {
          console.log(`✅ Created paper ${fullPaperName} for teacher ${teacher.name} section ${section} semester ${semester} (no students found for auto-assignment)`);
        }
    }
  }
  await mongoose.disconnect();
  console.log(`Seeding complete for ${department} department, semester ${semester}.`);
}

seed().catch(e => { console.error(e); process.exit(1); }); 
