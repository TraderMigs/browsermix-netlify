const { preflight, corsHeaders } = require('./util');
const jwt = require('jsonwebtoken');

const SIGNING_SECRET = process.env.LICENSE_SIGNING_SECRET || process.env.STRIPE_SECRET_KEY;

exports.handler = async (event) => {
  const pf = preflight(event); if (pf) return pf;

  try {
    const auth = event.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'No token' }) };
    }

    const payload = jwt.verify(token, SIGNING_SECRET);
    if (!payload || payload.typ !== 'browsermix_license') {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // If in the future you add revocation, check a denylist here.

    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ valid: true }) };
  } catch (err) {
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
