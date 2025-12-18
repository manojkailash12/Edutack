const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const Staff = require('./models/Staff');
const Student = require('./models/Student');

const MONGO_URI = 'mongodb://localhost:27017/edutack';

const departments = [
  'Computer Science and Engineering',
  'Information Technology',
  'Electronics and Communication Engineering',
  'Electrical and Electronics Engineering',
  'Mechanical Engineering',
  'Civil Engineering'
];

const sections = ['ALPHA', 'BETA', 'GAMMA', 'DELTA', 'SIGMA', 'OMEGA', 'ZETA', 'EPSILON'];

async function seedInitialData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Check if data already exists
    const existingStaff = await Staff.countDocuments();
    const existingStudents = await Student.countDocuments();

    if (existingStaff > 0 || existingStudents > 0) {
      console.log('Data already exists. Skipping seed.');
      return;
    }

    console.log('Creating initial staff and students...');

    // Create sample staff for each department
    const staffData = [];
    let employeeId = 1;

    for (const dept of departments) {
      // Create HOD for each department
      const hodPassword = await bcrypt.hash('hod123', 10);
      staffData.push({
        name: `HOD ${dept.split(' ')[0]}`,
        email: `hod.${dept.toLowerCase().replace(/\s+/g, '')}@edutack.com`,
        username: `hod_${dept.toLowerCase().replace(/\s+/g, '_')}`,
        password: hodPassword,
        department: dept,
        role: 'HOD',
        approved: true,
        employeeId: employeeId++
      });

      // Create 2-3 teachers for each department
      for (let i = 1; i <= 3; i++) {
        const teacherPassword = await bcrypt.hash('teacher123', 10);
        staffData.push({
          name: `Teacher ${i} ${dept.split(' ')[0]}`,
          email: `teacher${i}.${dept.toLowerCase().replace(/\s+/g, '')}@edutack.com`,
          username: `teacher${i}_${dept.toLowerCase().replace(/\s+/g, '_')}`,
          password: teacherPassword,
          department: dept,
          role: 'teacher',
          approved: true,
          employeeId: employeeId++
        });
      }
    }

    // Create admin
    const adminPassword = await bcrypt.hash('admin123', 10);
    staffData.push({
      name: 'System Administrator',
      email: 'admin@edutack.com',
      username: 'admin',
      password: adminPassword,
      department: 'Administration',
      role: 'admin',
      approved: true,
      employeeId: employeeId++
    });

    await Staff.insertMany(staffData);
    console.log(`✅ Created ${staffData.length} staff members`);

    // Create sample students for each department
    const studentData = [];
    let rollNoCounter = 1;

    for (const dept of departments) {
      // Create 5 students per section for first 3 sections
      for (let sectionIndex = 0; sectionIndex < 3; sectionIndex++) {
        const section = sections[sectionIndex];
        
        for (let i = 1; i <= 5; i++) {
          const studentPassword = await bcrypt.hash('student123', 10);
          const rollNo = `${dept.split(' ')[0].toUpperCase()}${String(rollNoCounter).padStart(3, '0')}`;
          
          studentData.push({
            name: `Student ${i} ${section} ${dept.split(' ')[0]}`,
            rollNo: rollNo,
            email: `${rollNo.toLowerCase()}@student.edutack.com`,
            password: studentPassword,
            department: dept,
            section: section,
            year: '2024-25'
          });
          
          rollNoCounter++;
        }
      }
    }

    await Student.insertMany(studentData);
    console.log(`✅ Created ${studentData.length} students`);

    console.log('\n🎉 Initial data seeded successfully!');
    console.log('\n📋 Login Credentials:');
    console.log('Admin: admin@edutack.com / admin123');
    console.log('HOD: hod.computerscienceandengineering@edutack.com / hod123');
    console.log('Teacher: teacher1.computerscienceandengineering@edutack.com / teacher123');
    console.log('Student: cse001@student.edutack.com / student123');
    
    console.log('\n🏢 Departments created:');
    departments.forEach(dept => console.log(`- ${dept}`));

  } catch (error) {
    console.error('Error during seeding:', error);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB');
  }
}

seedInitialData();