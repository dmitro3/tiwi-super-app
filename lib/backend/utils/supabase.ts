/**
 * Supabase Client Configuration
 * 
 * Creates and exports a singleton Supabase client instance.
 * Uses publishable keys for better security (safe for browser use with RLS enabled).
 */

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabasePublishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY || '';

if (!supabaseUrl || !supabasePublishableKey) {
  console.warn(
    '[Supabase] Missing Supabase environment variables. ' +
    'Please set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY'
  );
}

// Create Supabase client with publishable key
// This key is safe to use in browser when Row Level Security (RLS) is enabled
export const supabase = createClient(supabaseUrl, supabasePublishableKey, {
  auth: {
    persistSession: false, // We don't need auth sessions for server-side operations
  },
});

// Database types
export interface Database {
  public: {
    Tables: {
      referral_codes: {
        Row: {
          id: string;
          code: string;
          wallet_address: string;
          created_at: string;
          is_active: boolean;
        };
        Insert: {
          id?: string;
          code: string;
          wallet_address: string;
          created_at?: string;
          is_active?: boolean;
        };
        Update: {
          id?: string;
          code?: string;
          wallet_address?: string;
          created_at?: string;
          is_active?: boolean;
        };
      };
      referrals: {
        Row: {
          id: string;
          referrer_code: string;
          referrer_wallet: string;
          referee_wallet: string;
          created_at: string;
          status: 'active' | 'inactive';
        };
        Insert: {
          id?: string;
          referrer_code: string;
          referrer_wallet: string;
          referee_wallet: string;
          created_at?: string;
          status?: 'active' | 'inactive';
        };
        Update: {
          id?: string;
          referrer_code?: string;
          referrer_wallet?: string;
          referee_wallet?: string;
          created_at?: string;
          status?: 'active' | 'inactive';
        };
      };
      referral_activity: {
        Row: {
          id: string;
          wallet_address: string;
          reward: number;
          timestamp: string;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          reward: number;
          timestamp?: string;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          reward?: number;
          timestamp?: string;
        };
      };
      tiwi_transactions: {
        Row: {
          id: string;
          wallet_address: string;
          transaction_hash: string;
          chain_id: number;
          transaction_type: string;
          from_token_address: string | null;
          from_token_symbol: string | null;
          to_token_address: string | null;
          to_token_symbol: string | null;
          amount: string | null;
          amount_formatted: string | null;
          usd_value: number | null;
          router_name: string | null;
          created_at: string;
          block_number: number | null;
          block_timestamp: string | null;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          transaction_hash: string;
          chain_id: number;
          transaction_type: string;
          from_token_address?: string | null;
          from_token_symbol?: string | null;
          to_token_address?: string | null;
          to_token_symbol?: string | null;
          amount?: string | null;
          amount_formatted?: string | null;
          usd_value?: number | null;
          router_name?: string | null;
          created_at?: string;
          block_number?: number | null;
          block_timestamp?: string | null;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          transaction_hash?: string;
          chain_id?: number;
          transaction_type?: string;
          from_token_address?: string | null;
          from_token_symbol?: string | null;
          to_token_address?: string | null;
          to_token_symbol?: string | null;
          amount?: string | null;
          amount_formatted?: string | null;
          usd_value?: number | null;
          router_name?: string | null;
          created_at?: string;
          block_number?: number | null;
          block_timestamp?: string | null;
        };
      };
      tiwi_nft_activities: {
        Row: {
          id: string;
          wallet_address: string;
          transaction_hash: string;
          chain_id: number;
          contract_address: string;
          token_id: string;
          activity_type: string;
          from_address: string | null;
          to_address: string | null;
          price: string | null;
          price_usd: number | null;
          created_at: string;
          block_timestamp: string | null;
        };
        Insert: {
          id?: string;
          wallet_address: string;
          transaction_hash: string;
          chain_id: number;
          contract_address: string;
          token_id: string;
          activity_type: string;
          from_address?: string | null;
          to_address?: string | null;
          price?: string | null;
          price_usd?: number | null;
          created_at?: string;
          block_timestamp?: string | null;
        };
        Update: {
          id?: string;
          wallet_address?: string;
          transaction_hash?: string;
          chain_id?: number;
          contract_address?: string;
          token_id?: string;
          activity_type?: string;
          from_address?: string | null;
          to_address?: string | null;
          price?: string | null;
          price_usd?: number | null;
          created_at?: string;
          block_timestamp?: string | null;
        };
      };
    };
  };
}

