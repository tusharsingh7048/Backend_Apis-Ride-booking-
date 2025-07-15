const mongoose = require('mongoose');

const RideSchema = new mongoose.Schema({
  driverId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  pickup: String,
  drop: String,
  rideTime: Date,
  status: { type: String, enum: ['available', 'scheduled', 'active', 'completed', 'cancelled'], default: 'available' },
  startOtp: String
});

module.exports = mongoose.model('Ride', RideSchema);
