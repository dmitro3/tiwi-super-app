/**
 * Adverts API Route
 * 
 * Endpoint for creating and retrieving admin-created advertisements.
 * Uses Supabase database for persistent storage.
 */

import { NextRequest, NextResponse } from 'next/server';
import type { Advert, CreateAdvertRequest, UpdateAdvertRequest, AdvertsAPIResponse } from '@/lib/shared/types/adverts';
import { supabase } from '@/lib/backend/utils/supabase';

// ============================================================================
// GET Handler - Retrieve adverts
// ============================================================================

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const status = searchParams.get('status') as Advert['status'] | null;
    const campaignType = searchParams.get('campaignType');
    
    // Build Supabase query
    let query = supabase
      .from('adverts')
      .select('*')
      .order('created_at', { ascending: false });
    
    // Filter by status if provided
    if (status) {
      query = query.eq('status', status);
    }
    
    // Filter by campaign type if provided
    if (campaignType) {
      query = query.eq('campaign_type', campaignType);
    }
    
    // Execute query
    const { data, error } = await query;
    
    if (error) {
      console.error('[API] Supabase error:', error);
      throw new Error(error.message || 'Failed to fetch adverts from database');
    }
    
    // Map database rows to Advert interface
    const adverts: Advert[] = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      imageUrl: row.image_url || undefined,
      campaignType: row.campaign_type,
      advertFormat: row.advert_format,
      headline: row.headline || undefined,
      messageBody: row.message_body || undefined,
      audienceTargeting: row.audience_targeting || undefined,
      priorityLevel: row.priority_level || undefined,
      complianceNoMisleading: row.compliance_no_misleading || false,
      complianceNoUnsolicited: row.compliance_no_unsolicited || false,
      complianceClearRiskLanguage: row.compliance_clear_risk_language || false,
      compliancePartnerVerified: row.compliance_partner_verified || false,
      complianceConfirmed: row.compliance_confirmed || false,
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      createdBy: row.created_by || undefined,
    }));
    
    const response: AdvertsAPIResponse = {
      adverts,
      total: adverts.length,
    };
    
    return NextResponse.json(response);
  } catch (error: any) {
    console.error('[API] /api/v1/adverts GET error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to fetch adverts', 
        adverts: [],
        total: 0,
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// POST Handler - Create a new advert
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body: CreateAdvertRequest = await req.json();
    
    // Validate required fields
    if (!body.name || !body.campaignType || !body.advertFormat) {
      return NextResponse.json(
        { error: 'name, campaignType, and advertFormat are required' },
        { status: 400 }
      );
    }
    
    // Insert into Supabase
    const { data, error } = await supabase
      .from('adverts')
      .insert({
        name: body.name,
        image_url: body.imageUrl || null,
        campaign_type: body.campaignType,
        advert_format: body.advertFormat,
        headline: body.headline || null,
        message_body: body.messageBody || null,
        audience_targeting: body.audienceTargeting || null,
        priority_level: body.priorityLevel || null,
        compliance_no_misleading: body.complianceNoMisleading || false,
        compliance_no_unsolicited: body.complianceNoUnsolicited || false,
        compliance_clear_risk_language: body.complianceClearRiskLanguage || false,
        compliance_partner_verified: body.compliancePartnerVerified || false,
        compliance_confirmed: body.complianceConfirmed || false,
        status: body.status || 'draft',
        created_by: body.createdBy || null,
      })
      .select()
      .single();
    
    if (error) {
      console.error('[API] Supabase insert error:', error);
      throw new Error(error.message || 'Failed to create advert in database');
    }
    
    // Map database row to Advert interface
    const newAdvert: Advert = {
      id: data.id,
      name: data.name,
      imageUrl: data.image_url || undefined,
      campaignType: data.campaign_type,
      advertFormat: data.advert_format,
      headline: data.headline || undefined,
      messageBody: data.message_body || undefined,
      audienceTargeting: data.audience_targeting || undefined,
      priorityLevel: data.priority_level || undefined,
      complianceNoMisleading: data.compliance_no_misleading || false,
      complianceNoUnsolicited: data.compliance_no_unsolicited || false,
      complianceClearRiskLanguage: data.compliance_clear_risk_language || false,
      compliancePartnerVerified: data.compliance_partner_verified || false,
      complianceConfirmed: data.compliance_confirmed || false,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by || undefined,
    };
    
    return NextResponse.json(
      { 
        success: true,
        advert: newAdvert,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error('[API] /api/v1/adverts POST error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to create advert', 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// PATCH Handler - Update advert
// ============================================================================

export async function PATCH(req: NextRequest) {
  try {
    const body: UpdateAdvertRequest = await req.json();
    const { id, ...updateFields } = body;
    
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }
    
    // Build update object (only include provided fields)
    const updateData: any = {};
    
    if (updateFields.name !== undefined) {
      updateData.name = updateFields.name;
    }
    if (updateFields.imageUrl !== undefined) {
      updateData.image_url = updateFields.imageUrl;
    }
    if (updateFields.campaignType !== undefined) {
      updateData.campaign_type = updateFields.campaignType;
    }
    if (updateFields.advertFormat !== undefined) {
      updateData.advert_format = updateFields.advertFormat;
    }
    if (updateFields.headline !== undefined) {
      updateData.headline = updateFields.headline;
    }
    if (updateFields.messageBody !== undefined) {
      updateData.message_body = updateFields.messageBody;
    }
    if (updateFields.audienceTargeting !== undefined) {
      updateData.audience_targeting = updateFields.audienceTargeting;
    }
    if (updateFields.priorityLevel !== undefined) {
      updateData.priority_level = updateFields.priorityLevel;
    }
    if (updateFields.complianceNoMisleading !== undefined) {
      updateData.compliance_no_misleading = updateFields.complianceNoMisleading;
    }
    if (updateFields.complianceNoUnsolicited !== undefined) {
      updateData.compliance_no_unsolicited = updateFields.complianceNoUnsolicited;
    }
    if (updateFields.complianceClearRiskLanguage !== undefined) {
      updateData.compliance_clear_risk_language = updateFields.complianceClearRiskLanguage;
    }
    if (updateFields.compliancePartnerVerified !== undefined) {
      updateData.compliance_partner_verified = updateFields.compliancePartnerVerified;
    }
    if (updateFields.complianceConfirmed !== undefined) {
      updateData.compliance_confirmed = updateFields.complianceConfirmed;
    }
    if (updateFields.status !== undefined) {
      updateData.status = updateFields.status;
    }
    
    const { data, error } = await supabase
      .from('adverts')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();
    
    if (error) {
      console.error('[API] Supabase update error:', error);
      if (error.code === 'PGRST116') {
        // No rows returned - advert not found
        return NextResponse.json(
          { error: 'Advert not found' },
          { status: 404 }
        );
      }
      throw new Error(error.message || 'Failed to update advert in database');
    }
    
    // Map database row to Advert interface
    const updatedAdvert: Advert = {
      id: data.id,
      name: data.name,
      imageUrl: data.image_url || undefined,
      campaignType: data.campaign_type,
      advertFormat: data.advert_format,
      headline: data.headline || undefined,
      messageBody: data.message_body || undefined,
      audienceTargeting: data.audience_targeting || undefined,
      priorityLevel: data.priority_level || undefined,
      complianceNoMisleading: data.compliance_no_misleading || false,
      complianceNoUnsolicited: data.compliance_no_unsolicited || false,
      complianceClearRiskLanguage: data.compliance_clear_risk_language || false,
      compliancePartnerVerified: data.compliance_partner_verified || false,
      complianceConfirmed: data.compliance_confirmed || false,
      status: data.status,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
      createdBy: data.created_by || undefined,
    };
    
    return NextResponse.json(
      { 
        success: true,
        advert: updatedAdvert,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API] /api/v1/adverts PATCH error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to update advert', 
      },
      { status: 500 }
    );
  }
}

// ============================================================================
// DELETE Handler - Delete advert
// ============================================================================

export async function DELETE(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json(
        { error: 'id is required' },
        { status: 400 }
      );
    }
    
    const { error } = await supabase
      .from('adverts')
      .delete()
      .eq('id', id);
    
    if (error) {
      console.error('[API] Supabase delete error:', error);
      throw new Error(error.message || 'Failed to delete advert from database');
    }
    
    return NextResponse.json(
      { 
        success: true,
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error('[API] /api/v1/adverts DELETE error:', error);
    return NextResponse.json(
      { 
        error: error?.message || 'Failed to delete advert', 
      },
      { status: 500 }
    );
  }
}

