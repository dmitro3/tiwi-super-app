/**
 * Moralis Initialization Utility
 * 
 * Centralized Moralis initialization to avoid duplicate initializations.
 * This ensures Moralis is initialized only once across the application.
 */

import Moralis from 'moralis';

// ============================================================================
// Configuration
// ============================================================================

const MORALIS_API_KEY = process.env.MORALIS_API_KEY || process.env.NEXT_PUBLIC_MORALIS_API_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJub25jZSI6ImI3YzM4YjA2LTUwMjQtNDcxNC1iOTZhLTZiNzljNGQxZTE4NiIsIm9yZ0lkIjoiNDg1MjE2IiwidXNlcklkIjoiNDk5MTk1IiwidHlwZUlkIjoiOTI3ZGNlNzQtYmZkZi00Yjc3LWJlZTUtZTBmNTNlNDAzMTAwIiwidHlwZSI6IlBST0pFQ1QiLCJpYXQiOjE3NjUyNjAyMjQsImV4cCI6NDkyMTAyMDIyNH0._OVkoNmyqPF5xmJSwOfuifJUjOKpeVVJYayAmG992D8';

// ============================================================================
// Initialization State
// ============================================================================

let initializationPromise: Promise<void> | null = null;
let isInitialized = false;

// ============================================================================
// Initialization Function
// ============================================================================

/**
 * Initialize Moralis SDK
 * This function is idempotent - safe to call multiple times
 */
export async function initializeMoralis(): Promise<void> {
  if (isInitialized) {
    return;
  }
  
  if (initializationPromise) {
    return initializationPromise;
  }
  
  initializationPromise = (async () => {
    try {
      await Moralis.start({
        apiKey: MORALIS_API_KEY,
      });
      isInitialized = true;
      console.log('[MoralisInit] Moralis initialized successfully');
    } catch (error: any) {
      // Handle "already initialized" errors gracefully
      if (error?.message?.includes('Modules are started already') || 
          error?.message?.includes('C0009') ||
          error?.code === 'C0009') {
        isInitialized = true;
        console.log('[MoralisInit] Moralis already initialized (concurrent call handled)');
      } else {
        console.error('[MoralisInit] Error initializing Moralis:', error);
        initializationPromise = null;
        throw error;
      }
    }
  })();
  
  return initializationPromise;
}

/**
 * Get Moralis instance (ensures initialization)
 */
export async function getMoralis(): Promise<typeof Moralis> {
  await initializeMoralis();
  return Moralis;
}

