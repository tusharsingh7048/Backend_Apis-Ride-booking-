const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ratingController = require('../controllers/ratingController');

// Trip Rating
router.post('/submit-rating', auth, ratingController.submitTripRating);

// My Rides / Booked Rides
router.get('/booked', auth, ratingController.getBookedRides);
router.get('/my-requests', auth, ratingController.getMyRequestedRides);
router.get('/published', auth, ratingController.getMyPublishedRides);
router.get('/booked/:rideRequestId', auth, ratingController.getBookedRideDetails);

module.exports = router; 