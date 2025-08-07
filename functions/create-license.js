const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');
const path = require('path');

const LICENSE_DB_PATH = path.join(__dirname, 'licenses.json');

function loadLicenses() {
  if (!fs.existsSync(LICENSE_DB_PATH)) return {};
  return JSON.parse(fs.readFileSync(LICENSE_DB_PATH, 'utf-8'));
}

function saveLicenses(data) {
  fs.writeFileSync(LICENSE_DB_PATH, JSON.stringify(data, null, 2));
}

exports.handler = async function (event) {
  const sig = event.headers['stripe-signature'];
  const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET;

  let session;
  try {
    const body = event.body;
    session = stripe.webhooks.constructEvent(body, sig, endpointSecret);
  } catch (err) {
    return {
      statusCode: 400,
      body: `Webhook Error: ${err.message}`,
    };
  }

  if (session.type === 'checkout.session.completed') {
    const customerEmail = session.data.object.customer_details.email;
    const sessionId = session.data.object.id;
    const licenses = loadLicenses();

    licenses[customerEmail] = {
      email: customerEmail,
      sessionId,
      createdAt: new Date().toISOString(),
    };

    saveLicenses(licenses);
  }

  return {
    statusCode: 200,
    body: JSON.stringify({ received: true }),
  };
};
