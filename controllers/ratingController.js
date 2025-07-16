const RideRating = require('../models/RideRating');
const Ride = require('../models/Ride');
const RideRequest = require('../models/RideRequest');

// Submit Trip Rating
exports.submitTripRating = async (req, res) => {
  try {
    const { rideId, targetUserId, rating, review } = req.body;
    if (!rideId || !targetUserId || !rating) {
      return res.status(400).json({ msg: 'rideId, targetUserId, and rating are required' });
    }
    if (rating < 1 || rating > 5) {
      return res.status(400).json({ msg: 'Rating must be between 1 and 5' });
    }
    // Check if ride is completed and user participated
    const ride = await Ride.findById(rideId);
    if (!ride || ride.status !== 'completed') {
      return res.status(400).json({ msg: 'Ride not found or not completed' });
    }
    // Prevent duplicate rating
    const existing = await RideRating.findOne({ rideId, raterId: req.user.id, targetUserId });
    if (existing) {
      return res.status(400).json({ msg: 'You have already rated this user for this ride' });
    }
    const newRating = new RideRating({
      rideId,
      raterId: req.user.id,
      targetUserId,
      rating,
      review
    });
    await newRating.save();
    res.json({ success: true, message: 'Rating submitted' });
  } catch (err) {
    console.error('Submit Trip Rating error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get Booked Rides (Passenger)
exports.getBookedRides = async (req, res) => {
  try {
    // Find accepted/completed ride requests for this passenger
    const requests = await RideRequest.find({
      passengerId: req.user.id,
      status: { $in: ['accepted', 'approved'] }
    }).populate('rideId');
    res.json({ success: true, rides: requests });
  } catch (err) {
    console.error('Get Booked Rides error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get My Requested Rides
exports.getMyRequestedRides = async (req, res) => {
  try {
    const requests = await RideRequest.find({
      passengerId: req.user.id
    }).populate('rideId');
    res.json({ success: true, requests });
  } catch (err) {
    console.error('Get My Requested Rides error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get My Published Rides (Driver)
exports.getMyPublishedRides = async (req, res) => {
  try {
    const rides = await Ride.find({ driverId: req.user.id });
    res.json({ success: true, rides });
  } catch (err) {
    console.error('Get My Published Rides error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// Get Booked Ride Details
exports.getBookedRideDetails = async (req, res) => {
  try {
    const { rideRequestId } = req.params;
    const request = await RideRequest.findById(rideRequestId).populate('rideId passengerId');
    if (!request) {
      return res.status(404).json({ msg: 'Ride request not found' });
    }
    // Only allow access if user is the passenger or the driver
    if (
      request.passengerId._id.toString() !== req.user.id &&
      request.rideId.driverId.toString() !== req.user.id
    ) {
      return res.status(403).json({ msg: 'Not authorized' });
    }
    res.json({ success: true, request });
  } catch (err) {
    console.error('Get Booked Ride Details error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
}; 