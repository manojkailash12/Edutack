const mongoose = require('mongoose');
const connectDB = require('./config/dbConn');
const SemesterSettings = require('./models/SemesterSettings');
const Staff = require('./models/Staff');

async function seedSemesterSettings() {
  try {
    // Connect to database
    await connectDB();
    console.log('Connected to database');

    // Find an HOD to use as creator (or create a default one)
    let hod = await Staff.findOne({ role: 'HOD' });
    
    if (!hod) {
      console.log('No HOD found. Please create an HOD first.');
      return;
    }

    console.log(`Using HOD: ${hod.name} (${hod.department})`);

    // Sample semester settings based on your requirement
    const semesterData = [
      {
        department: hod.department,
        academicYear: '2024-2025',
        semester: 'I',
        startDate: new Date('2025-06-02'), // 02-06-2025
        endDate: new Date('2025-12-02'),   // 02-12-2025
        description: 'First semester 2024-25',
        createdBy: hod._id
      },
      {
        department: hod.department,
        academicYear: '2024-2025',
        semester: 'II',
        startDate: new Date('2025-01-06'), // January start
        endDate: new Date('2025-05-30'),   // May end
        description: 'Second semester 2024-25',
        createdBy: hod._id
      },
      {
        department: hod.department,
        academicYear: '2024-2025',
        semester: 'III',
        startDate: new Date('2025-06-02'),
        endDate: new Date('2025-12-02'),
        description: 'Third semester 2024-25',
        createdBy: hod._id
      },
      {
        department: hod.department,
        academicYear: '2024-2025',
        semester: 'IV',
        startDate: new Date('2025-01-06'),
        endDate: new Date('2025-05-30'),
        description: 'Fourth semester 2024-25',
        createdBy: hod._id
      }
    ];

    // Clear existing settings for this department and year
    await SemesterSettings.deleteMany({
      department: hod.department,
      academicYear: '2024-2025'
    });

    console.log('Cleared existing semester settings');

    // Insert new settings
    const createdSettings = await SemesterSettings.insertMany(semesterData);
    
    console.log(`\n✅ Created ${createdSettings.length} semester settings:`);
    createdSettings.forEach(setting => {
      console.log(`- Semester ${setting.semester}: ${setting.startDate.toDateString()} to ${setting.endDate.toDateString()}`);
    });

    console.log('\n🎯 Semester-based attendance control is now active!');
    console.log('Teachers can only mark attendance within these date ranges.');

  } catch (error) {
    console.error('❌ Error seeding semester settings:', error);
  } finally {
    mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run the seeding
seedSemesterSettings();