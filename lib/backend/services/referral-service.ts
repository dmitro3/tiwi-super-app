/**
 * Referral Service
 * 
 * Handles referral code generation, validation, and referral tracking.
 * Uses Supabase for database operations.
 */

import { supabase } from '@/lib/backend/utils/supabase';

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get the base URL for referral links
 * Uses localhost for local development, otherwise uses env variable or production URL
 */
function getReferralBaseUrl(): string {
  // Check if we have an explicit app URL set
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL;
  }
  
  // For local development, use localhost
  // In development mode, default to localhost for testing
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:3000';
  }
  
  // Fallback to production URL
  return 'https://tiwiprotocol.com';
}

// ============================================================================
// Types
// ============================================================================

export interface ReferralCode {
  id: string;
  code: string;
  walletAddress: string;
  createdAt: string;
  isActive: boolean;
}

export interface Referral {
  id: string;
  referrerCode: string;
  referrerWallet: string;
  refereeWallet: string;
  createdAt: string;
  status: 'active' | 'inactive';
}

export interface ReferralStats {
  totalInvites: number;
  totalBonuses: number;
  claimableRewards: number;
  referralCode: string | null;
  referralLink: string | null;
}

export interface RecentActivity {
  walletAddress: string;
  reward: number;
  timestamp: string;
}

// ============================================================================
// Referral Code Generation
// ============================================================================

/**
 * Generate a unique referral code in format TIWI####
 */
function generateReferralCode(): string {
  const randomNum = Math.floor(1000 + Math.random() * 9000); // 1000-9999
  return `TIWI${randomNum}`;
}

/**
 * Check if a referral code is unique (case-insensitive)
 */
async function isCodeUnique(code: string): Promise<boolean> {
  // Use case-insensitive comparison by converting to uppercase for comparison
  // This ensures "MyCode" and "mycode" are treated as the same
  const { data, error } = await supabase
    .from('referral_codes')
    .select('code')
    .eq('is_active', true);
  
  if (error) {
    console.error('[ReferralService] Error checking code uniqueness:', error);
    throw error;
  }
  
  if (!data || data.length === 0) {
    return true;
  }
  
  // Case-insensitive comparison
  const normalizedCode = code.toUpperCase();
  const isUnique = !data.some(item => item.code.toUpperCase() === normalizedCode);
  
  return isUnique;
}

/**
 * Generate a unique referral code
 */
async function generateUniqueCode(): Promise<string> {
  let attempts = 0;
  const maxAttempts = 100;
  
  while (attempts < maxAttempts) {
    const code = generateReferralCode();
    if (await isCodeUnique(code)) {
      return code;
    }
    attempts++;
  }
  
  // Fallback: use timestamp-based code
  const timestamp = Date.now().toString().slice(-6);
  return `TIWI${timestamp}`;
}

// ============================================================================
// Referral Service Class
// ============================================================================

export class ReferralService {
  /**
   * Create or get referral code for a wallet
   */
  async createReferralCode(
    walletAddress: string,
    customCode?: string
  ): Promise<{ code: string; link: string }> {
    const normalizedWallet = walletAddress.toLowerCase();
    
    // Check if user already has an active code
    const { data: existingCodes, error: fetchError } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('wallet_address', normalizedWallet)
      .eq('is_active', true)
      .limit(1);
    
    if (fetchError) {
      console.error('[ReferralService] Error fetching existing codes:', fetchError);
      throw new Error('Failed to check existing referral codes');
    }
    
    if (existingCodes && existingCodes.length > 0) {
      const code = existingCodes[0].code;
      const link = `${getReferralBaseUrl()}/referral/${code}`;
      return { code, link };
    }
    
    // Generate or use custom code
    let code: string;
    if (customCode) {
      // Validate custom code format - allow names, names with numbers, names with symbols
      // Allow letters, numbers, and common symbols (hyphens, underscores, dots)
      // Minimum 3 characters, maximum 30 characters
      const trimmedCode = customCode.trim();
      const codeRegex = /^[A-Za-z0-9\-_\.]{3,30}$/;
      
      if (!trimmedCode) {
        throw new Error('Custom code cannot be empty.');
      }
      
      if (trimmedCode.length < 3) {
        throw new Error('Custom code must be at least 3 characters long.');
      }
      
      if (trimmedCode.length > 30) {
        throw new Error('Custom code must be 30 characters or less.');
      }
      
      if (!codeRegex.test(trimmedCode)) {
        throw new Error('Custom code can contain letters, numbers, hyphens (-), underscores (_), and dots (.).');
      }
      
      // Check if custom code is unique (case-insensitive)
      if (!(await isCodeUnique(trimmedCode))) {
        throw new Error('Referral code already exists. Please choose a different code.');
      }
      
      // Preserve the original case for custom codes
      code = trimmedCode;
    } else {
      code = await generateUniqueCode();
    }
    
    // Create new referral code
    const { data: newCode, error: insertError } = await supabase
      .from('referral_codes')
      .insert({
        code,
        wallet_address: normalizedWallet,
        is_active: true,
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[ReferralService] Error creating referral code:', insertError);
      throw new Error('Failed to create referral code');
    }
    
    const link = `${getReferralBaseUrl()}/referral/${code}`;
    return { code, link };
  }
  
  /**
   * Validate and apply a referral code
   */
  async applyReferralCode(
    referralCode: string,
    refereeWallet: string
  ): Promise<{ success: boolean; referrerWallet?: string; message?: string }> {
    const normalizedRefereeWallet = refereeWallet.toLowerCase();
    const trimmedCode = referralCode.trim();
    
    if (!trimmedCode) {
      return { success: false, message: 'Referral code cannot be empty.' };
    }
    
    // Find the referral code (case-insensitive search)
    // Get all active codes and match case-insensitively
    const { data: allCodes, error: fetchError } = await supabase
      .from('referral_codes')
      .select('code, wallet_address')
      .eq('is_active', true);
    
    if (fetchError) {
      console.error('[ReferralService] Error fetching codes:', fetchError);
      return { success: false, message: 'Failed to validate referral code.' };
    }
    
    // Case-insensitive match
    const normalizedInput = trimmedCode.toUpperCase();
    const codeData = allCodes?.find(
      item => item.code.toUpperCase() === normalizedInput
    );
    
    if (!codeData) {
      return { success: false, message: 'Invalid referral code.' };
    }
    
    // Check if user is trying to use their own code
    if (codeData.wallet_address.toLowerCase() === normalizedRefereeWallet) {
      return { success: false, message: 'You cannot use your own referral code.' };
    }
    
    // Check if this wallet has already been referred
    const { data: existingReferral, error: referralCheckError } = await supabase
      .from('referrals')
      .select('id')
      .eq('referee_wallet', normalizedRefereeWallet)
      .eq('status', 'active')
      .limit(1)
      .maybeSingle();
    
    if (referralCheckError) {
      console.error('[ReferralService] Error checking existing referral:', referralCheckError);
      return { success: false, message: 'Failed to validate referral code.' };
    }
    
    if (existingReferral) {
      return { success: false, message: 'You have already been referred by another user.' };
    }
    
    // Create referral record
    const { data: newReferral, error: insertError } = await supabase
      .from('referrals')
      .insert({
        referrer_code: codeData.code,
        referrer_wallet: codeData.wallet_address,
        referee_wallet: normalizedRefereeWallet,
        status: 'active',
      })
      .select()
      .single();
    
    if (insertError) {
      console.error('[ReferralService] Error creating referral:', insertError);
      // Check if it's a unique constraint violation
      if (insertError.code === '23505') {
        return { success: false, message: 'You have already been referred by another user.' };
      }
      return { success: false, message: 'Failed to apply referral code.' };
    }
    
    // Add to activity feed
    await this.addActivity(codeData.wallet_address, 0); // Initial reward is 0
    
    return { success: true, referrerWallet: codeData.wallet_address };
  }
  
  /**
   * Get referral stats for a wallet
   */
  async getReferralStats(walletAddress: string): Promise<ReferralStats> {
    const normalizedWallet = walletAddress.toLowerCase();
    
    // Get user's referral code
    const { data: codeData } = await supabase
      .from('referral_codes')
      .select('code')
      .eq('wallet_address', normalizedWallet)
      .eq('is_active', true)
      .limit(1)
      .maybeSingle();
    
    // Get user's referrals count
    const { count: referralsCount, error: countError } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_wallet', normalizedWallet)
      .eq('status', 'active');
    
    if (countError) {
      console.error('[ReferralService] Error counting referrals:', countError);
    }
    
    // Calculate stats (placeholder - integrate with actual trading data later)
    const totalInvites = referralsCount || 0;
    const totalBonuses = 0; // TODO: Calculate from actual trading volume
    const claimableRewards = 0; // TODO: Calculate from actual rewards
    
    const referralLink = codeData?.code
      ? `${getReferralBaseUrl()}/referral/${codeData.code}`
      : null;
    
    return {
      totalInvites,
      totalBonuses,
      claimableRewards,
      referralCode: codeData?.code || null,
      referralLink,
    };
  }
  
  /**
   * Get recent referral activity
   */
  async getRecentActivity(limit: number = 10): Promise<RecentActivity[]> {
    const { data, error } = await supabase
      .from('referral_activity')
      .select('wallet_address, reward, timestamp')
      .order('timestamp', { ascending: false })
      .limit(limit);
    
    if (error) {
      console.error('[ReferralService] Error fetching recent activity:', error);
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    return data.map(item => ({
      walletAddress: item.wallet_address,
      reward: Number(item.reward),
      timestamp: item.timestamp,
    }));
  }
  
  /**
   * Add activity entry
   */
  async addActivity(walletAddress: string, reward: number): Promise<void> {
    const { error } = await supabase
      .from('referral_activity')
      .insert({
        wallet_address: walletAddress.toLowerCase(),
        reward: reward,
      });
    
    if (error) {
      console.error('[ReferralService] Error adding activity:', error);
      // Don't throw - activity logging is not critical
    }
    
    // Clean up old activities (keep only last 100)
    // This is done via a database trigger or scheduled job in production
    // For now, we'll just insert and let the database handle cleanup
  }
  
  /**
   * Get referrals for a wallet (list of people they referred)
   */
  async getReferrals(walletAddress: string): Promise<Referral[]> {
    const normalizedWallet = walletAddress.toLowerCase();
    
    const { data, error } = await supabase
      .from('referrals')
      .select('id, referrer_code, referrer_wallet, referee_wallet, created_at, status')
      .eq('referrer_wallet', normalizedWallet)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    
    if (error) {
      console.error('[ReferralService] Error fetching referrals:', error);
      return [];
    }
    
    if (!data) {
      return [];
    }
    
    return data.map(item => ({
      id: item.id,
      referrerCode: item.referrer_code,
      referrerWallet: item.referrer_wallet,
      refereeWallet: item.referee_wallet,
      createdAt: item.created_at,
      status: item.status as 'active' | 'inactive',
    }));
  }

  /**
   * Calculate rebate level based on 28-day trading volume
   */
  calculateRebateLevel(spotVolume: number): number {
    if (spotVolume <= 100) return 1; // 30%
    if (spotVolume <= 5000) return 2; // 35%
    if (spotVolume <= 10000) return 3; // 40%
    if (spotVolume <= 12500) return 4; // 45%
    if (spotVolume <= 20500) return 5; // 50%
    return 6; // 80%
  }

  /**
   * Get rebate percentage for a level
   */
  getRebatePercentage(level: number): number {
    const rebates: Record<number, number> = {
      1: 30,
      2: 35,
      3: 40,
      4: 45,
      5: 50,
      6: 80,
    };
    return rebates[level] || 30;
  }

  /**
   * Get rebate stats for a wallet
   */
  async getRebateStats(walletAddress: string): Promise<{
    rebateLevel: number;
    invitedFrens: number;
    frensSpotVol: number;
    frensPerpVol: number;
    mySpotRebate: number;
    myPerpRebate: number;
  }> {
    const normalizedWallet = walletAddress.toLowerCase();
    
    // Get count of invited friends
    const { count: invitedCount } = await supabase
      .from('referrals')
      .select('*', { count: 'exact', head: true })
      .eq('referrer_wallet', normalizedWallet)
      .eq('status', 'active');
    
    // Get 28-day trading volume from referees
    const twentyEightDaysAgo = new Date();
    twentyEightDaysAgo.setDate(twentyEightDaysAgo.getDate() - 28);
    
    // Get all active referees
    const { data: referees } = await supabase
      .from('referrals')
      .select('referee_wallet')
      .eq('referrer_wallet', normalizedWallet)
      .eq('status', 'active');
    
    const refereeWallets = referees?.map(r => r.referee_wallet) || [];
    
    // Calculate total spot and perp volume from referees in last 28 days
    let frensSpotVol = 0;
    let frensPerpVol = 0;
    
    if (refereeWallets.length > 0) {
      const { data: volumes } = await supabase
        .from('trading_volume')
        .select('spot_volume, perp_volume')
        .in('referee_wallet', refereeWallets)
        .gte('trade_date', twentyEightDaysAgo.toISOString().split('T')[0]);
      
      if (volumes) {
        frensSpotVol = volumes.reduce((sum, v) => sum + Number(v.spot_volume || 0), 0);
        frensPerpVol = volumes.reduce((sum, v) => sum + Number(v.perp_volume || 0), 0);
      }
    }
    
    // Calculate rebate level based on spot volume
    const rebateLevel = this.calculateRebateLevel(frensSpotVol);
    const mySpotRebate = this.getRebatePercentage(rebateLevel);
    const myPerpRebate = 0; // Perp rebate not implemented yet
    
    return {
      rebateLevel,
      invitedFrens: invitedCount || 0,
      frensSpotVol,
      frensPerpVol,
      mySpotRebate,
      myPerpRebate,
    };
  }

  /**
   * Get leaderboard data (top referrers by invites and rewards)
   */
  async getLeaderboard(limit: number = 10): Promise<Array<{
    rank: number;
    walletAddress: string;
    invites: number;
    rewards: number;
  }>> {
    // Get top referrers by invite count
    const { data: topReferrers, error } = await supabase
      .from('referrals')
      .select('referrer_wallet')
      .eq('status', 'active');
    
    if (error || !topReferrers) {
      console.error('[ReferralService] Error fetching leaderboard:', error);
      return [];
    }
    
    // Count invites per referrer
    const inviteCounts = new Map<string, number>();
    topReferrers.forEach(ref => {
      const wallet = ref.referrer_wallet.toLowerCase();
      inviteCounts.set(wallet, (inviteCounts.get(wallet) || 0) + 1);
    });
    
    // Get rewards for each referrer
    const { data: rewardsData } = await supabase
      .from('referral_rewards')
      .select('referrer_wallet, total_rewards');
    
    const rewardsMap = new Map<string, number>();
    rewardsData?.forEach(r => {
      rewardsMap.set(r.referrer_wallet.toLowerCase(), Number(r.total_rewards || 0));
    });
    
    // Combine data and sort by invites, then by rewards
    const leaderboard = Array.from(inviteCounts.entries())
      .map(([wallet, invites]) => ({
        walletAddress: wallet,
        invites,
        rewards: rewardsMap.get(wallet) || 0,
      }))
      .sort((a, b) => {
        // Sort by invites first, then by rewards
        if (b.invites !== a.invites) {
          return b.invites - a.invites;
        }
        return b.rewards - a.rewards;
      })
      .slice(0, limit)
      .map((item, index) => ({
        rank: index + 1,
        ...item,
      }));
    
    return leaderboard;
  }
}

// ============================================================================
// Singleton Instance
// ============================================================================

let referralServiceInstance: ReferralService | null = null;

export function getReferralService(): ReferralService {
  if (!referralServiceInstance) {
    referralServiceInstance = new ReferralService();
  }
  return referralServiceInstance;
}
