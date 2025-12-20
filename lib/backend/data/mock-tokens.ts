/**
 * Mock Token Data
 * 
 * Fallback token data used when API calls fail or return no results.
 * Minimal set for development and testing.
 */

import type { NormalizedToken } from '@/lib/backend/types/backend-tokens';

export const MOCK_TOKENS: NormalizedToken[] = [
  {
    chainId: 1,
    address: '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    priceUSD: '1.00',
    providers: ['mock'],
    verified: true,
    vmType: 'evm',
    chainBadge: 'evm-ethereum',
    chainName: 'Ethereum',
  },
  {
    chainId: 1,
    address: '0xdac17f958d2ee523a2206206994597c13d831ec7',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    priceUSD: '1.00',
    providers: ['mock'],
    verified: true,
    vmType: 'evm',
    chainBadge: 'evm-ethereum',
    chainName: 'Ethereum',
  },
  {
    chainId: 56,
    address: '0x55d398326f99059ff775485246999027b3197955',
    symbol: 'USDT',
    name: 'Tether USD',
    decimals: 18,
    logoURI: 'https://assets.coingecko.com/coins/images/325/large/Tether.png',
    priceUSD: '1.00',
    providers: ['mock'],
    verified: true,
    vmType: 'evm',
    chainBadge: 'evm-bnb-chain',
    chainName: 'BNB Chain',
  },
  {
    chainId: 137,
    address: '0x2791bca1f2de4661ed88a30c99a7a9449aa84174',
    symbol: 'USDC',
    name: 'USD Coin',
    decimals: 6,
    logoURI: 'https://assets.coingecko.com/coins/images/6319/large/USD_Coin_icon.png',
    priceUSD: '1.00',
    providers: ['mock'],
    verified: true,
    vmType: 'evm',
    chainBadge: 'evm-polygon',
    chainName: 'Polygon',
  },
  {
    chainId: 7565164,
    address: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263',
    symbol: 'BONK',
    name: 'Bonk',
    decimals: 5,
    logoURI: 'https://assets.coingecko.com/coins/images/28600/large/bonk.jpg',
    priceUSD: '0.000008',
    providers: ['mock'],
    verified: false,
    vmType: 'solana',
    chainBadge: 'solana-solana',
    chainName: 'Solana',
  },
];

