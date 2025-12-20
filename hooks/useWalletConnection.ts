"use client";

import { useState, useCallback } from "react";

export type WalletType =
  | "metamask"
  | "walletconnect"
  | "coinbase"
  | "create"
  | "import";

interface UseWalletConnectionReturn {
  isModalOpen: boolean;
  isToastOpen: boolean;
  connectedAddress: string | null;
  openModal: () => void;
  closeModal: () => void;
  connectWallet: (type: WalletType) => void;
  closeToast: () => void;
}

// Mock wallet addresses for different wallet types
const MOCK_ADDRESSES: Record<WalletType, string> = {
  metamask: "0x0617a8b3c4d5e6f7a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2",
  walletconnect: "0x1234567890abcdef1234567890abcdef12345678",
  coinbase: "0xabcdef1234567890abcdef1234567890abcdef12",
  create: "0x9876543210fedcba9876543210fedcba98765432",
  import: "0xfedcba0987654321fedcba0987654321fedcba09",
};

export function useWalletConnection(): UseWalletConnectionReturn {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToastOpen, setIsToastOpen] = useState(false);
  const [connectedAddress, setConnectedAddress] = useState<string | null>(null);

  const openModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const closeModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  const connectWallet = useCallback((type: WalletType) => {
    // Mock wallet connection - simulate async connection
    setTimeout(() => {
      const address = MOCK_ADDRESSES[type];
      setConnectedAddress(address);
      setIsToastOpen(true);
    }, 300); // Small delay to simulate connection
  }, []);

  const closeToast = useCallback(() => {
    setIsToastOpen(false);
  }, []);

  return {
    isModalOpen,
    isToastOpen,
    connectedAddress,
    openModal,
    closeModal,
    connectWallet,
    closeToast,
  };
}


