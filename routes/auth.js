const express = require('express')
const router = express.Router()
const authController = require('../controllers/authController')
const auth = require('../middleware/auth')
const passport = require('passport')
const jwt = require('jsonwebtoken')

// Public routes
router.post('/register', authController.register)
router.post('/login', authController.login)

// Protected routes
router.get('/me', auth, authController.getCurrentUser)
router.put('/profile', auth, authController.updateProfile) // Added profile update route

// Google OAuth Routes
router.get(
  '/google',
  passport.authenticate('google', { scope: ['profile', 'email'] })
)

router.get(
  '/google/callback',
  passport.authenticate('google', { failureRedirect: '/' }),
  (req, res) => {
    const token = jwt.sign(
      { userId: req.user._id, email: req.user.email },
      process.env.JWT_SECRET,
      {
        expiresIn: '24h',
      }
    )
    res.json({ message: 'Google login successful', token, user: req.user })
  }
)

module.exports = router
