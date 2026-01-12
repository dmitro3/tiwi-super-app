/**
 * TIWI Transactions API Route
 * 
 * Endpoint: POST /api/v1/tiwi/transactions
 * 
 * Saves transactions performed through the TIWI platform to the database.
 * This allows the platform to track and display only TIWI ecosystem activities.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getTIWIActivityService } from '@/lib/backend/services/tiwi-activity-service';
import type { TransactionType } from '@/lib/backend/types/wallet';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const {
      walletAddress,
      transactionHash,
      chainId,
      type,
      fromTokenAddress,
      fromTokenSymbol,
      toTokenAddress,
      toTokenSymbol,
      amount,
      amountFormatted,
      usdValue,
      routerName,
      blockNumber,
      blockTimestamp,
    } = body;

    // Validate required fields
    if (!walletAddress || !transactionHash || !chainId || !type) {
      return NextResponse.json(
        { error: 'Missing required fields: walletAddress, transactionHash, chainId, type' },
        { status: 400 }
      );
    }

    // Validate transaction type
    const validTypes: TransactionType[] = ['Swap', 'Sent', 'Received', 'Stake', 'Unstake', 'Approve', 'Transfer', 'DeFi', 'NFTTransfer', 'ContractCall'];
    if (!validTypes.includes(type)) {
      return NextResponse.json(
        { error: `Invalid transaction type. Must be one of: ${validTypes.join(', ')}` },
        { status: 400 }
      );
    }

    // Save transaction to database
    const tiwiActivityService = getTIWIActivityService();
    await tiwiActivityService.saveTransaction({
      walletAddress,
      transactionHash,
      chainId: parseInt(chainId, 10),
      type,
      fromTokenAddress,
      fromTokenSymbol,
      toTokenAddress,
      toTokenSymbol,
      amount,
      amountFormatted,
      usdValue: usdValue ? parseFloat(usdValue) : undefined,
      routerName,
      blockNumber: blockNumber ? parseInt(blockNumber, 10) : undefined,
      blockTimestamp: blockTimestamp ? new Date(blockTimestamp) : undefined,
    });

    return NextResponse.json({
      success: true,
      message: 'Transaction saved successfully',
    });
  } catch (error: any) {
    console.error('[API] /api/v1/tiwi/transactions POST error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to save transaction',
      },
      { status: 500 }
    );
  }
}

