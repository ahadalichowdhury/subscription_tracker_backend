const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY)

class StripeService {
  // Create a checkout session for subscription
  async createSubscriptionSession(userId, priceId, customerEmail) {
    try {
      // Create or retrieve Stripe customer
      let customer = await this.getOrCreateCustomer(customerEmail, userId)

      // Create checkout session
      const session = await stripe.checkout.sessions.create({
        customer: customer.id,
        payment_method_types: ['card'],
        line_items: [
          {
            price: priceId,
            quantity: 1,
          },
        ],
        mode: 'subscription',
        success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
        metadata: {
          userId,
        },
      })

      return session
    } catch (error) {
      console.error('Error creating subscription session:', error)
      throw error
    }
  }

  // Get or create a Stripe customer
  async getOrCreateCustomer(email, userId) {
    try {
      // Search for existing customer
      const customers = await stripe.customers.list({
        email,
        limit: 1,
      })

      if (customers.data.length > 0) {
        return customers.data[0]
      }

      // Create new customer if not found
      const customer = await stripe.customers.create({
        email,
        metadata: {
          userId,
        },
      })

      return customer
    } catch (error) {
      console.error('Error getting/creating customer:', error)
      throw error
    }
  }

  // Cancel a subscription
  async cancelSubscription(subscriptionId) {
    try {
      return await stripe.subscriptions.cancel(subscriptionId)
    } catch (error) {
      console.error('Error canceling subscription:', error)
      throw error
    }
  }

  // Get subscription status
  async getSubscriptionStatus(subscriptionId) {
    try {
      const subscription = await stripe.subscriptions.retrieve(subscriptionId)
      return subscription.status
    } catch (error) {
      console.error('Error getting subscription status:', error)
      throw error
    }
  }

  // Handle webhook events
  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          await this.handleCheckoutComplete(event.data.object)
          break
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          await this.handleSubscriptionUpdate(event.data.object)
          break
        case 'invoice.payment_failed':
          await this.handlePaymentFailed(event.data.object)
          break
      }
    } catch (error) {
      console.error('Error handling webhook event:', error)
      throw error
    }
  }

  // Handle successful checkout completion
  async handleCheckoutComplete(session) {
    // Update user's subscription status in your database
    // This is where you'd update the user's isPaidUser status
    const userId = session.metadata.userId
    // TODO: Update user subscription status
  }

  // Handle subscription updates
  async handleSubscriptionUpdate(subscription) {
    // Update subscription status in your database
    const userId = subscription.metadata.userId
    // TODO: Update subscription status
  }

  // Handle failed payments
  async handlePaymentFailed(invoice) {
    // Handle failed payment (e.g., notify user, update status)
    const userId = invoice.metadata.userId
    // TODO: Handle payment failure
  }
}

module.exports = new StripeService()
