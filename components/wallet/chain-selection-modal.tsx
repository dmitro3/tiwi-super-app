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

interface ChainSelectionModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  wallet: WalletProvider | WalletConnectWallet | null;
  onChainSelect: (chain: WalletChain) => void;
}

const CHAIN_LABELS: Record<WalletChain, string> = {
  ethereum: 'Ethereum',
  solana: 'Solana',
};

const CHAIN_ICONS: Record<WalletChain, string> = {
  ethereum: '⟠',
  solana: '◎',
};

export default function ChainSelectionModal({
  open,
  onOpenChange,
  wallet,
  onChainSelect,
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="bg-[#0b0f0a] border border-[#1f261e] rounded-2xl sm:rounded-3xl p-0 max-w-[calc(100vw-2rem)] sm:max-w-[550px] w-full overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 shrink-0 w-full border-b border-[#1f261e]">
          <button
            onClick={() => onOpenChange(false)}
            className="p-2 hover:bg-[#1a1f1a] rounded-lg transition-colors"
            aria-label="Back"
          >
            <svg className="w-5 h-5 text-[#b5b5b5]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <DialogTitle className="font-bold leading-normal relative shrink-0 text-lg sm:text-2xl text-left text-white m-0">
            Select Chain
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="cursor-pointer relative shrink-0 size-6 sm:size-8 hover:opacity-80 transition-opacity"
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
        <div className="flex justify-center py-6">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-200 to-purple-300 dark:from-purple-600 dark:to-purple-700 rounded-full flex items-center justify-center">
            {'icon' in wallet ? (
              <div className="text-4xl">{wallet.icon || '👻'}</div>
            ) : (
              <div className="text-4xl">👻</div>
            )}
          </div>
        </div>

        {/* Description */}
        <div className="px-6 pb-4 text-center">
          <p className="text-sm text-[#b5b5b5]">
            This wallet supports multiple chains. Select which chain you'd like to connect to
          </p>
        </div>

        {/* Chain Options */}
        <div className="px-4 pb-6 space-y-2 max-h-96 overflow-y-auto">
          {supportedChains.map((chain) => (
            <button
              key={chain}
              onClick={() => handleChainClick(chain)}
              className="w-full flex items-center justify-between p-4 rounded-xl border-2 border-[#1f261e] hover:border-[#b1f128] transition-colors bg-[#121712] hover:bg-[#1a1f1a]"
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900 dark:to-purple-800 flex items-center justify-center text-xl">
                  {CHAIN_ICONS[chain]}
                </div>
                <div className="text-left">
                  <div className="font-semibold text-white">{CHAIN_LABELS[chain]}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}

