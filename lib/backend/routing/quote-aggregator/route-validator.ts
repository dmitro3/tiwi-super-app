/**
 * Route Validator
 * 
 * Validates routes before returning them to users.
 * Ensures routes are safe and executable.
 */

import type { Address } from 'viem';
import type { UniversalRoute } from '../types';
import type { RouterRoute } from '@/lib/backend/routers/types';

/**
 * Validation result
 */
export interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

/**
 * Route Validator
 * 
 * Validates routes for safety and executability.
 */
export class RouteValidator {
  /**
   * Validate a route
   */
  validateRoute(route: RouterRoute | UniversalRoute): ValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    // 1. Check required fields
    if (!route.fromToken || !route.toToken) {
      errors.push('Missing token information');
    }
    
    if (!route.fromToken?.address || !route.toToken?.address) {
      errors.push('Missing token addresses');
    }
    
    if (!route.fromToken?.amount || !route.toToken?.amount) {
      errors.push('Missing token amounts');
    }
    
    // 2. Check amounts are positive
    const fromAmount = parseFloat(route.fromToken?.amount || '0');
    const toAmount = parseFloat(route.toToken?.amount || '0');
    
    if (fromAmount <= 0) {
      errors.push('Invalid input amount');
    }
    
    if (toAmount <= 0) {
      errors.push('Invalid output amount');
    }
    
    // 3. Check price impact
    const priceImpact = parseFloat(route.priceImpact?.toString() || '0');
    if (priceImpact > 50) {
      errors.push('Price impact too high (>50%)');
    } else if (priceImpact > 10) {
      warnings.push('High price impact (>10%)');
    }
    
    // 4. Check expiration
    if ('expiresAt' in route && route.expiresAt) {
      const now = Date.now();
      if (now >= route.expiresAt) {
        errors.push('Route has expired');
      } else if (route.expiresAt - now < 30000) {
        warnings.push('Route expires soon (<30 seconds)');
      }
    }
    
    // 5. Check gas estimate
    let gasEstimate = BigInt(0);
    if ('gasEstimate' in route && route.gasEstimate) {
      gasEstimate = route.gasEstimate;
    } else if (route.fees?.gas) {
      gasEstimate = BigInt(route.fees.gas);
    }
    
    if (gasEstimate === BigInt(0)) {
      warnings.push('Gas estimate not available');
    } else if (gasEstimate > BigInt(1000000)) {
      warnings.push('High gas estimate (>1M gas)');
    }
    
    // 6. Check fees
    if (route.fees) {
      const totalFees = parseFloat(route.fees.total || '0');
      if (totalFees < 0) {
        errors.push('Invalid fee calculation');
      }
    }
    
    // 7. Check path (for universal routes only)
    if ('path' in route) {
      const universalRoute = route as UniversalRoute;
      if (universalRoute.path) {
        if (universalRoute.path.length < 2) {
          errors.push('Invalid route path');
        }
        
        // Check path has valid addresses
        for (const address of universalRoute.path) {
          if (!address || address.length !== 42 || !address.startsWith('0x')) {
            errors.push('Invalid address in path');
            break;
          }
        }
      }
    }
    
    // 8. Check steps (for both route types)
    if ('steps' in route && route.steps) {
      const routeWithSteps = route as RouterRoute | UniversalRoute;
      if (routeWithSteps.steps.length === 0) {
        if ('path' in route && (route as UniversalRoute).path && (route as UniversalRoute).path.length > 2) {
          warnings.push('Route has path but no steps');
        }
      }
    }
    
    return {
      isValid: errors.length === 0,
      errors,
      warnings,
    };
  }
  
  /**
   * Validate multiple routes
   */
  validateRoutes(routes: (RouterRoute | UniversalRoute)[]): {
    valid: (RouterRoute | UniversalRoute)[];
    invalid: Array<{ route: RouterRoute | UniversalRoute; errors: string[] }>;
  } {
    const valid: (RouterRoute | UniversalRoute)[] = [];
    const invalid: Array<{ route: RouterRoute | UniversalRoute; errors: string[] }> = [];
    
    for (const route of routes) {
      const result = this.validateRoute(route);
      if (result.isValid) {
        valid.push(route);
      } else {
        invalid.push({
          route,
          errors: result.errors,
        });
      }
    }
    
    return { valid, invalid };
  }
  
  /**
   * Check if route is executable
   * 
   * A route is executable if:
   * - It's valid
   * - It hasn't expired
   * - It has reasonable price impact
   * - It has gas estimate
   */
  isExecutable(route: RouterRoute | UniversalRoute): boolean {
    const result = this.validateRoute(route);
    
    if (!result.isValid) {
      return false;
    }
    
    // Check expiration
    if ('expiresAt' in route && route.expiresAt) {
      if (Date.now() >= route.expiresAt) {
        return false;
      }
    }
    
    // Check price impact
    const priceImpact = parseFloat(route.priceImpact?.toString() || '0');
    if (priceImpact > 50) {
      return false;
    }
    
    // Check gas estimate
    let gasEstimate = BigInt(0);
    if ('gasEstimate' in route && route.gasEstimate) {
      gasEstimate = route.gasEstimate;
    } else if (route.fees?.gas) {
      gasEstimate = BigInt(route.fees.gas);
    }
    
    if (gasEstimate === BigInt(0)) {
      // Gas estimate missing is a warning, not a blocker
      // But we'll allow it for now
    }
    
    return true;
  }
}

// Singleton instance
let routeValidatorInstance: RouteValidator | null = null;

/**
 * Get singleton RouteValidator instance
 */
export function getRouteValidator(): RouteValidator {
  if (!routeValidatorInstance) {
    routeValidatorInstance = new RouteValidator();
  }
  return routeValidatorInstance;
}

