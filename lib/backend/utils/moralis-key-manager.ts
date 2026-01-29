/**
 * Moralis API Key Manager
 * 
 * Manages multiple Moralis API keys with automatic rotation when rate limits are hit.
 * Tracks exhausted keys and rotates to the next available key.
 */

// ============================================================================
// API Key Configuration
// ============================================================================

/**
 * Array of Moralis API keys (fallback keys)
 * Keys are tried in order when rate limits are hit
 */
/**
 * Filter out undefined/null keys and ensure we have at least one valid key
 */
function getValidKeys(): string[] {
  // Dynamically collect Moralis API keys from environment variables: MORALIS_API_KEY_1, _2, _3, ...
  const keys: string[] = [];
  let i = 1;
  while (true) {
    const key = process.env[`MORALIS_API_KEY_${i}` as const];
    if (typeof key === 'undefined') break;
    if (key && typeof key === 'string' && key.trim()) {
      keys.push(key);
    }
    i += 1;
  }
  if (keys.length === 0) {
    throw new Error('[MoralisKeyManager] No valid API keys provided');
  }
  
  return keys;
}

const MORALIS_API_KEYS: string[] = getValidKeys();

// ============================================================================
// Key State Management
// ============================================================================

/**
 * Track which keys have been exhausted (hit rate limit)
 * Reset on server restart
 */
const exhaustedKeys = new Set<number>();

/**
 * Current active key index
 */
let currentKeyIndex = 0;

// ============================================================================
// Key Management Functions
// ============================================================================

/**
 * Get the current active API key
 */
export function getCurrentApiKey(): string {
  return MORALIS_API_KEYS[currentKeyIndex];
}

/**
 * Get all available API keys
 */
export function getAllApiKeys(): string[] {
  return [...MORALIS_API_KEYS];
}

/**
 * Check if a key is exhausted (hit rate limit)
 */
export function isKeyExhausted(keyIndex: number): boolean {
  return exhaustedKeys.has(keyIndex);
}

/**
 * Mark a key as exhausted (hit rate limit)
 */
export function markKeyAsExhausted(keyIndex: number): void {
  exhaustedKeys.add(keyIndex);
  console.warn(`[MoralisKeyManager] Marked API key ${keyIndex + 1} as exhausted (rate limit hit)`);
}

/**
 * Get the next available API key index
 * Returns null if all keys are exhausted
 */
export function getNextAvailableKeyIndex(): number | null {
  // Try current key first (might have been reset)
  if (!exhaustedKeys.has(currentKeyIndex)) {
    return currentKeyIndex;
  }
  
  // Find next available key
  for (let i = 0; i < MORALIS_API_KEYS.length; i++) {
    const nextIndex = (currentKeyIndex + i + 1) % MORALIS_API_KEYS.length;
    if (!exhaustedKeys.has(nextIndex)) {
      return nextIndex;
    }
  }
  
  // All keys exhausted
  return null;
}

/**
 * Rotate to the next available API key
 * Returns the new API key, or null if all keys are exhausted
 */
export function rotateToNextKey(): string | null {
  const nextIndex = getNextAvailableKeyIndex();
  
  if (nextIndex === null) {
    console.error('[MoralisKeyManager] All API keys exhausted. Please add more keys or upgrade plan.');
    return null;
  }
  
  if (nextIndex !== currentKeyIndex) {
    console.log(`[MoralisKeyManager] Rotating from key ${currentKeyIndex + 1} to key ${nextIndex + 1}`);
    currentKeyIndex = nextIndex;
  }
  
  return MORALIS_API_KEYS[currentKeyIndex];
}

/**
 * Check if error is a rate limit error (401 Unauthorized with C0006 code)
 */
export function isRateLimitError(error: any): boolean {
  // Check for Moralis SDK error code C0006 (rate limit/unauthorized)
  if (error?.code === 'C0006' || error?.isMoralisError === true) {
    // Check if it's specifically a rate limit/plan limit error
    const message = error?.message || '';
    const details = error?.details || {};
    
    if (
      message.includes('Unauthorized') ||
      message.includes('401') ||
      message.includes('plan') ||
      message.includes('usage has been consumed') ||
      details?.status === 401
    ) {
      return true;
    }
  }
  
  // Check for Axios 401 error
  if (error?.response?.status === 401 || error?.status === 401) {
    return true;
  }
  
  return false;
}

/**
 * Get current key index (for debugging)
 */
export function getCurrentKeyIndex(): number {
  return currentKeyIndex;
}

/**
 * Get count of exhausted keys
 */
export function getExhaustedKeysCount(): number {
  return exhaustedKeys.size;
}

/**
 * Get total number of API keys
 */
export function getTotalKeysCount(): number {
  return MORALIS_API_KEYS.length;
}

/**
 * Reset exhausted keys (for testing or manual reset)
 */
export function resetExhaustedKeys(): void {
  exhaustedKeys.clear();
  console.log('[MoralisKeyManager] Reset all exhausted keys');
}


