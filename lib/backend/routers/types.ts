/**
 * Router Types
 * 
 * Core types for the swap routing system.
 * These types define the contract between routers and the route service.
 */

// ============================================================================
// Router Parameters (Normalized)
// ============================================================================

/**
 * Normalized router parameters (after transformation from canonical format)
 * These are router-specific and ready to be passed to router APIs
 */
export interface RouterParams {
  fromChainId: number | string;        // Provider-specific chain ID
  fromToken: string;                   // Provider-specific token identifier
  fromAmount: string;                  // Amount in smallest unit
  toChainId: number | string;
  toToken: string;
  recipient?: string;                  // Provider-specific address format
  slippage?: number;                   // Provider-specific slippage format
  order?: string;                      // Provider-specific order preference
}

// ============================================================================
// Router Route (Normalized Response)
// ============================================================================

/**
 * Normalized router response
 * All routers must return this format after normalization
 */
export interface RouterRoute {
  // Route identification
  router: string;                      // Router name (e.g., 'lifi', 'squid')
  routeId: string;                     // Unique route identifier
  
  // Token information
  fromToken: {
    chainId: number;                   // Canonical chain ID
    address: string;                    // Canonical token address
    symbol: string;                    // Token symbol
    amount: string;                    // Input amount (human-readable)
    amountUSD?: string;                 // Input amount in USD (from route or calculated)
    decimals: number;                  // Token decimals
  };
  toToken: {
    chainId: number;
    address: string;
    symbol: string;
    amount: string;                    // Output amount (human-readable)
    amountUSD?: string;                 // Output amount in USD (from route or calculated)
    decimals: number;
  };
  
  // Quote information
  exchangeRate: string;                // e.g., "1.5" (1 USDC = 1.5 USDT)
  priceImpact: string;                 // e.g., "0.5" (0.5%)
  slippage: string;                    // Applied slippage (e.g., "0.5")
  
  // Cost information
  fees: {
    protocol: string;                  // Protocol fee in USD (from router)
    gas: string;                       // Gas estimate (native token)
    gasUSD: string;                    // Gas estimate in USD
    tiwiProtocolFeeUSD?: string;       // Tiwi protocol fee (0.25% of fromAmountUSD)
    total: string;                     // Total fees in USD (includes Tiwi fee)
  };
  
  // Route steps
  steps: RouteStep[];
  
  // Execution metadata
  estimatedTime: number;               // Estimated time in seconds
  expiresAt: number;                  // Quote expiration timestamp (Unix timestamp)
  transactionData?: string;           // Encoded transaction (if available)
  
  // Raw router response (for debugging)
  raw?: any;                           // Original router response
}

export interface RouteStep {
  type: 'swap' | 'bridge' | 'wrap' | 'unwrap';
  chainId: number;                     // Canonical chain ID
  fromToken: {
    address: string;
    amount: string;
    symbol?: string;
  };
  toToken: {
    address: string;
    amount: string;
    symbol?: string;
  };
  protocol?: string;                   // e.g., "Uniswap V3", "Stargate"
  description?: string;                // Human-readable step description
}

// ============================================================================
// Route Request (Canonical)
// ============================================================================

/**
 * Canonical route request format (what frontend sends)
 */
export interface RouteRequest {
  // Token information (canonical format)
  fromToken: {
    chainId: number;                   // Canonical chain ID
    address: string;                     // Token address
    symbol?: string;                    // Optional: for validation
    decimals?: number;                  // Optional: if known
  };
  toToken: {
    chainId: number;
    address: string;
    symbol?: string;
    decimals?: number;
  };
  
  // Amount
  fromAmount: string;                   // Human-readable amount (e.g., "100.5")
  
  // Optional parameters
  slippage?: number;                    // Slippage tolerance (0-100, default: 0.5)
  slippageMode?: 'fixed' | 'auto';     // Fixed slippage or auto-adjust (default: 'fixed')
  recipient?: string;                   // Recipient address (optional, for cross-chain)
  order?: 'RECOMMENDED' | 'FASTEST' | 'CHEAPEST';  // Route preference (default: 'RECOMMENDED')
}

// ============================================================================
// Route Response (Unified)
// ============================================================================

/**
 * Unified route response (what frontend receives)
 */
export interface RouteResponse {
  route: RouterRoute;                  // Best route
  alternatives?: RouterRoute[];        // Alternative routes (if available)
  timestamp: number;                   // Response timestamp
  expiresAt: number;                   // Quote expiration timestamp
}

// ============================================================================
// Router Error
// ============================================================================

/**
 * Router error with normalized and router-specific information
 */
export interface RouterError {
  // Normalized error (for frontend)
  message: string;                     // User-friendly error message
  code: string;                        // Error code (e.g., 'NO_ROUTE', 'UNSUPPORTED_PAIR')
  
  // Router-specific details (for backend debugging)
  router: string;                      // Router name
  routerError?: any;                   // Original router error
  routerErrorCode?: string;            // Router-specific error code
  routerErrorMessage?: string;         // Router-specific error message
}

