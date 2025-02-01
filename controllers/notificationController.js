const nodemailer = require('nodemailer')
const TelegramBot = require('node-telegram-bot-api')
const twilio = require('twilio')

// Initialize email transporter
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
})

// Initialize Telegram bot
const bot = new TelegramBot(process.env.TELEGRAM_BOT_TOKEN, { polling: false })

// Initialize Twilio client
const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN
)

const sendEmail = async (to, subject, text) => {
  try {
    await transporter.sendMail({ to, subject, text })
    return true
  } catch (error) {
    console.error('Email error:', error)
    return false
  }
}

const sendSMS = async (to, message) => {
  try {
    await twilioClient.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE_NUMBER,
      to,
    })
    return true
  } catch (error) {
    console.error('SMS error:', error)
    return false
  }
}

const sendTelegramMessage = async (chatId, message) => {
  try {
    await bot.sendMessage(chatId, message)
    return true
  } catch (error) {
    console.error('Telegram error:', error)
    return false
  }
}

module.exports = {
  sendEmail,
  sendSMS,
  sendTelegramMessage,
}
