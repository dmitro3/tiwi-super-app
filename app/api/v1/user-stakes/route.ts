/**
 * User Stakes API Route
 * 
 * Endpoint for managing user staking positions.
 * Uses Supabase database for persistent storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/backend/utils/supabase';

// ============================================================================
// Types
// ============================================================================

export interface UserStake {
  id: string;
  userWallet: string;
  poolId: string;
  stakedAmount: number;
  rewardsEarned: number;
  lockPeriodDays?: number;
  lockEndDate?: string;
  status: 'active' | 'completed' | 'withdrawn';
  transactionHash?: string;
  createdAt: string;
  updatedAt: string;
  // Pool details (joined from staking_pools)
  pool?: {
    tokenSymbol?: string;
    tokenName?: string;
    tokenLogo?: string;
    apy?: number;
    chainName?: string;
  };
}

export interface UserStakesResponse {
  stakes: UserStake[];
  total: number;
}

// ============================================================================
// Helper: Map database row to UserStake interface
// ============================================================================

function mapRowToStake(row: any, poolData?: any): UserStake {
  return {
    id: row.id,
    userWallet: row.user_wallet,
    poolId: row.pool_id,
    stakedAmount: parseFloat(row.staked_amount || '0'),
    rewardsEarned: parseFloat(row.rewards_earned || '0'),
    lockPeriodDays: row.lock_period_days || undefined,
    lockEndDate: row.lock_end_date || undefined,
    status: row.status || 'active',
    transactionHash: row.transaction_hash || undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    pool: poolData ? {
      tokenSymbol: poolData.token_symbol,
      tokenName: poolData.token_name,
      tokenLogo: poolData.token_logo,
      apy: poolData.apy ? parseFloat(poolData.apy) : undefined,
      chainName: poolData.chain_name,
    } : undefined,
  };
}

// ============================================================================
// GET Handler - Retrieve user stakes
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const userWallet = searchParams.get('userWallet');
    const status = searchParams.get('status') as 'active' | 'completed' | 'withdrawn' | null;
    
    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet parameter is required' },
        { status: 400 }
      );
    }
    
    // Build Supabase query
    let query = supabase
      .from('user_stakes')
      .select('*')
      .eq('user_wallet', userWallet)
      .order('created_at', { ascending: false });
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('[API] Supabase error:', error);
      throw new Error(error.message || 'Failed to fetch user stakes from database');
    }
    
    // Fetch pool details for each stake
    const stakesWithPools = await Promise.all(
      (data || []).map(async (row: any) => {
        // Fetch pool details
        const { data: poolData } = await supabase
          .from('staking_pools')
          .select('token_symbol, token_name, token_logo, apy, chain_name')
          .eq('id', row.pool_id)
          .single();
        
        return mapRowToStake(row, poolData);
      })
    );
    
    const stakes: UserStake[] = stakesWithPools;
    
    const response: UserStakesResponse = {
      stakes,
      total: stakes.length,
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] /api/v1/user-stakes GET error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch user stakes',
        stakes: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Create user stake
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    console.log('[API] POST /api/v1/user-stakes - Request body:', JSON.stringify(body, null, 2));
    
    if (!body.userWallet || !body.poolId || body.stakedAmount === undefined) {
      return NextResponse.json(
        { error: 'userWallet, poolId, and stakedAmount are required' },
        { status: 400 }
      );
    }
    
    // Validate poolId exists in staking_pools table
    const { data: poolExists, error: poolCheckError } = await supabase
      .from('staking_pools')
      .select('id')
      .eq('id', body.poolId)
      .single();
    
    if (poolCheckError || !poolExists) {
      console.error('[API] Pool validation error:', poolCheckError);
      return NextResponse.json(
        { error: `Pool with ID ${body.poolId} not found` },
        { status: 404 }
      );
    }
    
    // Calculate lock end date if lock period is provided
    let lockEndDate = null;
    if (body.lockPeriodDays) {
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + body.lockPeriodDays);
      lockEndDate = endDate.toISOString();
    }
    
    // Prepare insert data
    const insertData = {
      user_wallet: body.userWallet.toLowerCase(), // Normalize wallet address
      pool_id: body.poolId,
      staked_amount: parseFloat(body.stakedAmount.toString()),
      rewards_earned: body.rewardsEarned ? parseFloat(body.rewardsEarned.toString()) : 0,
      lock_period_days: body.lockPeriodDays ? parseInt(body.lockPeriodDays.toString()) : null,
      lock_end_date: lockEndDate,
      status: body.status || 'active',
      transaction_hash: body.transactionHash || null,
    };
    
    console.log('[API] Inserting stake record:', JSON.stringify(insertData, null, 2));
    
    // Insert into database
    const { data, error } = await supabase
      .from('user_stakes')
      .insert(insertData)
      .select('*')
      .single();
    
    if (error) {
      console.error('[API] Supabase insert error:', error);
      console.error('[API] Error details:', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
      
      // Create a detailed error message
      const errorMessage = error.message || 'Failed to create user stake in database';
      const detailedError = new Error(errorMessage);
      (detailedError as any).code = error.code;
      (detailedError as any).details = error.details;
      (detailedError as any).hint = error.hint;
      (detailedError as any).insertData = insertData;
      throw detailedError;
    }
    
    // Fetch pool details
    const { data: poolData } = await supabase
      .from('staking_pools')
      .select('token_symbol, token_name, token_logo, apy, chain_name')
      .eq('id', data.pool_id)
      .single();
    
    // Map database row to UserStake interface
    const stake: UserStake = mapRowToStake(data, poolData);
    
    return NextResponse.json({
      success: true,
      stake,
    });
  } catch (error: any) {
    console.error('[API] /api/v1/user-stakes POST error:', error);
    console.error('[API] Error stack:', error.stack);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to create user stake',
        code: error?.code,
        details: error?.details,
        hint: error?.hint,
        insertData: error?.insertData,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH Handler - Update user stake (for unstaking, updating rewards, etc.)
// ============================================================================

export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Stake ID is required' },
        { status: 400 }
      );
    }
    
    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (body.stakedAmount !== undefined) updateData.staked_amount = body.stakedAmount;
    if (body.rewardsEarned !== undefined) updateData.rewards_earned = body.rewardsEarned;
    if (body.status !== undefined) updateData.status = body.status;
    if (body.transactionHash !== undefined) updateData.transaction_hash = body.transactionHash;
    
    // Update in database
    const { data, error } = await supabase
      .from('user_stakes')
      .update(updateData)
      .eq('id', body.id)
      .select('*')
      .single();
    
    if (error) {
      console.error('[API] Supabase error:', error);
      throw new Error(error.message || 'Failed to update user stake in database');
    }
    
    // Fetch pool details
    const { data: poolData } = await supabase
      .from('staking_pools')
      .select('token_symbol, token_name, token_logo, apy, chain_name')
      .eq('id', data.pool_id)
      .single();
    
    // Map database row to UserStake interface
    const stake: UserStake = mapRowToStake(data, poolData);
    
    return NextResponse.json({
      success: true,
      stake,
    });
  } catch (error: any) {
    console.error('[API] /api/v1/user-stakes PATCH error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update user stake' },
      { status: 500 }
    );
  }
}

