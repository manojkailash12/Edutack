const mongoose = require('mongoose');
const LoginSchema = new mongoose.Schema({
  userId: mongoose.Schema.Types.ObjectId,
  role: String,
  loginTime: { type: Date, default: Date.now }
});
module.exports = mongoose.model('Login', LoginSchema); 