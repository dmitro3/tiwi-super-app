# Reverse Routing Parameter Analysis

## Issue Summary
Two errors occurring with reverse routing swaps:
1. **"Invalid path" error** - First attempt
2. **"Insufficient output balance" error** - Second attempt

## Function Signature Analysis

The function `swapExactTokensForETHSupportingFeeOnTransferTokens` correctly takes 2 amount parameters:
```typescript
args = [BigInt(amountIn), BigInt(amountOutMin), pathAddresses, recipientAddress, deadlineBigInt]
```

This is CORRECT - the function signature requires 2 amount params.

## Current Parameter Flow

### 1. amountIn (Input Amount)
**Location**: Line 732 - passed to `buildSwapData(route, amountInSmallestUnit, ...)`

**Current Logic**:
- **Line 278-281**: For reverse routing getAmountsOut, uses `route.toToken.amount` ✅
- **Line 361**: After path flip, updates to `route.fromToken.amount` ✅
- **Issue**: This is CORRECT - `amountIn` should be `route.fromToken.amount` for swap

### 2. amountOutMin (Minimum Output)
**Location**: Line 733 - passed to `buildSwapData(..., amountOutMin.toString(), ...)`

**Current Logic**:
- **Lines 625-632**: Uses conservative calculation (0.01% or 0.1% of targetOutputAmount)
- **Issue**: For reverse routing, user wants RAW output amount, not conservative calculation

**User Requirement**: 
> "we are to send the raw outamount not the rounded one"
> "for the reverse routing note that the param we are sending to the frontend is the user's desired outputAmount"

### 3. Path
**Location**: Line 165 in `pancakeswap-executor.ts` - uses `route.raw?.path`

**Current Logic**:
- **Line 351**: Path is flipped after getAmountsOut succeeds ✅
- **Line 354**: `route.raw.path` is updated with flipped path ✅
- **Issue**: Need to verify path is correctly flipped before buildSwapData

## Error Analysis

### Error 1: "Invalid path"
**First attempt params**:
```json
{
  "amountIn": 1109257329837227,
  "amountOutMin": 110925732000,  // Very small (0.01% of something)
  "path": ["0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c", "0xDA1060158F7D593667cCE0a15DB346BB3FfB3596"]
}
```

**Analysis**:
- Path appears REVERSED (WBNB → TWC) - should be TWC → WBNB for swap
- `amountIn` looks correct (large value)
- `amountOutMin` is very small (conservative calculation)

**Possible Causes**:
1. Path not flipped correctly before buildSwapData
2. Path validation failing
3. Wrong token order in path

### Error 2: "Insufficient output balance"
**Second attempt params**:
```json
{
  "amountIn": 1109257329837227,
  "amountOutMin": 231000000000000,  // Much larger (raw output?)
  "path": ["0xDA1060158F7D593667cCE0a15DB346BB3FfB3596", "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"]
}
```

**Analysis**:
- Path is CORRECT (TWC → WBNB) ✅
- `amountIn` looks correct ✅
- `amountOutMin` is much larger (231000000000000) - this might be the raw output
- Error: "Insufficient output balance" means `amountOutMin > actualAmountOut`

**Possible Causes**:
1. `amountOutMin` set too high (exceeds what we can actually get)
2. Market moved between quote and execution
3. Using wrong amount for `amountOutMin` (should be raw output, not user desired)

## Root Causes

### Issue 1: amountOutMin Calculation for Reverse Routing
**Problem**: Using conservative calculation (0.01% or 0.1%) instead of raw output
**Location**: Lines 625-632
**Fix Needed**: For reverse routing, use `actualAmountOut` (raw output from getAmountsOut)

### Issue 2: Path Flipping Timing
**Problem**: Need to verify path is flipped before all swap operations
**Location**: Line 351 (path flip), Line 165 (buildSwapData uses route.raw.path)
**Fix Needed**: Ensure path is flipped and route.raw.path is updated before buildSwapData

### Issue 3: amountOutMin Validation
**Problem**: `amountOutMin` might exceed `actualAmountOut` for reverse routing
**Location**: Lines 694-700
**Fix Needed**: For reverse routing, ensure `amountOutMin <= actualAmountOut`

## Proposed Fixes

### Fix 1: Use Raw Output for Reverse Routing amountOutMin
**Location**: Lines 619-632
**Change**: For reverse routing, use `actualAmountOut` directly instead of conservative calculation

### Fix 2: Ensure Path is Flipped Before All Operations
**Location**: Verify path flip happens before:
- Multi-hop simulation (line 663)
- buildSwapData (line 730)
- Path validation (line 463)

### Fix 3: Add amountOutMin Validation for Reverse Routing
**Location**: Lines 694-700
**Change**: For reverse routing, cap `amountOutMin` at `actualAmountOut` (raw output)

## Code Locations to Fix

1. **Line 619-632**: amountOutMin calculation - add reverse routing special case
2. **Line 351-367**: Path flip - verify it happens before all swap operations
3. **Line 694-700**: Final safeguard - ensure amountOutMin doesn't exceed actualAmountOut
4. **Line 663**: Multi-hop simulation - verify uses flipped path
5. **Line 730**: buildSwapData - verify uses flipped path from route.raw.path

