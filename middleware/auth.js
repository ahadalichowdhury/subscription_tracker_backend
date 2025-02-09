const jwt = require('jsonwebtoken')
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key'

const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '')
    if (!token) {
      return res.status(401).json({ message: 'Authentication required' })
    }

    const decoded = jwt.verify(token, JWT_SECRET)
    req.user = {
      userId: decoded.userId,
      email: decoded.email,
      isPaidUser: decoded.isPaidUser,
    }
    next()
  } catch (error) {
    res.status(401).json({ message: 'Invalid token', error: error.message })
  }
}

module.exports = auth
