const mongoose = require('mongoose');

const MONGO_URI = 'mongodb+srv://Manoj:Manoj@cluster0.wpbk05r.mongodb.net/test?retryWrites=true&w=majority';

async function dropUsernameIndex() {
  await mongoose.connect(MONGO_URI);
  const result = await mongoose.connection.db.collection('students').dropIndex('username_1').catch(err => err);
  if (result && result.ok === 1) {
    console.log('Successfully dropped index username_1 from students collection.');
  } else {
    console.log('Index username_1 may not exist or was already dropped:', result);
  }
  await mongoose.disconnect();
}

dropUsernameIndex().catch(err => {
  console.error('Error dropping index:', err);
  process.exit(1);
}); 