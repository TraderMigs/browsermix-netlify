// Netlify Function: create-checkout-session
// Purpose: start a $4.99 Stripe Checkout and give back the redirect URL

const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  // Only allow POST; a GET should show 405 so we know the function exists
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method Not Allowed. Use POST." }),
    };
  }

  try {
    // Create a simple one-time payment for $4.99 USD
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
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
      // Send buyer back to your site
      success_url: "https://browsermix.netlify.app/success.html",
      cancel_url: "https://browsermix.netlify.app/",
    });

    return {
      statusCode: 200,
      body: JSON.stringify({ url: session.url }),
    };
  } catch (err) {
    console.error("Stripe error:", err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
