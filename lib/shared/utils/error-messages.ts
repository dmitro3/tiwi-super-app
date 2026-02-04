/**
 * Error Message Utilities
 * 
 * Provides user-friendly error messages and next steps for routing errors.
 */

export interface RouteErrorAction {
  label: string;
  slippageTolerance: number;
}

export interface RouteErrorInfo {
  title: string;
  message: string;
  nextSteps?: string[];
  actions?: RouteErrorAction[];
}

/**
 * Parse routing error and return short, user-friendly message
 */
export function parseRouteError(error: Error | string): RouteErrorInfo {
  const errorMessage = typeof error === 'string' ? error : error.message || 'Unknown error';
  const lowerMessage = errorMessage.toLowerCase();

  // No route found errors
  if (lowerMessage.includes('no route found') || lowerMessage.includes('no route available')) {
    return {
      title: 'Route not available',
      message: 'No swap route for this pair.',
    };
  }

  // No routers support this chain
  if (lowerMessage.includes('no routers support') || lowerMessage.includes('chain combination')) {
    return {
      title: 'Chain not supported',
      message: 'This network combo is not supported.',
    };
  }

  // Slippage-related errors (most common)
  if (
    lowerMessage.includes('slippage') ||
    lowerMessage.includes('insufficient_output') ||
    lowerMessage.includes('amount_out_min') ||
    lowerMessage.includes('execution reverted') ||
    lowerMessage.includes('slippage tolerance')
  ) {
    return {
      title: 'Swap failed',
      message: 'Swap failed due to slippage. Consider increasing slippage tolerance or try another pair.',
      actions: [
        { label: 'Increase to 1%', slippageTolerance: 1 },
        { label: 'Increase to 3%', slippageTolerance: 3 },
        { label: 'Increase to 5%', slippageTolerance: 5 },
      ],
      nextSteps: [
        'Try increasing slippage tolerance',
        'Try swapping a smaller amount',
        'Try a different token pair',
      ],
    };
  }

  // Auto slippage errors
  if (lowerMessage.includes('auto slippage') || lowerMessage.includes('no route found after')) {
    return {
      title: 'Swap route not found',
      message: 'Could not find a route even with increased slippage tolerance. This pair may have very low liquidity.',
      actions: [
        { label: 'Try 5% slippage', slippageTolerance: 5 },
        { label: 'Try 10% slippage', slippageTolerance: 10 },
      ],
      nextSteps: [
        'Try using fixed slippage mode with a higher tolerance (e.g., 5-10%)',
        'Try swapping a smaller amount',
        'Try a different token pair',
      ],
    };
  }

  // Insufficient liquidity
  if (lowerMessage.includes('insufficient liquidity') || lowerMessage.includes('low liquidity')) {
    return {
      title: 'Low liquidity',
      message: 'Not enough liquidity for this swap.',
      actions: [
        { label: 'Try 3% slippage', slippageTolerance: 3 },
        { label: 'Try 5% slippage', slippageTolerance: 5 },
      ],
      nextSteps: [
        'Try swapping a smaller amount',
        'Try using fixed slippage mode with higher tolerance',
        'Try a different token pair',
      ],
    };
  }

  // Timeout errors
  if (lowerMessage.includes('timeout') || lowerMessage.includes('timed out')) {
    return {
      title: 'Timed out',
      message: 'Request took too long. Please retry.',
    };
  }

  // Invalid parameters
  if (lowerMessage.includes('invalid') || lowerMessage.includes('missing required')) {
    return {
      title: 'Invalid input',
      message: 'Check tokens and amount, then retry.',
    };
  }

  // Network errors
  if (lowerMessage.includes('network') || lowerMessage.includes('connection') || lowerMessage.includes('fetch')) {
    return {
      title: 'Network issue',
      message: 'Check your connection and retry.',
    };
  }

  // Generic error
  return {
    title: 'Swap failed',
    message: 'Something went wrong. Please retry.',
  };
}

/**
 * Extract router names from error message
 */
export function extractRouterNames(errorMessage: string): string[] {
  const routerMap: Record<string, string> = {
    'lifi': 'LiFi',
    'pancakeswap': 'PancakeSwap',
    'uniswap': 'Uniswap',
    'squid': 'Squid',
    'jupiter': 'Jupiter',
    'relay': 'Relay',
  };

  const routers: string[] = [];
  const lowerMessage = errorMessage.toLowerCase();

  for (const [key, displayName] of Object.entries(routerMap)) {
    if (lowerMessage.includes(key)) {
      routers.push(displayName);
    }
  }

  return routers;
}

/**
 * Format error message for display (truncate long messages)
 */
export function formatErrorMessage(error: Error | string, maxLength: number = 200): string {
  const message = typeof error === 'string' ? error : error.message || 'Unknown error';
  
  if (message.length <= maxLength) {
    return message;
  }

  // Truncate and add ellipsis
  return message.substring(0, maxLength - 3) + '...';
}

