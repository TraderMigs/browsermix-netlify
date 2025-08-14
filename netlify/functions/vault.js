// vault.js — Full implementation for encrypted history vault

// Import Argon2 for key derivation
importScripts('argon2-bundled.min.js');

const VAULT_DB = 'browsermix_vault';
const VAULT_STORE = 'vault_store';

async function deriveKey(password, salt) {
  const hash = await argon2.hash({
    pass: password,
    salt: salt,
    time: 2,
    mem: 65536,
    parallelism: 1,
    type: argon2.ArgonType.Argon2id,
    hashLen: 32
  });
  const raw = Uint8Array.from(atob(hash.hash), c => c.charCodeAt(0));
  return crypto.subtle.importKey('raw', raw.buffer, 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function encryptVisits(password, visits) {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const key = await deriveKey(password, salt);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoder = new TextEncoder();
  const data = encoder.encode(JSON.stringify(visits));
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, data);
  return { ciphertext, salt, iv };
}

async function decryptVisits(password, salt, iv, ciphertext) {
  const key = await deriveKey(password, salt);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, ciphertext);
  const decoder = new TextDecoder();
  return JSON.parse(decoder.decode(decrypted));
}

function openVaultDB() {
  return new Promise((res, rej) => {
    const req = indexedDB.open(VAULT_DB, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(VAULT_STORE);
    };
    req.onsuccess = () => res(req.result);
    req.onerror = () => rej(req.error);
  });
}

async function storeVault(obj) {
  const db = await openVaultDB();
  const tx = db.transaction(VAULT_STORE, 'readwrite');
  tx.objectStore(VAULT_STORE).put(obj, 'vault');
  return tx.complete;
}

async function getVault() {
  const db = await openVaultDB();
  const tx = db.transaction(VAULT_STORE, 'readonly');
  const obj = await tx.objectStore(VAULT_STORE).get('vault');
  return obj;
}

// Message handling for integration
chrome.runtime.onMessage.addListener((msg, _, sendResponse) => {
  (async () => {
    if (msg.type === 'PROTECT_HISTORY') {
      const v = await sendMessageToBG('GET_VISITS');
      const enc = await encryptVisits(msg.password, v.visits);
      await storeVault(enc);
      sendResponse({ ok: true });
    } else if (msg.type === 'UNLOCK_VAULT') {
      const store = await getVault();
      let visits = [];
      try {
        visits = await decryptVisits(msg.password, store.salt, store.iv, store.ciphertext);
      } catch (e) {
        return sendResponse({ ok: false, error: 'Wrong password or corrupt vault' });
      }
      sendResponse({ ok: true, visits });
    } else if (msg.type === 'EXPORT_VAULT') {
      const store = await getVault();
      const blob = new Blob([JSON.stringify(store)], { type: 'application/json' });
      sendResponse({ ok: true, blob });
    } else if (msg.type === 'IMPORT_VAULT') {
      await storeVault(msg.store);
      sendResponse({ ok: true });
    }
  })();
  return true;
});
