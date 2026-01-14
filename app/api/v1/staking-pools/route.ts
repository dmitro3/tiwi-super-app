/**
 * Staking Pools API Route
 * 
 * Endpoint for managing staking pools.
 * Uses Supabase database for persistent storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/backend/utils/supabase';

// ============================================================================
// Types
// ============================================================================

export interface StakingPool {
  id: string;
  chainId: number;
  chainName: string;
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenLogo?: string;
  minStakingPeriod?: string;
  minStakeAmount: number;
  maxStakeAmount?: number;
  stakeModificationFee: boolean;
  timeBoost: boolean;
  timeBoostConfig?: any;
  country?: string;
  stakePoolCreationFee: number;
  rewardPoolCreationFee?: string;
  apy?: number;
  status: 'active' | 'inactive' | 'archived';
  createdAt: string;
  updatedAt: string;
}

export interface StakingPoolsResponse {
  pools: StakingPool[];
  total: number;
}

export interface CreateStakingPoolRequest {
  chainId: number;
  chainName: string;
  tokenAddress: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenLogo?: string;
  minStakingPeriod?: string;
  minStakeAmount: number;
  maxStakeAmount?: number;
  stakeModificationFee?: boolean;
  timeBoost?: boolean;
  timeBoostConfig?: any;
  country?: string;
  stakePoolCreationFee?: number;
  rewardPoolCreationFee?: string;
  apy?: number;
  status?: 'active' | 'inactive' | 'archived';
}

export interface UpdateStakingPoolRequest {
  id: string;
  chainId?: number;
  chainName?: string;
  tokenAddress?: string;
  tokenSymbol?: string;
  tokenName?: string;
  tokenLogo?: string;
  minStakingPeriod?: string;
  minStakeAmount?: number;
  maxStakeAmount?: number;
  stakeModificationFee?: boolean;
  timeBoost?: boolean;
  timeBoostConfig?: any;
  country?: string;
  stakePoolCreationFee?: number;
  rewardPoolCreationFee?: string;
  apy?: number;
  status?: 'active' | 'inactive' | 'archived';
}

// ============================================================================
// Helper: Map database row to StakingPool interface
// ============================================================================

function mapRowToPool(row: any): StakingPool {
  return {
    id: row.id,
    chainId: row.chain_id,
    chainName: row.chain_name,
    tokenAddress: row.token_address,
    tokenSymbol: row.token_symbol || undefined,
    tokenName: row.token_name || undefined,
    tokenLogo: row.token_logo || undefined,
    minStakingPeriod: row.min_staking_period || undefined,
    minStakeAmount: parseFloat(row.min_stake_amount || '0'),
    maxStakeAmount: row.max_stake_amount ? parseFloat(row.max_stake_amount) : undefined,
    stakeModificationFee: row.stake_modification_fee || false,
    timeBoost: row.time_boost || false,
    timeBoostConfig: row.time_boost_config || undefined,
    country: row.country || undefined,
    stakePoolCreationFee: parseFloat(row.stake_pool_creation_fee || '0.15'),
    rewardPoolCreationFee: row.reward_pool_creation_fee || undefined,
    apy: row.apy ? parseFloat(row.apy) : undefined,
    status: row.status || 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

// ============================================================================
// GET Handler - Retrieve all staking pools
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const chainId = searchParams.get('chainId');
    const tokenSymbol = searchParams.get('tokenSymbol');
    const status = searchParams.get('status') as 'active' | 'inactive' | 'archived' | null;
    
    // Build Supabase query
    let query = supabase
      .from('staking_pools')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by chain ID if provided
    if (chainId) {
      const chainIdNum = parseInt(chainId, 10);
      if (!isNaN(chainIdNum)) {
        query = query.eq('chain_id', chainIdNum);
      }
    }
    
    // Filter by token symbol if provided
    if (tokenSymbol) {
      query = query.ilike('token_symbol', `%${tokenSymbol}%`);
    }
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('[API] Supabase error:', error);
      throw new Error(error.message || 'Failed to fetch staking pools from database');
    }
    
    // Map database rows to StakingPool interface
    const pools: StakingPool[] = (data || []).map(mapRowToPool);
    
    const response: StakingPoolsResponse = {
      pools,
      total: pools.length,
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] /api/v1/staking-pools GET error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch staking pools',
        pools: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Create staking pool
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: CreateStakingPoolRequest = await req.json();
    
    if (!body.chainId || !body.chainName || !body.tokenAddress || body.minStakeAmount === undefined) {
      return NextResponse.json(
        { error: 'chainId, chainName, tokenAddress, and minStakeAmount are required' },
        { status: 400 }
      );
    }
    
    // Insert into database
    const { data, error } = await supabase
      .from('staking_pools')
      .insert({
        chain_id: body.chainId,
        chain_name: body.chainName,
        token_address: body.tokenAddress,
        token_symbol: body.tokenSymbol || null,
        token_name: body.tokenName || null,
        token_logo: body.tokenLogo || null,
        min_staking_period: body.minStakingPeriod || null,
        min_stake_amount: body.minStakeAmount,
        max_stake_amount: body.maxStakeAmount || null,
        stake_modification_fee: body.stakeModificationFee || false,
        time_boost: body.timeBoost || false,
        time_boost_config: body.timeBoostConfig || null,
        country: body.country || null,
        stake_pool_creation_fee: body.stakePoolCreationFee || 0.15,
        reward_pool_creation_fee: body.rewardPoolCreationFee || null,
        apy: body.apy || null,
        status: body.status || 'active',
      })
      .select()
      .single();
    
    if (error) {
      console.error('[API] Supabase error:', error);
      throw new Error(error.message || 'Failed to create staking pool in database');
    }
    
    // Map database row to StakingPool interface
    const pool: StakingPool = mapRowToPool(data);
    
    return NextResponse.json({
      success: true,
      pool,
    });
  } catch (error: any) {
    console.error('[API] /api/v1/staking-pools POST error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to create staking pool' },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH Handler - Update staking pool
// ============================================================================

export async function PATCH(req: NextRequest) {
  try {
    const body: UpdateStakingPoolRequest = await req.json();
    
    if (!body.id) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }
    
    // Check if pool exists
    const { data: existing, error: fetchError } = await supabase
      .from('staking_pools')
      .select('*')
      .eq('id', body.id)
      .single();
    
    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Staking pool not found' },
        { status: 404 }
      );
    }
    
    // Build update object
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };
    
    if (body.chainId !== undefined) updateData.chain_id = body.chainId;
    if (body.chainName !== undefined) updateData.chain_name = body.chainName;
    if (body.tokenAddress !== undefined) updateData.token_address = body.tokenAddress;
    if (body.tokenSymbol !== undefined) updateData.token_symbol = body.tokenSymbol || null;
    if (body.tokenName !== undefined) updateData.token_name = body.tokenName || null;
    if (body.tokenLogo !== undefined) updateData.token_logo = body.tokenLogo || null;
    if (body.minStakingPeriod !== undefined) updateData.min_staking_period = body.minStakingPeriod || null;
    if (body.minStakeAmount !== undefined) updateData.min_stake_amount = body.minStakeAmount;
    if (body.maxStakeAmount !== undefined) updateData.max_stake_amount = body.maxStakeAmount || null;
    if (body.stakeModificationFee !== undefined) updateData.stake_modification_fee = body.stakeModificationFee;
    if (body.timeBoost !== undefined) updateData.time_boost = body.timeBoost;
    if (body.timeBoostConfig !== undefined) updateData.time_boost_config = body.timeBoostConfig || null;
    if (body.country !== undefined) updateData.country = body.country || null;
    if (body.stakePoolCreationFee !== undefined) updateData.stake_pool_creation_fee = body.stakePoolCreationFee;
    if (body.rewardPoolCreationFee !== undefined) updateData.reward_pool_creation_fee = body.rewardPoolCreationFee || null;
    if (body.apy !== undefined) updateData.apy = body.apy || null;
    if (body.status !== undefined) updateData.status = body.status;
    
    // Update in database
    const { data, error } = await supabase
      .from('staking_pools')
      .update(updateData)
      .eq('id', body.id)
      .select()
      .single();
    
    if (error) {
      console.error('[API] Supabase error:', error);
      throw new Error(error.message || 'Failed to update staking pool in database');
    }
    
    // Map database row to StakingPool interface
    const updatedPool: StakingPool = mapRowToPool(data);
    
    return NextResponse.json({
      success: true,
      pool: updatedPool,
    });
  } catch (error: any) {
    console.error('[API] /api/v1/staking-pools PATCH error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to update staking pool' },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE Handler - Remove staking pool
// ============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'Pool ID is required' },
        { status: 400 }
      );
    }
    
    // Check if pool exists
    const { data: existing, error: fetchError } = await supabase
      .from('staking_pools')
      .select('id')
      .eq('id', id)
      .single();
    
    if (fetchError || !existing) {
      return NextResponse.json(
        { error: 'Staking pool not found' },
        { status: 404 }
      );
    }
    
    // Delete from database
    const { error } = await supabase
      .from('staking_pools')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[API] Supabase error:', error);
      throw new Error(error.message || 'Failed to delete staking pool from database');
    }
    
    return NextResponse.json({
      success: true,
      message: 'Staking pool deleted successfully',
    });
  } catch (error: any) {
    console.error('[API] /api/v1/staking-pools DELETE error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to delete staking pool' },
      { status: 500 }
    );
  }
}



