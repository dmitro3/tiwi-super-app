/**
 * Jupiter Swap Utilities
 * 
 * Helper functions for executing Jupiter swaps on Solana.
 */

import { Transaction } from '@solana/web3.js';

/**
 * Get Jupiter swap transaction
 */
export async function getJupiterSwapTransaction(
  inputMint: string,
  outputMint: string,
  amount: string,
  quote: any
): Promise<Transaction> {
  try {
    const { Transaction } = await import('@solana/web3.js');
    
    // If quote already has swapTransaction, use it
    if (quote.swapTransaction) {
      return Transaction.from(Buffer.from(quote.swapTransaction, 'base64'));
    }
    
    // Get user's public key from wallet
    const { getSolanaWallet } = await import('./solana');
    const wallet = await getSolanaWallet();
    const userPublicKey = wallet.publicKey?.toString() || '';
    
    if (!userPublicKey) {
      throw new Error('Wallet public key not available');
    }
    
    // Fetch swap transaction from Jupiter API
    const swapResponse = await fetch('https://quote-api.jup.ag/v6/swap', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        quoteResponse: quote,
        userPublicKey: userPublicKey,
        wrapUnwrapSOL: true,
        dynamicComputeUnitLimit: true,
        prioritizationFeeLamports: 'auto',
      }),
    });
    
    if (!swapResponse.ok) {
      const errorText = await swapResponse.text();
      throw new Error(`Jupiter swap API error: ${swapResponse.status} ${errorText}`);
    }
    
    const swapData = await swapResponse.json();
    
    if (!swapData.swapTransaction) {
      throw new Error('Jupiter swap transaction not found in response');
    }
    
    // Decode base64 transaction
    return Transaction.from(Buffer.from(swapData.swapTransaction, 'base64'));
  } catch (error: any) {
    console.error('[Jupiter] Error getting swap transaction:', error);
    throw error;
  }
}

