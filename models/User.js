const bcryptjs = require('bcryptjs')
const mongoose = require('mongoose')

const userSchema = new mongoose.Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: false,
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
  },
})

// Add comparePassword method to User schema
userSchema.methods.comparePassword = function (password) {
  return bcryptjs.compare(password, this.password)
}

const User = mongoose.model('User', userSchema)

module.exports = User
