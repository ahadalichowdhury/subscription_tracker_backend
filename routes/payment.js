const express = require('express')
const router = express.Router()
const auth = require('../middleware/auth')
const stripeService = require('../services/stripeService')

// Create a subscription checkout session
router.post('/create-subscription', auth, async (req, res) => {
  try {
    const { priceId } = req.body

    if (!priceId) {
      return res.status(400).json({
        success: false,
        error: 'Price ID is required',
      })
    }

    const session = await stripeService.createSubscriptionSession(
      req.user.userId,
      priceId,
      req.user.email
    )

    res.json({
      success: true,
      data: {
        sessionId: session.id,
        url: session.url,
      },
    })
  } catch (error) {
    console.error('Error creating subscription:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to create subscription',
    })
  }
})

// Cancel subscription
router.post('/cancel-subscription', auth, async (req, res) => {
  try {
    const { subscriptionId } = req.body

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required',
      })
    }

    await stripeService.cancelSubscription(subscriptionId)

    res.json({
      success: true,
      message: 'Subscription cancelled successfully',
    })
  } catch (error) {
    console.error('Error cancelling subscription:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to cancel subscription',
    })
  }
})

// Get subscription status
router.get('/subscription-status/:subscriptionId', auth, async (req, res) => {
  try {
    const { subscriptionId } = req.params

    if (!subscriptionId) {
      return res.status(400).json({
        success: false,
        error: 'Subscription ID is required',
      })
    }

    const status = await stripeService.getSubscriptionStatus(subscriptionId)

    res.json({
      success: true,
      data: { status },
    })
  } catch (error) {
    console.error('Error getting subscription status:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to get subscription status',
    })
  }
})

// Stripe webhook handler
router.post(
  '/webhook',
  express.raw({ type: 'application/json' }),
  async (req, res) => {
    try {
      const sig = req.headers['stripe-signature']
      const event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      )

      await stripeService.handleWebhookEvent(event)

      res.json({ received: true })
    } catch (error) {
      console.error('Webhook error:', error)
      res.status(400).send(`Webhook Error: ${error.message}`)
    }
  }
)

module.exports = router
