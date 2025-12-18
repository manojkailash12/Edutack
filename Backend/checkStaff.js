const mongoose = require('mongoose');
const Staff = require('./models/Staff');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function checkStaff() {
  try {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    const staff = await Staff.find({ role: { $in: ['teacher', 'HOD'] } });
    console.log(`Found ${staff.length} teachers/HODs:`);
    
    staff.forEach((person, index) => {
      console.log(`\n${index + 1}. ${person.name}`);
      console.log(`   ID: ${person._id}`);
      console.log(`   Role: ${person.role}`);
      console.log(`   Department: ${person.department}`);
      console.log(`   Approved: ${person.approved}`);
    });

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await mongoose.disconnect();
  }
}

checkStaff();