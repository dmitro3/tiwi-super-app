/**
 * NFT-related types for backend services
 * Used for NFT collection, metadata, and activity tracking
 */

// ============================================================================
// NFT
// ============================================================================

export interface NFT {
  // Basic Info
  contractAddress: string;
  tokenId: string;
  name: string;
  description?: string;
  image?: string;
  imageThumbnail?: string;
  chainId: number;
  
  // Collection Info
  collectionName?: string;
  collectionSymbol?: string;
  contractType: 'ERC721' | 'ERC1155';
  
  // Ownership
  owner: string;
  amount?: string; // For ERC1155
  
  // Minting Info
  minterAddress?: string;
  blockNumberMinted?: string;
  blockTimestampMinted?: number; // Unix timestamp
  
  // Metadata
  attributes?: Array<{
    trait_type: string;
    value: string | number;
  }>;
  
  // Market Data (from OpenSea/Reservoir)
  floorPrice?: string;        // In ETH
  floorPriceUSD?: string;     // In USD
  totalVolume?: string;       // In ETH
  totalVolumeUSD?: string;     // In USD
  owners?: number;            // Number of unique owners
  listed?: number;            // Number of listed NFTs
  listedPercentage?: number;  // Percentage listed
  supply?: number;            // Total supply
}

// ============================================================================
// NFT Collection
// ============================================================================

export interface NFTCollection {
  contractAddress: string;
  name: string;
  symbol: string;
  chainId: number;
  
  // Market Stats
  floorPrice?: string;
  floorPriceUSD?: string;
  totalVolume?: string;
  totalVolumeUSD?: string;
  owners?: number;
  listed?: number;
  listedPercentage?: number;
  supply?: number;
  
  // Metadata
  description?: string;
  image?: string;
  externalUrl?: string;
}

// ============================================================================
// NFT Transfer
// ============================================================================

export interface NFTTransfer {
  contractAddress: string;
  tokenId: string;
  from: string;
  to: string;
  transactionHash: string;
  blockNumber: string;
  blockTimestamp: number; // Unix timestamp
  value?: string;         // Transfer value (if ERC1155)
  amount?: string;        // Amount transferred
  type: 'received' | 'sent' | 'mint' | 'burn';
  priceUSD?: string;      // Price when transferred (if available)
}

// ============================================================================
// NFT Activity
// ============================================================================

export interface NFTActivity {
  type: 'received' | 'sent' | 'mint' | 'burn' | 'list' | 'sale';
  date: string;           // Formatted date (e.g., "Jan 4, 2024")
  timestamp: number;      // Unix timestamp
  nftName: string;
  price?: string;         // Price in ETH
  priceUSD?: string;      // Price in USD
  from?: string;
  to?: string;
  transactionHash: string;
}

// ============================================================================
// API Response Types
// ============================================================================

export interface WalletNFTsResponse {
  nfts: NFT[];
  total: number;
  address: string;
  chains: number[];
  timestamp: number;
}

export interface NFTActivityResponse {
  activities: NFTActivity[];
  total: number;
  timestamp: number;
}


