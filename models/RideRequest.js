const mongoose = require('mongoose');

const RideRequestSchema = new mongoose.Schema({
  rideId: { type: mongoose.Schema.Types.ObjectId, ref: 'Ride' },
  passengerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, enum: ['pending', 'accepted', 'cancelled'], default: 'pending' },
  cancellationReason: String,
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('RideRequest', RideRequestSchema);
