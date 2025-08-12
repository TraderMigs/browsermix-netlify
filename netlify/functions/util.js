// netlify/functions/util.js
const { getStore } = require('@netlify/blobs');

// CORS helpers (unchanged)
const cors = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  }
};
exports.preflight = (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors.headers, body: "" };
  }
  return null;
};
exports.corsHeaders = cors.headers;

// --- Blobs helpers (lazy store creation) ---
async function getLicensesStore() {
  // Pass siteId/token so it works in all environments
  return getStore('licenses', {
    siteId: process.env.NETLIFY_SITE_ID,
    token: process.env.NETLIFY_BLOBS_TOKEN
  });
}

exports.upsertLicense = async (key, value) => {
  const store = await getLicensesStore();
  await store.set(key, JSON.stringify(value), {
    metadata: { contentType: 'application/json' }
  });
};

exports.getLicense = async (key) => {
  const store = await getLicensesStore();
  const val = await store.get(key, { type: 'json' });
  return val || null;
};
