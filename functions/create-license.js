// ===== create-license.js =====
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  try {
    const sig = event.headers['stripe-signature'];
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    const body = event.body;

    // Verify Stripe webhook
    const stripeEvent = stripe.webhooks.constructEvent(body, sig, webhookSecret);

    if (stripeEvent.type === 'checkout.session.completed') {
      const session = stripeEvent.data.object;

      const customerId = session.customer;
      const email = session.customer_email || session.customer_details?.email || 'no-email';
      const timestamp = Date.now();
      const licenseKey = `${timestamp}-${Math.random().toString(36).substr(2, 9)}`;

      const license = {
        licenseKey,
        customerId,
        email,
        created: timestamp,
        status: 'active',
      };

      console.log('🟢 License created:', license);

      // Respond with 200
      return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
      };
    }

    return { statusCode: 200, body: 'Event ignored' };
  } catch (err) {
    console.error('❌ Error creating license:', err.message);
    return { statusCode: 400, body: 'Webhook Error' };
  }
};
