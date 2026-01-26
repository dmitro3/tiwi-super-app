/**
 * Device Location API Route
 * 
 * Fetches IP address and location information for the requesting client.
 * Uses external IP geolocation services as fallback.
 */

import { NextRequest, NextResponse } from 'next/server';

interface LocationResponse {
  ip: string;
  city: string;
  country?: string;
  countryCode?: string;
}

/**
 * Get client IP address from request headers
 */
function getClientIP(req: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = req.headers.get('x-forwarded-for');
  const realIP = req.headers.get('x-real-ip');
  const cfConnectingIP = req.headers.get('cf-connecting-ip'); // Cloudflare

  if (cfConnectingIP) return cfConnectingIP;
  if (realIP) return realIP;
  if (forwarded) {
    // x-forwarded-for can contain multiple IPs, take the first one
    return forwarded.split(',')[0].trim();
  }

  // Fallback
  return 'Unknown';
}

/**
 * Fetch location from external service
 */
async function fetchLocationFromService(ip: string): Promise<LocationResponse | null> {
  try {
    // Try ipapi.co first (free tier: 1000 requests/day)
    const response = await fetch(`https://ipapi.co/${ip}/json/`, {
      headers: {
        'User-Agent': 'TIWI-Protocol/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (!data.error) {
        return {
          ip: data.ip || ip,
          city: data.city || 'Unknown',
          country: data.country_name || undefined,
          countryCode: data.country_code || undefined,
        };
      }
    }
  } catch (error) {
    console.warn('[DeviceLocationAPI] ipapi.co failed:', error);
  }

  // Fallback: Try ip-api.com (free tier: 45 requests/minute)
  try {
    const response = await fetch(`http://ip-api.com/json/${ip}`, {
      headers: {
        'User-Agent': 'TIWI-Protocol/1.0',
      },
    });

    if (response.ok) {
      const data = await response.json();
      if (data.status === 'success') {
        return {
          ip: data.query || ip,
          city: data.city || 'Unknown',
          country: data.country || undefined,
          countryCode: data.countryCode || undefined,
        };
      }
    }
  } catch (error) {
    console.warn('[DeviceLocationAPI] ip-api.com failed:', error);
  }

  return null;
}

export async function GET(req: NextRequest) {
  try {
    const clientIP = getClientIP(req);

    // If IP is unknown or localhost, try to get from external service
    if (clientIP === 'Unknown' || clientIP === '::1' || clientIP.startsWith('127.')) {
      // For localhost/development, fetch from external service
      const location = await fetchLocationFromService('');
      if (location) {
        return NextResponse.json(location);
      }
    } else {
      // For real IPs, fetch location
      const location = await fetchLocationFromService(clientIP);
      if (location) {
        return NextResponse.json(location);
      }
    }

    // Fallback response
    return NextResponse.json({
      ip: clientIP,
      city: 'Unknown',
      country: undefined,
      countryCode: undefined,
    });
  } catch (error: any) {
    console.error('[DeviceLocationAPI] Error:', error);
    return NextResponse.json(
      {
        error: error?.message || 'Failed to fetch location',
        ip: 'Unknown',
        city: 'Unknown',
      },
      { status: 500 }
    );
  }
}

