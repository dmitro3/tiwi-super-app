/**
 * Chain Name Utilities
 * 
 * Helper functions to get display names for chains by chainId
 */

/**
 * Get chain display name from chainId
 * @param chainId - Chain ID
 * @returns Chain display name (e.g., "Ethereum", "Solana", "Polygon")
 */
export function getChainDisplayName(chainId: number): string {
  const chainNames: Record<number, string> = {
    // EVM Chains
    1: 'Ethereum',
    56: 'BSC',
    137: 'Polygon',
    42161: 'Arbitrum',
    10: 'Optimism',
    8453: 'Base',
    43114: 'Avalanche',
    250: 'Fantom',
    100: 'Gnosis',
    42220: 'Celo',
    1284: 'Moonbeam',
    1285: 'Moonriver',
    
    // Solana
    7565164: 'Solana',
    
    // Add more chains as needed
  };
  
  return chainNames[chainId] || `Chain ${chainId}`;
}

