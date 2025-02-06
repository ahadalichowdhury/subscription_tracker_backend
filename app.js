require('dotenv').config()
const express = require('express')
const mongoose = require('mongoose')
const cors = require('cors')
const passport = require('passport')
const session = require('express-session')
const MongoStore = require('connect-mongo')
const trendingRoutes = require('./routes/trending')
const googleTrendsRoutes = require('./routes/googleTrends')
const videoIdeasRoutes = require('./routes/videoIdeas')
const videoScriptsRoutes = require('./routes/videoScripts')
const analytics = require('./routes/analytics')
// Import cron service
require('./cronjob')

const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Passport configuration
require('./config/passport')

// Session configuration
app.use(
  session({
    secret: process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    store: MongoStore.create({
      mongoUrl:
        process.env.MONGODB_URI ||
        'mongodb://localhost:27017/subscription-tracker',
      collectionName: 'sessions',
    }),
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
    },
  })
)

// Passport middleware
app.use(passport.initialize())
app.use(passport.session())
// MongoDB Connection
mongoose
  .connect(
    process.env.MONGODB_URI || 'mongodb://localhost:27017/subscription-tracker',
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log('Connected to MongoDB')
  })
  .catch((err) => {
    console.error('MongoDB connection error:', err)
  })

// Routes
app.use('/auth', require('./routes/auth'))
app.use('/api', trendingRoutes)
app.use('/api', googleTrendsRoutes)
app.use('/api', videoIdeasRoutes) // Add the new video ideas routes
app.use('/api', videoScriptsRoutes) // Add the video scripts routes
app.use('/api/analytics', analytics)
app.use('/api', require('./routes/keywords')) // Add the keyword analysis routes
// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: 'Something went wrong!' })
})

const PORT = process.env.PORT || 5000
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`)
})
