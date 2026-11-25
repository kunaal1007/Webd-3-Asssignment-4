const express = require('express');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const appEvents = require('../events/appEvents');
const { protect, authorizeRoles } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/auth/signup
router.post('/signup', async (req, res) => {
  try {
    const { username, email, password, role } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ message: 'username, email, and password are required' });
    }

    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'Email already registered' });
    }

    const assignedRole = role === 'admin' ? 'admin' : 'user';

    const user = await User.create({
      username,
      email,
      password,
      role: assignedRole,
    });

    appEvents.emit('user:registered', user);

    return res.status(201).json({
      message: 'User registered',
      id: user._id.toString(),
      username: user.username,
      email: user.email,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error during signup', error: err.message });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'email and password are required' });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user._id.toString(), role: user.role, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      sameSite: 'lax',
    });

    appEvents.emit('user:login', user);

    return res.status(200).json({
      message: 'Login successful',
      token,
    });
  } catch (err) {
    return res.status(500).json({ message: 'Server error during login', error: err.message });
  }
});

// GET /api/auth/me
router.get('/me', protect, (req, res) => {
  res.status(200).json({ user: req.user });
});

// GET /api/auth/admin/users (RBAC protected)
router.get('/admin/users', protect, authorizeRoles('admin'), async (req, res) => {
  const users = await User.find().select('-password');
  res.status(200).json({ users });
});

module.exports = router;