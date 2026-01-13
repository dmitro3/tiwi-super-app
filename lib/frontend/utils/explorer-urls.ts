/**
 * Block Explorer URL Utilities
 * 
 * Provides functions to generate block explorer URLs for different chains.
 * Supports both EVM chains (Etherscan, BSCScan, etc.) and Solana (Solscan).
 */

/**
 * Get block explorer URL for a transaction hash
 * @param txHash - Transaction hash or signature
 * @param chainId - Chain ID (number for EVM, 7565164 for Solana)
 * @returns Full explorer URL
 */
export function getExplorerUrl(txHash: string, chainId: number): string {
  const explorers: Record<number, string> = {
    // EVM Chains
    1: `https://etherscan.io/tx/${txHash}`, // Ethereum
    56: `https://bscscan.com/tx/${txHash}`, // BSC
    137: `https://polygonscan.com/tx/${txHash}`, // Polygon
    42161: `https://arbiscan.io/tx/${txHash}`, // Arbitrum
    10: `https://optimistic.etherscan.io/tx/${txHash}`, // Optimism
    8453: `https://basescan.org/tx/${txHash}`, // Base
    43114: `https://snowtrace.io/tx/${txHash}`, // Avalanche
    250: `https://ftmscan.com/tx/${txHash}`, // Fantom
    100: `https://gnosisscan.io/tx/${txHash}`, // Gnosis
    
    // Solana
    7565164: `https://solscan.io/tx/${txHash}`, // Solana Mainnet
  };

  const baseUrl = explorers[chainId];
  if (!baseUrl) {
    // Default to BSC if chain not found
    console.warn(`Explorer URL not found for chain ${chainId}, defaulting to BSC`);
    return `https://bscscan.com/tx/${txHash}`;
  }

  return baseUrl;
}

/**
 * Get explorer name for display
 * @param chainId - Chain ID
 * @returns Explorer name (e.g., "Etherscan", "BSCScan", "Solscan")
 */
export function getExplorerName(chainId: number): string {
  const names: Record<number, string> = {
    1: 'Etherscan',
    56: 'BSCScan',
    137: 'Polygonscan',
    42161: 'Arbiscan',
    10: 'Optimistic Etherscan',
    8453: 'Basescan',
    43114: 'Snowtrace',
    250: 'FTMScan',
    100: 'GnosisScan',
    7565164: 'Solscan',
  };

  return names[chainId] || 'Explorer';
}

