/**
 * Error Handler Utilities
 * 
 * Utilities for handling and formatting swap execution errors.
 */

import { SwapExecutionError, SwapErrorCode } from '../types';

/**
 * Format error message for user display
 */
export function formatErrorMessage(error: unknown): string {
  if (error instanceof SwapExecutionError) {
    return error.message;
  }
  
  if (error instanceof Error) {
    const message = error.message;
    
    // Common error patterns
    if (message.includes('rejected') || message.includes('User rejected')) {
      return 'Transaction was rejected. Please try again.';
    }
    
    if (message.includes('insufficient funds') || message.includes('insufficient balance')) {
      return 'Insufficient balance for this transaction.';
    }
    
    if (message.includes('network') || message.includes('RPC') || message.includes('Failed to fetch') || message.includes('fetch')) {
      return 'Network error. Please check your connection and try again.';
    }

    if (message.includes('wallet') || message.includes('provider') || message.includes('not connected')) {
      return 'Wallet connection error. Please ensure your wallet is connected and try again.';
    }
    
    if (message.includes('slippage') || message.includes('SLIPPAGE')) {
      return 'Slippage tolerance exceeded. Try increasing slippage or reducing amount.';
    }
    
    if (message.includes('expired') || message.includes('EXPIRED')) {
      return 'Quote has expired. Please get a new quote and try again.';
    }
    
    // Return original message if no pattern matches
    return message;
  }
  
  return 'An unknown error occurred. Please try again.';
}

/**
 * Create a SwapExecutionError from various error types
 */
export function createSwapError(
  error: unknown,
  code: SwapErrorCode,
  router?: string
): SwapExecutionError {
  if (error instanceof SwapExecutionError) {
    return error;
  }
  
  const message = formatErrorMessage(error);
  const originalError = error instanceof Error ? error : undefined;
  
  return new SwapExecutionError(message, code, router, originalError);
}

/**
 * Check if an error is retryable
 */
export function isRetryableError(error: unknown): boolean {
  if (error instanceof SwapExecutionError) {
    // Network errors are retryable
    if (error.code === SwapErrorCode.NETWORK_ERROR) {
      return true;
    }
    // User rejection is not retryable
    if (error.code === SwapErrorCode.TRANSACTION_REJECTED || 
        error.code === SwapErrorCode.APPROVAL_REJECTED) {
      return false;
    }
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    // Retryable errors
    if (
      message.includes('network') ||
      message.includes('rpc') ||
      message.includes('timeout') ||
      message.includes('connection')
    ) {
      return true;
    }
    
    // Non-retryable errors
    if (
      message.includes('rejected') ||
      message.includes('insufficient') ||
      message.includes('expired')
    ) {
      return false;
    }
  }
  
  // Default to not retryable
  return false;
}

/**
 * Extract error code from error
 */
export function getErrorCode(error: unknown): SwapErrorCode {
  if (error instanceof SwapExecutionError) {
    return error.code;
  }
  
  if (error instanceof Error) {
    const message = error.message.toLowerCase();
    
    if (message.includes('rejected')) {
      return SwapErrorCode.TRANSACTION_REJECTED;
    }
    if (message.includes('insufficient')) {
      return SwapErrorCode.INSUFFICIENT_BALANCE;
    }
    if (message.includes('network') || message.includes('rpc')) {
      return SwapErrorCode.NETWORK_ERROR;
    }
    if (message.includes('expired')) {
      return SwapErrorCode.QUOTE_EXPIRED;
    }
  }
  
  return SwapErrorCode.UNKNOWN_ERROR;
}

