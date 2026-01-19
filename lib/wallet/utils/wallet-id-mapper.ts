/**
 * Maps wallet IDs from supported-wallets.ts to provider IDs expected by wallet-detector.ts
 * This ensures compatibility between the wallet list and the connection logic
 */

/**
 * Map from supported-wallets ID to wallet-detector provider ID
 * This ensures compatibility between wallet list IDs and wallet-detector provider IDs
 */
const WALLET_ID_MAP: Record<string, string> = {
  // Exact matches (no change needed)
  'metamask': 'metamask',
  'rabby': 'rabby',
  'phantom': 'phantom',
  'coinbase': 'coinbase',
  'base-formerly-coinbase-wallet': 'coinbase', // Base wallet uses Coinbase provider
  'trust-wallet': 'trust',
  'okx-wallet': 'okx',
  'okx': 'okx',
  'brave': 'brave',
  'solflare': 'solflare',
  'backpack': 'backpack',
  'glow': 'glow',
  'slope': 'slope',
  'zerion': 'zerion',
  'tokenpocket': 'tokenpocket',
  'bitkeep': 'bitkeep',
  'mathwallet': 'mathwallet',
  'frame': 'frame',
  'frontier': 'frontier',
  'binance': 'binance',
  'binance-wallet': 'binance',
  'binance-chain': 'binance',
  'binance-web3': 'binance',
  'rainbow': 'rainbow',
  'argent': 'argent',
  'ledger': 'ledger',
  'ledger-live': 'ledger',
  'trezor': 'trezor',
  'trezor-suite': 'trezor',
  'atomic': 'atomic',
  'exodus': 'exodus',
  'guarda': 'guarda',
  'myetherwallet': 'myetherwallet',
  'nightly': 'nightly',
  'coin98': 'coin98',
  'safepal': 'safepal',
  '1inch': '1inch',
  '1inch-wallet': '1inch',
  'imtoken': 'imtoken',
  'walletconnect': 'walletconnect',
  'bitget': 'bitget',
  'jupiter': 'jupiter',
  
  // Add more mappings as needed
  // Format: 'supported-wallets-id': 'wallet-detector-id'
};

/**
 * Convert wallet ID from supported-wallets format to wallet-detector format
 * @param walletId - The wallet ID from supported-wallets.ts
 * @returns The provider ID expected by wallet-detector.ts
 */
export function mapWalletIdToProviderId(walletId: string): string {
  // Check if we have a direct mapping
  if (WALLET_ID_MAP[walletId]) {
    return WALLET_ID_MAP[walletId];
  }
  
  // Try to infer the provider ID from the wallet ID
  // Remove common suffixes like '-wallet', '-extension', etc.
  let providerId = walletId
    .replace(/-wallet$/, '')
    .replace(/-extension$/, '')
    .replace(/-solana$/, '')
    .replace(/-ethereum$/, '')
    .replace(/-defi$/, '')
    .replace(/-web3$/, '')
    .replace(/-chain$/, '');
  
  // Special cases
  if (walletId.includes('trust')) return 'trust';
  if (walletId.includes('okx')) return 'okx';
  if (walletId.includes('coinbase')) return 'coinbase';
  if (walletId.includes('binance')) return 'binance';
  
  // Return the cleaned ID or original if no changes
  return providerId || walletId;
}

/**
 * Get the original wallet ID from supported-wallets given a provider ID
 * @param providerId - The provider ID from wallet-detector
 * @returns The wallet ID from supported-wallets, or the providerId if not found
 */
export function mapProviderIdToWalletId(providerId: string): string {
  // Reverse lookup
  const entry = Object.entries(WALLET_ID_MAP).find(([_, value]) => value === providerId);
  if (entry) {
    return entry[0];
  }
  
  // Common reverse mappings
  if (providerId === 'trust') return 'trust-wallet';
  if (providerId === 'okx') return 'okx-wallet';
  if (providerId === 'rabby') return 'rabby';
  if (providerId === 'metamask') return 'metamask';
  if (providerId === 'coinbase') return 'coinbase';
  if (providerId === 'brave') return 'brave';
  if (providerId === 'binance') return 'binance-wallet';
  
  return providerId;
}


