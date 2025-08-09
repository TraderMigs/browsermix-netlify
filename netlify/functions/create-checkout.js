const { preflight, corsHeaders } = require('./util');

const PRICE_ID = 'price_1Ru8IeRrIlnVe6VQ8iURS2Hf'; // One-time $4.99 (Year Pass)
const NETLIFY_BASE = 'https://browsermix.netlify.app';

exports.handler = async (event) => {
  // Handle CORS preflight first
  const pf = preflight(event);
  if (pf) return pf;

  // Load Stripe only for real requests
  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const ext = (body.ext || '').trim();
    if (!ext) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing extension id' }) };
    }

    // One-time payment for Year Pass
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      allow_promotion_codes: false,
      // land on Netlify success, which bounces into chrome-extension://<ext>/thankyou.html
      success_url: `${NETLIFY_BASE}/success.html?ext=${encodeURIComponent(ext)}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${NETLIFY_BASE}/`
    });

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
