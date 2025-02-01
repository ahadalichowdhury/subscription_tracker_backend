const mongoose = require('mongoose')

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  type: {
    type: String,
    enum: ['renewal', 'price_change', 'usage_alert', 'system'],
    required: true,
  },
  method: {
    type: String,
    enum: ['email', 'sms', 'telegram'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'sent', 'failed'],
    default: 'pending',
  },
  sentAt: {
    type: Date,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  subscriptionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Subscription',
  },
  metadata: {
    type: Map,
    of: String,
  },
})

const Notification = mongoose.model('Notification', notificationSchema)

module.exports = Notification
