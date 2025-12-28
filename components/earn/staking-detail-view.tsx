"use client";

import { useState } from "react";
import Image from "next/image";
import { ArrowLeft, RefreshCw, X, Zap, AlertTriangle } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTokenBalance } from "@/hooks/useTokenBalance";
import { useWallet } from "@/lib/wallet/hooks/useWallet";
import { useSignMessage } from "wagmi";
import { useChainId } from "wagmi";
import TransactionToast from "./transaction-toast";
import type { StakingPool } from "@/data/mock-staking-pools";

interface StakingDetailViewProps {
  pool: StakingPool;
  onBack: () => void;
}

export default function StakingDetailView({ pool, onBack }: StakingDetailViewProps) {
  const [activeTab, setActiveTab] = useState<"boost" | "unstake">("boost");
  const [showBoostMessage, setShowBoostMessage] = useState(true);
  const [showUnstakeWarning, setShowUnstakeWarning] = useState(true);
  const [amount, setAmount] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [toastOpen, setToastOpen] = useState(false);
  const [toastSuccess, setToastSuccess] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [txHash, setTxHash] = useState<string | undefined>();
  const [txChainId, setTxChainId] = useState<number | undefined>();

  const { balance, isLoading: balanceLoading, refetch: refetchBalance } = useTokenBalance(pool.tokenSymbol);
  const { isConnected, address } = useWallet();
  const chainId = useChainId();
  const { signMessageAsync } = useSignMessage();

  const handleMaxClick = () => {
    if (balance && !balanceLoading) {
      setAmount(balance);
    }
  };

  const handleStakeNow = async () => {
    if (!isConnected || !address) {
      setToastSuccess(false);
      setToastMessage("Please connect your wallet first");
      setToastOpen(true);
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setToastSuccess(false);
      setToastMessage("Please enter a valid amount");
      setToastOpen(true);
      return;
    }

    if (parseFloat(amount) > parseFloat(balance)) {
      setToastSuccess(false);
      setToastMessage("Insufficient balance");
      setToastOpen(true);
      return;
    }

    setIsProcessing(true);

    try {
      // Create a message to sign
      const message = `TIWI Protocol acknowledges your staking contract for ${amount} ${pool.tokenSymbol}. This is a staking agreement.`;

      // Sign the message
      const signature = await signMessageAsync({
        message,
      });

      // Generate a mock transaction hash (in real implementation, this would come from the actual transaction)
      const mockTxHash = `0x${Array.from({ length: 64 }, () => 
        Math.floor(Math.random() * 16).toString(16)
      ).join('')}`;

      setTxHash(mockTxHash);
      setTxChainId(chainId);
      setToastSuccess(true);
      setToastMessage(`Successfully staked ${amount} ${pool.tokenSymbol}`);
      setToastOpen(true);
      
      // Reset form
      setAmount("");
      refetchBalance();
    } catch (error: any) {
      console.error("Transaction error:", error);
      setToastSuccess(false);
      setToastMessage(error.message || "Transaction failed. Please try again.");
      setToastOpen(true);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <>
      <div className="flex flex-col gap-6 items-center relative shrink-0 w-full max-w-[880px] mx-auto px-4 lg:px-0 staking-detail-enter">
        {/* Header with Back Button and Token - Centered as per Figma */}
        <div className="flex items-center justify-start relative shrink-0 w-full">
          <button
            onClick={onBack}
            className="cursor-pointer relative shrink-0 size-10 hover:opacity-80 transition-opacity"
            aria-label="Back"
          >
            <ArrowLeft className="size-10 text-white" />
          </button>
          <div className="flex gap-2 items-center relative shrink-0 mx-auto">
            <div className="relative shrink-0 size-10">
              <Image
                src={pool.tokenIcon}
                alt={pool.tokenSymbol}
                width={40}
                height={40}
                className="block max-w-none size-full rounded-full"
              />
            </div>
            <div className="flex flex-col items-start justify-center relative shrink-0">
              <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-base text-white whitespace-nowrap">
                {pool.tokenSymbol}
              </p>
            </div>
          </div>
        </div>

        {/* Stats Card */}
        <div className="bg-[#0b0f0a] border-[#273024] border-[0.5px] border-solid flex flex-col items-start overflow-clip p-4 relative rounded-xl shrink-0 w-full">
          <div className="flex gap-px items-center relative shrink-0 w-full">
            <div className="flex-1 flex flex-col items-center relative shrink-0">
              <div className="flex flex-col font-['Manrope',sans-serif] font-medium gap-1 items-center leading-normal relative shrink-0 text-center w-full">
                <p className="relative shrink-0 text-[#7c7c7c] text-xs tracking-[-0.48px] w-full">
                  TVL
                </p>
                <p className="relative shrink-0 text-sm text-white tracking-[-0.56px] w-full">
                  {pool.tvl || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-start relative shrink-0">
              <div className="flex flex-col font-['Manrope',sans-serif] font-medium gap-1 items-center leading-normal relative shrink-0 text-center w-full">
                <p className="relative shrink-0 text-[#7c7c7c] text-xs tracking-[-0.48px] w-full">
                  APR
                </p>
                <p className="relative shrink-0 text-sm text-white tracking-[-0.56px] w-full">
                  {pool.apr || pool.apy || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-start relative shrink-0">
              <div className="flex flex-col font-['Manrope',sans-serif] font-medium gap-1 items-center leading-normal relative shrink-0 text-center w-full">
                <p className="relative shrink-0 text-[#7c7c7c] text-xs tracking-[-0.48px] w-full">
                  Total Staked
                </p>
                <p className="relative shrink-0 text-sm text-white tracking-[-0.56px] w-full">
                  {pool.totalStaked || "N/A"}
                </p>
              </div>
            </div>
            <div className="flex-1 flex flex-col items-start relative shrink-0">
              <div className="flex flex-col font-['Manrope',sans-serif] font-medium gap-1 items-center leading-normal relative shrink-0 text-center w-full">
                <p className="relative shrink-0 text-[#7c7c7c] text-xs tracking-[-0.48px] w-full">
                  Limits
                </p>
                <p className="relative shrink-0 text-sm text-white tracking-[-0.56px] w-full">
                  {pool.limits || "N/A"}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabs Section - Exact Figma dimensions */}
        <div className="bg-[#0b0f0a] border-[#273024] border-[0.5px] border-solid flex flex-col h-[71px] items-start px-4 py-3.5 relative rounded-full shrink-0 w-full max-w-[881px]">
          <div className="flex gap-4 lg:gap-[233px] items-center justify-between relative shrink-0 w-full">
            <div className="bg-[#0b0f0a] flex items-center p-1 relative rounded-full shrink-0 w-full lg:w-[568px]">
              <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as "boost" | "unstake")} className="w-full">
                <TabsList className="bg-transparent p-0 h-[35px] w-full gap-0">
                  <TabsTrigger
                    value="boost"
                    className="data-[state=active]:bg-[#141e00] data-[state=active]:border-[#b1f128] data-[state=active]:border data-[state=active]:text-[#b1f128] text-[#7c7c7c] h-[35px] rounded-full px-4 py-1.5 text-sm font-medium flex-1 lg:w-[280px] border-0 cursor-pointer"
                  >
                    Boost
                  </TabsTrigger>
                  <TabsTrigger
                    value="unstake"
                    className="data-[state=active]:bg-[#141e00] data-[state=active]:border-[#b1f128] data-[state=active]:border data-[state=active]:text-[#b1f128] text-[#7c7c7c] h-[35px] rounded-full px-4 py-1.5 text-sm font-medium flex-1 lg:w-[280px] border-0 cursor-pointer"
                  >
                    Unstake
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            <button
              onClick={refetchBalance}
              className="bg-[#0b0f0a] h-[43px] overflow-clip relative rounded-[20px] shrink-0 w-12 flex items-center justify-center hover:opacity-80 transition-opacity"
              aria-label="Refresh"
            >
              <RefreshCw className="size-6 text-white" />
            </button>
          </div>
        </div>

        {/* Boost Message Banner */}
        {showBoostMessage && activeTab === "boost" && (
          <div className="bg-[rgba(73,143,0,0.15)] border-[#498f00] border-[0.5px] border-solid flex flex-col items-start overflow-clip px-4 py-3 relative rounded-xl shrink-0 w-full">
            <div className="flex items-start justify-between relative shrink-0 w-full">
              <div className="flex gap-2 items-center relative shrink-0">
                <Zap className="size-6 text-[#498f00]" />
                <p className="font-['Inter',sans-serif] font-normal leading-normal not-italic relative shrink-0 text-[#498f00] text-[10px] whitespace-pre-wrap">
                  Boost your earnings by extending your lock period or adding more tokens.
                </p>
              </div>
              <button
                onClick={() => setShowBoostMessage(false)}
                className="cursor-pointer relative shrink-0 size-4 hover:opacity-80 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="size-4 text-[#498f00]" />
              </button>
            </div>
          </div>
        )}

        {/* Unstake Warning Banner */}
        {showUnstakeWarning && activeTab === "unstake" && (
          <div className="bg-[rgba(255,68,68,0.15)] border-[#ff4444] border-[0.5px] border-solid flex flex-col items-start overflow-clip px-4 py-3 relative rounded-xl shrink-0 w-full">
            <div className="flex items-start justify-between relative shrink-0 w-full">
              <div className="flex gap-2 items-center relative shrink-0">
                <AlertTriangle className="size-6 text-[#ff4444]" />
                <p className="font-['Inter',sans-serif] font-normal leading-normal not-italic relative shrink-0 text-[#ff4444] text-[10px] whitespace-pre-wrap">
                  Unstaking initiates a 30-day cooldown, though you can cancel at any point.
                </p>
              </div>
              <button
                onClick={() => setShowUnstakeWarning(false)}
                className="cursor-pointer relative shrink-0 size-4 hover:opacity-80 transition-opacity"
                aria-label="Dismiss"
              >
                <X className="size-4 text-[#ff4444]" />
              </button>
            </div>
          </div>
        )}

        {/* Content Section - Changes based on active tab */}
        {activeTab === "boost" ? (
          /* Boost Tab - Add More Tokens Section */
          <div className="flex flex-col gap-6 lg:gap-7 items-center justify-center relative shrink-0 w-full max-w-[612px]">
            <p className="font-['Manrope',sans-serif] font-medium leading-normal relative shrink-0 text-base text-white w-full whitespace-pre-wrap text-left">
              Add More Tokens
            </p>
            <div className="flex flex-col gap-12 sm:gap-16 lg:gap-20 items-center justify-center relative shrink-0 w-full">
              <div className="h-[112px] relative shrink-0 w-full max-w-[606px]">
                <div className="absolute bg-[#010501] border border-[#1f261e] border-solid flex flex-col items-center justify-center left-0 px-0 py-6 rounded-2xl top-0 w-full">
                  <div className="flex flex-col items-center px-6 py-0 relative shrink-0 w-full">
                    <div className="border-[#7c7c7c] border-[0.2px] border-solid h-16 overflow-hidden relative rounded-2xl shrink-0 w-full max-w-[353px]">
                      <div className="absolute bg-[#b1f128] h-7 flex items-center justify-center right-4 px-4 py-1 rounded-full top-1/2 translate-y-[-50%]">
                        <button
                          onClick={handleMaxClick}
                          type="button"
                          className="flex flex-col font-['Manrope',sans-serif] font-medium justify-center leading-0 relative shrink-0 text-base text-black text-right whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          Max
                        </button>
                      </div>
                      <div className="absolute flex font-['Manrope',sans-serif] font-medium gap-1 items-end leading-0 left-4 text-right top-1.5 w-[180px]">
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="0.000"
                          className="bg-transparent border-0 p-0 text-[40px] text-white placeholder:text-[#7c7c7c] focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex flex-col h-6 justify-center relative shrink-0 text-sm text-white w-[33px]">
                          <p className="leading-normal whitespace-pre-wrap">{pool.tokenSymbol}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleStakeNow}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="bg-[#081f02] h-14 items-center justify-center px-6 py-4 relative rounded-full shrink-0 w-full max-w-[606px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-[#b1f128] text-lg text-center tracking-[0.018px] whitespace-pre-wrap">
                  {isProcessing ? "Processing..." : "Stake Now"}
                </p>
              </Button>
            </div>
          </div>
        ) : (
          /* Unstake Tab - Unstake Tokens Section */
          <div className="flex flex-col gap-6 lg:gap-7 items-center justify-center relative shrink-0 w-full max-w-[612px]">
            <p className="font-['Manrope',sans-serif] font-medium leading-normal relative shrink-0 text-base text-white w-full whitespace-pre-wrap text-left">
              Unstake Tokens
            </p>
            <div className="flex flex-col gap-12 sm:gap-16 lg:gap-20 items-center justify-center relative shrink-0 w-full">
              <div className="h-[112px] relative shrink-0 w-full max-w-[606px]">
                <div className="absolute bg-[#010501] border border-[#1f261e] border-solid flex flex-col items-center justify-center left-0 px-0 py-6 rounded-2xl top-0 w-full">
                  <div className="flex flex-col items-center px-6 py-0 relative shrink-0 w-full">
                    <div className="border-[#7c7c7c] border-[0.2px] border-solid h-16 overflow-hidden relative rounded-2xl shrink-0 w-full max-w-[353px]">
                      <div className="absolute bg-[#b1f128] h-7 flex items-center justify-center right-4 px-4 py-1 rounded-full top-1/2 translate-y-[-50%]">
                        <button
                          onClick={handleMaxClick}
                          type="button"
                          className="flex flex-col font-['Manrope',sans-serif] font-medium justify-center leading-0 relative shrink-0 text-base text-black text-right whitespace-nowrap cursor-pointer hover:opacity-80 transition-opacity"
                        >
                          Max
                        </button>
                      </div>
                      <div className="absolute flex font-['Manrope',sans-serif] font-medium gap-1 items-end leading-0 left-4 text-right top-1.5 w-[180px]">
                        <Input
                          type="number"
                          value={amount}
                          onChange={(e) => setAmount(e.target.value)}
                          onWheel={(e) => e.currentTarget.blur()}
                          placeholder="0.000"
                          className="bg-transparent border-0 p-0 text-[40px] text-white placeholder:text-[#7c7c7c] focus-visible:ring-0 focus-visible:ring-offset-0 w-full h-auto [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        />
                        <div className="flex flex-col h-6 justify-center relative shrink-0 text-sm text-white w-[33px]">
                          <p className="leading-normal whitespace-pre-wrap">{pool.tokenSymbol}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              <Button
                onClick={handleStakeNow}
                disabled={isProcessing || !amount || parseFloat(amount) <= 0}
                className="bg-[#081f02] h-14 items-center justify-center px-6 py-4 relative rounded-full shrink-0 w-full max-w-[606px] hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <p className="font-['Manrope',sans-serif] font-semibold leading-normal relative shrink-0 text-[#b1f128] text-lg text-center tracking-[0.018px] whitespace-pre-wrap">
                  {isProcessing ? "Processing..." : "Unstake"}
                </p>
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Transaction Toast */}
      <TransactionToast
        open={toastOpen}
        onOpenChange={setToastOpen}
        success={toastSuccess}
        message={toastMessage}
        txHash={txHash}
        chainId={txChainId}
      />
    </>
  );
}

