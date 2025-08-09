const { preflight, corsHeaders } = require('./util');
const jwt = require('jsonwebtoken');

const SIGNING_SECRET = process.env.LICENSE_SIGNING_SECRET || process.env.STRIPE_SECRET_KEY;

exports.handler = async (event) => {
  // Handle CORS preflight
  const pf = preflight(event);
  if (pf) return pf;

  try {
    // Expect: Authorization: Bearer <token>
    const auth = event.headers.authorization || '';
    const token = auth.startsWith('Bearer ') ? auth.slice(7) : null;
    if (!token) {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'No token' }) };
    }

    const payload = jwt.verify(token, SIGNING_SECRET); // throws if expired/invalid
    if (!payload || payload.typ !== 'year_pass') {
      return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: 'Invalid token' }) };
    }

    // If we get here, token is valid and not expired.
    return { statusCode: 200, headers: corsHeaders, body: JSON.stringify({ valid: true }) };
  } catch (err) {
    // jwt.verify throws on expiration/invalid signature, we return not valid
    return { statusCode: 401, headers: corsHeaders, body: JSON.stringify({ error: err.message }) };
  }
};
