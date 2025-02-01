const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const {
  sendEmail,
  sendSMS,
  sendTelegramMessage,
} = require('../controllers/notificationController')

// Protected notification routes
router.post('/send-email', auth, async (req, res) => {
  try {
    const { to, subject, text } = req.body
    const result = await sendEmail(to, subject, text)
    if (result) {
      res.json({ success: true, message: 'Email sent successfully' })
    } else {
      res.status(500).json({ success: false, message: 'Failed to send email' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/send-sms', auth, async (req, res) => {
  try {
    const { to, message } = req.body
    const result = await sendSMS(to, message)
    if (result) {
      res.json({ success: true, message: 'SMS sent successfully' })
    } else {
      res.status(500).json({ success: false, message: 'Failed to send SMS' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

router.post('/send-telegram', auth, async (req, res) => {
  try {
    const { chatId, message } = req.body
    const result = await sendTelegramMessage(chatId, message)
    if (result) {
      res.json({ success: true, message: 'Telegram message sent successfully' })
    } else {
      res
        .status(500)
        .json({ success: false, message: 'Failed to send Telegram message' })
    }
  } catch (error) {
    res.status(500).json({ message: error.message })
  }
})

module.exports = router
