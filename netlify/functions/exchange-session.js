const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const jwt = require('jsonwebtoken');

exports.handler = async (event) => {
  try {
    const { session_id } = JSON.parse(event.body);
    const session = await stripe.checkout.sessions.retrieve(session_id);

    if (session.payment_status !== 'paid') {
      throw new Error('Payment not completed');
    }

    // Issue license key JWT
    const token = jwt.sign(
      {
        typ: 'year_pass',
        exp: Math.floor(Date.now() / 1000) + 365 * 24 * 60 * 60, // 1 year
      },
      process.env.JWT_SECRET
    );

    return {
      statusCode: 200,
      body: JSON.stringify({ licenseKey: token }),
    };
  } catch (err) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
