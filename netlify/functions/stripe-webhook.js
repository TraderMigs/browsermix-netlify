// netlify/functions/stripe-webhook.js
// ===== Stripe Webhook (Netlify Functions) =====
// IMPORTANT: Do NOT parse event.body before verifying the signature.
// Env needed: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET, NETLIFY_SITE_ID, NETLIFY_BLOBS_TOKEN

const Stripe = require("stripe");
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY, {
  apiVersion: "2024-06-20",
});

const { upsertLicense, preflight, corsHeaders } = require("./util.js");

exports.handler = async (event) => {
  // Basic CORS preflight (Stripe won't use it, but keeps consistency)
  const pf = preflight(event);
  if (pf) return pf;

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers: corsHeaders, body: "Method Not Allowed" };
  }

  // Stripe requires the raw request body for signature verification.
  // Do NOT JSON.parse(event.body) before constructEvent.
  // See: https://docs.stripe.com/webhooks#signatures
  const sig = event.headers["stripe-signature"];
  if (!sig) {
    return { statusCode: 400, headers: corsHeaders, body: "Missing signature" };
  }

  let evt;
  try {
    evt = stripe.webhooks.constructEvent(
      event.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return {
      statusCode: 400,
      headers: corsHeaders,
      body: `Signature verification failed: ${err.message}`,
    };
  }

  try {
    // Helper to persist status into Blobs
    async function activateByCustomer({ customer, email, subscriptionId }) {
      let currentPeriodEnd = null;
      if (subscriptionId) {
        const sub = await stripe.subscriptions.retrieve(subscriptionId);
        currentPeriodEnd = sub.current_period_end
          ? new Date(sub.current_period_end * 1000).toISOString()
          : null;
      }
      await upsertLicense(customer || email, {
        customer_id: customer || null,
        email: email || null,
        status: "active",
        current_period_end: currentPeriodEnd,
      });
    }

    async function setStatus(customerOrEmail, status) {
      await upsertLicense(customerOrEmail, { status });
    }

    switch (evt.type) {
      case "checkout.session.completed": {
        const s = evt.data.object;
        await activateByCustomer({
          customer: s.customer,
          email: s.customer_details?.email || s.customer_email || null,
          subscriptionId: s.subscription || null,
        });
        break;
      }

      case "invoice.paid": {
        const inv = evt.data.object;
        if (inv.subscription) {
          const sub = await stripe.subscriptions.retrieve(inv.subscription);
          await upsertLicense(inv.customer, {
            status: "active",
            current_period_end: sub.current_period_end
              ? new Date(sub.current_period_end * 1000).toISOString()
              : null,
          });
        } else {
          await setStatus(inv.customer || inv.customer_email, "active");
        }
        break;
      }

      case "customer.subscription.deleted": {
        const sub = evt.data.object;
        await setStatus(sub.customer, "canceled");
        break;
      }

      case "charge.refunded": {
        const ch = evt.data.object;
        await setStatus(ch.customer || ch.billing_details?.email, "refunded");
        break;
      }

      default:
        // Ignore other event types
        break;
    }

    return { statusCode: 200, headers: corsHeaders, body: "ok" };
  } catch (err) {
    return {
      statusCode: 500,
      headers: corsHeaders,
      body: `Webhook error: ${err.message}`,
    };
  }
};
