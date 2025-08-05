const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

exports.handler = async (event) => {
  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    line_items: [{ price: "price_1RsjJZRrIlnVe6VQwjaCfrXo", quantity: 1 }],
    success_url: `chrome-extension://${process.env.EXT_ID}/thankyou.html`,
    cancel_url: `chrome-extension://${process.env.EXT_ID}/popup.html`
  });
  return {
    statusCode: 200,
    body: JSON.stringify({ url: session.url })
  };
};
