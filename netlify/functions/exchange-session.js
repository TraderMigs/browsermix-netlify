const { preflight, corsHeaders } = require('./util');

const PRICE_ID = 'price_1Ru8IeRrIlnVe6VQ8iURS2Hf'; // One-time $4.99 (Year Pass)

exports.handler = async (event) => {
  // CORS preflight first
  const pf = preflight(event);
  if (pf) return pf;

  // Load deps only for real requests
  const Stripe = require('stripe');
  const jwt = require('jsonwebtoken');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
  const SIGNING_SECRET = process.env.LICENSE_SIGNING_SECRET || process.env.STRIPE_SECRET_KEY;

  try {
    const { session_id } = JSON.parse(event.body || '{}');
    if (!session_id) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing session_id' }) };
    }

    // Retrieve Checkout session and line items
    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['line_items'] });

    // Must be a paid one-time checkout
    if (!session || session.mode !== 'payment' || session.payment_status !== 'paid') {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Payment not confirmed' }) };
    }

    // Validate the correct one-time price was purchased
    const items = session.line_items?.data || [];
    const valid = items.some(i => i.price && i.price.id === PRICE_ID);
    if (!valid) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Wrong product' }) };
    }

    // Issue a 1-year license token (JWT)
    const nowSec = Math.floor(Date.now() / 1000);
    const oneYearSec = 365 * 24 * 60 * 60;
    const token = jwt.sign(
      { typ: 'year_pass', price: PRICE_ID },
      SIGNING_SECRET,
      { expiresIn: oneYearSec } // expires in 1 year
    );

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ token }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
