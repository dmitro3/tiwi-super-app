"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import TradingChart from "@/components/swap/trading-chart";
import SwapCard from "@/components/swap/swap-card";
import SwapBackgroundElements from "@/components/swap/swap-background-elements";
import { useWalletConnection } from "@/hooks/useWalletConnection";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import ConnectWalletModal from "@/components/wallet/connect-wallet-modal";
import WalletExplorerModal from "@/components/wallet/wallet-explorer-modal";
import ChainSelectionModal from "@/components/wallet/chain-selection-modal";
import WalletConnectedToast from "@/components/wallet/wallet-connected-toast";
import TokenSelectorModal from "@/components/swap/token-selector-modal";
import { getWalletIconFromAccount, isWalletChainCompatible, isAddressChainCompatible } from "@/lib/frontend/utils/wallet-display";
import { sanitizeDecimal, parseNumber } from "@/lib/shared/utils/number";
import {
  calculateLimitPriceUsd,
} from "@/lib/frontend/calculations/swap";
import { useCurrencyStore } from "@/lib/frontend/store/currency-store";
import { convertAndFormatUSD } from "@/lib/shared/utils/currency-conversion";
import { useSwapQuote } from "@/hooks/useSwapQuote";
import { useSwapStore } from "@/lib/frontend/store/swap-store";
import { useTokenPricePrefetch } from "@/hooks/useTokenPricePrefetch";
import type { Token } from "@/lib/frontend/types/tokens";
import { MOCK_TOKENS } from "@/data/mock-tokens";
import ErrorToast, { type ErrorToastAction } from "@/components/ui/error-toast";
import { parseRouteError } from "@/lib/shared/utils/error-messages";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useSettingsStore } from "@/lib/frontend/store/settings-store";
import { useSwapExecution } from "@/hooks/useSwapExecution";
import TransactionToast from "@/components/earn/transaction-toast";
import SwapStatusToast from "@/components/swap/swap-status-toast";
import type { SwapStage } from "@/lib/frontend/services/swap-executor/types";
import FromWalletSelectorModal from "@/components/swap/from-wallet-selector-modal";
import ToAddressModal from "@/components/swap/to-address-modal";

// Default tokens (ensure chainId/address/logo for routing + display)
export const DEFAULT_FROM_TOKEN: Token = {
  id: "56-0xDA1060158F7D593667cCE0a15DB346BB3FfB3596".toLowerCase(),
  name: "TIWI CAT",
  symbol: "TWC",
  address: "0xDA1060158F7D593667cCE0a15DB346BB3FfB3596",
  chain: "BNB Chain",
  chainId: 56,
  // Use DexScreener openGraph image to avoid broken logos
  logo:
    "/assets/logos/twc-token.svg",
  chainLogo: "/assets/icons/chains/bsc.svg",
  chainBadge: "bsc",
  decimals: 9
};

export const DEFAULT_TO_TOKEN: Token = {
  id: "56-0x55d398326f99059ff775485246999027b3197955".toLowerCase(),
  name: "Binance Coin",
  symbol: "BNB",
  address: "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
  chain: "BNB Chain",
  chainId: 56,
  logo: "/assets/icons/tokens/tether.svg",
  chainLogo: "/assets/icons/chains/bsc.svg",
  chainBadge: "bsc",
  decimals: 18
};

export default function SwapPage() {
  // ===== Zustand Store State =====
  // Read swap state from store
  const activeTab = useSwapStore((state) => state.activeTab);
  const fromToken = useSwapStore((state) => state.fromToken);
  const toToken = useSwapStore((state) => state.toToken);
  const fromAmount = useSwapStore((state) => state.fromAmount);
  const toAmount = useSwapStore((state) => state.toAmount);
  const limitPrice = useSwapStore((state) => state.limitPrice);
  const expires = useSwapStore((state) => state.expires);
  const isQuoteLoading = useSwapStore((state) => state.isQuoteLoading);

  // Get store actions
  const setActiveTab = useSwapStore((state) => state.setActiveTab);
  const setFromToken = useSwapStore((state) => state.setFromToken);
  const setToToken = useSwapStore((state) => state.setToToken);
  const setFromAmount = useSwapStore((state) => state.setFromAmount);
  const setLimitPrice = useSwapStore((state) => state.setLimitPrice);
  const setExpires = useSwapStore((state) => state.setExpires);
  const setToAmount = useSwapStore((state) => state.setToAmount);
  const setQuoteLoading = useSwapStore((state) => state.setQuoteLoading);
  const swapTokens = useSwapStore((state) => state.swapTokens);

  // Wallet connection state
  const {
    isModalOpen,
    isExplorerOpen,
    isChainSelectionOpen,
    isToastOpen,
    connectedAddress,
    pendingWallet,
    openModal,
    closeModal,
    openExplorer,
    closeExplorer,
    connectWallet,
    selectChain,
    closeToast,
    handleChainModalBack,
  } = useWalletConnection();
  const { 
    primaryWallet, 
    secondaryWallet, 
    secondaryAddress,
    connectedWallets,
    connectAdditionalWallet,
    isProviderConnected,
    error: walletError,
    clearError: clearWalletError,
  } = useWallet();

  // Get wallet icons
  const fromWalletIcon = getWalletIconFromAccount(primaryWallet);
  
  // Determine recipient address (secondary wallet or manual address)
  const effectiveRecipientAddress = secondaryWallet?.address || secondaryAddress || null;
  // Initialize default tokens on mount (use real chainId/address to avoid quote errors)

  // Recipient wallet state for wallet-to-wallet transfers
  // Use secondary wallet/address if available, otherwise default to primary wallet address
  const [recipientAddress, setRecipientAddress] = useState<string | null>(
    effectiveRecipientAddress || connectedAddress
  );

  useEffect(() => {
    if (!fromToken) {
      setFromToken(DEFAULT_FROM_TOKEN);
    }
  }, [fromToken, setFromToken]);

  // Prefetch token prices when tokens are selected (ensures prices are available for USD calculations)
  useTokenPricePrefetch(fromToken, toToken);

  // Use custom hook for quote calculation (updates store)
  // Get activeInput from store
  const activeInput = useSwapStore((state) => state.activeInput);

  useSwapQuote({
    fromAmount,
    toAmount,
    activeInput,
    activeTab,
    fromToken,
    toToken,
    recipient: recipientAddress, // Pass recipient address for routing
  });

  // Fetch token balances for fromToken and toToken
  const fromTokenBalance = useTokenBalance(
    connectedAddress,
    fromToken?.address,
    fromToken?.chainId
  );
  const toTokenBalance = useTokenBalance(
    connectedAddress,
    toToken?.address,
    toToken?.chainId
  );

  // Token selector modal state (stays local - UI only)
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [tokenModalType, setTokenModalType] = useState<"from" | "to">("from");
  
  // Error toast state
  const [isErrorToastOpen, setIsErrorToastOpen] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ 
    title: string; 
    message: string; 
    nextSteps?: string[];
    actions?: ErrorToastAction[];
  } | null>(null);
  
  // Get quote error and route from store
  const route = useSwapStore((state) => state.route);
  const quoteError = useSwapStore((state) => state.quoteError);
  
  // Get settings store for slippage actions
  const setSlippageMode = useSettingsStore((state) => state.setSlippageMode);
  const setSlippageTolerance = useSettingsStore((state) => state.setSlippageTolerance);
  
  // Get currency preference
  const currency = useCurrencyStore((state) => state.currency);
  
  // State for converted USD values (async conversion)
  const [fromUsdValueFormatted, setFromUsdValueFormatted] = useState<string>("$0");
  const [toUsdValueFormatted, setToUsdValueFormatted] = useState<string>("$0");

  // Local UI state for wallet/address modals
  const [isFromWalletModalOpen, setIsFromWalletModalOpen] = useState(false);
  const [isToAddressModalOpen, setIsToAddressModalOpen] = useState(false);
  const [isConnectingFromSection, setIsConnectingFromSection] = useState(false);
  
  // Show error toast when quote error occurs
  useEffect(() => {
    if (quoteError) {
      const parsed = parseRouteError(quoteError);
      
      // Convert RouteErrorAction[] to ErrorToastAction[]
      const toastActions: ErrorToastAction[] | undefined = parsed.actions?.map((action) => ({
        label: action.label,
        onClick: () => {
          // Switch to fixed mode and set the suggested slippage tolerance
          setSlippageMode('fixed');
          setSlippageTolerance(action.slippageTolerance);
          console.log(`[SwapPage] Updated slippage tolerance to ${action.slippageTolerance}%`);
        },
        variant: 'primary' as const,
      }));
      
      setErrorInfo({ 
        title: parsed.title, 
        message: parsed.message, 
        nextSteps: parsed.nextSteps,
        actions: toastActions,
      });
      setIsErrorToastOpen(true);
    } else {
      setIsErrorToastOpen(false);
    }
  }, [quoteError, setSlippageMode, setSlippageTolerance]);

  

  // ===== Event Handlers =====
  
  const handleTabChange = (tab: "swap" | "limit") => {
    setActiveTab(tab);
  };

  const handleFromTokenSelect = () => {
    setTokenModalType("from");
    setIsTokenModalOpen(true);
  };

  const handleToTokenSelect = () => {
    setTokenModalType("to");
    setIsTokenModalOpen(true);
  };

  const handleTokenSelect = (token: Token) => {
    if (tokenModalType === "from") {
      setFromToken(token);
      // TODO: When token changes, make API call with new token address and current amount
      // Example: if (fromAmount) { fetchQuote(token.address, fromAmount); } 
    } else {
      setToToken(token);
    }
    setIsTokenModalOpen(false);
  };

  const handleFromAmountChange = (value: string) => {
    // Sanitize input and update store
    // This sets activeInput to 'from' automatically
    const sanitized = sanitizeDecimal(value);
    setFromAmount(sanitized);
    
    // When user clears input, clear both fields (user requirement)
    if (sanitized === '') {
      const setToAmount = useSwapStore.getState().setToAmount;
      setToAmount('');
    }
  };

  const handleToAmountChange = (value: string) => {
    // Sanitize input and update store
    // This sets activeInput to 'to' automatically (for reverse routing)
    const sanitized = sanitizeDecimal(value);
    const setToAmount = useSwapStore.getState().setToAmount;
    setToAmount(sanitized);
    
    // When user clears input, clear both fields (user requirement)
    if (sanitized === '') {
      setFromAmount('');
    }
  };

  const handleLimitPriceChange = (value: string) => {
    setLimitPrice(sanitizeDecimal(value));
  };

  const handleMaxClick = () => {
    // Set fromAmount to the full token balance from Moralis
    if (fromTokenBalance && !fromTokenBalance.isLoading && fromTokenBalance.balanceFormatted) {
      // Use balanceFormatted which is already formatted with proper decimals
      setFromAmount(fromTokenBalance.balanceFormatted);
    }
  };

  // Handle swap tokens button (middle arrow) - swaps tokens, amounts, and addresses
  const handleSwapTokens = () => {
    // Only swap if both tokens are selected
    if (!fromToken || !toToken) {
      return;
    }

    // Store current values before swap
    const currentFromAddress = connectedAddress;
    const currentToAddress = recipientAddress;
    const currentFromToken = fromToken;
    const currentToToken = toToken;

    // Swap tokens and amounts in the store
    swapTokens();

    // Swap addresses: fromAddress (connectedAddress) ↔ toAddress (recipientAddress)
    // After swap:
    // - New fromToken (was toToken) needs the address that was previously the toAddress
    // - New toToken (was fromToken) needs the address that was previously the fromAddress
    
    // The new fromToken is the old toToken
    const newFromToken = currentToToken;
    // The new toToken is the old fromToken
    const newToToken = currentFromToken;

    // Swap recipient address
    // If there was a recipient address and it's compatible with the new fromToken, keep it
    // Otherwise, set recipient to the old fromAddress if it's compatible with new toToken
    if (currentToAddress && newFromToken?.chainId && isAddressChainCompatible(currentToAddress, newFromToken.chainId)) {
      // Old recipient is compatible with new fromToken - this becomes the new "from" address
      // But we can't change connectedAddress directly, so we'll just update recipient
      // The new recipient should be the old fromAddress if compatible with new toToken
      if (currentFromAddress && newToToken?.chainId && isAddressChainCompatible(currentFromAddress, newToToken.chainId)) {
        setRecipientAddress(currentFromAddress);
      } else {
        // Old fromAddress not compatible with new toToken, clear recipient
        setRecipientAddress(null);
      }
    } else {
      // Old recipient was null or incompatible
      // Set new recipient to old fromAddress if compatible with new toToken
      if (currentFromAddress && newToToken?.chainId && isAddressChainCompatible(currentFromAddress, newToToken.chainId)) {
        setRecipientAddress(currentFromAddress);
      } else {
        setRecipientAddress(null);
      }
    }
  };

  // Sync recipient address with secondary wallet/address changes
  // IMPORTANT: Only sync if user hasn't manually changed the recipient
  // This prevents overwriting pasted addresses (e.g., Solana addresses)
  useEffect(() => {
    // Don't overwrite if user has manually set a recipient address
    if (userChangedRecipientRef.current) {
      return;
    }
    
    const newRecipient = effectiveRecipientAddress || connectedAddress;
    if (newRecipient !== recipientAddress) {
      // Only update if it's compatible with current toToken
      if (!toToken?.chainId || !newRecipient || isAddressChainCompatible(newRecipient, toToken.chainId)) {
        setRecipientAddress(newRecipient);
      }
    }
  }, [effectiveRecipientAddress, connectedAddress, toToken?.chainId, recipientAddress]);

  // Handle recipient change with chain compatibility + user override tracking
  const handleRecipientChange = (address: string | null) => {
    // If address is set, check compatibility with toToken
    if (address && toToken?.chainId) {
      if (!isAddressChainCompatible(address, toToken.chainId)) {
        // Incompatible - clear address
        console.log("[SwapPage] Recipient address incompatible with token chain, clearing");
        setRecipientAddress(null);
        return;
      }
    }

    // Track if user has manually changed recipient away from primary wallet
    if (address && connectedAddress && address.toLowerCase() === connectedAddress.toLowerCase()) {
      userChangedRecipientRef.current = false;
    } else {
      userChangedRecipientRef.current = true;
    }

    setRecipientAddress(address);
  };

  // Calculate To wallet icon based on recipient address
  // For To wallet icon: use secondary wallet icon if recipient matches secondary wallet address
  // Otherwise, if recipient matches primary wallet, use primary wallet icon
  // Manual addresses won't have icons
  const toWalletIcon = useMemo(() => {
    if (!recipientAddress) return null;
    
    if (secondaryWallet && recipientAddress.toLowerCase() === secondaryWallet.address.toLowerCase()) {
      return getWalletIconFromAccount(secondaryWallet);
    }
    
    if (primaryWallet && recipientAddress.toLowerCase() === primaryWallet.address.toLowerCase()) {
      return getWalletIconFromAccount(primaryWallet);
    }
    
    // Manual address - no icon
    return null;
  }, [recipientAddress, secondaryWallet, primaryWallet]);

  // Check chain compatibility when tokens change and auto-clear incompatible selections
  useEffect(() => {
    // Check fromToken compatibility with connected address
    // If incompatible, clear the selection (user needs to connect/paste compatible wallet)
    if (fromToken?.chainId && connectedAddress) {
      if (!isAddressChainCompatible(connectedAddress, fromToken.chainId)) {
        console.log('[SwapPage] Connected address is incompatible with fromToken chain, clearing selection');
        // Note: We don't clear connectedAddress itself, just note it's incompatible
        // The wallet dropdown will hide it, and useSwapQuote won't use it
      }
    }

    // Check toToken compatibility with recipient address
    // If incompatible, automatically clear recipient address
    if (toToken?.chainId && recipientAddress) {
      if (!isAddressChainCompatible(recipientAddress, toToken.chainId)) {
        console.log('[SwapPage] Recipient address incompatible with toToken chain, auto-clearing');
        setRecipientAddress(null);
      }
    }
  }, [fromToken, toToken, connectedAddress, recipientAddress]);
  const [isExecutingTransfer, setIsExecutingTransfer] = useState(false);
  // Toast state for swap status
  const [toastState, setToastState] = useState<{
    open: boolean;
    stage: SwapStage;
    message: string;
    txHash?: string;
    chainId?: number;
  } | null>(null);

    // Swap execution hook
    const {
      execute: executeSwap,
      isExecuting: isExecutingSwap,
      status: swapStatus,
      error: swapError,
      reset: resetSwapExecution,
    } = useSwapExecution();

  // Sync swap execution status with toast system
  useEffect(() => {
    if (swapStatus) {
      setToastState({
        open: true,
        stage: swapStatus.stage,
        message: swapStatus.message,
        txHash: swapStatus.txHash,
        chainId: fromToken?.chainId,
      });

      // On success, clear amounts and show success toast with explorer link
      if (swapStatus.stage === 'completed') {
        // Clear amounts
        setFromAmount('');
        setToAmount('');
      }
    }
  }, [swapStatus, fromToken?.chainId, setFromAmount, setToAmount]);

  // Handle swap execution errors
  useEffect(() => {
    if (swapError) {
      const errorMessage = swapError.message || "Swap failed. Please try again.";
      setToastState({
        open: true,
        stage: 'failed',
        message: errorMessage,
      });
    }
  }, [swapError]);
  const prevConnectedAddressRef = useRef<string | null>(connectedAddress);
  const userChangedRecipientRef = useRef(false);

  // Update recipient address to primary wallet when primary wallet connects or changes
  // Only auto-update if user hasn't manually changed it
  useEffect(() => {
    const prevAddress = prevConnectedAddressRef.current;
    
    // If user hasn't manually changed recipient, auto-update to primary wallet
    if (!userChangedRecipientRef.current) {
      if (connectedAddress) {
        setRecipientAddress(connectedAddress);
      } else {
        setRecipientAddress(null);
      }
    } else {
      // User has manually changed recipient
      // Only update if the recipient was set to the previous primary wallet address
      if (prevAddress && recipientAddress && recipientAddress.toLowerCase() === prevAddress.toLowerCase()) {
        // Recipient was set to old primary wallet, update to new one
        if (connectedAddress) {
          setRecipientAddress(connectedAddress);
        } else {
          setRecipientAddress(null);
        }
      }
    }
    
    // Update ref for next comparison
    prevConnectedAddressRef.current = connectedAddress;
  }, [connectedAddress, recipientAddress]);

  const handleSwapClick = async () => {
    // Check if this is a wallet-to-wallet transfer (same token, same chain, different recipient)
    const isSameToken = fromToken && toToken && 
      fromToken.address.toLowerCase() === toToken.address.toLowerCase();
    const isSameChain = fromToken?.chainId === toToken?.chainId;
    const hasRecipient = recipientAddress && recipientAddress.toLowerCase() !== connectedAddress?.toLowerCase();
    
    // Check if it's a wallet-to-wallet transfer
    if (isSameToken && isSameChain && hasRecipient && connectedAddress) {
      await executeWalletToWalletTransfer();
      return;
    }
    
    // Execute swap using swap executor
    await executeSwapTransaction();
  };

  /**
   * Execute swap transaction using the swap executor
   */
  const executeSwapTransaction = async () => {
    // Validate prerequisites
    if (!fromToken || !toToken || !fromAmount || !connectedAddress) {
      setToastState({
        open: true,
        stage: 'failed',
        message: "Please select tokens and enter an amount",
      });
      return;
    }

    if (!route) {
      setToastState({
        open: true,
        stage: 'failed',
        message: "Please wait for quote to load",
      });
      return;
    }

    // Validate route hasn't expired
    const now = Math.floor(Date.now() / 1000);
    if (route.expiresAt && now >= route.expiresAt) {
      setToastState({
        open: true,
        stage: 'failed',
        message: "Quote has expired. Please get a new quote.",
      });
      // Optionally trigger a new quote fetch here
      return;
    }

    // Validate fromAmount is greater than 0
    const fromAmountNum = parseNumber(fromAmount);
    if (fromAmountNum <= 0) {
      setToastState({
        open: true,
        stage: 'failed',
        message: "Please enter a valid amount",
      });
      return;
    }

    try {
      setIsExecutingTransfer(true);

      // Execute swap using the swap executor
      const result = await executeSwap({
        route,
        fromToken,
        toToken,
        fromAmount,
        userAddress: connectedAddress,
        recipientAddress: recipientAddress || undefined,
        isFeeOnTransfer: true,
      });

      // Success - toast will be shown via swapStatus effect
      // Amounts will be cleared via swapStatus effect
      // Note: Balances will automatically refresh via useTokenBalance hook
      // The hook watches for changes and will refetch when needed
    } catch (error: any) {
      console.error("Swap execution error:", error);
      
      // Extract user-friendly error message
      let errorMessage = "Swap failed. Please try again.";
      if (error?.message) {
        errorMessage = error.message;
      } else if (typeof error === 'string') {
        errorMessage = error;
      }

      setToastState({
        open: true,
        stage: 'failed',
        message: errorMessage,
      });
    } finally {
      setIsExecutingTransfer(false);
    }
  };

  const executeWalletToWalletTransfer = async () => {
    if (!fromToken || !toToken || !fromAmount || !recipientAddress || !connectedAddress) {
      return;
    }

    setIsExecutingTransfer(true);
    setToastState({
      open: true,
      stage: 'preparing',
      message: "Preparing transfer...",
    });

    try {
      const chainId = fromToken.chainId;
      const isSolana = chainId === 7565164; // Solana chain ID

      if (isSolana) {
        // Solana transfer
        await executeSolanaTransfer();
      } else {
        // EVM transfer
        await executeEVMTransfer();
      }
    } catch (error: any) {
      console.error("Error executing transfer:", error);
      setToastState({
        open: true,
        stage: 'failed',
        message: error.message || "Transfer failed",
      });
    } finally {
      setIsExecutingTransfer(false);
    }
  };

  const executeSolanaTransfer = async () => {
    if (!fromToken || !fromAmount || !recipientAddress) return;
    
    if (fromToken.decimals === undefined) {
      throw new Error("Token decimals not available");
    }

    setToastState({
      open: true,
      stage: 'preparing',
      message: "Preparing Solana transfer...",
    });

    const { getSolanaWallet } = await import("@/lib/wallet/utils/solana");
    const { transferSOL, transferSPLToken, toSmallestUnit, NATIVE_SOL_MINT } = await import("@/lib/wallet/utils/transfer");

    const solanaWallet = await getSolanaWallet();
    if (!solanaWallet || !solanaWallet.isConnected || !solanaWallet.publicKey) {
      throw new Error("Please connect your Solana wallet first");
    }

    const amountForTransfer = BigInt(toSmallestUnit(fromAmount, fromToken.decimals));
    const isNativeSOL = fromToken.address === NATIVE_SOL_MINT || 
                       fromToken.address.toLowerCase() === NATIVE_SOL_MINT.toLowerCase();

    if (isNativeSOL) {
      setToastState({
        open: true,
        stage: 'signing',
        message: "Sending SOL...",
      });
      const signature = await transferSOL(solanaWallet, recipientAddress, amountForTransfer);
      
      setToastState({
        open: true,
        stage: 'confirming',
        message: "Waiting for confirmation...",
      });
      
      // Wait a bit for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setToastState({
        open: true,
        stage: 'completed',
        message: `Transfer successful! Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
        txHash: signature,
        chainId: fromToken.chainId,
      });
      
      // Clear amounts on success
      setFromAmount('');
      setToAmount('');
    } else {
      setToastState({
        open: true,
        stage: 'signing',
        message: "Sending SPL token...",
      });
      const signature = await transferSPLToken(solanaWallet, fromToken.address, recipientAddress, amountForTransfer);
      
      setToastState({
        open: true,
        stage: 'confirming',
        message: "Waiting for confirmation...",
      });
      
      // Wait a bit for confirmation
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setToastState({
        open: true,
        stage: 'completed',
        message: `Transfer successful! Signature: ${signature.slice(0, 8)}...${signature.slice(-8)}`,
        txHash: signature,
        chainId: fromToken.chainId,
      });
      
      // Clear amounts on success
      setFromAmount('');
      setToAmount('');
    }
  };

  const executeEVMTransfer = async () => {
    if (!fromToken || !fromAmount || !recipientAddress || !connectedAddress) return;
    
    if (fromToken.chainId === undefined) {
      throw new Error("Token chain ID not available");
    }
    
    if (fromToken.decimals === undefined) {
      throw new Error("Token decimals not available");
    }

    setToastState({
      open: true,
      stage: 'preparing',
      message: "Preparing EVM transfer...",
    });

    // Get wallet client - this will need to be implemented based on your wsallet connection setup
    // For now, we'll use a placeholder that needs to be connected to your actual wallet system
    const { createWalletClient, custom } = await import("viem");
    const { mainnet, arbitrum, optimism, polygon, base, bsc } = await import("viem/chains");
    
    const chainMap: Record<number, any> = {
      1: mainnet,
      42161: arbitrum,
      10: optimism,
      137: polygon,
      8453: base,
      56: bsc,
    };

    const chain = chainMap[fromToken.chainId];
    if (!chain) {
      throw new Error(`Unsupported chain: ${fromToken.chainId}`);
    }

    // Get provider from window (MetaMask, etc.)
    if (typeof window === "undefined" || !(window as any).ethereum) {
      throw new Error("No Ethereum wallet found. Please install MetaMask or another wallet.");
    }

    const provider = (window as any).ethereum;
    const walletClient = createWalletClient({
      chain,
      transport: custom(provider),
      account: connectedAddress as `0x${string}`,
    });

    const { transferNativeToken, transferERC20Token, isNativeToken, toSmallestUnit, getPublicClient } = await import("@/lib/wallet/utils/transfer");
    
    const amountForTransfer = BigInt(toSmallestUnit(fromAmount, fromToken.decimals));

    if (isNativeToken(fromToken.address)) {
      setToastState({
        open: true,
        stage: 'signing',
        message: "Sending native token...",
      });
      const hash = await transferNativeToken(walletClient, recipientAddress, amountForTransfer);
      
      setToastState({
        open: true,
        stage: 'confirming',
        message: "Waiting for confirmation...",
      });
      const publicClient = getPublicClient(fromToken.chainId);
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: hash as `0x${string}`,
        timeout: 60000,
      });
      
      if (receipt.status === "reverted") {
        throw new Error("Transfer reverted");
      }
      
      setToastState({
        open: true,
        stage: 'completed',
        message: `Transfer successful! Transaction: ${hash.slice(0, 6)}...${hash.slice(-4)}`,
        txHash: hash,
        chainId: fromToken.chainId,
      });
      
      // Clear amounts on success
      setFromAmount('');
      setToAmount('');
    } else {
      setToastState({
        open: true,
        stage: 'preparing',
        message: "Preparing ERC20 transfer...",
      });
      const hash = await transferERC20Token(walletClient, fromToken.address, recipientAddress, amountForTransfer);
      
      setToastState({
        open: true,
        stage: 'confirming',
        message: "Waiting for confirmation...",
      });
      const publicClient = getPublicClient(fromToken.chainId);
      const receipt = await publicClient.waitForTransactionReceipt({ 
        hash: hash as `0x${string}`,
        timeout: 60000,
      });
      
      if (receipt.status === "reverted") {
        throw new Error("Transfer reverted");
      }
      
      setToastState({
        open: true,
        stage: 'completed',
        message: `Transfer successful! Transaction: ${hash.slice(0, 6)}...${hash.slice(-4)}`,
        txHash: hash,
        chainId: fromToken.chainId,
      });
      
      // Clear amounts on success
      setFromAmount('');
      setToAmount('');
    }
  };

  // Get connected provider IDs for filtering
  const connectedProviders = connectedWallets.map(w => w.provider);
  
  const handleConnectClick = () => {
    setIsConnectingFromSection(false);
    openModal();
  };
  
  // Handler for connecting additional wallet from "From" section
  const handleConnectFromSection = () => {
    setIsConnectingFromSection(true);
    openModal();
  };
  
  // Helper to determine chain from wallet ID
  const getChainForWallet = (walletId: string): 'ethereum' | 'solana' => {
    const solanaOnlyWallets = ['solflare', 'glow', 'slope', 'nightly', 'jupiter', 'phantom'];
    if (solanaOnlyWallets.some(w => walletId.toLowerCase().includes(w.toLowerCase()))) {
      return 'solana';
    }
    return 'ethereum';
  };
  
  // Unified wallet connection handler
  const handleWalletConnect = async (walletType: any) => {
    try {
      if (isConnectingFromSection && connectedWallets.length > 0) {
        // Connecting from "From" section with existing wallets - use connectAdditionalWallet
        let walletId: string;
        let chain: 'ethereum' | 'solana' = 'ethereum';
        
        if (typeof walletType === 'string') {
          // Simple wallet ID string
          walletId = walletType;
          chain = getChainForWallet(walletId);
        } else if (walletType && typeof walletType === 'object') {
          // WalletConnectWallet object
          walletId = walletType.id || walletType.name?.toLowerCase() || '';
          chain = getChainForWallet(walletId);
        } else {
          throw new Error('Invalid wallet type');
        }
        
        await connectAdditionalWallet(walletId, chain, true);
        setIsConnectingFromSection(false);
        closeModal();
      } else {
        // Regular connection (first wallet or from other places)
        await connectWallet(walletType);
        setIsConnectingFromSection(false);
      }
    } catch (error) {
      console.error('[SwapPage] Error connecting wallet:', error);
      setIsConnectingFromSection(false);
    }
  };


  // Calculate USD values from route response or token prices
  const fromAmountNum = parseNumber(fromAmount);
  const toAmountNum = parseNumber(toAmount);
  const limitPriceNum = parseNumber(limitPrice);

  // Calculate fromToken USD value
  // Priority: route.fromToken.amountUSD > fromAmount × fromToken.price (from API)
  const getFromTokenUSD = (): string | undefined => {
    // First priority: Use USD value from route (most accurate, from quote)
    if (route?.fromToken.amountUSD) {
      const usd = parseFloat(route.fromToken.amountUSD);
      if (!isNaN(usd) && usd > 0) {
        return route.fromToken.amountUSD;
      }
    }
    
    // Second priority: Calculate from token price (if available)
    if (fromAmountNum > 0 && fromToken?.price) {
      const price = parseFloat(fromToken.price);
      if (!isNaN(price) && price > 0) {
        const calculated = (fromAmountNum * price).toFixed(2);
        // Only return if calculated value is meaningful (> 0)
        if (parseFloat(calculated) > 0) {
          return calculated;
        }
      }
    }
    
    return undefined;
  };

  // Calculate toToken USD value
  // Priority: route.toToken.amountUSD > toAmount × toToken.price (from API)
  const getToTokenUSD = (): string | undefined => {
    // First priority: Use USD value from route (most accurate, from quote)
    if (route?.toToken.amountUSD) {
      const usd = parseFloat(route.toToken.amountUSD);
      if (!isNaN(usd) && usd > 0) {
        return route.toToken.amountUSD;
      }
    }
    
    // Second priority: Calculate from token price (if available)
    if (toAmountNum > 0 && toToken?.price) {
      const price = parseFloat(toToken.price);
      if (!isNaN(price) && price > 0) {
        const calculated = (toAmountNum * price).toFixed(2);
        // Only return if calculated value is meaningful (> 0)
        if (parseFloat(calculated) > 0) {
          return calculated;
        }
      }
    }
    
    return undefined;
  };

  // Convert and format USD values based on currency preference
  useEffect(() => {
    const updateUSDValues = async () => {
      if (isQuoteLoading) {
        setToUsdValueFormatted("Fetching quote...");
        return;
      }

      const fromUSD = getFromTokenUSD();
      const toUSD = getToTokenUSD();

      if (fromUSD) {
        const formatted = await convertAndFormatUSD(fromUSD, currency);
        setFromUsdValueFormatted(formatted);
      } else {
        setFromUsdValueFormatted(currency === 'USD' ? "$0" : await convertAndFormatUSD("0", currency));
      }

      if (toUSD) {
        const formatted = await convertAndFormatUSD(toUSD, currency);
        setToUsdValueFormatted(formatted);
      } else {
        setToUsdValueFormatted(currency === 'USD' ? "$0" : await convertAndFormatUSD("0", currency));
      }
    };

    updateUSDValues();
  }, [fromAmount, toAmount, route, currency, isQuoteLoading, fromToken, toToken, fromToken?.price, toToken?.price]);

  const limitPriceUsd = calculateLimitPriceUsd(limitPriceNum);

  return (
    <div className="2xl:container mx-auto px-4 sm:px-6 md:px-8 lg:px-10 py-4 sm:py-5 md:py-6 lg:py-8 relative z-20 min-h-screen">
      {/* Cards Container - Relative positioning for background elements tied to cards */}
      <div className="relative z-30">
        {/* Background elements positioned relative to cards container */}
        {/* <SwapBackgroundElements /> */}

        <div className="flex flex-col lg:flex-row lg:items-start gap-3 sm:gap-4 lg:gap-5 xl:gap-6 relative z-30 pb-[80px] sm:pb-[95px] md:pb-[110px] lg:pb-[125px] xl:pb-[145px] 2xl:pb-[160px]">
          {/* Chart Section - Left Side (Desktop) */}
          <div className="flex-1 order-2 lg:order-1 hidden lg:block relative z-30">
            <TradingChart 
              fromToken={fromToken}
              toToken={toToken}
            />
          </div>

          {/* Swap / Limit Interface - Right Side (Desktop) */}
          <div className="w-full lg:w-[480px] xl:w-[540px] 2xl:w-[606px] order-1 lg:order-2 relative z-30">
            {/* Mobile Chart Section */}
            <div className="lg:hidden mb-3 sm:mb-4 relative z-30">
              <TradingChart 
                fromToken={fromToken}
                toToken={toToken}
              />
            </div>

            {/* Swap / Limit Card */}
            <SwapCard
              activeTab={activeTab}
              fromToken={fromToken ? {
                symbol: fromToken.symbol,
                chain: fromToken.chain,
                icon: fromToken.logo,
                chainBadge: fromToken.chainLogo,
                chainId: fromToken.chainId,
                address: fromToken.address,
              } : undefined}
              toToken={toToken ? {
                symbol: toToken.symbol,
                chain: toToken.chain,
                icon: toToken.logo,
                chainBadge: toToken.chainLogo,
                chainId: toToken.chainId,
                address: toToken.address,
              } : undefined}
              fromBalance={fromTokenBalance.balanceFormatted || "0.00"}
              fromBalanceLoading={fromTokenBalance.isLoading}
              fromAmount={fromAmount}
              fromUsdValue={fromUsdValueFormatted}
              toBalance={toTokenBalance.balanceFormatted || "0.00"}
              toBalanceLoading={toTokenBalance.isLoading}
              toAmount={toAmount}
              toUsdValue={toUsdValueFormatted}
              limitPrice={limitPrice}
              limitPriceUsd={limitPriceUsd}
              expires={expires}
              recipientAddress={recipientAddress}
              onRecipientChange={handleRecipientChange}
              connectedAddress={connectedAddress}
              fromWalletIcon={fromWalletIcon}
              toWalletIcon={toWalletIcon}
              onToWalletClick={() => {
                // Open recipient wallet selector - this will be handled by RecipientWalletSelector
                // For now, we can trigger the modal via the selector component
              }}
              onTabChange={handleTabChange}
              onFromTokenSelect={handleFromTokenSelect}
              onToTokenSelect={handleToTokenSelect}
              onFromAmountChange={handleFromAmountChange}
              onToAmountChange={handleToAmountChange}
              onLimitPriceChange={handleLimitPriceChange}
              onExpiresChange={setExpires}
              onMaxClick={handleMaxClick}
              onSwapClick={handleSwapClick}
              onSwapTokens={handleSwapTokens}
              onConnectClick={handleConnectClick}
              onConnectFromSection={handleConnectFromSection}
              isConnected={!!connectedAddress}
              isExecutingTransfer={isExecutingTransfer || isExecutingSwap}
            />
          </div>
        </div>
      </div>

      {/* Connect Wallet Modal */}
      <ConnectWalletModal
        open={isModalOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsConnectingFromSection(false);
          }
          closeModal();
        }}
        onWalletConnect={handleWalletConnect}
        onOpenExplorer={openExplorer}
        excludeProviders={connectedProviders}
      />

      {/* Wallet Explorer Modal */}
      <WalletExplorerModal
        open={isExplorerOpen}
        onOpenChange={closeExplorer}
        onWalletConnect={handleWalletConnect}
        excludeProviders={connectedProviders}
      />

      {/* Chain Selection Modal */}
      {pendingWallet && (
        <ChainSelectionModal
          open={isChainSelectionOpen}
          onOpenChange={(open) => {
            if (!open) {
              handleChainModalBack();
            }
          }}
          wallet={pendingWallet}
          onChainSelect={selectChain}
          onBack={handleChainModalBack}
        />
      )}

      {/* Wallet Connected Toast */}
      {connectedAddress && (
        <WalletConnectedToast
          address={connectedAddress}
          open={isToastOpen}
          onOpenChange={closeToast}
          duration={5000}
        />
      )}

      {/* Token Selector Modal */}
      <TokenSelectorModal
        open={isTokenModalOpen}
        onOpenChange={setIsTokenModalOpen}
        onTokenSelect={handleTokenSelect}
        selectedToken={tokenModalType === "from" ? fromToken : toToken}
        connectedAddress={connectedAddress}
        recipientAddress={recipientAddress}
        tokenModalType={tokenModalType}
      />

      {/* Error Toast */}
      {errorInfo && (
        <ErrorToast
          title={errorInfo.title}
          message={errorInfo.message}
          nextSteps={errorInfo.nextSteps}
          actions={errorInfo.actions}
          open={isErrorToastOpen}
          onOpenChange={setIsErrorToastOpen}
          duration={10000} // 10 seconds for routing errors
        />
      )}

      {/* Wallet Connection Error Toast */}
      {walletError && (
        <ErrorToast
          title="Wallet connection error"
          message={walletError}
          open={!!walletError}
          onOpenChange={(open) => {
            if (!open) {
              clearWalletError();
            }
          }}
          duration={6000}
        />
      )}

      {/* Swap Status Toast */}
      {toastState && (
        <SwapStatusToast
          open={toastState.open}
          onOpenChange={(open) => {
            if (!open) {
              setToastState(null);
            } else {
              setToastState({ ...toastState, open });
            }
          }}
          stage={toastState.stage}
          message={toastState.message}
          txHash={toastState.txHash}
          chainId={toastState.chainId}
        />
      )}
    </div>
  );
}