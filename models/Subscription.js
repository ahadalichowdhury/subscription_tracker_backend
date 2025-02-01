const mongoose = require('mongoose')

const subscriptionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  name: {
    type: String,
    required: true,
    trim: true,
  },
  amount: {
    type: Number,
    required: true,
    min: 0,
  },
  currency: {
    type: String,
    required: true,
    default: 'USD',
  },
  renewalDate: {
    type: Date,
    required: true,
  },
  category: {
    type: String,
    enum: ['Entertainment', 'Productivity', 'Business', 'Other'],
    default: 'Other',
  },
  billingCycle: {
    type: String,
    enum: ['monthly', 'yearly', 'quarterly', 'weekly'],
    required: true,
  },
  status: {
    type: String,
    enum: ['active', 'cancelled', 'paused'],
    default: 'active',
  },
  autoRenew: {
    type: Boolean,
    default: true,
  },
  notificationSettings: {
    reminderDays: {
      type: Number,
      default: 7,
    },
    methods: [
      {
        type: String,
        enum: ['email', 'sms', 'telegram'],
        default: ['email'],
      },
    ],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
})

// Update the updatedAt timestamp before saving
subscriptionSchema.pre('save', function (next) {
  this.updatedAt = new Date()
  next()
})

const Subscription = mongoose.model('Subscription', subscriptionSchema)

module.exports = Subscription
