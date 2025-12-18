const mongoose = require('mongoose');
const Paper = require('./models/Paper');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function testEndpoint() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const allDepartments = await Paper.distinct("department");
    console.log('All departments:', allDepartments);
    
    // Filter to only show Computer Science and Engineering related departments for timetable
    const timetableDepartments = allDepartments.filter(dept => 
      dept === 'Computer Science and Engineering' || 
      dept === 'Computer Science and Engineering (CSE)' ||
      dept === 'CSE' ||
      dept === 'Computer Science'
    );
    
    console.log('Filtered departments:', timetableDepartments);
    
    // If no CSE departments found, default to Computer Science and Engineering
    const departments = timetableDepartments.length > 0 ? timetableDepartments : ['Computer Science and Engineering'];
    
    const semesters = await Paper.distinct("semester");
    const years = await Paper.distinct("year");
    
    console.log('\n=== ENDPOINT RESPONSE ===');
    console.log('Departments:', departments);
    console.log('Semesters:', semesters);
    console.log('Years:', years);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

testEndpoint();