/**
 * Adverts API Client
 * 
 * Client functions for fetching and managing adverts from the API.
 */

import type { Advert, CreateAdvertRequest, UpdateAdvertRequest, AdvertsAPIResponse } from '@/lib/shared/types/adverts';

const API_BASE = '/api/v1/adverts';

/**
 * Fetch adverts from the API
 */
export async function fetchAdverts(params?: {
  status?: Advert['status'];
  campaignType?: string;
}): Promise<Advert[]> {
  try {
    const searchParams = new URLSearchParams();
    if (params?.status) {
      searchParams.append('status', params.status);
    }
    if (params?.campaignType) {
      searchParams.append('campaignType', params.campaignType);
    }
    
    const url = `${API_BASE}${searchParams.toString() ? `?${searchParams.toString()}` : ''}`;
    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data: AdvertsAPIResponse = await response.json();
    return data.adverts || [];
  } catch (error: any) {
    console.error('[API] Error fetching adverts:', error);
    throw error;
  }
}

/**
 * Create a new advert
 */
export async function createAdvert(advert: CreateAdvertRequest): Promise<Advert> {
  try {
    const response = await fetch(API_BASE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(advert),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.advert;
  } catch (error: any) {
    console.error('[API] Error creating advert:', error);
    throw error;
  }
}

/**
 * Update an existing advert
 */
export async function updateAdvert(advert: UpdateAdvertRequest): Promise<Advert> {
  try {
    const response = await fetch(API_BASE, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(advert),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
    
    const data = await response.json();
    return data.advert;
  } catch (error: any) {
    console.error('[API] Error updating advert:', error);
    throw error;
  }
}

/**
 * Delete an advert
 */
export async function deleteAdvert(id: string): Promise<void> {
  try {
    const response = await fetch(`${API_BASE}?id=${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error! status: ${response.status}`);
    }
  } catch (error: any) {
    console.error('[API] Error deleting advert:', error);
    throw error;
  }
}

