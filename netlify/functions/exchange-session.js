const { preflight, corsHeaders } = require('./util');
const Stripe = require('stripe');
const jwt = require('jsonwebtoken');

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });
const PRICE_ID = 'price_1RsjJZRrIlnVe6VQwjaCfrXo';
const SIGNING_SECRET = process.env.LICENSE_SIGNING_SECRET || process.env.STRIPE_SECRET_KEY;

exports.handler = async (event) => {
  const pf = preflight(event); if (pf) return pf;

  try {
    const { session_id } = JSON.parse(event.body || '{}');
    if (!session_id) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing session_id' }) };
    }

    const session = await stripe.checkout.sessions.retrieve(session_id, { expand: ['line_items', 'customer'] });
    if (!session || session.payment_status !== 'paid') {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Payment not confirmed' }) };
    }

    // Ensure correct product/price was purchased
    const items = (session.line_items && session.line_items.data) ? session.line_items.data : [];
    const valid = items.some(i => i.price && i.price.id === PRICE_ID);
    if (!valid) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Wrong product' }) };
    }

    const customerId = session.customer && session.customer.id ? session.customer.id : 'anon';
    const email = session.customer_details && session.customer_details.email ? session.customer_details.email : 'unknown';

    // Create long-lived signed license token (JWT)
    const token = jwt.sign(
      { sub: customerId, email, price: PRICE_ID, typ: 'browsermix_license' },
      SIGNING_SECRET,
      { expiresIn: '3650d' } // ~10 years
    );

    // Store token on customer for audit (best-effort)
    try {
      if (customerId !== 'anon') {
        await stripe.customers.update(customerId, { metadata: { browsermix_license: token } });
      }
    } catch (_) {}

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ token }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
