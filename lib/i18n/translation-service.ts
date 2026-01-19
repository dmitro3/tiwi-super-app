/**
 * Translation Service
 * 
 * Fetches translations dynamically from translation API or uses cached translations.
 * Caches translations in localStorage to avoid repeated API calls.
 */

import type { TranslationKey } from './translations';

const TRANSLATION_CACHE_KEY_PREFIX = 'tiwi_translation_';
const CACHE_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

interface CachedTranslation {
  text: string;
  timestamp: number;
  language: string;
}

/**
 * Get cached translation from localStorage
 */
function getCachedTranslation(key: TranslationKey, language: string): string | null {
  if (typeof window === 'undefined') return null;
  
  try {
    const cacheKey = `${TRANSLATION_CACHE_KEY_PREFIX}${language}_${key}`;
    const cached = localStorage.getItem(cacheKey);
    
    if (!cached) return null;
    
    const data: CachedTranslation = JSON.parse(cached);
    const now = Date.now();
    
    // Check if cache is expired
    if (now - data.timestamp > CACHE_EXPIRY_MS) {
      localStorage.removeItem(cacheKey);
      return null;
    }
    
    return data.text;
  } catch {
    return null;
  }
}

/**
 * Cache translation in localStorage
 */
function cacheTranslation(key: TranslationKey, language: string, text: string): void {
  if (typeof window === 'undefined') return;
  
  try {
    const cacheKey = `${TRANSLATION_CACHE_KEY_PREFIX}${language}_${key}`;
    const data: CachedTranslation = {
      text,
      timestamp: Date.now(),
      language,
    };
    localStorage.setItem(cacheKey, JSON.stringify(data));
  } catch (error) {
    // Ignore localStorage errors (quota exceeded, etc.)
    console.warn('[TranslationService] Failed to cache translation:', error);
  }
}

/**
 * Translate text using API
 */
async function translateViaAPI(text: string, targetLanguage: string): Promise<string> {
  const response = await fetch('/api/v1/translate', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      text,
      targetLanguage,
    }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.error || `Translation failed: ${response.statusText}`);
  }
  
  const data = await response.json();
  return data.translatedText || text;
}

/**
 * Get translation for a key in the specified language.
 * Uses cache first, then API if needed.
 */
export async function getTranslationAsync(
  key: TranslationKey,
  language: string,
  fallbackText: string
): Promise<string> {
  // Normalize language code
  const normalizedLang = language.split('-')[0].toLowerCase();
  
  // If English, return fallback (which should be English)
  if (normalizedLang === 'en') {
    return fallbackText;
  }
  
  // Check cache first
  const cached = getCachedTranslation(key, normalizedLang);
  if (cached) {
    return cached;
  }
  
  // Translate via API
  try {
    const translatedText = await translateViaAPI(fallbackText, normalizedLang);
    
    // Cache the translation
    cacheTranslation(key, normalizedLang, translatedText);
    
    return translatedText;
  } catch (error) {
    console.error(`[TranslationService] Failed to translate ${key} to ${normalizedLang}:`, error);
    // Return fallback on error
    return fallbackText;
  }
}
