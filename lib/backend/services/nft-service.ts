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
import { getTIWIActivityService } from './tiwi-activity-service';
import type { NFT, NFTActivity } from '@/lib/backend/types/nft';

// ============================================================================
// NFT Service Class
// ============================================================================

export class NFTService {
  private tiwiActivityService = getTIWIActivityService();

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
      const allNFTs: NFT[] = [];
      let cursor: string | undefined = undefined;
      let hasMore = true;
      const maxPages = 10; // Limit to prevent infinite loops
      let pageCount = 0;

      // Fetch NFTs with pagination (handle large collections)
      while (hasMore && pageCount < maxPages) {
        const response = await getWalletNFTs(address, chainId, {
          limit: 100,
          normalizeMetadata: true,
          cursor,
        });

        const tokenDataArray = response.result || [];
        
        if (!Array.isArray(tokenDataArray)) {
          console.warn('[NFTService] Invalid response format from getWalletNFTs');
          break;
        }

        // If no results, break
        if (tokenDataArray.length === 0) {
          hasMore = false;
          break;
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
              allNFTs.push(nft);
            }
          } catch (error) {
            console.error('[NFTService] Error processing NFT:', error);
            continue;
          }
        }

        // Check for pagination cursor (Moralis returns cursor if there are more results)
        cursor = response.cursor;
        hasMore = !!cursor && tokenDataArray.length >= 100; // If we got 100, there might be more
        pageCount++;
        
        // Safety check: if we've processed a lot of NFTs, stop pagination
        if (allNFTs.length >= 1000) {
          console.log(`[NFTService] Reached max NFT limit (1000) for chain ${chainId}, stopping pagination`);
          hasMore = false;
        }
      }
      
      return allNFTs;
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
      // Extract image URL (try multiple sources in order of preference)
      // Check both normalized metadata and raw metadata fields
      // Moralis can return images in various fields depending on normalization
      let image = item.metadata?.image || 
                   item.metadata?.image_url ||
                   item.metadata?.imageUrl ||
                   item.metadata?.image_uri ||
                   item.metadata?.imageURI ||
                   item.metadata?.image_data ||
                   item.metadata?.imageData ||
                   item.token_uri?.image || 
                   item.token_uri?.image_url ||
                   item.token_uri?.imageUrl ||
                   item.image || 
                   item.image_url ||
                   item.thumbnail ||
                   item.thumbnail_url ||
                   item.media?.image?.original ||
                   item.media?.image?.thumbnail ||
                   item.media?.image ||
                   null;
      
      // Sometimes the image is nested deeper in metadata
      if (!image && item.metadata) {
        // Check for nested image objects
        if (typeof item.metadata.image === 'object' && item.metadata.image) {
          image = item.metadata.image.original || 
                  item.metadata.image.url || 
                  item.metadata.image.uri ||
                  null;
        }
      }
      
      // If no image in metadata, try fetching from token_uri
      if (!image && item.token_uri) {
        try {
          const tokenUriResponse = await fetch(item.token_uri, {
            signal: AbortSignal.timeout(8000), // 8 second timeout
            headers: {
              'Accept': 'application/json, */*',
            },
          });
          if (tokenUriResponse.ok) {
            const tokenMetadata = await tokenUriResponse.json();
            image = tokenMetadata.image || 
                   tokenMetadata.image_url ||
                   tokenMetadata.imageUrl ||
                   tokenMetadata.image_uri ||
                   tokenMetadata.imageURI ||
                   tokenMetadata.image_data ||
                   tokenMetadata.imageData ||
                   null;
            
            // Check for nested image objects in token metadata
            if (!image && typeof tokenMetadata.image === 'object' && tokenMetadata.image) {
              image = tokenMetadata.image.original || 
                      tokenMetadata.image.url || 
                      tokenMetadata.image.uri ||
                      null;
            }
          }
        } catch (error) {
          // Failed to fetch token_uri, continue with available data
          console.warn(`[NFTService] Failed to fetch token_uri ${item.token_uri}:`, error);
        }
      }
      
      // Normalize image URL (handle IPFS, HTTP, etc.)
      let normalizedImage = this.normalizeImageUrl(image);
      
      // If we have a normalized URL, use it - don't validate aggressively
      // Frontend will handle broken images with fallbacks
      // Only use placeholder if we truly don't have a valid URL
      if (!normalizedImage) {
        // No image URL found, use default placeholder
        if (image) {
          // Log when we have an image but normalization failed (for debugging)
          console.warn(`[NFTService] Failed to normalize image URL for NFT ${item.token_id}: ${image}`);
        }
        const tokenId = item.token_id || '0';
        const placeholderIndex = (parseInt(tokenId) % 6) + 1;
        normalizedImage = `/nft${placeholderIndex}.svg`;
      } else if (normalizedImage.startsWith('/')) {
        // Already a local path, keep it
      } else if (!normalizedImage.startsWith('http') && !normalizedImage.startsWith('data:')) {
        // Invalid URL format, use placeholder
        console.warn(`[NFTService] Invalid URL format for NFT ${item.token_id}: ${normalizedImage}`);
        const tokenId = item.token_id || '0';
        const placeholderIndex = (parseInt(tokenId) % 6) + 1;
        normalizedImage = `/nft${placeholderIndex}.svg`;
      }
      // Otherwise, use the normalized URL as-is (frontend will handle validation)
      
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
        image: normalizedImage || '/nft1.svg', // Always provide an image (fallback to default)
        imageThumbnail: normalizedImage || '/nft1.svg', // Always provide a thumbnail
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
   * ONLY returns activities performed within the TIWI ecosystem/dApp platform
   * 
   * @param address - Wallet address
   * @param contractAddress - NFT contract address
   * @param tokenId - Token ID
   * @param chainId - Chain ID
   * @returns Array of activities sorted by timestamp (newest first) - TIWI platform activities only
   */
  async getNFTActivity(
    address: string,
    contractAddress: string,
    tokenId: string,
    chainId: number
  ): Promise<NFTActivity[]> {
    try {
      // Fetch ONLY TIWI platform NFT activities from database
      const activities = await this.tiwiActivityService.getNFTActivities(address, {
        contractAddress,
        tokenId,
        chainId,
        limit: 50,
      });
      
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
   * Fetch and validate image URL (DEPRECATED - not used anymore)
   * We now trust the normalized URLs and let the frontend handle validation
   * This method is kept for potential future use but is not called
   * 
   * @param url - Image URL to validate
   * @returns Validated URL or null if image cannot be fetched
   */
  private async fetchAndValidateImage(url: string): Promise<string | null> {
    // This method is no longer used - we trust normalized URLs
    // Frontend will handle broken images with fallbacks
    return url;
  }

  /**
   * Normalize image URL (handle IPFS, HTTP, etc.)
   * 
   * @param url - Image URL (can be IPFS, HTTP, data URI, etc.)
   * @returns Normalized URL or undefined
   */
  private normalizeImageUrl(url: string | null | undefined): string | undefined {
    if (!url || typeof url !== 'string') return undefined;
    
    // Clean the URL (remove whitespace, control characters, and common issues)
    let cleanedUrl = url.trim().replace(/[\x00-\x1F\x7F]/g, '');
    
    // Remove leading/trailing quotes if present
    cleanedUrl = cleanedUrl.replace(/^["']|["']$/g, '');
    
    // Handle array format (sometimes URLs are in arrays)
    if (cleanedUrl.startsWith('[') && cleanedUrl.endsWith(']')) {
      try {
        const parsed = JSON.parse(cleanedUrl);
        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'string') {
          cleanedUrl = parsed[0];
        }
      } catch {
        // Not valid JSON, continue with original
      }
    }
    
    if (!cleanedUrl || cleanedUrl === 'null' || cleanedUrl === 'undefined') return undefined;
    
    // Handle IPFS protocols (ipfs://)
    if (cleanedUrl.startsWith('ipfs://')) {
      const ipfsHash = cleanedUrl.replace('ipfs://', '').replace(/^\/+/, '').split('?')[0].split('#')[0];
      if (ipfsHash) {
        // Use ipfs.io as primary gateway (most reliable)
        // Frontend can try other gateways if this fails
        return `https://ipfs.io/ipfs/${ipfsHash}`;
      }
    }
    
    // Handle IPFS gateway URLs (already normalized) - check for various formats
    if (cleanedUrl.includes('/ipfs/')) {
      // Extract IPFS hash from URL
      const ipfsMatch = cleanedUrl.match(/\/ipfs\/([^/?&#]+)/);
      if (ipfsMatch) {
        const ipfsHash = ipfsMatch[1];
        // If it's already a full URL, return as-is, otherwise construct it
        if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) {
          return cleanedUrl;
        } else {
          return `https://ipfs.io/ipfs/${ipfsHash}`;
        }
      }
    }
    
    // Handle HTTP/HTTPS URLs (including relative URLs that start with //)
    if (cleanedUrl.startsWith('http://') || cleanedUrl.startsWith('https://')) {
      return cleanedUrl;
    }
    
    // Handle protocol-relative URLs (//example.com/image.png)
    if (cleanedUrl.startsWith('//')) {
      return `https:${cleanedUrl}`;
    }
    
    // Handle data URIs (base64 encoded images)
    if (cleanedUrl.startsWith('data:')) {
      return cleanedUrl;
    }
    
    // Handle Qm hash (IPFS CID v0 - 46 characters starting with Qm)
    if (/^Qm[1-9A-HJ-NP-Za-km-z]{44}$/.test(cleanedUrl)) {
      return `https://ipfs.io/ipfs/${cleanedUrl}`;
    }
    
    // Handle IPFS CID v1 (starts with bafy or bafk)
    if (/^baf[ky][a-z0-9]{54,}$/.test(cleanedUrl)) {
      return `https://ipfs.io/ipfs/${cleanedUrl}`;
    }
    
    // Handle relative IPFS paths
    if (cleanedUrl.startsWith('/ipfs/')) {
      return `https://ipfs.io${cleanedUrl}`;
    }
    
    // Handle Arweave URLs (ar://)
    if (cleanedUrl.startsWith('ar://')) {
      const arweaveHash = cleanedUrl.replace('ar://', '');
      return `https://arweave.net/${arweaveHash}`;
    }
    
    // Handle relative URLs that might be valid (but be careful)
    // Only if they look like they might be part of a known CDN or service
    if (cleanedUrl.startsWith('/') && cleanedUrl.length > 1) {
      // Could be a relative URL, but we'll be conservative
      // Most NFT images should be absolute URLs
      return undefined;
    }
    
    // If it's a valid-looking hash but doesn't match patterns above, try as IPFS
    // This is a fallback for various IPFS hash formats
    if (/^[a-zA-Z0-9]{32,}$/.test(cleanedUrl) && cleanedUrl.length <= 100) {
      // Could be an IPFS hash, try it
      return `https://ipfs.io/ipfs/${cleanedUrl}`;
    }
    
    return undefined;
  }
}


