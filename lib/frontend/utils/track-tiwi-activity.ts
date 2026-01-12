/**
 * TIWI Activity Tracking Utilities
 * 
 * Helper functions to track transactions and NFT activities performed through the TIWI platform.
 * These functions should be called when transactions are executed through TIWI.
 */

/**
 * Track a transaction performed through TIWI platform
 * 
 * @param transaction - Transaction data to track
 */
export async function trackTIWITransaction(transaction: {
  walletAddress: string;
  transactionHash: string;
  chainId: number;
  type: 'Swap' | 'Sent' | 'Received' | 'Stake' | 'Unstake' | 'Approve' | 'Transfer' | 'DeFi' | 'NFTTransfer' | 'ContractCall';
  fromTokenAddress?: string;
  fromTokenSymbol?: string;
  toTokenAddress?: string;
  toTokenSymbol?: string;
  amount?: string;
  amountFormatted?: string;
  usdValue?: number;
  routerName?: string;
  blockNumber?: number;
  blockTimestamp?: Date;
}): Promise<void> {
  try {
    const response = await fetch('/api/v1/tiwi/transactions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: transaction.walletAddress,
        transactionHash: transaction.transactionHash,
        chainId: transaction.chainId,
        type: transaction.type,
        fromTokenAddress: transaction.fromTokenAddress,
        fromTokenSymbol: transaction.fromTokenSymbol,
        toTokenAddress: transaction.toTokenAddress,
        toTokenSymbol: transaction.toTokenSymbol,
        amount: transaction.amount,
        amountFormatted: transaction.amountFormatted,
        usdValue: transaction.usdValue,
        routerName: transaction.routerName,
        blockNumber: transaction.blockNumber,
        blockTimestamp: transaction.blockTimestamp?.toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[trackTIWITransaction] Failed to save transaction:', errorData);
    }
  } catch (error) {
    console.error('[trackTIWITransaction] Error tracking transaction:', error);
    // Don't throw - tracking failure shouldn't break the transaction flow
  }
}

/**
 * Track an NFT activity performed through TIWI platform
 * 
 * @param activity - NFT activity data to track
 */
export async function trackTIWINFTActivity(activity: {
  walletAddress: string;
  transactionHash: string;
  chainId: number;
  contractAddress: string;
  tokenId: string;
  type: 'mint' | 'transfer' | 'sent' | 'received' | 'sale' | 'purchase';
  fromAddress?: string;
  toAddress?: string;
  price?: string;
  priceUSD?: number;
  blockTimestamp?: Date;
}): Promise<void> {
  try {
    const response = await fetch('/api/v1/tiwi/nft-activities', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        walletAddress: activity.walletAddress,
        transactionHash: activity.transactionHash,
        chainId: activity.chainId,
        contractAddress: activity.contractAddress,
        tokenId: activity.tokenId,
        type: activity.type,
        fromAddress: activity.fromAddress,
        toAddress: activity.toAddress,
        price: activity.price,
        priceUSD: activity.priceUSD,
        blockTimestamp: activity.blockTimestamp?.toISOString(),
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[trackTIWINFTActivity] Failed to save NFT activity:', errorData);
    }
  } catch (error) {
    console.error('[trackTIWINFTActivity] Error tracking NFT activity:', error);
    // Don't throw - tracking failure shouldn't break the activity flow
  }
}

