const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  email: String,
  // Add other fields as per your database structure
});

module.exports = mongoose.model('User', UserSchema); 