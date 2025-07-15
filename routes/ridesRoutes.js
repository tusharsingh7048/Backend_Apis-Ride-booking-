const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const ridesController = require('../controllers/ridesController');

router.post('/search', auth, ridesController.searchRides);
router.get('/available', auth, ridesController.getAvailableRides);
router.post('/request', auth, ridesController.requestToJoinRide);
router.post('/verify-ride-otp', auth, ridesController.verifyRideOtp);
router.post('/cancel', auth, ridesController.cancelRideRequest);

module.exports = router;
