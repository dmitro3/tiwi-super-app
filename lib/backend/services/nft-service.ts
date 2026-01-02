/**
 * NFT Service
 * 
 * Orchestrates NFT data fetching, normalization, and enrichment.
 * Combines data from Moralis (NFTs, transfers) and Reservoir (market data).
 */

import { 
  getWalletNFTs, 
  getNFTCollectionMetadata, 
  getNFTTransfers 
} from '@/lib/backend/providers/moralis-rest-client';
import { 
  getCollectionStats, 
  getTokenSales 
} from '@/lib/backend/providers/market-data-provider';
import type { NFT, NFTActivity } from '@/lib/backend/types/nft';

// ============================================================================
// NFT Service Class
// ============================================================================

export class NFTService {
  /**
   * Get all NFTs for a wallet across multiple chains
   * 
   * @param address - Wallet address
   * @param chainIds - Array of chain IDs to fetch
   * @returns Array of NFTs
   */
  async getWalletNFTs(
    address: string,
    chainIds: number[]
  ): Promise<NFT[]> {
    // Fetch NFTs from all chains in parallel
    const promises = chainIds.map(chainId => 
      this.getWalletNFTsForChain(address, chainId)
    );
    
    const results = await Promise.allSettled(promises);
    const allNFTs: NFT[] = [];
    
    for (const result of results) {
      if (result.status === 'fulfilled') {
        allNFTs.push(...result.value);
      } else {
        console.error('[NFTService] Error fetching NFTs:', result.reason);
      }
    }
    
    return allNFTs;
  }

  /**
   * Get NFTs for a specific chain
   * 
   * @param address - Wallet address
   * @param chainId - Chain ID
   * @returns Array of NFTs for the chain
   */
  private async getWalletNFTsForChain(
    address: string,
    chainId: number
  ): Promise<NFT[]> {
    try {
      const response = await getWalletNFTs(address, chainId, {
        limit: 100,
        normalizeMetadata: true,
      });

      const nfts: NFT[] = [];
      const tokenDataArray = response.result || [];
      
      if (!Array.isArray(tokenDataArray)) {
        console.warn('[NFTService] Invalid response format from getWalletNFTs');
        return [];
      }
      
      // Process NFTs in batches to avoid overwhelming the API
      // Fetch market data for unique collections
      const uniqueCollections = new Set<string>();
      for (const item of tokenDataArray) {
        if (item.token_address) {
          uniqueCollections.add(item.token_address.toLowerCase());
        }
      }
      
      // Fetch collection stats for all unique collections in parallel
      const collectionStatsPromises = Array.from(uniqueCollections).map(
        contractAddress => getCollectionStats(contractAddress, chainId)
      );
      const collectionStatsResults = await Promise.allSettled(collectionStatsPromises);
      
      // Create a map of contract address to stats
      const statsMap = new Map<string, any>();
      let statsIndex = 0;
      for (const contractAddress of uniqueCollections) {
        const result = collectionStatsResults[statsIndex];
        if (result.status === 'fulfilled' && result.value) {
          statsMap.set(contractAddress, result.value);
        }
        statsIndex++;
      }
      
      // Normalize each NFT
      for (const item of tokenDataArray) {
        try {
          const contractAddress = item.token_address?.toLowerCase();
          const collectionStats = contractAddress ? statsMap.get(contractAddress) : null;
          
          const nft = await this.normalizeNFT(item, chainId, collectionStats);
          if (nft) {
            nfts.push(nft);
          }
        } catch (error) {
          console.error('[NFTService] Error processing NFT:', error);
          continue;
        }
      }
      
      return nfts;
    } catch (error) {
      console.error(`[NFTService] Error fetching NFTs for chain ${chainId}:`, error);
      return [];
    }
  }

  /**
   * Normalize Moralis NFT response to our NFT type
   * 
   * @param item - Raw NFT data from Moralis
   * @param chainId - Chain ID
   * @param collectionStats - Collection stats from Reservoir (optional)
   * @returns Normalized NFT or null if invalid
   */
  private async normalizeNFT(
    item: any,
    chainId: number,
    collectionStats?: any
  ): Promise<NFT | null> {
    try {
      // Extract image URL (try multiple sources)
      const image = item.metadata?.image || 
                   item.token_uri?.image || 
                   item.image || 
                   null;
      
      // Normalize image URL (handle IPFS, HTTP, etc.)
      const normalizedImage = this.normalizeImageUrl(image);
      
      // Calculate listed percentage
      let listedPercentage: number | undefined;
      if (collectionStats?.onSaleCount !== undefined && collectionStats?.tokenCount !== undefined) {
        if (collectionStats.tokenCount > 0) {
          listedPercentage = (collectionStats.onSaleCount / collectionStats.tokenCount) * 100;
        }
      }

      // Parse block timestamp if available
      let blockTimestampMinted: number | undefined;
      if (item.block_number_minted) {
        // We'll use block_timestamp if available, otherwise leave undefined
        // (block timestamp would require additional RPC call)
        blockTimestampMinted = item.block_timestamp 
          ? new Date(item.block_timestamp).getTime()
          : undefined;
      }

      return {
        contractAddress: item.token_address,
        tokenId: item.token_id,
        name: item.name || item.metadata?.name || `#${item.token_id}`,
        description: item.metadata?.description,
        image: normalizedImage,
        imageThumbnail: normalizedImage, // Could generate thumbnail later
        chainId,
        collectionName: item.metadata?.collection?.name || collectionStats?.name,
        collectionSymbol: item.symbol,
        contractType: item.contract_type as 'ERC721' | 'ERC1155',
        owner: item.owner_of,
        amount: item.amount,
        minterAddress: item.minter_address,
        blockNumberMinted: item.block_number_minted,
        blockTimestampMinted,
        attributes: item.metadata?.attributes || [],
        
        // Market data from Reservoir
        floorPrice: collectionStats?.floorAsk?.price?.amount?.native,
        floorPriceUSD: collectionStats?.floorAsk?.price?.amount?.usd?.toString(),
        totalVolume: collectionStats?.volume?.allTime?.native,
        totalVolumeUSD: collectionStats?.volume?.allTime?.usd?.toString(),
        owners: collectionStats?.ownerCount,
        listed: collectionStats?.onSaleCount,
        listedPercentage,
        supply: collectionStats?.tokenCount,
      };
    } catch (error) {
      console.error('[NFTService] Error normalizing NFT:', error);
      return null;
    }
  }

  /**
   * Get NFT transfers/activity for a specific NFT
   * 
   * @param address - Wallet address
   * @param contractAddress - NFT contract address
   * @param tokenId - Token ID
   * @param chainId - Chain ID
   * @returns Array of activities sorted by timestamp (newest first)
   */
  async getNFTActivity(
    address: string,
    contractAddress: string,
    tokenId: string,
    chainId: number
  ): Promise<NFTActivity[]> {
    try {
      // Fetch transfers from Moralis
      const transfersResponse = await getNFTTransfers(address, chainId, {
        limit: 50,
        direction: 'both',
        contractAddress,
      });

      const activities: NFTActivity[] = [];
      const transfers = transfersResponse.result || [];
      
      // Fetch sale data from Reservoir for price information
      const salesData = await getTokenSales(contractAddress, tokenId, chainId);
      const salesMap = new Map<string, { price: string; priceUSD?: string }>();
      
      if (salesData) {
        for (const sale of salesData) {
          salesMap.set(sale.transactionHash.toLowerCase(), {
            price: sale.price.native,
            priceUSD: sale.price.usd?.toString(),
          });
        }
      }
      
      // Process transfers
      for (const transfer of transfers) {
        // Filter by token ID
        if (transfer.token_id !== tokenId) continue;
        
        const activity = this.normalizeTransferToActivity(
          transfer,
          address,
          contractAddress,
          salesMap
        );
        if (activity) {
          activities.push(activity);
        }
      }
      
      // Sort by timestamp (newest first)
      return activities.sort((a, b) => b.timestamp - a.timestamp);
    } catch (error) {
      console.error('[NFTService] Error fetching NFT activity:', error);
      return [];
    }
  }

  /**
   * Normalize transfer to activity
   * 
   * @param transfer - Raw transfer data from Moralis
   * @param walletAddress - Wallet address to determine activity type
   * @param contractAddress - Contract address (for NFT name)
   * @param salesMap - Map of transaction hash to sale price
   * @returns Normalized activity or null
   */
  private normalizeTransferToActivity(
    transfer: any,
    walletAddress: string,
    contractAddress: string,
    salesMap: Map<string, { price: string; priceUSD?: string }>
  ): NFTActivity | null {
    try {
      const timestamp = new Date(transfer.block_timestamp).getTime();
      const date = new Date(timestamp).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });

      // Determine activity type
      let type: NFTActivity['type'] = 'transfer';
      const fromAddress = transfer.from_address?.toLowerCase() || '';
      const toAddress = transfer.to_address?.toLowerCase() || '';
      const walletLower = walletAddress.toLowerCase();
      
      if (fromAddress === '0x0000000000000000000000000000000000000000') {
        type = 'mint';
      } else if (toAddress === walletLower) {
        type = 'received';
      } else if (fromAddress === walletLower) {
        type = 'sent';
      }

      // Get price from sales map if available
      const txHash = transfer.transaction_hash?.toLowerCase() || '';
      const saleData = salesMap.get(txHash);
      
      // Use contract address as NFT name (will be enriched with actual name if available)
      const nftName = contractAddress;

      return {
        type,
        date,
        timestamp,
        nftName,
        price: saleData?.price,
        priceUSD: saleData?.priceUSD,
        from: transfer.from_address,
        to: transfer.to_address,
        transactionHash: transfer.transaction_hash,
      };
    } catch (error) {
      console.error('[NFTService] Error normalizing transfer:', error);
      return null;
    }
  }

  /**
   * Normalize image URL (handle IPFS, HTTP, etc.)
   * 
   * @param url - Image URL (can be IPFS, HTTP, data URI, etc.)
   * @returns Normalized URL or undefined
   */
  private normalizeImageUrl(url: string | null | undefined): string | undefined {
    if (!url) return undefined;
    
    // Handle IPFS
    if (url.startsWith('ipfs://')) {
      const ipfsHash = url.replace('ipfs://', '').replace('ipfs/', '');
      return `https://ipfs.io/ipfs/${ipfsHash}`;
    }
    
    // Handle IPFS gateway URLs
    if (url.includes('ipfs.io') || url.includes('gateway.pinata.cloud')) {
      return url;
    }
    
    // Handle HTTP/HTTPS
    if (url.startsWith('http://') || url.startsWith('https://')) {
      return url;
    }
    
    // Handle data URIs
    if (url.startsWith('data:')) {
      return url;
    }
    
    // Try to construct IPFS URL if it looks like a hash
    if (/^[a-zA-Z0-9]{46}$/.test(url)) {
      return `https://ipfs.io/ipfs/${url}`;
    }
    
    return undefined;
  }
}


