/**
 * Referrals API Route
 * 
 * Handles referral code generation, validation, and referral data fetching.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getReferralService } from '@/lib/backend/services/referral-service';

// ============================================================================
// GET Handler - Get referral stats and data
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const walletAddress = searchParams.get('walletAddress');
    const action = searchParams.get('action'); // 'stats', 'activity', 'referrals', 'validate'
    const code = searchParams.get('code');
    
    const referralService = getReferralService();
    
    // Validation endpoint (doesn't require wallet address)
    if (action === 'validate') {
      if (!code) {
        return NextResponse.json(
          { valid: false, error: 'Referral code is required' },
          { status: 400 }
        );
      }
      
      // Check if code exists and is active
      const { supabase } = await import('@/lib/backend/utils/supabase');
      const { data: codes, error: fetchError } = await supabase
        .from('referral_codes')
        .select('code, is_active')
        .eq('is_active', true);
      
      if (fetchError) {
        return NextResponse.json(
          { valid: false, error: 'Failed to validate code' },
          { status: 500 }
        );
      }
      
      const normalizedInput = code.toUpperCase();
      const isValid = codes?.some(
        item => item.code.toUpperCase() === normalizedInput
      ) || false;
      
      return NextResponse.json({ valid: isValid });
    }
    
    // Leaderboard endpoint (doesn't require wallet address)
    if (action === 'leaderboard') {
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const leaderboard = await referralService.getLeaderboard(limit);
      return NextResponse.json({ leaderboard });
    }
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    if (action === 'activity') {
      const limit = parseInt(searchParams.get('limit') || '10', 10);
      const activity = await referralService.getRecentActivity(limit);
      return NextResponse.json({ activity });
    }
    
    if (action === 'referrals') {
      const referrals = await referralService.getReferrals(walletAddress);
      return NextResponse.json({ referrals });
    }
    
    if (action === 'rebate') {
      const rebateStats = await referralService.getRebateStats(walletAddress);
      return NextResponse.json({ rebateStats });
    }
    
    // Default: get stats
    const stats = await referralService.getReferralStats(walletAddress);
    return NextResponse.json({ stats });
  } catch (error: any) {
    console.error('[API] /api/v1/referrals GET error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch referral data' },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Create referral code or apply referral
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, walletAddress, referralCode, customCode } = body;
    
    if (!walletAddress) {
      return NextResponse.json(
        { error: 'Wallet address is required' },
        { status: 400 }
      );
    }
    
    const referralService = getReferralService();
    
    if (action === 'create') {
      // Create or get referral code
      const result = await referralService.createReferralCode(
        walletAddress,
        customCode
      );
      return NextResponse.json({ success: true, ...result });
    }
    
    if (action === 'apply') {
      // Apply referral code
      if (!referralCode) {
        return NextResponse.json(
          { error: 'Referral code is required' },
          { status: 400 }
        );
      }
      
      const result = await referralService.applyReferralCode(
        referralCode,
        walletAddress
      );
      
      if (!result.success) {
        return NextResponse.json(
          { success: false, message: result.message },
          { status: 400 }
        );
      }
      
      return NextResponse.json({ success: true, referrerWallet: result.referrerWallet });
    }
    
    return NextResponse.json(
      { error: 'Invalid action. Use "create" or "apply"' },
      { status: 400 }
    );
  } catch (error: any) {
    console.error('[API] /api/v1/referrals POST error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process referral request' },
      { status: 500 }
    );
  }
}

