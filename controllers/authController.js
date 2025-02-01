const bcryptjs = require('bcryptjs')
const jwt = require('jsonwebtoken')
const passport = require('passport')
const { Strategy: GoogleStrategy } = require('passport-google-oauth20')
const User = require('../models/User')

// JWT secret key (should be in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET

// Register new user
exports.register = async (req, res) => {
  try {
    const { email, password } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({ email })
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' })
    }

    // Create new user
    const hashedPassword = await bcryptjs.hash(password, 10)
    const user = new User({
      email,
      password: hashedPassword,
      preferences: {
        notificationMethods: ['email'],
        currency: 'USD',
      },
    })

    await user.save()

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.status(201).json({
      message: 'User registered successfully',
      token,
      user: {
        id: user._id,
        email: user.email,
        preferences: user.preferences,
      },
    })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error registering user', error: error.message })
  }
}

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body

    // Check if user exists
    const user = await User.findOne({ email })
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Compare password using bcryptjs
    const isValidPassword = await bcryptjs.compare(password, user.password)
    if (!isValidPassword) {
      return res.status(401).json({ message: 'Invalid credentials' })
    }

    // Generate JWT token
    const token = jwt.sign(
      { userId: user._id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    )

    res.json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        preferences: user.preferences,
      },
    })
  } catch (error) {
    res.status(500).json({ message: 'Error logging in', error: error.message })
  }
}


// Get current user
exports.getCurrentUser = async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select('-password')
    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }
    res.json({ user })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error fetching user', error: error.message })
  }
}

// Update user profile
exports.updateProfile = async (req, res) => {
  try {
    const { email, password } = req.body
    const user = await User.findById(req.user.userId)

    if (!user) {
      return res.status(404).json({ message: 'User not found' })
    }

    if (email) user.email = email
    if (password) {
      const salt = await bcryptjs.genSalt(10)
      user.password = await bcryptjs.hash(password, salt)
    }

    await user.save()
    res.json({ message: 'Profile updated successfully', user })
  } catch (error) {
    res
      .status(500)
      .json({ message: 'Error updating profile', error: error.message })
  }
}

// Google OAuth Strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: GOOGLE_CLIENT_ID,
      clientSecret: GOOGLE_CLIENT_SECRET,
      callbackURL: '/auth/google/callback',
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        let user = await User.findOne({ email: profile.emails[0].value })
        if (!user) {
          user = new User({
            email: profile.emails[0].value,
            password: null,
            preferences: {
              notificationMethods: ['email'],
              currency: 'USD',
            },
          })
          await user.save()
        }
        return done(null, user)
      } catch (error) {
        return done(error, null)
      }
    }
  )
)

passport.serializeUser((user, done) => done(null, user.id))
passport.deserializeUser(async (id, done) => {
  const user = await User.findById(id)
  done(null, user)
})
