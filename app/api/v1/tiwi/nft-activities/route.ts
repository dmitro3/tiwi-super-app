/**
 * TIWI NFT Activities API Route
 * 
 * Endpoint: POST /api/v1/tiwi/nft-activities
 * 
 * Saves NFT activities performed through the TIWI platform to the database.
 * This allows the platform to track and display only TIWI ecosystem NFT activities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTIWIActivityService } from '@/lib/backend/services/tiwi-activity-service';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const {
      walletAddress,
      transactionHash,
      chainId,
      contractAddress,
      tokenId,
      type,
      fromAddress,
      toAddress,
      price,
      priceUSD,
      blockTimestamp,
    } = body;

    // Validate required fields
    if (!walletAddress || !transactionHash || !chainId || !contractAddress || !tokenId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, transactionHash, chainId, contractAddress, tokenId, type' },
        { status: 400 }
      );
    }

    // Validate activity type
    const validTypes = ['mint', 'transfer', 'sent', 'received', 'sale', 'purchase'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid activity type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Save NFT activity to database
    const tiwiActivityService = getTIWIActivityService();
    await tiwiActivityService.saveNFTActivity({
      walletAddress,
      transactionHash,
      chainId: parseInt(chainId, 10),
      contractAddress,
      tokenId,
      type: type as 'mint' | 'transfer' | 'sent' | 'received' | 'sale' | 'purchase',
      fromAddress,
      toAddress,
      price,
      priceUSD: priceUSD ? parseFloat(priceUSD) : undefined,
      blockTimestamp: blockTimestamp ? new Date(blockTimestamp) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'NFT activity saved successfully',
    });
  } catch (error: any) {
    console.error('[API] /api/v1/tiwi/nft-activities POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to save NFT activity',
      },
      { status: 500 }
    );
  }
}

