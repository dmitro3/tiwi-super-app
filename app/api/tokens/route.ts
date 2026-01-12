/**
 * Tokens API Route (for wallet balances)
 * 
 * Endpoint: GET /api/tokens?address={address}&chain={chain}
 * 
 * Fetches token balances for a wallet address on a specific chain using Moralis.
 * This matches the pattern used in the sample code for accurate token fetching.
 * Supports ALL chains that Moralis supports.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getWalletTokensWithPrices } from '@/lib/backend/providers/moralis-rest-client';

// Map Moralis chain names to chain IDs (matching CHAIN_NAME_MAP from moralis-rest-client)
// This includes ALL chains supported by Moralis
const MORALIS_CHAIN_TO_ID: Record<string, number> = {
  'eth': 1,
  'optimism': 10,
  'bsc': 56,
  'polygon': 137,
  'arbitrum': 42161,
  'avalanche': 43114,
  'base': 8453,
  'fantom': 250,
  'gnosis': 100,
  'polygon-zkevm': 1101,
  'zksync': 324,
  'mantle': 5000,
  'linea': 59144,
  'scroll': 534352,
};

export async function GET(req: NextRequest) {
  try {
    const searchParams = req.nextUrl.searchParams;
    const address = searchParams.get('address');
    const chain = searchParams.get('chain');

    // Validate required parameters
    if (!address) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameter: address' 
        },
        { status: 400 }
      );
    }

    if (!chain) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Missing required parameter: chain' 
        },
        { status: 400 }
      );
    }

    // Validate address format (Ethereum address)
    if (!address.startsWith('0x') || address.length !== 42) {
      return NextResponse.json(
        { 
          success: false,
          error: 'Invalid address format' 
        },
        { status: 400 }
      );
    }

    // Validate chain name
    const chainId = MORALIS_CHAIN_TO_ID[chain.toLowerCase()];
    if (!chainId) {
      return NextResponse.json(
        { 
          success: false,
          error: `Unsupported chain: ${chain}. Supported chains: ${Object.keys(MORALIS_CHAIN_TO_ID).join(', ')}` 
        },
        { status: 400 }
      );
    }

    // Fetch tokens from Moralis
    try {
      const response = await getWalletTokensWithPrices(address, chainId);
      
      // Transform Moralis response to match expected format
      // Moralis returns: { result: Token[], cursor: string, page: string, page_size: string }
      const tokenDataArray = response.result || response;
      
      if (!Array.isArray(tokenDataArray)) {
        return NextResponse.json({
          success: true,
          result: [],
        });
      }
      
      // Check if native token is present in the response
      // Native token symbols by chain
      const NATIVE_SYMBOLS: Record<number, string> = {
        1: 'ETH',
        10: 'ETH',
        56: 'BNB',
        137: 'POL',
        42161: 'ETH',
        43114: 'AVAX',
        8453: 'ETH',
        250: 'FTM',
        100: 'xDAI',
        1101: 'ETH',
        324: 'ETH',
        5000: 'MNT',
        59144: 'ETH',
        534352: 'ETH',
      };
      
      const expectedNativeSymbol = NATIVE_SYMBOLS[chainId];
      const hasNativeToken = tokenDataArray.some((token: any) => {
        const isNative = token.native_token === true ||
                        token.token_address === '0x0000000000000000000000000000000000000000' ||
                        token.token_address === '0x0000000000000000000000000000000000001010' ||
                        (!token.token_address && (token.symbol || '').toUpperCase() === expectedNativeSymbol);
        return isNative && BigInt(token.balance || '0') > BigInt(0);
      });
      
      // If native token is missing but should exist, try to fetch it explicitly
      // This handles cases where Moralis doesn't include native token in /wallets/tokens response
      if (!hasNativeToken && expectedNativeSymbol) {
        try {
          const { getEVMNativeBalance } = await import('@/lib/backend/providers/moralis-rest-client');
          const chainHex = `0x${chainId.toString(16)}`;
          const nativeBalanceResponse = await getEVMNativeBalance(address, chainId, chainHex);
          
          // Moralis native balance response format: { balance: string }
          if (nativeBalanceResponse && nativeBalanceResponse.balance) {
            const balanceBigInt = BigInt(nativeBalanceResponse.balance || '0');
            if (balanceBigInt > BigInt(0)) {
              // Calculate USD value if price is available (we'll need to fetch price separately or use 0)
              // For now, set usd_value to 0 - it will be calculated later if needed
              const balanceStr = balanceBigInt.toString();
              const divisor = BigInt(10 ** 18);
              const wholePart = balanceBigInt / divisor;
              const fractionalPart = balanceBigInt % divisor;
              let formattedBalance: string;
              if (fractionalPart === BigInt(0)) {
                formattedBalance = wholePart.toString();
              } else {
                const fractionalStr = fractionalPart.toString().padStart(18, '0');
                const trimmedFractional = fractionalStr.replace(/0+$/, '');
                formattedBalance = trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
              }
              
              // Add native token to the array
              tokenDataArray.push({
                native_token: true,
                token_address: chainId === 137 
                  ? '0x0000000000000000000000000000000000001010'
                  : '0x0000000000000000000000000000000000000000',
                symbol: expectedNativeSymbol,
                name: expectedNativeSymbol,
                balance: balanceStr, // Raw balance string
                decimals: 18,
                usd_price: 0, // Will be fetched/calculated separately if needed
                usd_value: 0, // Will be calculated if price is available
                logo: null,
                thumbnail: null,
                possible_spam: false,
              });
            }
          }
        } catch (nativeError) {
          // If native balance fetch fails, continue without it (non-blocking)
          console.warn(`[API] Failed to fetch native balance for chain ${chainId}:`, nativeError);
        }
      }
      
      // Transform tokens to match the expected format from sample code
      const transformedTokens = tokenDataArray
        .filter((token: any) => {
          // Filter out zero balances and spam tokens
          const rawBalance = token.balance || '0';
          const balanceBigInt = BigInt(rawBalance);
          if (balanceBigInt === BigInt(0)) {
            return false;
          }
          if (token.possible_spam === true) {
            return false;
          }
          return true;
        })
        .map((token: any) => {
          // Determine if this is the native token
          // Moralis can return native tokens in different formats:
          // 1. With native_token: true flag
          // 2. With zero address (0x0000... or 0x1010 for Polygon)
          // 3. With empty/null address AND native token symbol (BNB, ETH, etc.)
          const tokenAddress = token.token_address || '';
          const tokenSymbol = (token.symbol || '').toUpperCase();
          
          const isZeroAddress = tokenAddress === '0x0000000000000000000000000000000000000000' ||
                                tokenAddress === '0x0000000000000000000000000000000000001010'; // Polygon native
          
          const hasEmptyAddress = !tokenAddress || 
                                  tokenAddress === '' ||
                                  tokenAddress === null ||
                                  tokenAddress === undefined;
          
          // Native token symbols by chain
          const NATIVE_SYMBOLS: Record<number, string> = {
            1: 'ETH',
            10: 'ETH',
            56: 'BNB',
            137: 'POL', // Polygon native token is POL, not MATIC
            42161: 'ETH',
            43114: 'AVAX',
            8453: 'ETH',
            250: 'FTM',
            100: 'xDAI',
            1101: 'ETH',
            324: 'ETH',
            5000: 'MNT',
            59144: 'ETH',
            534352: 'ETH',
          };
          
          const expectedNativeSymbol = NATIVE_SYMBOLS[chainId];
          const hasNativeSymbol = expectedNativeSymbol && tokenSymbol === expectedNativeSymbol;
          
          // Treat as native if:
          // 1. Explicitly marked as native_token === true, OR
          // 2. Has zero address, OR
          // 3. Has empty address AND symbol matches native token symbol (Moralis sometimes returns native tokens this way)
          const isNative = token.native_token === true || 
                          isZeroAddress || 
                          (hasEmptyAddress && hasNativeSymbol);
          
          // Get token address (native tokens use zero address, ERC20 tokens use their contract address)
          // If address is empty/null but NOT native, use a placeholder to prevent it from being treated as native
          const finalTokenAddress = isNative 
            ? (chainId === 137 
                ? '0x0000000000000000000000000000000000001010'  // Polygon native
                : '0x0000000000000000000000000000000000000000')  // Other chains native
            : (tokenAddress && tokenAddress !== '' ? tokenAddress : `0x${'0'.repeat(40)}`); // Use provided address, or placeholder if empty
          
          // Calculate formatted balance (using same logic as Moralis provider)
          const rawBalance = token.balance || '0';
          
          // Get decimals (use token decimals or fallback to known decimals)
          let decimals = token.decimals !== undefined && token.decimals !== null
            ? Number(token.decimals)
            : 18;
          
          // Known decimals for common tokens
          const tokenAddressLower = (tokenAddress || '').toLowerCase();
          // tokenSymbol is already defined above in the native token detection section
          
          const KNOWN_DECIMALS: Record<string, number> = {
            '0xdac17f958d2ee523a2206206994597c13d831ec7': 6, // Ethereum USDT
            '0x55d398326f99059ff775485246999027b3197955': 18, // BSC USDT
            '0xc2132d05d31c914a87c6611c10748aeb04b58e8f': 6, // Polygon USDT
            '0xfd086bc7cd5c481dcc9c85ebe478a1c0b69fcbb9': 6, // Arbitrum USDT
            '0x94b008aa00579c1307b0ef2c499ad98a8ce58e58': 6, // Optimism USDT
            '0xa0b86991c6218b36c1d19d4a2e9eb0ce3606eb48': 6, // Ethereum USDC
            '0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d': 18, // BSC USDC
          };
          
          const KNOWN_SYMBOL_DECIMALS: Record<string, number> = {
            'USDT': 6,
            'USDC': 6,
          };
          
          if (KNOWN_DECIMALS[tokenAddressLower]) {
            decimals = KNOWN_DECIMALS[tokenAddressLower];
          } else if (KNOWN_SYMBOL_DECIMALS[tokenSymbol]) {
            // BSC uses 18 decimals for stablecoins
            if ((tokenSymbol === 'USDT' || tokenSymbol === 'USDC') && chainId === 56) {
              decimals = 18;
            } else {
              decimals = KNOWN_SYMBOL_DECIMALS[tokenSymbol];
            }
          }
          
          // Ensure decimals is valid (0-18)
          decimals = Math.max(0, Math.min(18, Math.floor(decimals)));
          
          // Format balance using same logic as Moralis provider
          const balanceBigInt = BigInt(rawBalance);
          const divisor = BigInt(10 ** decimals);
          const wholePart = balanceBigInt / divisor;
          const fractionalPart = balanceBigInt % divisor;
          
          let balance: string;
          if (fractionalPart === BigInt(0)) {
            balance = wholePart.toString();
          } else {
            const fractionalStr = fractionalPart.toString().padStart(decimals, '0');
            const trimmedFractional = fractionalStr.replace(/0+$/, '');
            balance = trimmedFractional ? `${wholePart}.${trimmedFractional}` : wholePart.toString();
          }
          
          // Get USD value and price (Moralis provides these)
          const usdValue = token.usd_value ? parseFloat(String(token.usd_value)) : 0;
          const price = token.usd_price ? parseFloat(String(token.usd_price)) : 0;
          
          // Get chain name for native token display
          const CHAIN_NAMES: Record<number, string> = {
            1: 'Ethereum',
            10: 'Optimism',
            56: 'BSC',
            137: 'Polygon',
            42161: 'Arbitrum',
            43114: 'Avalanche',
            8453: 'Base',
            250: 'Fantom',
            100: 'Gnosis',
            1101: 'Polygon zkEVM',
            324: 'zkSync Era',
            5000: 'Mantle',
            59144: 'Linea',
            534352: 'Scroll',
          };
          
          // Get symbol - use native symbol ONLY if confirmed native, otherwise use token's own symbol
          // NATIVE_SYMBOLS is already defined above in the native token check section
          const symbol = isNative 
            ? (expectedNativeSymbol || 'NATIVE')
            : (token.symbol || token.name || 'UNKNOWN'); // Use token's own symbol/name, not native
          
          // For native tokens, use chain name for clear identification (e.g., "Base" not "ETH")
          // For other tokens, use the token name from Moralis (never use native token name)
          const name = isNative
            ? (CHAIN_NAMES[chainId] || 'Unknown Chain')
            : (token.name || token.symbol || 'Unknown Token'); // Use token's own name/symbol

          return {
            symbol: symbol,
            name: name,
            balance: balance,
            usdValue: usdValue,
            price: price,
            token_address: tokenAddress,
            contract_address: tokenAddress,
            chainId: `0x${chainId.toString(16)}`,
            chainIdNumber: chainId, // Add numeric chainId for easier deduplication
            chain: CHAIN_NAMES[chainId] || 'Unknown Chain', // Add chain name for grouping/display
            logo: token.logo || token.thumbnail || null,
            logoUrl: token.logo || token.thumbnail || null,
          };
        });

      return NextResponse.json({
        success: true,
        result: transformedTokens,
      });
    } catch (moralisError: any) {
      console.error(`[API] /api/tokens Moralis error for chain ${chain}:`, moralisError);
      
      // Return empty result instead of error (allows other chains to continue)
      return NextResponse.json({
        success: true,
        result: [],
        error: moralisError?.message || 'Failed to fetch tokens from Moralis',
      });
    }
  } catch (error: any) {
    console.error('[API] /api/tokens error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to fetch tokens',
        result: [],
      },
      { status: 500 }
    );
  }
}

