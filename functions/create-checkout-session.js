// Netlify Function: create-checkout-session
// Starts a $4.99 Stripe Checkout and returns the redirect URL.
// Requires POST with JSON body: { "extId": "some-unique-id-from-extension" }

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

const headers = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

exports.handler = async (event) => {
  // Preflight for browsers
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "OK" };
  }

  // Block anything that isn’t POST
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  // Parse body and validate extId
  let extId;
  try {
    const body = event.body ? JSON.parse(event.body) : {};
    extId = (body.extId || "").toString().trim();
    if (!extId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "extId is required" }),
      };
    }
  } catch {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify({ error: "Invalid JSON body" }),
    };
  }

  try {
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: extId, // lets us reconcile the purchase later
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { name: "BrowserMix Premium" },
            unit_amount: 499, // $4.99 in cents
          },
          quantity: 1,
        },
      ],
      // include extId on your success page so Restore can verify later
      success_url: `https://browsermix.netlify.app/success.html?extId=${encodeURIComponent(extId)}`,
      cancel_url: "https://browsermix.netlify.app/",
    });

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "Server error creating session" }),
    };
  }
};
