const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

//  Utility: India 10-digit mobile validation
const isValidMobile = (mobile) => {
  const mobileRegex = /^[6-9]\d{9}$/; // E.g., 9876543210
  return mobileRegex.test(mobile);
};

//  1) Send OTP (with role support)
exports.sendOtp = async (req, res) => {
  try {
    const { mobile, role } = req.body;

    if (!mobile) {
      return res.status(400).json({ msg: 'Mobile number is required' });
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({ msg: 'Invalid mobile number format' });
    }

    if (role && !['passenger', 'driver', 'admin'].includes(role)) {
      return res.status(400).json({ msg: 'Invalid role value' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    let user = await User.findOne({ mobile });

    if (!user) {
      user = new User({
        mobile,
        otp,
        otpExpiresAt,
        role: role || 'passenger'  // default to passenger if not given
      });
    } else {
      user.otp = otp;
      user.otpExpiresAt = otpExpiresAt;

      // Patch existing user with missing role
      if (!user.role) {
        user.role = role || 'passenger';
      }
    }

    await user.save();

    console.log(` OTP for ${mobile}: ${otp} (expires at ${otpExpiresAt})`);

    res.status(200).json({
      success: true,
      message: `OTP sent to ${mobile}`
    });
  } catch (err) {
    console.error('Send OTP error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

//  2) Verify OTP
exports.verifyOtp = async (req, res) => {
  try {
    const { mobile, otp } = req.body;

    if (!mobile || !otp) {
      return res.status(400).json({ msg: 'Mobile and OTP are required' });
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({ msg: 'Invalid mobile number format' });
    }

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    console.log(' DB otp:', user.otp);
    console.log(' Req otp:', otp);
    console.log(' DB otpExpiresAt:', user.otpExpiresAt);
    console.log(' Now:', new Date());

    if (
      user.otp !== otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    //  Clear OTP and patch role if needed
    user.otp = null;
    user.otpExpiresAt = null;

    if (!user.role) {
      user.role = 'passenger';  //  fallback
    }

    await user.save();

    console.log(' OTP verified! OTP cleared.');

    const payload = {
      user: {
        id: user.id,
        mobile: user.mobile,
        role: user.role  //  always include
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({ success: true, token });
  } catch (err) {
    console.error('Verify OTP error:', err);
    res.status(500).json({ msg: 'Server Error' });
  }
};

//  3) Login with mobile & password
exports.login = async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({ msg: 'Mobile and password are required' });
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({ msg: 'Invalid mobile number format' });
    }

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    if (!user.password) {
      return res.status(400).json({
        msg: 'No password set for this user. Use OTP or reset password.'
      });
    }

    if (!user.role) {
      user.role = 'passenger';  //  fallback if old user
      await user.save();
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ msg: 'Invalid credentials' });
    }

    const payload = {
      user: {
        id: user.id,
        mobile: user.mobile,
        role: user.role
      }
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: '1h'
    });

    res.json({ success: true, token });
  } catch (err) {
    console.error('Login error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

// 4) Forgot Password — Send OTP for reset
exports.forgotPassword = async (req, res) => {
  try {
    const { mobile } = req.body;

    if (!mobile) {
      return res.status(400).json({ msg: 'Mobile is required' });
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({ msg: 'Invalid mobile number format' });
    }

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const otpExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

    user.otp = otp;
    user.otpExpiresAt = otpExpiresAt;

    if (!user.role) {
      user.role = 'passenger';  //  patch
    }

    await user.save();

    console.log(`Reset OTP for ${mobile} is ${otp}`);

    res.json({ success: true, message: 'OTP sent for password reset' });
  } catch (err) {
    console.error('Forgot Password error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};

//  5) Reset Password using OTP
exports.resetPassword = async (req, res) => {
  try {
    const { mobile, otp, newPassword } = req.body;

    if (!mobile || !otp || !newPassword) {
      return res.status(400).json({
        msg: 'Mobile, OTP and new password are required'
      });
    }

    if (!isValidMobile(mobile)) {
      return res.status(400).json({ msg: 'Invalid mobile number format' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        msg: 'Password must be at least 6 characters'
      });
    }

    const user = await User.findOne({ mobile });

    if (!user) {
      return res.status(400).json({ msg: 'User not found' });
    }

    if (
      user.otp !== otp ||
      !user.otpExpiresAt ||
      user.otpExpiresAt < new Date()
    ) {
      return res.status(400).json({ msg: 'Invalid or expired OTP' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    user.otp = null;
    user.otpExpiresAt = null;

    if (!user.role) {
      user.role = 'passenger';  //  patch
    }

    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully' });
  } catch (err) {
    console.error('Reset Password error:', err.message);
    res.status(500).json({ msg: 'Server Error' });
  }
};
