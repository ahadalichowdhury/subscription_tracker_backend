const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')

// Protected AI routes
router.post('/analyze-spending', auth, async (req, res) => {
  try {
    // TODO: Implement AI analysis
    res.json({ message: 'AI analysis endpoint (to be implemented)' })
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
