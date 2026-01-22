/**
 * Helper utilities for wallet detection
 */

import { SupportedWallet } from "./supported-wallets";

/**
 * Verify that a detected wallet object is actually functional
 * Checks for required methods and properties
 */
function verifyWalletFunctionality(walletObj: any, chain: 'ethereum' | 'solana'): boolean {
  if (!walletObj || typeof walletObj !== 'object') {
    return false;
  }
  
  const keys = Object.keys(walletObj);
  if (keys.length === 0) {
    return false;
  }
  
  if (chain === 'solana') {
    if (typeof walletObj.connect !== 'function') {
      return false;
    }
    return true;
  } else if (chain === 'ethereum') {
    if (typeof walletObj.request !== 'function') {
      return false;
    }
    return true;
  }
  
  return false;
}

/**
 * Check if a wallet is installed by directly checking for wallet objects
 */
export const isWalletInstalled = (wallet: SupportedWallet): boolean => {
  if (typeof window === 'undefined') return false;
  
  const win = window as any;
  const ethereum = win.ethereum;
  const walletIdLower = wallet.id.toLowerCase().replace(/-wallet$/, '').replace(/-extension$/, '');
  const walletNameLower = (wallet.name || '').toLowerCase();
  
  // === SOLANA WALLETS ===
  if (wallet.id === 'phantom' || walletNameLower.includes('phantom')) {
    if (win.phantom) {
      if (wallet.supportedChains.includes('solana') && win.phantom.solana) {
        if (verifyWalletFunctionality(win.phantom.solana, 'solana')) return true;
      }
      if (wallet.supportedChains.includes('ethereum') && win.phantom.ethereum) {
        if (verifyWalletFunctionality(win.phantom.ethereum, 'ethereum')) return true;
      }
    }
    return false;
  }
  
  if (walletIdLower.includes('solflare') || walletNameLower.includes('solflare')) {
    const solflare = win.solflare?.solana || win.solflare;
    if (solflare && verifyWalletFunctionality(solflare, 'solana')) return true;
    if (win.solana?.isSolflare && verifyWalletFunctionality(win.solana, 'solana')) return true;
    return false;
  }
  
  if (walletIdLower.includes('backpack') || walletNameLower.includes('backpack')) {
    const backpack = win.backpack?.solana || win.backpack;
    if (backpack && verifyWalletFunctionality(backpack, 'solana')) return true;
    return false;
  }
  
  // Method 2: EIP-6963 providers array (for EVM wallets)
  if (wallet.supportedChains.includes('ethereum') && ethereum?.providers && Array.isArray(ethereum.providers)) {
    for (const provider of ethereum.providers) {
      if (!verifyWalletFunctionality(provider, 'ethereum')) continue;
      
      const rdns = (provider.info?.rdns || '').toLowerCase();
      const displayName = (provider.info?.name || '').toLowerCase();
      
      if (walletIdLower.includes('metamask') || walletNameLower.includes('metamask')) {
        const hasMetaMaskRdns = rdns.includes('metamask') || rdns.includes('io.metamask');
        if (hasMetaMaskRdns && verifyWalletFunctionality(provider, 'ethereum')) return true;
        
        const isMetaMask = provider.isMetaMask === true;
        const isRabby = provider.isRabby === true;
        const isTrust = provider.isTrust === true || provider.isTrustWallet === true;
        const isOkx = provider.isOkxWallet === true;
        
        if (isMetaMask && !isRabby && !isTrust && !isOkx && verifyWalletFunctionality(provider, 'ethereum')) return true;
      }
      
      if (walletIdLower.includes('rabby') && provider.isRabby === true && verifyWalletFunctionality(provider, 'ethereum')) return true;
      if (rdns && rdns.includes(walletIdLower.replace(/-wallet$/, ''))) return true;
    }
  }
  
  // Method 3: Single provider case
  if (wallet.supportedChains.includes('ethereum') && ethereum && !ethereum.providers) {
    if (!verifyWalletFunctionality(ethereum, 'ethereum')) return false;
    
    if (walletIdLower.includes('metamask') || walletNameLower.includes('metamask')) {
      if (ethereum.isMetaMask && !ethereum.isRabby && !ethereum.isOkxWallet) return true;
    }
    if (walletIdLower.includes('rabby') && ethereum.isRabby === true) return true;
  }
  
  return false;
};

/**
 * Convert SupportedWallet to WalletProvider
 */
export const convertToWalletProvider = (wallet: SupportedWallet, installed: boolean) => {
  return {
    id: wallet.id,
    name: wallet.name,
    icon: wallet.icon,
    supportedChains: wallet.supportedChains,
    installed,
    imageId: wallet.imageId,
  };
};
