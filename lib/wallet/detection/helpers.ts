/**
 * Helper functions for wallet detection
 */

import { SUPPORTED_WALLETS, type SupportedWallet } from './supported-wallets';
import type { WalletProvider, SupportedChain } from './types';

/**
 * Verify that a detected wallet object is actually functional
 * Checks for required methods and properties
 * More strict verification - ensures wallet is actually usable
 */
function verifyWalletFunctionality(walletObj: any, chain: 'ethereum' | 'solana'): boolean {
  if (!walletObj || typeof walletObj !== 'object') {
    return false;
  }
  
  // Additional check: ensure it's not just an empty object or stub
  // Some wallets inject stub objects that have no properties
  const keys = Object.keys(walletObj);
  if (keys.length === 0) {
    return false;
  }
  
  if (chain === 'solana') {
    // Solana wallets need connect method and it must be callable
    if (typeof walletObj.connect !== 'function') {
      return false;
    }
    // Additional verification: check if it has other expected Solana wallet properties
    // Real Solana wallets typically have more than just 'connect'
    // But don't be too strict - some wallets might have minimal APIs
    return true;
  } else if (chain === 'ethereum') {
    // Ethereum wallets need request method and it must be callable
    if (typeof walletObj.request !== 'function') {
      return false;
    }
    // Additional verification: check if it has other expected Ethereum provider properties
    // Real Ethereum providers typically have more than just 'request'
    // But don't be too strict - some wallets might have minimal APIs
    return true;
  }
  
  return false;
}

/**
 * Check if a wallet is installed by directly checking for wallet objects
 * Uses the same strict logic as detectWalletProviders to ensure accuracy
 * Only returns true if the actual wallet extension object exists and is functional
 */
export const isWalletInstalled = (wallet: SupportedWallet): boolean => {
  if (typeof window === 'undefined') return false;
  
  const win = window as any;
  const ethereum = win.ethereum;
  const walletIdLower = wallet.id.toLowerCase().replace(/-wallet$/, '').replace(/-extension$/, '');
  const walletNameLower = (wallet.name || '').toLowerCase();
  
  // === SOLANA WALLETS ===
  // Check for Phantom (supports Solana, Ethereum)
  if (wallet.id === 'phantom' || walletNameLower.includes('phantom')) {
    if (win.phantom) {
      // Phantom must have functional solana or ethereum property
      if (wallet.supportedChains.includes('solana') && win.phantom.solana) {
        if (verifyWalletFunctionality(win.phantom.solana, 'solana')) {
          return true;
        }
      }
      if (wallet.supportedChains.includes('ethereum') && win.phantom.ethereum) {
        if (verifyWalletFunctionality(win.phantom.ethereum, 'ethereum')) {
          return true;
        }
      }
    }
    return false; // Phantom not found or not functional
  }
  
  // Check for Solflare (Solana)
  if (walletIdLower.includes('solflare') || walletNameLower.includes('solflare')) {
    const solflare = win.solflare?.solana || win.solflare;
    if (solflare && verifyWalletFunctionality(solflare, 'solana')) {
      return true;
    }
    // Also check via solana property
    if (win.solana?.isSolflare && verifyWalletFunctionality(win.solana, 'solana')) {
      return true;
    }
    return false;
  }
  
  // Check for Backpack (Solana)
  if (walletIdLower.includes('backpack') || walletNameLower.includes('backpack')) {
    const backpack = win.backpack?.solana || win.backpack;
    if (backpack && verifyWalletFunctionality(backpack, 'solana')) {
      return true;
    }
    return false;
  }
  
  // Check for Glow (Solana)
  if (walletIdLower.includes('glow') || walletNameLower.includes('glow')) {
    const glow = win.glow?.solana || win.glow;
    if (glow && verifyWalletFunctionality(glow, 'solana')) {
      return true;
    }
    return false;
  }
  
  // Check for Slope (Solana)
  if (walletIdLower.includes('slope') || walletNameLower.includes('slope')) {
    const slope = win.Slope?.solana || win.Slope || win.slope?.solana || win.slope;
    if (slope && verifyWalletFunctionality(slope, 'solana')) {
      return true;
    }
    return false;
  }
  
  // Check for Nightly (Solana)
  if (walletIdLower.includes('nightly') || walletNameLower.includes('nightly')) {
    const nightly = win.nightly?.solana || win.nightly;
    if (nightly && verifyWalletFunctionality(nightly, 'solana')) {
      return true;
    }
    return false;
  }
  
  // Check for Jupiter (Solana)
  if (walletIdLower.includes('jupiter') || walletNameLower.includes('jupiter')) {
    const jupiter = win.jupiter?.solana || win.jupiter;
    if (jupiter && verifyWalletFunctionality(jupiter, 'solana')) {
      return true;
    }
    return false;
  }
  
  // Check for Torus (Solana)
  if (walletIdLower.includes('torus') || walletNameLower.includes('torus')) {
    if (win.torus && verifyWalletFunctionality(win.torus, 'solana')) {
      return true;
    }
    return false;
  }
  
  // Generic Solana wallet (only if not already detected as specific wallet)
  if (wallet.supportedChains.includes('solana') && 
      !win.phantom && 
      !win.solflare && 
      !win.backpack &&
      !win.glow &&
      !win.Slope &&
      !win.slope &&
      !win.nightly &&
      !win.jupiter &&
      !win.torus) {
    if (win.solana && verifyWalletFunctionality(win.solana, 'solana')) {
      return true;
    }
  }
  
  // Method 2: EIP-6963 providers array (for EVM wallets)
  if (wallet.supportedChains.includes('ethereum') && ethereum?.providers && Array.isArray(ethereum.providers)) {
    for (const provider of ethereum.providers) {
      // Verify provider has required methods
      if (!verifyWalletFunctionality(provider, 'ethereum')) {
        continue;
      }
      
      const rdns = (provider.info?.rdns || '').toLowerCase();
      const displayName = (provider.info?.name || '').toLowerCase();
      const uuid = (provider.info?.uuid || '').toLowerCase();
      
      // Check wallet-specific boolean properties (most reliable)
      // Only return true if provider is verified as functional
      
      // MetaMask detection - COMPLETELY INDEPENDENT from other wallets
      if (walletIdLower.includes('metamask') || walletNameLower.includes('metamask')) {
        // Check rdns first (most reliable for MetaMask)
        const hasMetaMaskRdns = rdns.includes('metamask') || rdns.includes('io.metamask') || rdns.includes('io.metamask.extension');
        if (hasMetaMaskRdns && verifyWalletFunctionality(provider, 'ethereum')) {
          return true;
        }
        
        // Check display name
        const hasMetaMaskName = displayName.includes('metamask');
        if (hasMetaMaskName && verifyWalletFunctionality(provider, 'ethereum')) {
          return true;
        }
        
        // Check isMetaMask property - but ONLY if it's NOT Rabby, NOT Trust Wallet, and NOT OKX
        // Rabby and OKX set isMetaMask=true for compatibility, so we need to exclude them
        const isMetaMask = provider.isMetaMask === true;
        const isRabby = provider.isRabby === true;
        const isTrust = provider.isTrust === true || provider.isTrustWallet === true;
        const isOkx = provider.isOkxWallet === true;
        // rdns and displayName are already lowercase from lines 170-171
        const isOkxByInfo = rdns.includes('okx') || displayName.includes('okx');
        const isRabbyByInfo = rdns.includes('rabby') || displayName.includes('rabby');
        
        // Only accept isMetaMask if it's NOT Rabby, NOT Trust Wallet, and NOT OKX
        // Prioritize rdns/name checks over isMetaMask property for reliability
        if (isMetaMask && !isRabby && !isTrust && !isOkx && !isOkxByInfo && !isRabbyByInfo && verifyWalletFunctionality(provider, 'ethereum')) {
          return true;
        }
      }
      
      // Rabby detection - COMPLETELY INDEPENDENT
      if (walletIdLower.includes('rabby') && provider.isRabby === true && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('coinbase') || walletNameLower.includes('coinbase')) && provider.isCoinbaseWallet && verifyWalletFunctionality(provider, 'ethereum')) return true;
      // Binance Wallet - check BEFORE Trust Wallet to avoid conflicts
      if ((walletIdLower.includes('binance') || walletNameLower.includes('binance'))) {
        const rdns = (provider.info?.rdns || '').toLowerCase();
        const name = (provider.info?.name || '').toLowerCase();
        if ((rdns.includes('binance') || 
             name.includes('binance') ||
             provider.isBinance === true ||
             provider.isBinanceWallet === true) && 
            verifyWalletFunctionality(provider, 'ethereum')) {
          return true;
        }
      }
      if ((walletIdLower.includes('trust') || walletNameLower.includes('trust')) && (provider.isTrust || provider.isTrustWallet) && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('brave') || walletNameLower.includes('brave')) && provider.isBraveWallet && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('okx') || walletNameLower.includes('okx')) && provider.isOkxWallet && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('zerion') || walletNameLower.includes('zerion')) && provider.isZerion && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('tokenpocket') || walletNameLower.includes('tokenpocket')) && provider.isTokenPocket && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('bitkeep') || walletNameLower.includes('bitkeep')) && provider.isBitKeep && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('mathwallet') || walletNameLower.includes('mathwallet')) && provider.isMathWallet && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('frame') || walletNameLower.includes('frame')) && provider.isFrame && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('frontier') || walletNameLower.includes('frontier')) && provider.isFrontier && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('tokenary') || walletNameLower.includes('tokenary')) && provider.isTokenary && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('rainbow') || walletNameLower.includes('rainbow')) && provider.isRainbow && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if ((walletIdLower.includes('argent') || walletNameLower.includes('argent')) && provider.isArgent && verifyWalletFunctionality(provider, 'ethereum')) return true;
      
      // Check by rdns (reverse domain name service - most reliable identifier)
      // Skip MetaMask here - already checked above with stricter logic
      if (rdns && verifyWalletFunctionality(provider, 'ethereum') && 
          !walletIdLower.includes('metamask') && !walletNameLower.includes('metamask')) {
        // Remove common prefixes/suffixes for matching
        const cleanRdns = rdns.replace(/^io\./, '').replace(/^com\./, '').replace(/^org\./, '');
        const cleanWalletId = walletIdLower.replace(/-wallet$/, '').replace(/-extension$/, '');
        
        if (rdns.includes(cleanWalletId) || cleanRdns.includes(cleanWalletId)) {
          return true;
        }
        
        // Also check wallet name in rdns
        const cleanWalletName = walletNameLower.replace(/\s+/g, '').replace(/wallet/gi, '');
        if (rdns.includes(cleanWalletName) || cleanRdns.includes(cleanWalletName)) {
          return true;
        }
      }
      
      // Check by display name
      // Skip MetaMask here - already checked above with stricter logic
      if (displayName && verifyWalletFunctionality(provider, 'ethereum') &&
          !walletIdLower.includes('metamask') && !walletNameLower.includes('metamask')) {
        if (displayName.includes(walletIdLower) || displayName.includes(walletNameLower)) {
          return true;
        }
        // Also check without common suffixes
        const nameWithoutSuffix = walletNameLower.replace(/\s+wallet/gi, '').replace(/\s+extension/gi, '');
        if (displayName.includes(nameWithoutSuffix)) {
          return true;
        }
      }
      
      // Check by UUID (some wallets use this)
      // Skip MetaMask here - already checked above with stricter logic
      if (uuid && (uuid.includes(walletIdLower) || uuid.includes(walletNameLower)) && 
          verifyWalletFunctionality(provider, 'ethereum') &&
          !walletIdLower.includes('metamask') && !walletNameLower.includes('metamask')) {
        return true;
      }
    }
  }
  
  // Method 3: Single provider case (window.ethereum without providers array)
  if (wallet.supportedChains.includes('ethereum') && ethereum && !ethereum.providers) {
    // Verify it's functional first
    if (!verifyWalletFunctionality(ethereum, 'ethereum')) {
      return false;
    }
    
    // Check wallet-specific properties on single provider
    // Only return true if ethereum is verified as functional
    
      // MetaMask detection - COMPLETELY INDEPENDENT from other wallets
      if ((walletIdLower.includes('metamask') || walletNameLower.includes('metamask'))) {
        // Check for MetaMask-specific properties first (most reliable)
        const hasMetaMaskProperty = ethereum._metamask !== undefined;
        const hasMetaMaskState = ethereum._state !== undefined;
        
        if ((hasMetaMaskProperty || hasMetaMaskState) && verifyWalletFunctionality(ethereum, 'ethereum')) {
          return true;
        }
        
        // Check isMetaMask property - but ONLY if it's NOT Rabby, NOT Trust Wallet, and NOT OKX
        // Rabby and OKX set isMetaMask=true for compatibility, so we need to exclude them
        const isMetaMask = ethereum.isMetaMask === true;
        const isRabby = ethereum.isRabby === true;
        const isTrust = ethereum.isTrust === true || ethereum.isTrustWallet === true;
        const isOkx = ethereum.isOkxWallet === true;
        
        // Only accept isMetaMask if it's NOT Rabby, NOT Trust Wallet, and NOT OKX
        if (isMetaMask && !isRabby && !isTrust && !isOkx && verifyWalletFunctionality(ethereum, 'ethereum')) {
          return true;
        }
      }
    
    // Rabby detection - COMPLETELY INDEPENDENT
    if ((walletIdLower.includes('rabby') || walletNameLower.includes('rabby')) && ethereum.isRabby === true && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('coinbase') || walletNameLower.includes('coinbase')) && ethereum.isCoinbaseWallet && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    // Binance Wallet - check BEFORE Trust Wallet to avoid conflicts
    if ((walletIdLower.includes('binance') || walletNameLower.includes('binance'))) {
      // Check window.BinanceChain directly (Binance's own provider)
      if (win.BinanceChain || win.binanceChain) {
        const binanceChain = win.BinanceChain || win.binanceChain;
        if (verifyWalletFunctionality(binanceChain, 'ethereum')) {
          return true;
        }
      }
      // Also check if ethereum has Binance properties
      if ((ethereum.isBinance || ethereum.isBinanceWallet) && verifyWalletFunctionality(ethereum, 'ethereum')) {
        return true;
      }
    }
    if ((walletIdLower.includes('trust') || walletNameLower.includes('trust')) && (ethereum.isTrust || ethereum.isTrustWallet) && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('brave') || walletNameLower.includes('brave')) && ethereum.isBraveWallet && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('okx') || walletNameLower.includes('okx')) && ethereum.isOkxWallet && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('zerion') || walletNameLower.includes('zerion')) && ethereum.isZerion && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('tokenpocket') || walletNameLower.includes('tokenpocket')) && ethereum.isTokenPocket && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('bitkeep') || walletNameLower.includes('bitkeep')) && ethereum.isBitKeep && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('mathwallet') || walletNameLower.includes('mathwallet')) && ethereum.isMathWallet && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('frame') || walletNameLower.includes('frame')) && ethereum.isFrame && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('frontier') || walletNameLower.includes('frontier')) && ethereum.isFrontier && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('tokenary') || walletNameLower.includes('tokenary')) && ethereum.isTokenary && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
    if ((walletIdLower.includes('rainbow') || walletNameLower.includes('rainbow')) && ethereum.isRainbow && verifyWalletFunctionality(ethereum, 'ethereum')) return true;
  }
  
  
  // Method 6: Direct window property checks for specific wallets
  // Trust Wallet
  if ((walletIdLower.includes('trust') || walletNameLower.includes('trust')) && 
      !walletIdLower.includes('trustwallet')) {
    const trustWallet = win.trustwallet || win.trustWallet;
    if (trustWallet && verifyWalletFunctionality(trustWallet, 'ethereum')) {
      return true;
    }
    if (win.ethereum && (win.ethereum.isTrust || win.ethereum.isTrustWallet) && verifyWalletFunctionality(win.ethereum, 'ethereum')) {
      return true;
    }
  }
  
  // OKX Wallet
  if ((walletIdLower.includes('okx') || walletNameLower.includes('okx')) && 
      !walletIdLower.includes('okxwallet')) {
    const okxWallet = win.okxwallet || win.okxWallet;
    if (okxWallet && verifyWalletFunctionality(okxWallet, 'ethereum')) {
      return true;
    }
    if (win.ethereum?.isOkxWallet && verifyWalletFunctionality(win.ethereum, 'ethereum')) {
      return true;
    }
  }
  
  // Binance
  if ((walletIdLower.includes('binance') || walletNameLower.includes('binance'))) {
    const binanceChain = win.BinanceChain || win.binanceChain;
    if (binanceChain && verifyWalletFunctionality(binanceChain, 'ethereum')) {
        return true;
      }
  }
  
  // Rabby
  if ((walletIdLower.includes('rabby') || walletNameLower.includes('rabby'))) {
    const rabby = win.rabby;
    if (rabby && verifyWalletFunctionality(rabby, 'ethereum')) {
        return true;
      }
    if (win.ethereum?.isRabby && verifyWalletFunctionality(win.ethereum, 'ethereum')) {
      return true;
    }
  }
  
  return false;
};

/**
 * Convert SupportedWallet to WalletProvider
 */
export const convertToWalletProvider = (wallet: SupportedWallet, installed: boolean): WalletProvider => {
  return {
    id: wallet.id,
    name: wallet.name,
    icon: wallet.icon,
    supportedChains: wallet.supportedChains as SupportedChain[],
    installed,
    imageId: wallet.imageId, // Pass WalletConnect image ID for icon fetching
  };
};

