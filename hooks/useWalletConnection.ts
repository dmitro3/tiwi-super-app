"use client";

import { useCallback, useState } from "react";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { getWalletById } from "@/lib/wallet/detection/detector";
import type { WalletType } from "@/components/wallet/connect-wallet-modal";
import type { WalletProvider } from "@/lib/wallet/detection/types";
import type { WalletConnectWallet } from "@/lib/wallet/services/wallet-explorer-service";
import type { WalletChain } from "@/lib/wallet/connection/types";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isExplorerOpen, setIsExplorerOpen] = useState(false);
  const [isChainSelectionOpen, setIsChainSelectionOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [pendingWallet, setPendingWallet] = useState<WalletProvider | WalletConnectWallet | null>(null);
  const [pendingWalletId, setPendingWalletId] = useState<string | null>(null);

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
      await wallet.connect(pendingWalletId, chain);
      setIsToastOpen(true);
      setIsChainSelectionOpen(false);
      setPendingWallet(null);
      setPendingWalletId(null);
    } catch (error: any) {
      console.error('Error connecting wallet:', error);
    }
  }, [wallet, pendingWalletId]);

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
  };
}
