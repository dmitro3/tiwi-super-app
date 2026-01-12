/**
 * Moralis API Keys Test Endpoint
 * 
 * Tests if Moralis API keys are configured and working
 * GET /api/v1/test/moralis-keys
 */

import { NextRequest, NextResponse } from 'next/server';
import { 
  getCurrentApiKey, 
  getAllApiKeys, 
  getCurrentKeyIndex,
  getExhaustedKeysCount 
} from '@/lib/backend/utils/moralis-key-manager';
import { getWalletTokensWithPrices } from '@/lib/backend/providers/moralis-rest-client';

export async function GET(req: NextRequest) {
  try {
    // Get key information
    const allKeys = getAllApiKeys();
    const currentKey = getCurrentApiKey();
    const currentIndex = getCurrentKeyIndex();
    const exhaustedCount = getExhaustedKeysCount();
    
    // Mask keys for security (show first 8 and last 4 characters)
    const maskKey = (key: string): string => {
      if (key.length <= 12) return '***';
      return `${key.substring(0, 8)}...${key.substring(key.length - 4)}`;
    };
    
    // Check if keys look like JWT tokens (common mistake)
    const looksLikeJWT = (key: string): boolean => {
      return key.trim().startsWith('eyJ') && key.includes('.');
    };
    
    const keyInfo = {
      totalKeys: allKeys.length,
      currentKeyIndex: currentIndex + 1,
      currentKey: maskKey(currentKey),
      currentKeyFormat: looksLikeJWT(currentKey) ? 'JWT_TOKEN' : 'API_KEY',
      allKeys: allKeys.map((key, index) => ({
        index: index + 1,
        masked: maskKey(key),
        isCurrent: index === currentIndex,
        format: looksLikeJWT(key) ? 'JWT_TOKEN' : 'API_KEY',
      })),
      exhaustedKeysCount: exhaustedCount,
    };
    
    // Check JWT expiration if it's a JWT token
    const checkJWTExpiration = (token: string): { isExpired: boolean; expiresAt: number | null; message: string | null } => {
      if (!token.startsWith('eyJ')) {
        return { isExpired: false, expiresAt: null, message: null };
      }
      
      try {
        // Decode JWT (base64 decode the payload)
        const parts = token.split('.');
        if (parts.length !== 3) {
          return { isExpired: false, expiresAt: null, message: 'Invalid JWT format' };
        }
        
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        const exp = payload.exp;
        
        if (!exp) {
          return { isExpired: false, expiresAt: null, message: 'JWT has no expiration claim' };
        }
        
        const expiresAt = exp * 1000; // Convert to milliseconds
        const now = Date.now();
        const isExpired = now >= expiresAt;
        
        return {
          isExpired,
          expiresAt,
          message: isExpired 
            ? `JWT expired on ${new Date(expiresAt).toISOString()}` 
            : `JWT expires on ${new Date(expiresAt).toISOString()}`,
        };
      } catch (error) {
        return { isExpired: false, expiresAt: null, message: 'Failed to decode JWT' };
      }
    };
    
    const jwtCheck = checkJWTExpiration(currentKey);
    
    // Test the API key by making a simple request
    // Use a well-known address (Vitalik's address) for testing
    const testAddress = '0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045'; // Vitalik's address
    const testChainId = 1; // Ethereum mainnet
    
    let testResult = {
      success: false,
      error: null as string | null,
      response: null as any,
      jwtStatus: jwtCheck,
    };
    
    // If JWT is expired, don't even try the request
    if (jwtCheck.isExpired) {
      testResult.error = `JWT token is expired. ${jwtCheck.message}`;
      testResult.response = null;
    } else {
      try {
        console.log('[MoralisKeysTest] Testing API key with test request...');
        const response = await getWalletTokensWithPrices(testAddress, testChainId);
      
      // Check if we got a valid response
      if (response && (response.result || Array.isArray(response))) {
        testResult.success = true;
        testResult.response = {
          tokensCount: Array.isArray(response) ? response.length : (response.result?.length || 0),
          hasData: true,
        };
      } else {
        testResult.success = false;
        testResult.error = 'Invalid response format';
        testResult.response = response;
      }
    } catch (error: any) {
      testResult.success = false;
      testResult.error = error?.message || 'Unknown error';
      
      // Check for specific error types
      if (error?.status === 401) {
        testResult.error = 'API key is invalid or expired (401 Unauthorized)';
      } else if (error?.status === 429) {
        testResult.error = 'API key rate limit exceeded (429 Too Many Requests)';
      } else if (error?.code === 'C0006') {
        testResult.error = 'API key plan limit reached or invalid (C0006)';
      }
      
        console.error('[MoralisKeysTest] Test request failed:', error);
        
        // Add more detailed error information
        if (error?.response) {
          testResult.response = {
            status: error.status,
            errorData: error.response,
          };
        }
      }
    }
    
    return NextResponse.json({
      keys: keyInfo,
      test: testResult,
      recommendations: jwtCheck.isExpired 
        ? ['JWT token is expired. Please generate a new API key from https://admin.moralis.io/web3apis']
        : testResult.success 
        ? []
        : [
            'Check if the API key has the correct permissions for the Web3 Data API',
            'Verify the project is active in your Moralis dashboard',
            'Check if you have reached your plan limits',
            'Try generating a new API key from https://admin.moralis.io/web3apis',
          ],
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[MoralisKeysTest] Error:', error);
    
    // Check if it's a "no keys" error
    if (error?.message?.includes('No valid API keys')) {
      return NextResponse.json(
        {
          error: 'No Moralis API keys configured',
          message: 'Please set MORALIS_API_KEY_1, MORALIS_API_KEY_2, etc. in your environment variables',
          keys: {
            totalKeys: 0,
            currentKeyIndex: 0,
            currentKey: null,
            allKeys: [],
            exhaustedKeysCount: 0,
          },
          test: {
            success: false,
            error: 'No API keys configured',
            response: null,
          },
        },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      {
        error: error?.message || 'Failed to test Moralis API keys',
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}

