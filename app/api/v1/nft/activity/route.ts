import { NextRequest, NextResponse } from 'next/server';
import { NFTService } from '@/lib/backend/services/nft-service';

const nftService = new NFTService();

/**
 * GET /api/v1/nft/activity
 * 
 * Get NFT activity (transfers, sales) for a specific NFT
 * 
 * Query Parameters:
 * - address: Wallet address (required)
 * - contractAddress: NFT contract address (required)
 * - tokenId: Token ID (required)
 * - chainId: Chain ID (required)
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const address = searchParams.get('address');
    const contractAddress = searchParams.get('contractAddress');
    const tokenId = searchParams.get('tokenId');
    const chainIdParam = searchParams.get('chainId');

    // Validate required parameters
    if (!address) {
      return NextResponse.json(
        { error: 'Address is required' },
        { status: 400 }
      );
    }

    if (!contractAddress) {
      return NextResponse.json(
        { error: 'Contract address is required' },
        { status: 400 }
      );
    }

    if (!tokenId) {
      return NextResponse.json(
        { error: 'Token ID is required' },
        { status: 400 }
      );
    }

    if (!chainIdParam) {
      return NextResponse.json(
        { error: 'Chain ID is required' },
        { status: 400 }
      );
    }

    const chainId = parseInt(chainIdParam, 10);
    if (isNaN(chainId)) {
      return NextResponse.json(
        { error: 'Invalid chain ID' },
        { status: 400 }
      );
    }

    // Fetch activities
    const activities = await nftService.getNFTActivity(
      address,
      contractAddress,
      tokenId,
      chainId
    );

    return NextResponse.json({
      activities,
      total: activities.length,
      address,
      contractAddress,
      tokenId,
      chainId,
      timestamp: Date.now(),
    });
  } catch (error: any) {
    console.error('[NFT Activity API] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch NFT activity' },
      { status: 500 }
    );
  }
}


