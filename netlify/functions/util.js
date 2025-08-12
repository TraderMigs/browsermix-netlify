/* ===== CORS + Blobs utils (Netlify Functions, Node 18) ===== */
const { getStore } = require("@netlify/blobs");

/* CORS (shared by all endpoints) */
const cors = {
  headers: {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  },
};
exports.preflight = (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: cors.headers, body: "" };
  }
  return null;
};
exports.corsHeaders = cors.headers;

/* ----- Blobs: simple key/value store for licenses ----- */
/* One store named "licenses". Netlify auto-wires credentials in prod. */
const store = getStore({ name: "licenses" });

/** Read license record by key (string). Returns object or null. */
exports.getLicense = async (key) => {
  if (!key) return null;
  return await store.get(key, { type: "json" }); // null if missing
};

/** Write/replace license record at key (string). */
exports.setLicense = async (key, data) => {
  if (!key) throw new Error("Missing license key");
  await store.set(key, JSON.stringify(data), {
    contentType: "application/json",
  });
  return true;
};

/** Merge+save: reads existing (if any), shallow-merges, writes back. */
exports.upsertLicense = async (key, patch) => {
  if (!key) throw new Error("Missing license key");
  const existing = (await store.get(key, { type: "json" })) || {};
  const merged = {
    ...existing,
    ...patch,
    updated_at: new Date().toISOString(),
  };
  await store.set(key, JSON.stringify(merged), {
    contentType: "application/json",
  });
  return merged;
};
