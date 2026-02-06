/**
 * Router Constants
 * 
 * Shared constants for routers.
 */

/**
 * Default Squid address for when user hasn't connected wallet
 * Used for quote fetching when recipient is not provided
 */
export const SQUID_DEFAULT_ADDRESS = 'osmo1qqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqqq65mj83';

/**
 * Default slippage tolerance (0.5%)
 */
export const DEFAULT_SLIPPAGE = 0.5;

/**
 * Maximum slippage for auto-slippage mode (30.5%)
 * Used for low liquidity pairs
 */
export const MAX_AUTO_SLIPPAGE = 30.5;

/**
 * Quote expiration time (60 seconds)
 */
export const QUOTE_EXPIRATION_SECONDS = 60;

/**
 * Router timeout (25 seconds)
 */
export const ROUTER_TIMEOUT_MS = 25000;

/**
 * Maximum retry attempts for router calls
 */
export const MAX_RETRY_ATTEMPTS = 1;

