const express = require('express')
const router = express.Router()
const subscriptionController = require('../controllers/subscriptionController')
const auth = require('../middleware/auth')
const multer = require('multer')
const upload = multer({ dest: 'uploads/' })

// All routes require authentication
router.use(auth)

// CRUD routes for subscriptions
router.post('/', subscriptionController.createSubscription)
router.get('/', subscriptionController.getSubscriptions)
router.get('/:id', subscriptionController.getSubscriptionById)
router.patch('/:id', subscriptionController.updateSubscription)
router.delete('/:id', subscriptionController.deleteSubscription)
router.post(
  '/process-bank-statement',
  upload.single('file'),
  subscriptionController.processBankStatement
)

module.exports = router
