/**
 * Local Keystore
 *
 * Stores encrypted private keys for local wallets in browser storage.
 * Encryption is handled by wallet-encryption.ts (AES-GCM + PBKDF2).
 *
 * SECURITY NOTES:
 * - This module NEVER stores plaintext private keys or mnemonics.
 * - Only encrypted blobs (base64) are persisted in localStorage.
 * - The user must provide their password to decrypt when needed.
 */

const KEYSTORE_STORAGE_KEY = 'tiwi_local_keystore_v1';

export interface LocalKeystoreEntry {
  address: string;        // checksum or lowercase, we normalize to lowercase for lookups
  encryptedPrivateKey: string; // base64 payload from encryptWalletData
  createdAt: number;
}

interface LocalKeystoreData {
  entries: LocalKeystoreEntry[];
}

function loadKeystore(): LocalKeystoreData {
  if (typeof window === 'undefined') {
    return { entries: [] };
  }

  try {
    const raw = window.localStorage.getItem(KEYSTORE_STORAGE_KEY);
    if (!raw) return { entries: [] };
    const parsed = JSON.parse(raw) as LocalKeystoreData;
    if (!parsed || !Array.isArray(parsed.entries)) {
      return { entries: [] };
    }
    return {
      entries: parsed.entries.map((e) => ({
        ...e,
        address: e.address.toLowerCase(),
      })),
    };
  } catch {
    return { entries: [] };
  }
}

function saveKeystore(data: LocalKeystoreData) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEYSTORE_STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Ignore storage errors (quota, etc.)
  }
}

export function saveEncryptedPrivateKey(address: string, encryptedPrivateKey: string): void {
  const normalized = address.toLowerCase();
  const data = loadKeystore();

  const existingIndex = data.entries.findIndex(
    (e) => e.address === normalized
  );

  if (existingIndex >= 0) {
    data.entries[existingIndex] = {
      ...data.entries[existingIndex],
      encryptedPrivateKey,
    };
  } else {
    data.entries.push({
      address: normalized,
      encryptedPrivateKey,
      createdAt: Date.now(),
    });
  }

  saveKeystore(data);
}

export function getEncryptedPrivateKey(address: string): string | null {
  const normalized = address.toLowerCase();
  const data = loadKeystore();
  const entry = data.entries.find((e) => e.address === normalized);
  return entry?.encryptedPrivateKey || null;
}

export function listLocalKeystore(): LocalKeystoreEntry[] {
  return loadKeystore().entries;
}

export function hasAnyLocalWalletsInKeystore(): boolean {
  return loadKeystore().entries.length > 0;
}

export function removeEncryptedPrivateKey(address: string): void {
  const normalized = address.toLowerCase();
  const data = loadKeystore();
  data.entries = data.entries.filter((e) => e.address !== normalized);
  saveKeystore(data);
}


