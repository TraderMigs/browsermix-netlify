// netlify/functions/util.js
// Utility helpers: CORS + Blobs-backed license upsert.
//
// IMPORTANT for Netlify Blobs:
// - Call getStore() *inside* a function that's invoked per request.
// - Provide siteID + token when running in environments where they're not injected automatically.
//
// Docs: https://docs.netlify.com/storage/overview/#blob-store
// JavaScript API (getStore options): https://docs.netlify.com/storage/overview/#blob-store
// (siteID/token are set automatically in Functions, but can be supplied manually)

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,Stripe-Signature",
};

function preflight(event) {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers: corsHeaders };
  }
  return null;
}

/**
 * Upsert a license record in Netlify Blobs.
 * @param {string} idOrEmail - Stripe customer ID or e-mail
 * @param {object} patch - fields to upsert
 */
async function upsertLicense(idOrEmail, patch) {
  // Import at call-time so we’re not initializing at module scope.
  const { getStore } = await import("@netlify/blobs");

  const store = getStore({
    name: "licenses",
    // Supply these explicitly to avoid "environment not configured" errors.
    siteID: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN,
  });

  const key = `license:${String(idOrEmail || "").toLowerCase()}`;

  // Merge with any existing record
  const existing = (await store.getJSON(key)) || {};
  const merged = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  };

  await store.setJSON(key, merged);
  return merged;
}

module.exports = { corsHeaders, preflight, upsertLicense };
