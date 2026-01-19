/**
 * Device Detection Utilities
 * 
 * Detects device type, name, and fetches IP/location information.
 */

export interface DeviceInfo {
  deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown';
  deviceName: string;
  userAgent: string;
}

export interface LocationInfo {
  ipAddress: string;
  city: string;
  country?: string;
}

/**
 * Detect device type and name from user agent
 */
export function detectDevice(): DeviceInfo {
  if (typeof window === 'undefined') {
    return {
      deviceType: 'unknown',
      deviceName: 'Unknown Device',
      userAgent: '',
    };
  }

  const userAgent = navigator.userAgent;
  let deviceType: 'desktop' | 'mobile' | 'tablet' | 'unknown' = 'unknown';
  let deviceName = 'Unknown Device';

  // Detect device type
  if (/tablet|ipad|playbook|silk/i.test(userAgent)) {
    deviceType = 'tablet';
  } else if (/mobile|iphone|ipod|android|blackberry|opera|mini|windows\s+ce|palm|smartphone|iemobile/i.test(userAgent)) {
    deviceType = 'mobile';
  } else {
    deviceType = 'desktop';
  }

  // Detect browser and OS
  const browser = detectBrowser(userAgent);
  const os = detectOS(userAgent);

  deviceName = `${browser} on ${os}`;

  return {
    deviceType,
    deviceName,
    userAgent,
  };
}

function detectBrowser(userAgent: string): string {
  if (userAgent.includes('Chrome') && !userAgent.includes('Edg')) return 'Chrome';
  if (userAgent.includes('Safari') && !userAgent.includes('Chrome')) return 'Safari';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Edg')) return 'Edge';
  if (userAgent.includes('Opera') || userAgent.includes('OPR')) return 'Opera';
  return 'Unknown Browser';
}

function detectOS(userAgent: string): string {
  if (userAgent.includes('Windows')) return 'Windows';
  if (userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')) return 'macOS';
  if (userAgent.includes('Linux')) return 'Linux';
  if (userAgent.includes('Android')) return 'Android';
  if (userAgent.includes('iOS') || userAgent.includes('iPhone') || userAgent.includes('iPad')) return 'iOS';
  return 'Unknown OS';
}

/**
 * Fetch IP address and location information
 * Uses a free IP geolocation service
 */
export async function fetchLocationInfo(): Promise<LocationInfo> {
  try {
    // Try using our API endpoint first (if available)
    const response = await fetch('/api/v1/device/location', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ipAddress: data.ip || 'Unknown',
        city: data.city || 'Unknown',
        country: data.country || undefined,
      };
    }
  } catch (error) {
    console.warn('[DeviceDetection] Failed to fetch location from API:', error);
  }

  // Fallback: Try external service (ipapi.co)
  try {
    const response = await fetch('https://ipapi.co/json/', {
      method: 'GET',
    });

    if (response.ok) {
      const data = await response.json();
      return {
        ipAddress: data.ip || 'Unknown',
        city: data.city || 'Unknown',
        country: data.country_name || undefined,
      };
    }
  } catch (error) {
    console.warn('[DeviceDetection] Failed to fetch location from ipapi.co:', error);
  }

  // Final fallback
  return {
    ipAddress: 'Unknown',
    city: 'Unknown',
    country: undefined,
  };
}

/**
 * Create a device session when a local wallet connects
 */
export async function createDeviceSession(walletAddress: string): Promise<string> {
  const deviceInfo = detectDevice();
  const locationInfo = await fetchLocationInfo();

  const { useDeviceSessionStore } = await import('@/lib/wallet/state/device-session-store');
  const addSession = useDeviceSessionStore.getState().addSession;

  const sessionId = addSession({
    walletAddress: walletAddress.toLowerCase(),
    deviceType: deviceInfo.deviceType,
    deviceName: deviceInfo.deviceName,
    ipAddress: locationInfo.ipAddress,
    city: locationInfo.city,
    country: locationInfo.country,
    userAgent: deviceInfo.userAgent,
    isActive: true,
  });

  return sessionId;
}

