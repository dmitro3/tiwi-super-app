/**
 * Wallet Connection Module
 * 
 * Pure functions for connecting to wallet providers
 */

import type { WalletChain, WalletAccount } from './types';

/**
 * Get wallet instance for a specific chain
 */
export const getWalletForChain = async (
  providerId: string,
  chain: WalletChain
): Promise<any> => {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  switch (chain) {
    case 'solana': {
      const win = window as any;
      
      // Check for specific wallets first
      if (providerId === 'phantom' && win.phantom?.solana) {
        return win.phantom.solana;
      }
      if (providerId === 'solflare') {
        // Solflare can be at window.solflare or window.solflare.solana
        if (win.solflare?.solana) {
          return win.solflare.solana;
        }
        if (win.solflare) {
          return win.solflare;
        }
      }
      if (providerId === 'backpack' && win.backpack) {
        return win.backpack;
      }
      if (providerId === 'glow' && win.glow) {
        return win.glow;
      }
      if (providerId === 'slope' && win.Slope) {
        return win.Slope;
      }
      if (providerId === 'nightly' && win.nightly) {
        return win.nightly;
      }
      if (providerId === 'jupiter' && win.jupiter) {
        return win.jupiter;
      }
      if (providerId === 'torus' && win.torus) {
        return win.torus;
      }
      
      // Generic Solana provider fallback
      if (win.solana) {
        return win.solana;
      }
      
      throw new Error(`Solana wallet not found for provider: ${providerId}`);
    }

    case 'ethereum': {
      // DIRECTLY return the selected wallet provider - no double checking or fallbacks
      // Check for wallets with separate window objects first
      const win = window as any;
      if (providerId === 'phantom' && win.phantom?.ethereum) {
        return win.phantom.ethereum;
      }
      if (providerId === 'okx' && (win.okxwallet || win.okxWallet)) {
        return win.okxwallet || win.okxWallet;
      }
      if (providerId === 'binance' && (win.BinanceChain || win.binanceChain)) {
        return win.BinanceChain || win.binanceChain;
      }
      if (providerId === 'rabby' && win.rabby) {
        return win.rabby;
      }
      if (providerId === 'trust' && (win.trustwallet || win.trustWallet)) {
        return win.trustwallet || win.trustWallet;
      }
      
      // Check for EIP-6963 providers array (multiple wallets installed)
      const ethereum = (window as any).ethereum;
      if (ethereum?.providers && Array.isArray(ethereum.providers)) {
        // CRITICAL: Check Rabby FIRST - Rabby sets isMetaMask=true for compatibility
        // Always check isRabby FIRST before isMetaMask to get the correct provider
        if (providerId === 'rabby') {
          // Find provider where isRabby or rdns/name clearly indicate Rabby
          const rabbyProvider = ethereum.providers.find((p: any) =>
            p.isRabby === true ||
            (p.info?.rdns || '').toLowerCase().includes('rabby') ||
            (p.info?.name || '').toLowerCase().includes('rabby')
          );
          if (rabbyProvider) return rabbyProvider;
        } else if (providerId === 'metamask') {
          // MetaMask detection - prioritize rdns/name (most reliable), then fallback to isMetaMask property
          // Always exclude Rabby and OKX which masquerade as MetaMask
          let metamaskProvider = ethereum.providers.find((p: any) => {
            const rdns = (p.info?.rdns || '').toLowerCase();
            const name = (p.info?.name || '').toLowerCase();
            // First priority: rdns clearly indicates MetaMask (most reliable)
            const hasMetaMaskRdns = rdns.includes('metamask') || rdns.includes('io.metamask');
            if (hasMetaMaskRdns && !rdns.includes('rabby') && !rdns.includes('okx')) {
              return true;
            }
            // Second priority: name clearly indicates MetaMask
            if (name.includes('metamask') && !name.includes('rabby') && !name.includes('okx')) {
              return true;
            }
            // Third priority: isMetaMask property, but exclude Rabby and OKX
            if (p.isMetaMask === true && 
                p.isRabby !== true && 
                p.isOkxWallet !== true &&
                !rdns.includes('rabby') &&
                !rdns.includes('okx') &&
                !name.includes('rabby') &&
                !name.includes('okx')) {
              return true;
            }
            return false;
          });
          if (metamaskProvider) return metamaskProvider;
        } else if (providerId === 'coinbase') {
          const provider = ethereum.providers.find((p: any) => p.isCoinbaseWallet);
          if (provider) return provider;
        } else if (providerId === 'brave') {
          const provider = ethereum.providers.find((p: any) => p.isBraveWallet);
          if (provider) return provider;
        } else if (providerId === 'binance') {
          // Binance Wallet - check by rdns, name, or specific properties
          const binanceProvider = ethereum.providers.find((p: any) => {
            const rdns = (p.info?.rdns || '').toLowerCase();
            const name = (p.info?.name || '').toLowerCase();
            return rdns.includes('binance') || 
                   name.includes('binance') ||
                   p.isBinance === true ||
                   p.isBinanceWallet === true;
          });
          if (binanceProvider) return binanceProvider;
          // Also check window.BinanceChain directly (Binance's own provider)
          if ((window as any).BinanceChain) {
            return (window as any).BinanceChain;
          }
        } else if (providerId === 'trust') {
          // Trust Wallet - check by property, rdns, and name
          const trustProvider = ethereum.providers.find((p: any) => {
            const rdns = (p.info?.rdns || '').toLowerCase();
            const name = (p.info?.name || '').toLowerCase();
            return p.isTrust === true || 
                   p.isTrustWallet === true ||
                   rdns.includes('trust') ||
                   name.includes('trust');
          });
          if (trustProvider) return trustProvider;
        } else if (providerId === 'okx') {
          // OKX Wallet - check by property, rdns, and name
          const okxProvider = ethereum.providers.find((p: any) => {
            const rdns = (p.info?.rdns || '').toLowerCase();
            const name = (p.info?.name || '').toLowerCase();
            return p.isOkxWallet === true ||
                   rdns.includes('okx') ||
                   name.includes('okx');
          });
          if (okxProvider) return okxProvider;
        } else if (providerId === 'zerion') {
          const provider = ethereum.providers.find((p: any) => p.isZerion);
          if (provider) return provider;
        } else if (providerId === 'tokenpocket') {
          const provider = ethereum.providers.find((p: any) => p.isTokenPocket);
          if (provider) return provider;
        } else if (providerId === 'bitkeep') {
          const provider = ethereum.providers.find((p: any) => p.isBitKeep);
          if (provider) return provider;
        } else if (providerId === 'mathwallet') {
          const provider = ethereum.providers.find((p: any) => p.isMathWallet);
          if (provider) return provider;
        } else if (providerId === 'frame') {
          const provider = ethereum.providers.find((p: any) => p.isFrame);
          if (provider) return provider;
        } else if (providerId === 'frontier') {
          const provider = ethereum.providers.find((p: any) => p.isFrontier);
          if (provider) return provider;
        } else if (providerId === 'tokenary') {
          const provider = ethereum.providers.find((p: any) => p.isTokenary);
          if (provider) return provider;
        }
        
        // NO FALLBACKS - if wallet not found in providers array, fall through to single-provider detection
        // This ensures each wallet uses its own provider and doesn't get routed to wrong wallets
      }
      
      // Single provider case - check window.ethereum directly
      if (ethereum) {
        // CRITICAL: Check Rabby FIRST - always check isRabby before isMetaMask
        if (providerId === 'rabby' && ethereum.isRabby === true) {
          return ethereum;
        }
        // CRITICAL: Check OKX before MetaMask - OKX also masquerades as MetaMask
        if (providerId === 'okx' && ethereum.isOkxWallet === true) {
          return ethereum;
        }
        // MetaMask: Check for MetaMask-specific properties first (most reliable), then isMetaMask property
        if (providerId === 'metamask') {
          // Check MetaMask-specific properties first (most reliable indicator)
          if (ethereum._metamask !== undefined || ethereum._state !== undefined) {
            return ethereum;
          }
          // Fallback to isMetaMask property, but exclude Rabby and OKX
          if (ethereum.isMetaMask === true && 
              ethereum.isRabby !== true && 
              ethereum.isOkxWallet !== true) {
            return ethereum;
          }
        }
        if (providerId === 'coinbase' && ethereum.isCoinbaseWallet) {
          return ethereum;
        }
        if (providerId === 'brave' && ethereum.isBraveWallet && !ethereum.isMetaMask) {
          return ethereum;
        }
        if (providerId === 'binance') {
          // Binance Wallet - check window.BinanceChain directly (its own provider)
          if ((window as any).BinanceChain) {
            return (window as any).BinanceChain;
          }
          // Also check if ethereum has Binance properties
          if (ethereum.isBinance || ethereum.isBinanceWallet) {
            return ethereum;
          }
        }
        if (providerId === 'trust') {
          // Trust Wallet - check window.trustwallet directly first
          if (win.trustwallet || win.trustWallet) {
            return win.trustwallet || win.trustWallet;
          }
          // Also check if ethereum has Trust properties
          if (ethereum.isTrust === true || ethereum.isTrustWallet === true) {
            return ethereum;
          }
        }
        if (providerId === 'okx') {
          // OKX Wallet - check window.okxwallet directly first
          if (win.okxwallet || win.okxWallet) {
            return win.okxwallet || win.okxWallet;
          }
          // Also check if ethereum has OKX properties
          if (ethereum.isOkxWallet === true) {
            return ethereum;
          }
        }
        if (providerId === 'zerion' && ethereum.isZerion) {
          return ethereum;
        }
        if (providerId === 'tokenpocket' && ethereum.isTokenPocket) {
          return ethereum;
        }
        if (providerId === 'bitkeep' && ethereum.isBitKeep) {
          return ethereum;
        }
        if (providerId === 'mathwallet' && ethereum.isMathWallet) {
          return ethereum;
        }
        if (providerId === 'frame' && ethereum.isFrame) {
          return ethereum;
        }
        if (providerId === 'frontier' && ethereum.isFrontier) {
          return ethereum;
        }
        if (providerId === 'tokenary' && ethereum.isTokenary) {
          return ethereum;
        }
        if (providerId === 'ethereum') {
          return ethereum;
        }
      }
      
      // NO FALLBACKS - throw error if wallet not found
      // Each wallet must use its own provider, no routing through other wallets
      throw new Error(`Wallet provider "${providerId}" not found`);
    }

    default:
      throw new Error(`Unsupported chain: ${chain}`);
  }
};

/**
 * Connect to wallet for a specific chain
 */
export const connectWallet = async (
  providerId: string,
  chain: WalletChain
): Promise<WalletAccount> => {
  const wallet = await getWalletForChain(providerId, chain);

  // Verify we got the correct wallet provider before connecting
  if (chain === 'ethereum' && wallet) {
    // For MetaMask, verify it's actually MetaMask and not OKX or Rabby
    if (providerId === 'metamask') {
      if (wallet.isOkxWallet === true) {
        console.error('[connectWallet] ERROR: Got OKX wallet instead of MetaMask!', {
          providerId,
          walletProps: {
            isOkxWallet: wallet.isOkxWallet,
            isRabby: wallet.isRabby,
            isMetaMask: wallet.isMetaMask,
            _metamask: wallet._metamask,
            rdns: (wallet as any).info?.rdns,
            name: (wallet as any).info?.name,
          }
        });
        throw new Error('MetaMask connection failed: OKX wallet detected instead of MetaMask. Please ensure MetaMask is installed and enabled.');
      }
      if (wallet.isRabby === true) {
        console.error('[connectWallet] ERROR: Got Rabby wallet instead of MetaMask!', {
          providerId,
          walletProps: {
            isOkxWallet: wallet.isOkxWallet,
            isRabby: wallet.isRabby,
            isMetaMask: wallet.isMetaMask,
            _metamask: wallet._metamask,
            rdns: (wallet as any).info?.rdns,
            name: (wallet as any).info?.name,
          }
        });
        throw new Error('MetaMask connection failed: Rabby wallet detected instead of MetaMask. Please ensure MetaMask is installed and enabled.');
      }
      // Verify it's actually MetaMask by checking MetaMask-specific properties
      const isActuallyMetaMask = wallet._metamask !== undefined || 
                                  wallet._state !== undefined || 
                                  (wallet.isMetaMask === true && wallet.isRabby !== true && wallet.isOkxWallet !== true);
      if (!isActuallyMetaMask) {
        console.error('[connectWallet] ERROR: Provider is not MetaMask!', {
          providerId,
          walletProps: {
            isOkxWallet: wallet.isOkxWallet,
            isRabby: wallet.isRabby,
            isMetaMask: wallet.isMetaMask,
            _metamask: wallet._metamask,
            rdns: (wallet as any).info?.rdns,
            name: (wallet as any).info?.name,
          }
        });
        throw new Error('MetaMask connection failed: Provider is not MetaMask. Please ensure MetaMask is installed and enabled.');
      }
      console.log('[connectWallet] Verified MetaMask provider:', {
        isMetaMask: wallet.isMetaMask,
        _metamask: wallet._metamask,
        rdns: (wallet as any).info?.rdns,
        name: (wallet as any).info?.name,
      });
    }
    // For OKX, verify it's actually OKX
    if (providerId === 'okx' && wallet.isOkxWallet !== true) {
      throw new Error('OKX wallet connection failed: Provider is not OKX');
    }
    // For Rabby, verify it's actually Rabby
    if (providerId === 'rabby' && wallet.isRabby !== true) {
      throw new Error('Rabby wallet connection failed: Provider is not Rabby');
    }
  }

  try {
    switch (chain) {
      case 'solana':
        // For ALL Solana wallets, always disconnect first to ensure fresh connection prompt
        // This prevents using cached connections and forces user approval every time
        if (wallet.disconnect) {
          try {
            await wallet.disconnect();
            // Wait a bit to ensure disconnect completes
            await new Promise(resolve => setTimeout(resolve, 300));
          } catch (error) {
            // Ignore disconnect errors - wallet might not be connected, which is fine
            console.warn('Error disconnecting wallet before reconnect (this is OK):', error);
          }
        }
        
        // Now connect - this will always prompt for user approval since we disconnected first
        const response = await wallet.connect();
        
        // Handle different response formats from Solana wallets
        let publicKey;
        if (response?.publicKey) {
          // Standard format: { publicKey: PublicKey }
          publicKey = response.publicKey;
        } else if (response && typeof response === 'object' && 'toString' in response) {
          // Direct PublicKey object
          publicKey = response;
        } else if (wallet.publicKey) {
          // Wallet already has publicKey property
          publicKey = wallet.publicKey;
        } else {
          throw new Error('Failed to get public key from wallet connection');
        }
        
        // Convert to string
        const address = typeof publicKey === 'string' ? publicKey : publicKey.toString();
        
        if (!address) {
          throw new Error('Failed to get wallet address');
        }
        
        return {
          address,
          chain: 'solana',
          provider: providerId,
        };

      case 'ethereum':
        // For Phantom Ethereum, disconnect first to ensure fresh connection prompt
        // This ensures the user can select which account to connect
        if (providerId === 'phantom') {
          // Disconnect Phantom Ethereum first to force fresh connection
          try {
            // Phantom Ethereum doesn't have a disconnect method, but we can revoke permissions
            const permissions = await wallet.request({
              method: 'wallet_getPermissions',
            });
            
            if (permissions && permissions.length > 0) {
              try {
                await wallet.request({
                  method: 'wallet_revokePermissions',
                  params: [{ eth_accounts: {} }],
                });
                // Wait a bit to ensure revoke completes
                await new Promise(resolve => setTimeout(resolve, 300));
              } catch (error) {
                // Ignore revoke errors - wallet might not support it
                console.warn('Error revoking Phantom Ethereum permissions (this is OK):', error);
              }
            }
          } catch (error) {
            // Ignore errors - wallet might not be connected
            console.warn('Error checking Phantom Ethereum permissions (this is OK):', error);
          }
          
          // Now request accounts - this will prompt for user approval
          const accounts = await wallet.request({ method: 'eth_requestAccounts' });
          
          if (!accounts || accounts.length === 0) {
            throw new Error('User rejected connection or no accounts returned');
          }
          
          return {
            address: accounts[0],
            chain: chain,
            provider: providerId,
          };
        }
        
        // For other EVM wallets, force fresh authentication by revoking permissions
        try {
          const permissions = await wallet.request({
            method: 'wallet_getPermissions',
          });
          
          if (permissions && permissions.length > 0) {
            try {
              await wallet.request({
                method: 'wallet_revokePermissions',
                params: [{ eth_accounts: {} }]
              });
              await new Promise(resolve => setTimeout(resolve, 100));
            } catch (revokeError) {
              // Some wallets don't support revokePermissions - that's okay
            }
          }
        } catch (e) {
          // Ignore permission check errors
        }
        
        // Always use eth_requestAccounts which prompts for approval
        const accounts = await wallet.request({ method: 'eth_requestAccounts' });
        
        if (!accounts || accounts.length === 0) {
          throw new Error('User rejected connection or no accounts returned');
        }
        
        // CRITICAL: Detect the actual wallet provider after connection
        // This is important because some wallets masquerade as MetaMask (Rabby, OKX, Trust Wallet)
        // We need to detect the actual wallet to show the correct icon
        const detectedProviderId = await detectWalletFromProvider(providerId, chain, wallet);
        
        // Map detected provider ID back to wallet ID for consistency
        // Import mapProviderIdToWalletId at the top of the file
        const { mapProviderIdToWalletId } = await import('../utils/wallet-id-mapper');
        const finalWalletId = detectedProviderId 
          ? mapProviderIdToWalletId(detectedProviderId) 
          : providerId;
        
        console.log('[connectWallet] Wallet detection result:', {
          requestedProviderId: providerId,
          detectedProviderId,
          finalWalletId,
          walletProps: {
            isRabby: wallet.isRabby,
            isTrust: wallet.isTrust || wallet.isTrustWallet,
            isMetaMask: wallet.isMetaMask,
            isOkxWallet: wallet.isOkxWallet,
          }
        });
        
        return {
          address: accounts[0],
          chain: chain,
          provider: finalWalletId, // Use detected wallet ID (e.g., 'rabby', 'trust-wallet', not 'metamask')
        };

      default:
        throw new Error(`Unsupported chain: ${chain}`);
    }
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('User rejected the connection request');
    }
    throw error;
  }
};

/**
 * Get connected account for a specific chain
 * Note: This only checks if a wallet is already connected, it does NOT prompt for connection
 * Use connectWallet() to establish a new connection with user approval
 */
export const getConnectedAccount = async (
  providerId: string,
  chain: WalletChain
): Promise<WalletAccount | null> => {
  try {
    const wallet = await getWalletForChain(providerId, chain);

    switch (chain) {
      case 'solana':
        // Check if wallet is connected (read-only check, no prompt)
        if (wallet.isConnected && wallet.publicKey) {
          return {
            address: (typeof wallet.publicKey === 'string' ? wallet.publicKey : wallet.publicKey.toString()),
            chain: 'solana',
            provider: providerId,
          };
        }
        return null;

      case 'ethereum':
        // Check for selected address (read-only check, no prompt)
        if (wallet.selectedAddress) {
          return {
            address: wallet.selectedAddress,
            chain: chain,
            provider: providerId,
          };
        }
        // Try eth_accounts (read-only, doesn't prompt)
        // This only returns accounts if already connected, won't trigger popup
        try {
          const accounts = await wallet.request({ method: 'eth_accounts' });
          if (accounts && accounts.length > 0) {
            return {
              address: accounts[0],
              chain: chain,
              provider: providerId,
            };
          }
        } catch {
          // Not connected
        }
        return null;

      default:
        return null;
    }
  } catch {
    return null;
  }
};

/**
 * Disconnect wallet for a specific chain
 */
export const disconnectWallet = async (
  providerId: string,
  chain: WalletChain
): Promise<void> => {
  try {
    const wallet = await getWalletForChain(providerId, chain);

    switch (chain) {
      case 'solana':
        if (wallet.disconnect) {
          await wallet.disconnect();
        }
        break;

      case 'ethereum':
        // Try multiple methods to ensure complete disconnection
        try {
          // Method 1: Revoke permissions (most reliable for preventing auto-reconnection)
          await wallet.request({
            method: 'wallet_revokePermissions',
            params: [{ eth_accounts: {} }]
          });
        } catch (revokeError) {
          // Some wallets don't support revokePermissions - that's okay
          console.warn('[disconnectWallet] wallet_revokePermissions not supported, trying alternative methods');
        }
        
        // Method 2: Try to disconnect if the wallet has a disconnect method
        try {
          if (typeof wallet.disconnect === 'function') {
            await wallet.disconnect();
          }
        } catch (disconnectError) {
          // Not all wallets have disconnect method
          console.warn('[disconnectWallet] Wallet disconnect method not available');
        }
        
        // Method 3: Clear any cached connection state
        try {
          if (wallet.removeAllListeners) {
            wallet.removeAllListeners();
          }
        } catch (clearError) {
          // Ignore errors
        }
        break;
    }
  } catch (error) {
    console.error('Error disconnecting wallet:', error);
  }
};

// Removed detectCurrentWallet - this is detection logic, not connection logic
// Use detection module instead

/**
 * Detect wallet name from a wallet provider instance
 * Used after connecting to verify which wallet was actually connected
 */
export const detectWalletFromProvider = async (
  providerId: string,
  chain: WalletChain,
  wallet: any
): Promise<string | null> => {
  if (chain === 'ethereum') {
    // For EVM wallets, detect from the actual provider
    // IMPORTANT: Check in order of specificity (most specific first)
    // This ensures wallets that masquerade as others are detected correctly
    try {
      // 1. Rabby - sets isMetaMask=true for compatibility, so check FIRST
      if (wallet.isRabby === true) {
        return "rabby";
      }
      
      // 2. OKX - also sets isMetaMask=true, check before MetaMask
      if (wallet.isOkxWallet === true) {
        return "okx";
      }
      
      // 3. Trust Wallet - check before MetaMask
      if (wallet.isTrust === true || wallet.isTrustWallet === true) {
        return "trust";
      }
      
      // 4. Brave Wallet - check before MetaMask (can have isMetaMask=true)
      if (wallet.isBraveWallet === true && wallet.isMetaMask !== true) {
        return "brave";
      }
      
      // 5. Coinbase Wallet
      if (wallet.isCoinbaseWallet === true || wallet.isCoinbaseBrowser === true) {
        return "coinbase";
      }
      
      // 6. Binance Wallet
      if (wallet.isBinance === true || wallet.isBinanceWallet === true) {
        return "binance";
      }
      
      // 7. Zerion
      if (wallet.isZerion === true) {
        return "zerion";
      }
      
      // 8. TokenPocket
      if (wallet.isTokenPocket === true) {
        return "tokenpocket";
      }
      
      // 9. BitKeep
      if (wallet.isBitKeep === true) {
        return "bitkeep";
      }
      
      // 10. MathWallet
      if (wallet.isMathWallet === true) {
        return "mathwallet";
      }
      
      // 11. Frame
      if (wallet.isFrame === true) {
        return "frame";
      }
      
      // 12. Frontier
      if (wallet.isFrontier === true) {
        return "frontier";
      }
      
      // 13. Tokenary
      if (wallet.isTokenary === true) {
        return "tokenary";
      }
      
      // 14. MetaMask - check LAST after excluding masquerading wallets
      // Only return MetaMask if it's actually MetaMask and NOT Rabby/OKX/Trust
      if (wallet.isMetaMask === true && 
          wallet.isRabby !== true && 
          wallet.isOkxWallet !== true &&
          wallet.isTrust !== true &&
          wallet.isTrustWallet !== true) {
        return "metamask";
      }
      
      // 15. Fallback: Check wallet.info for rdns/name if available
      // This helps detect wallets that don't set standard properties
      if (wallet.info) {
        const rdns = (wallet.info.rdns || '').toLowerCase();
        const name = (wallet.info.name || '').toLowerCase();
        
        // Check for specific wallets by rdns/name
        if (rdns.includes('rabby') || name.includes('rabby')) {
          return "rabby";
        }
        if (rdns.includes('okx') || name.includes('okx')) {
          return "okx";
        }
        if (rdns.includes('trust') || name.includes('trust')) {
          return "trust";
        }
        if (rdns.includes('metamask') || name.includes('metamask')) {
          // Only if not Rabby/OKX/Trust
          if (!rdns.includes('rabby') && !rdns.includes('okx') && !rdns.includes('trust')) {
            return "metamask";
          }
        }
        if (rdns.includes('coinbase') || name.includes('coinbase')) {
          return "coinbase";
        }
        if (rdns.includes('brave') || name.includes('brave')) {
          return "brave";
        }
        if (rdns.includes('binance') || name.includes('binance')) {
          return "binance";
        }
      }
      
      // 16. Final fallback: return the requested providerId
      // This handles wallets that don't set detection properties
      return providerId;
    } catch (error) {
      console.warn('[detectWalletFromProvider] Error during detection, using providerId:', error);
      // Fallback to providerId if detection fails
      return providerId;
    }
  } else if (chain === 'solana') {
    // For Solana wallets, use the provider ID directly
    // Solana wallets are typically more straightforward and don't masquerade
    return providerId;
  } else {
    // For other chains, use provider ID
    return providerId;
  }
};

