"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { getWalletById } from "@/lib/wallet/detection/detector";
import type { WalletType } from "@/components/wallet/connect-wallet-modal";
import type { WalletProvider } from "@/lib/wallet/detection/types";
import type { WalletConnectWallet } from "@/lib/wallet/services/wallet-explorer-service";
import type { WalletChain } from "@/lib/wallet/connection/types";
import { mapWalletIdToProviderId } from "@/lib/wallet/utils/wallet-id-mapper";
import { useConnect, useDisconnect, useConfig } from "wagmi";
import { getAccount } from "@wagmi/core";
import { connectWallet as connectWalletConnector } from "@/lib/wallet/connection/connector";
import { useWalletStore } from "@/lib/wallet/state/store";

interface UseWalletConnectionReturn {
  isModalOpen: boolean;
  isExplorerOpen: boolean;
  isChainSelectionOpen: boolean;
  isToastOpen: boolean;
  connectedAddress: string | null;
  pendingWallet: WalletProvider | WalletConnectWallet | null;
  openModal: () => void;
  closeModal: () => void;
  openExplorer: () => void;
  closeExplorer: () => void;
  connectWallet: (type: WalletType | WalletConnectWallet) => Promise<void>;
  selectChain: (chain: WalletChain) => Promise<void>;
  closeToast: () => void;
  handleChainModalBack: () => void;
}

// Map WalletType to wallet ID and chain (for hardcoded types)
const WALLET_TYPE_MAP: Partial<Record<WalletType, { walletId: string; chain: 'ethereum' | 'solana' }>> = {
  metamask: { walletId: 'metamask', chain: 'ethereum' },
  walletconnect: { walletId: 'walletconnect', chain: 'ethereum' },
  coinbase: { walletId: 'base-formerly-coinbase-wallet', chain: 'ethereum' },
  create: { walletId: 'metamask', chain: 'ethereum' }, // Default to MetaMask for create
  import: { walletId: 'metamask', chain: 'ethereum' }, // Default to MetaMask for import
};

// Determine chain from wallet ID
function getChainForWallet(walletId: string): 'ethereum' | 'solana' {
  // Solana-only wallets
  const solanaOnlyWallets = ['solflare', 'glow', 'slope', 'nightly', 'jupiter'];
  if (solanaOnlyWallets.includes(walletId.toLowerCase())) {
    return 'solana';
  }
  
  // Default to Ethereum (most wallets support it, including multi-chain wallets like Phantom)
  return 'ethereum';
}

// Check if wallet supports multiple chains (only Solana and Ethereum count)
function isMultiChainWallet(wallet: WalletProvider | WalletConnectWallet | null): boolean {
  if (!wallet) return false;
  
  if ('supportedChains' in wallet) {
    // WalletProvider from detection
    const supported = wallet.supportedChains.filter(
      chain => chain === 'ethereum' || chain === 'solana'
    );
    return supported.length > 1;
  }
  
  // WalletConnectWallet - assume it supports both if we don't know
  // In practice, we'd need to check wallet.chains or make an assumption
  // For now, we'll check common multi-chain wallets by name
  const multiChainNames = ['phantom', 'metamask', 'coinbase', 'trust', 'rabby'];
  return multiChainNames.some(name => wallet.name.toLowerCase().includes(name.toLowerCase()));
}

export function useWalletConnection(): UseWalletConnectionReturn {
  const wallet = useWallet();
  const wagmiConfig = useConfig();
  const { connect: wagmiConnect, connectors: wagmiConnectors } = useConnect();
  const { disconnect: wagmiDisconnect } = useDisconnect();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isChainSelectionOpen, setIsChainSelectionOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<WalletProvider | WalletConnectWallet | null>(null);
  const [pendingWalletId, setPendingWalletId] = useState<string | null>(null);
  const [previousModalState, setPreviousModalState] = useState<'connect' | 'explorer' | null>(null);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const openExplorer = useCallback(() => {
    setIsExplorerOpen(true);
  }, []);

  const closeExplorer = useCallback(() => {
    setIsExplorerOpen(false);
  }, []);

  const connectWalletHandler = useCallback(async (walletInput: WalletType | WalletConnectWallet) => {
    try {
      // Handle WalletConnect wallet from explorer
      if (typeof walletInput === 'object' && 'id' in walletInput && 'name' in walletInput) {
        const wcWallet = walletInput as WalletConnectWallet;
        
        // Check if this is a multi-chain wallet
        if (isMultiChainWallet(wcWallet)) {
          setPendingWallet(wcWallet);
          setPendingWalletId(wcWallet.id);
          setPreviousModalState('explorer'); // Remember we came from explorer modal
          setIsChainSelectionOpen(true);
          setIsExplorerOpen(false);
          return;
        }
        
        // Single-chain wallet - determine chain and connect
        const chain = getChainForWallet(wcWallet.id);
        await wallet.connect(wcWallet.id, chain);
        setIsToastOpen(true);
        setIsExplorerOpen(false);
        return;
      }

      // Handle string wallet type
      const type = walletInput as WalletType;
      
      // For create/import, show instructions or redirect
      if (type === 'create' || type === 'import') {
        // TODO: Show create/import wallet UI or redirect
        console.log('Create/import wallet not yet implemented');
        return;
      }

      // Get wallet from supported wallets
      const walletInfo = getWalletById(type);
      if (!walletInfo) {
        throw new Error(`Wallet "${type}" not found`);
      }

      // Convert to WalletProvider to check chains
      const walletProvider: WalletProvider = {
        id: walletInfo.id,
        name: walletInfo.name,
        icon: walletInfo.icon,
        supportedChains: walletInfo.supportedChains,
        installed: true, // Assume installed if user clicked it
      };

      // Check if multi-chain wallet
      if (isMultiChainWallet(walletProvider)) {
        setPendingWallet(walletProvider);
        setPendingWalletId(type);
        setPreviousModalState('connect'); // Remember we came from connect modal
        setIsChainSelectionOpen(true);
        setIsModalOpen(false);
        return;
      }

      // Single-chain wallet - connect immediately
      let walletId: string;
      let chain: 'ethereum' | 'solana';
      
      if (WALLET_TYPE_MAP[type]) {
        const mapped = WALLET_TYPE_MAP[type]!;
        walletId = mapped.walletId;
        chain = mapped.chain;
      } else {
        walletId = type;
        chain = getChainForWallet(walletId);
      }

      await wallet.connect(walletId, chain);
      setIsToastOpen(true);
      setIsModalOpen(false);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
      // Error is already set in store
    }
  }, [wallet]);

  const selectChain = useCallback(async (chain: WalletChain) => {
    if (!pendingWalletId) return;

    try {
      // Map wallet ID to provider ID
      const providerId = mapWalletIdToProviderId(pendingWalletId);
      
      // For MetaMask on Ethereum, use Wagmi's MetaMask connector specifically
      // This ensures we use MetaMask's own provider and avoid OKX/Rabby conflicts
      if (chain === 'ethereum' && providerId === 'metamask') {
        try {
          // Find Wagmi's MetaMask connector
          const metamaskConnector = wagmiConnectors.find((c: any) => {
            const id = (c.id || '').toLowerCase();
            const name = (c.name || '').toLowerCase();
            const type = (c.type || '').toLowerCase();
            return id.includes('metamask') || 
                   name.includes('metamask') ||
                   type === 'metamask' ||
                   c.id === 'metaMask' ||
                   c.id === 'metaMaskSDK';
          });
          
          if (metamaskConnector) {
            console.log('[useWalletConnection] Using Wagmi MetaMask connector for MetaMask connection');
            
            // Disconnect any existing wallet first
            if (wallet.primaryWallet) {
              try {
                await wallet.disconnect();
              } catch (error) {
                console.warn('Error disconnecting existing wallet:', error);
              }
            }
            
            // Connect using Wagmi's MetaMask connector
            await wagmiConnect({ connector: metamaskConnector });
            
            // Get the connected account directly from Wagmi core (synchronous after connection)
            // This is more reliable than waiting for React hooks to update
            const wagmiAccount = getAccount(wagmiConfig);
            let address: string;
            
            if (!wagmiAccount.address) {
              // If address not immediately available, wait a bit and try again
              await new Promise(resolve => setTimeout(resolve, 300));
              const retryAccount = getAccount(wagmiConfig);
              if (!retryAccount.address) {
                throw new Error('Failed to get account address from MetaMask connector. Please try again.');
              }
              address = retryAccount.address;
            } else {
              address = wagmiAccount.address;
            }
            
            // Update wallet store with the connected account directly
            // Don't call wallet.connect() as it will try to connect again via connector
            // Instead, use the store's setAccount method to set the account directly
            const account: WalletAccount = {
              address: address,
              chain: 'ethereum',
              provider: pendingWalletId, // Keep original wallet ID
            };
            
            // Use the store's setAccount method directly
            useWalletStore.getState().setAccount(account);
            
            setIsToastOpen(true);
            setIsChainSelectionOpen(false);
            setPendingWallet(null);
            setPendingWalletId(null);
            setPreviousModalState(null);
            return;
          } else {
            // Fallback to custom connection if connector not found
            console.warn('[useWalletConnection] Wagmi MetaMask connector not found, using custom connection');
            await wallet.connect(pendingWalletId, chain);
          }
        } catch (wagmiError: any) {
          console.error('[useWalletConnection] Wagmi MetaMask connection failed, trying custom connection:', wagmiError);
          // Fallback to custom connection
          await wallet.connect(pendingWalletId, chain);
        }
      } else {
        // For other wallets (non-MetaMask or Solana), use the custom connection logic
        // Disconnect any existing wallet first (like tiwi-test)
        if (wallet.primaryWallet) {
          try {
            await wallet.disconnect();
            // Also disconnect from Wagmi if it was an EVM wallet
            if (wallet.primaryWallet.chain === 'ethereum') {
              try {
                wagmiDisconnect();
              } catch (wagmiError) {
                // Ignore Wagmi disconnect errors
              }
            }
          } catch (error) {
            console.warn('Error disconnecting existing wallet:', error);
          }
        }
        
        await wallet.connect(pendingWalletId, chain);
      }
      
      setIsToastOpen(true);
      setIsChainSelectionOpen(false);
      setPendingWallet(null);
      setPendingWalletId(null);
      setPreviousModalState(null);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
    }
  }, [wallet, pendingWalletId, wagmiConfig, wagmiConnect, wagmiConnectors, wagmiDisconnect]);

  const handleChainModalBack = useCallback(() => {
    setIsChainSelectionOpen(false);
    setPendingWallet(null);
    setPendingWalletId(null);
    
    // Restore previous modal state
    if (previousModalState === 'connect') {
      setIsModalOpen(true);
    } else if (previousModalState === 'explorer') {
      setIsExplorerOpen(true);
    }
    
    setPreviousModalState(null);
  }, [previousModalState]);

  const closeToast = useCallback(() => {
    setIsToastOpen(false);
  }, []);

  return {
    isModalOpen,
    isExplorerOpen,
    isChainSelectionOpen,
    isToastOpen,
    connectedAddress: wallet.address,
    pendingWallet,
    openModal,
    closeModal,
    openExplorer,
    closeExplorer,
    connectWallet: connectWalletHandler,
    selectChain,
    closeToast,
    handleChainModalBack, // Export the back handler
  };
}
