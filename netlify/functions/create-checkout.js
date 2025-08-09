const { preflight, corsHeaders } = require('./util');

// Your live price id (from you)
const PRICE_ID = 'price_1RsjJZRrIlnVe6VQwjaCfrXo';

// We redirect to your Netlify success page, carrying both ext id and session id
// success.html will bounce into chrome-extension://<ext>/thankyou.html?session_id=...
const NETLIFY_BASE = 'https://browsermix.netlify.app';

exports.handler = async (event) => {
  // Handle CORS preflight *before* loading heavy deps
  const pf = preflight(event); 
  if (pf) return pf;

  // Load Stripe only for real requests (avoids preflight failures)
  const Stripe = require('stripe');
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, { apiVersion: '2024-06-20' });

  try {
    const body = event.body ? JSON.parse(event.body) : {};
    const ext = (body.ext || '').trim();

    if (!ext) {
      return { statusCode: 400, headers: corsHeaders, body: JSON.stringify({ error: 'Missing extension id' }) };
    }

    const success_url = `${NETLIFY_BASE}/success.html?ext=${encodeURIComponent(ext)}&session_id={CHECKOUT_SESSION_ID}`;
    const cancel_url  = `${NETLIFY_BASE}/`;

    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      line_items: [{ price: PRICE_ID, quantity: 1 }],
      allow_promotion_codes: false,
      success_url,
      cancel_url
    });

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ url: session.url }) };
  } catch (err) {
    return { statusCode: 500, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
