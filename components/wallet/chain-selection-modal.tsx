"use client";

import Image from "next/image";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "@/components/ui/dialog";
import type { WalletProvider } from "@/lib/wallet/detection/types";
import type { WalletChain } from "@/lib/wallet/connection/types";
import type { WalletConnectWallet } from "@/lib/wallet/services/wallet-explorer-service";
import { getWalletIconUrl } from "@/lib/wallet/services/wallet-explorer-service";
import { getWalletById } from "@/lib/wallet/detection/detector";

interface ChainSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletProvider | WalletConnectWallet | null;
  onChainSelect: (chain: WalletChain) => void;
  onBack?: () => void; // Callback to go back to previous modal
}

const CHAIN_LABELS: Record<WalletChain, string> = {
  ethereum: 'EVM',
  solana: 'Solana',
};

export default function ChainSelectionModal({
  open,
  onOpenChange,
  wallet,
  onChainSelect,
  onBack,
}: ChainSelectionModalProps) {
  if (!wallet) return null;

  // Determine supported chains
  let supportedChains: WalletChain[] = [];
  
  if ('supportedChains' in wallet) {
    // WalletProvider from detection
    supportedChains = wallet.supportedChains.filter(
      chain => chain === 'ethereum' || chain === 'solana'
    ) as WalletChain[];
  } else {
    // WalletConnectWallet - assume both chains for multi-chain wallets
    // Common multi-chain wallets
    const multiChainNames = ['phantom', 'metamask', 'coinbase', 'trust', 'rabby'];
    const isMultiChain = multiChainNames.some(name => 
      wallet.name.toLowerCase().includes(name.toLowerCase())
    );
    
    if (isMultiChain) {
      supportedChains = ['ethereum', 'solana'];
    } else {
      // Default to Ethereum for unknown wallets
      supportedChains = ['ethereum'];
    }
  }

  // If only one chain supported, auto-select it
  if (supportedChains.length === 1) {
    onChainSelect(supportedChains[0]);
    onOpenChange(false);
    return null;
  }

  const handleChainClick = (chain: WalletChain) => {
    onChainSelect(chain);
    onOpenChange(false);
  };

  const handleBack = () => {
    if (onBack) {
      onBack();
    } else {
      onOpenChange(false);
    }
  };

  // Get wallet icon
  const getWalletIcon = (): string => {
    // For WalletConnect wallets, use image_id
    if ('image_id' in wallet && wallet.image_id) {
      try {
        return getWalletIconUrl(wallet.image_id, 'lg');
      } catch (error) {
        console.error('[ChainSelectionModal] Error generating wallet icon URL:', error);
      }
    }
    
    // For WalletProvider from detection, lookup in SUPPORTED_WALLETS to get imageId
    if ('id' in wallet && wallet.id) {
      const walletInfo = getWalletById(wallet.id);
      if (walletInfo?.imageId) {
        try {
          return getWalletIconUrl(walletInfo.imageId, 'lg');
        } catch (error) {
          console.error('[ChainSelectionModal] Error generating wallet icon URL:', error);
        }
      }
    }
    
    // Fallback to default icon
    return '/assets/icons/wallet/wallet-04.svg';
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[550px] w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 shrink-0 w-full border-b border-[#1f261e]">
          <button
            onClick={handleBack}
            className="p-2 hover:bg-[#1a1f1a] rounded-lg transition-colors cursor-pointer"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <DialogTitle className="font-bold leading-normal relative shrink-0 text-2xl text-center text-white m-0 flex-1">
            Select Chain
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer relative shrink-0 size-8 hover:opacity-80 transition-opacity"
            aria-label="Close modal"
          >
            <Image
              src="/assets/icons/cancel-circle.svg"
              alt="Close"
              width={32}
              height={32}
              className="w-full h-full object-contain"
            />
          </button>
        </div>

        {/* Wallet Icon */}
        <div className="flex justify-center py-6 px-6">
          <div className="relative w-24 h-24 shrink-0">
            <Image
              src={getWalletIcon()}
              alt={('name' in wallet ? (wallet as WalletProvider).name : (wallet as WalletConnectWallet).name) || 'Wallet'}
              width={96}
              height={96}
              className="w-full h-full object-contain rounded-full"
              onError={(e) => {
                e.currentTarget.src = '/assets/icons/wallet/wallet-04.svg';
              }}
            />
          </div>
        </div>

        {/* Description */}
        <div className="px-6 pb-6 text-center">
          <p className="text-base text-white leading-normal">
            This wallet supports multiple chains. Select which chain you'd like to connect to
          </p>
        </div>

        {/* Chain Options */}
        <div className="px-6 pb-6 space-y-2">
          {supportedChains.map((chain) => (
            <button
              key={chain}
              onClick={() => handleChainClick(chain)}
              className="w-full flex items-center justify-between p-4 rounded-xl border border-[#1f261e] hover:border-[#b1f128] transition-colors bg-[#121712] hover:bg-[#1a1f1a] cursor-pointer"
            >
              <div className="flex items-center gap-3">
                {/* Chain Logo */}
                <div className="relative w-10 h-10 shrink-0 flex items-center justify-center">
                  {chain === 'ethereum' ? (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <Image
                        src="/assets/icons/chains/ethereum.svg"
                        alt="Ethereum"
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback: Purple diamond shape for Ethereum
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector('.fallback-icon')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-icon w-10 h-10 bg-gradient-to-br from-[#627EEA] to-[#8B5CF6] rounded-lg transform rotate-45 flex items-center justify-center';
                            const inner = document.createElement('div');
                            inner.className = 'transform -rotate-45 text-white font-bold text-xs';
                            inner.textContent = '⟠';
                            fallback.appendChild(inner);
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <div className="w-10 h-10 flex items-center justify-center">
                      <Image
                        src="/assets/icons/chains/solana.svg"
                        alt="Solana"
                        width={40}
                        height={40}
                        className="w-full h-full object-contain"
                        onError={(e) => {
                          // Fallback: Green/purple gradient circle for Solana
                          e.currentTarget.style.display = 'none';
                          const parent = e.currentTarget.parentElement;
                          if (parent && !parent.querySelector('.fallback-icon')) {
                            const fallback = document.createElement('div');
                            fallback.className = 'fallback-icon w-10 h-10 rounded-full bg-gradient-to-br from-[#14F195] to-[#9945FF] flex items-center justify-center';
                            const inner = document.createElement('div');
                            inner.className = 'text-white font-bold text-xs';
                            inner.textContent = '◎';
                            fallback.appendChild(inner);
                            parent.appendChild(fallback);
                          }
                        }}
                      />
                    </div>
                  )}
                </div>
                {/* Chain Label */}
                <div className="text-left">
                  <div className="font-semibold text-white text-base">{CHAIN_LABELS[chain]}</div>
                </div>
              </div>
              {/* Installed Badge */}
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-[#b1f128] shrink-0"></div>
                <span className="text-sm text-white font-medium">Installed</span>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
