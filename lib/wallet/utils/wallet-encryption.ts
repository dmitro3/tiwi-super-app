/**
 * Secure Wallet Encryption Utility
 * 
 * Uses Web Crypto API for maximum security:
 * - AES-GCM encryption (256-bit keys)
 * - PBKDF2 key derivation (100,000 iterations)
 * - Secure random IV generation
 * - No plaintext storage of sensitive data
 * 
 * SECURITY NOTES:
 * - Never log or expose mnemonics/private keys
 * - Clear sensitive data from memory after use
 * - Use strong passwords (min 12 characters recommended)
 * - Store encrypted data securely (localStorage is NOT ideal for production)
 */

const PBKDF2_ITERATIONS = 100000; // High iteration count for security
const KEY_LENGTH = 256; // AES-256
const SALT_LENGTH = 16; // 128 bits
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Derive encryption key from password using PBKDF2
 */
async function deriveKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const passwordKey = await crypto.subtle.importKey(
    'raw',
    encoder.encode(password),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    passwordKey,
    { name: 'AES-GCM', length: KEY_LENGTH },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Generate random salt for key derivation
 */
function generateSalt(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(SALT_LENGTH));
}

/**
 * Generate random IV for encryption
 */
function generateIV(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(IV_LENGTH));
}

/**
 * Encrypt sensitive data (mnemonic/private key)
 * 
 * @param plaintext - The data to encrypt (mnemonic phrase or private key)
 * @param password - User's password for encryption
 * @returns Encrypted data with salt and IV (base64 encoded)
 */
/**
 * Validate password strength
 * SECURITY FIX: Strengthened password requirements
 */
function validatePasswordStrength(password: string): { valid: boolean; error?: string } {
  if (password.length < 12) {
    return { valid: false, error: 'Password must be at least 12 characters' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one uppercase letter' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one lowercase letter' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one number' };
  }
  if (!/[^A-Za-z0-9]/.test(password)) {
    return { valid: false, error: 'Password must contain at least one special character' };
  }
  return { valid: true };
}

export async function encryptWalletData(
  plaintext: string,
  password: string
): Promise<string> {
  try {
    if (!plaintext || !password) {
      throw new Error('Plaintext and password are required');
    }

    // SECURITY FIX: Use strengthened password validation
    const validation = validatePasswordStrength(password);
    if (!validation.valid) {
      throw new Error(validation.error || 'Password does not meet security requirements');
    }

    // Generate salt and IV
    const salt = generateSalt();
    const iv = generateIV();

    // Derive encryption key
    const key = await deriveKey(password, salt);

    // Encrypt data
    const encoder = new TextEncoder();
    const plaintextBytes = encoder.encode(plaintext);
    
    const encryptedData = await crypto.subtle.encrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      plaintextBytes
    );

    // Combine salt + IV + encrypted data
    const combined = new Uint8Array(
      salt.length + iv.length + encryptedData.byteLength
    );
    combined.set(salt, 0);
    combined.set(iv, salt.length);
    combined.set(new Uint8Array(encryptedData), salt.length + iv.length);

    // Convert to base64 for storage
    const base64 = btoa(
      String.fromCharCode(...combined)
    );

    // Clear sensitive data from memory (best effort)
    plaintextBytes.fill(0);
    combined.fill(0);

    return base64;
  } catch (error) {
    // Never expose error details that could leak sensitive info
    console.error('Encryption failed');
    throw new Error('Failed to encrypt wallet data');
  }
}

/**
 * Decrypt sensitive data (mnemonic/private key)
 * 
 * @param encryptedData - Encrypted data (base64 encoded)
 * @param password - User's password for decryption
 * @returns Decrypted plaintext
 */
export async function decryptWalletData(
  encryptedData: string,
  password: string
): Promise<string> {
  try {
    if (!encryptedData || !password) {
      throw new Error('Encrypted data and password are required');
    }

    // Decode base64
    const combined = new Uint8Array(
      atob(encryptedData)
        .split('')
        .map((char) => char.charCodeAt(0))
    );

    // Extract salt, IV, and encrypted data
    const salt = combined.slice(0, SALT_LENGTH);
    const iv = combined.slice(SALT_LENGTH, SALT_LENGTH + IV_LENGTH);
    const encrypted = combined.slice(SALT_LENGTH + IV_LENGTH);

    // Derive decryption key
    const key = await deriveKey(password, salt);

    // Decrypt data
    const decryptedData = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv,
      },
      key,
      encrypted
    );

    // Convert to string
    const decoder = new TextDecoder();
    const plaintext = decoder.decode(decryptedData);

    // Clear sensitive data from memory (best effort)
    combined.fill(0);
    new Uint8Array(decryptedData).fill(0);

    return plaintext;
  } catch (error) {
    // Never expose error details that could leak sensitive info
    console.error('Decryption failed');
    throw new Error('Failed to decrypt wallet data. Incorrect password or corrupted data.');
  }
}

/**
 * Generate a secure random password for internal use
 * (Not used for user encryption, but useful for generating random keys)
 */
export function generateSecureRandomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

