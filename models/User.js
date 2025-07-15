const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema({
  name: String,
  mobile: { type: String, required: true, unique: true },
  password: String,
  role: { type: String, enum: ['passenger', 'driver', 'admin'] },
  otp: String,
  otpExpiresAt: Date,
  createdAt: { type: Date, default: Date.now },
});

module.exports = mongoose.model('User', UserSchema);
