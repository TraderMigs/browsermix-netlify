// netlify/functions/util.js
// Small helpers shared by functions (CJS)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type,Stripe-Signature",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
};

function preflight(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: corsHeaders, body: "ok" };
  }
  return null;
}

/**
 * Upsert a "license" record in Netlify Blobs.
 * IMPORTANT: create the Blobs store *inside* the function so the Netlify runtime
 * is fully initialized, and provide manual credentials (siteID, token).
 */
async function upsertLicense(idOrEmail, patch) {
  // ESM-only package: import dynamically from CJS
  const { getStore } = await import("@netlify/blobs");

  const store = getStore({
    name: "licenses",
    // Manual mode so it works in Functions runtime
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN, // Personal Access Token / site-scoped token
  });

  const key = `license:${idOrEmail}`;
  const existing = (await store.get(key, { type: "json" })) || {};

  const next = {
    id: idOrEmail || existing.id || null,
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  await store.setJSON(key, next);
  return next;
}

module.exports = { corsHeaders, preflight, upsertLicense };
