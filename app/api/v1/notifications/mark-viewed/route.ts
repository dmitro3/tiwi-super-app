/**
 * Mark Notifications as Viewed API Route
 * 
 * Endpoint for marking notifications as viewed by a user.
 */

import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/backend/utils/supabase';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { notificationIds, userWallet } = body;
    
    if (!userWallet) {
      return NextResponse.json(
        { error: 'userWallet is required' },
        { status: 400 }
      );
    }
    
    if (!notificationIds || !Array.isArray(notificationIds) || notificationIds.length === 0) {
      return NextResponse.json(
        { error: 'notificationIds array is required' },
        { status: 400 }
      );
    }
    
    // Insert view records (using upsert to handle duplicates gracefully)
    const viewsToInsert = notificationIds.map((notificationId: string) => ({
      notification_id: notificationId,
      user_wallet: userWallet,
    }));
    
    const { error } = await supabase
      .from('notification_views')
      .upsert(viewsToInsert, {
        onConflict: 'notification_id,user_wallet',
        ignoreDuplicates: false,
      });
    
    if (error) {
      console.error('[API] Supabase upsert error:', error);
      throw new Error(error.message || 'Failed to mark notifications as viewed');
    }
    
    return NextResponse.json(
      { 
        success: true,
        message: 'Notifications marked as viewed',
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API] /api/v1/notifications/mark-viewed POST error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to mark notifications as viewed', 
      },
      { status: 500 }
    );
  }
}





