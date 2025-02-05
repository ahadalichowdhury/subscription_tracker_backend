const bcryptjs = require('bcryptjs')
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
    },
    password: {
      type: String,
      required: false,
    },
    name: {
      type: String,
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    googleId: {
      type: String,
      unique: true,
      sparse: true,
    },
    avatar: {
      type: String,
    },
    preferences: {
      notificationMethods: {
        type: [String],
        default: ['email'],
      },
      currency: {
        type: String,
        default: 'USD',
      },
      timezone: {
        type: String,
        default: 'UTC',
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    lastLogin: {
      type: Date,
    },
    isPaidUser: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
  }
)

// Add comparePassword method to User schema
userSchema.methods.comparePassword = function (password) {
  return bcryptjs.compare(password, this.password)
}

const User = mongoose.model('User', userSchema)

module.exports = User
