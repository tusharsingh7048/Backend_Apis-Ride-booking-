const Ride = require('../models/Ride'); // Example model — adjust name as needed
const RideRequest = require('../models/RideRequest'); // Example for join requests
const mongoose = require('mongoose');


//  1) Search for Rides
exports.searchRides = async (req, res) => {
  try {
    const { pickup, drop, rideTime } = req.body;

    if (!pickup || !drop || !rideTime) {
      return res.status(400).json({ msg: 'Pickup, drop, and ride time are required' });
    }

    // Example: Save search if needed or just use to query
    console.log(`User ${req.user.id} is searching rides from ${pickup} to ${drop} at ${rideTime}`);

    // You can log or store search filters in DB for analytics.

    res.json({ success: true, message: 'Search criteria received.' });
  } catch (err) {
    console.error('Search Rides error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

//  2) Get Available Rides
exports.getAvailableRides = async (req, res) => {
  try {
    const { pickup, drop, rideTime } = req.query;

    if (!pickup || !drop || !rideTime) {
      return res.status(400).json({ msg: 'pickup, drop, and rideTime are required' });
    }

    console.log('👉 Raw rideTime:', rideTime);

    const cleanRideTime = rideTime.trim();  // Remove any \n or spaces
    const rideTimeDate = new Date(cleanRideTime);

    if (isNaN(rideTimeDate)) {
      return res.status(400).json({ msg: 'Invalid rideTime format' });
    }

    console.log(`User ${req.user?.id || 'N/A'} is searching rides from ${pickup} to ${drop} at ${rideTimeDate.toISOString()}`);

    const rides = await Ride.find({
      pickup,
      drop,
      rideTime: rideTimeDate,
      status: 'available'
    });

    console.log('👉 Rides found:', rides);

    res.json({ success: true, rides });
  } catch (err) {
    console.error('Get Available Rides error:', err.message, err);
    res.status(500).json({ msg: 'Server Error' });
  }
};


//  3) Request to Join Ride
exports.requestToJoinRide = async (req, res) => {
  try {
    const { rideId } = req.body;

    if (!rideId) {
      return res.status(400).json({ msg: 'Ride ID is required' });
    }
      if (!mongoose.Types.ObjectId.isValid(rideId)) {
      return res.status(400).json({ msg: 'Invalid ride ID' });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ msg: 'Ride not found' });
    }

    if (ride.status !== 'available') {
      return res.status(400).json({ msg: 'Ride is not available to join.' });
    }

    // Check if user already requested
    const existingRequest = await RideRequest.findOne({
      rideId: rideId,
      passengerId: req.user.id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (existingRequest) {
      return res.status(400).json({ msg: 'You already have an active request for this ride.' });
    }

    const rideRequest = new RideRequest({
      rideId: rideId,
      passengerId: req.user.id,
      status: 'pending'
    });

    await rideRequest.save();

    res.json({ success: true, message: 'Request sent to driver.' });
  } catch (err) {
    console.error('Request to Join Ride error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

//  4) Ride OTP Verification
exports.verifyRideOtp = async (req, res) => {
  try {
    const { rideId, otp } = req.body;

    if (!rideId || !otp) {
      return res.status(400).json({ msg: 'Ride ID and OTP are required' });
    }

    const ride = await Ride.findById(rideId);

    if (!ride) {
      return res.status(404).json({ msg: 'Ride not found' });
    }

    // Confirm the logged-in driver owns this ride
    if (ride.driverId.toString() !== req.user.id) {
      return res.status(403).json({ msg: 'You are not authorized to verify OTP for this ride.' });
    }

    if (ride.startOtp !== otp) {
      return res.status(400).json({ msg: 'Invalid OTP provided.' });
    }

    if (!['available', 'scheduled'].includes(ride.status)) {
      return res.status(400).json({ msg: 'Ride cannot be started now.' });
    }

    // Start the ride
    ride.status = 'active';
    ride.startOtp = null; // clear used OTP
    await ride.save();
    //  After ride.save()
    await RideRequest.updateMany(
  { rideId: ride._id, status: 'pending' },
  { $set: { status: 'approved' } }
);


    res.json({ success: true, message: 'OTP verified. Ride started.' });
  } catch (err) {
    console.error('Ride OTP Verification error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// 5) Cancel Ride Request
exports.cancelRideRequest = async (req, res) => {
  try {
    const { rideId, reason } = req.body;

    if (!rideId || !reason) {
      return res.status(400).json({ msg: 'Ride ID and reason are required' });
    }

    const rideRequest = await RideRequest.findOne({
      rideId: rideId,
      passengerId: req.user.id,
      status: { $in: ['pending', 'accepted'] }
    });

    if (!rideRequest) {
      return res.status(404).json({ msg: 'No active ride request found to cancel.' });
    }

    rideRequest.status = 'cancelled';
    rideRequest.cancellationReason = reason;
    await rideRequest.save();

    // After saving rideRequest.status = 'cancelled'
   const activeRequests = await RideRequest.find({
    rideId: rideRequest.rideId,
    status: { $in: ['pending', 'approved'] }
    });

   if (activeRequests.length === 0) {
  // No more active requests → reset the ride!
    const ride = await Ride.findById(rideRequest.rideId);
    if (ride) {
    ride.status = 'available';
    ride.startOtp = '654321'; // You can also re-generate if you prefer
    await ride.save();
  }
  }


    res.json({ success: true, message: 'Ride request cancelled.' });
  } catch (err) {
    console.error('Cancel Ride Request error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};
