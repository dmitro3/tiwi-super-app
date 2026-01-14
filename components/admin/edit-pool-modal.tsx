"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline, IoCloseOutline } from "react-icons/io5";
import { useChains } from "@/hooks/useChains";

interface EditPoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  poolData: any;
}

export default function EditPoolModal({
  open,
  onOpenChange,
  poolData,
}: EditPoolModalProps) {
  const { chains, isLoading: chainsLoading } = useChains();
  
  // Step 1 fields
  const [selectedChain, setSelectedChain] = useState<{ id: number; name: string } | null>(null);
  const [tokenAddress, setTokenAddress] = useState("");
  const [minStakingPeriod, setMinStakingPeriod] = useState("");
  const [minStakeAmount, setMinStakeAmount] = useState("");
  const [maxStakeAmount, setMaxStakeAmount] = useState("");
  const [showChainDropdown, setShowChainDropdown] = useState(false);
  
  // Step 2 fields
  const [stakeModificationFee, setStakeModificationFee] = useState(false);
  const [timeBoost, setTimeBoost] = useState(false);
  const [country, setCountry] = useState("");
  const [stakePoolCreationFee, setStakePoolCreationFee] = useState("0.15");
  const [rewardPoolCreationFee, setRewardPoolCreationFee] = useState("");

  const chainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && poolData) {
      // Set chain
      if (poolData.chain && chains.length > 0) {
        const chain = chains.find(c => c.name === poolData.chain || c.id === poolData.chainId);
        if (chain) {
          setSelectedChain({ id: chain.id, name: chain.name });
        }
      }
      
      setTokenAddress(poolData.tokenAddress || "");
      setMinStakingPeriod(poolData.minStakingPeriod || "");
      setMinStakeAmount(poolData.minStakeAmount || "");
      setMaxStakeAmount(poolData.maxStakeAmount || "");
      setStakeModificationFee(poolData.stakeModificationFee || false);
      setTimeBoost(poolData.timeBoost || false);
      setCountry(poolData.country || "");
      setStakePoolCreationFee(poolData.stakePoolCreationFee || "0.15");
      setRewardPoolCreationFee(poolData.rewardPoolCreationFee || "");
    }
  }, [open, poolData, chains]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chainRef.current && !chainRef.current.contains(event.target as Node)) {
        setShowChainDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleTimeBoostToggle = () => {
    setTimeBoost(!timeBoost);
  };

  const handleSave = async () => {
    if (!poolData?.id || !selectedChain || !tokenAddress || !minStakeAmount) {
      alert("Please fill in all required fields");
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await fetch("/api/v1/staking-pools", {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: poolData.id,
          chainId: selectedChain.id,
          chainName: selectedChain.name,
          tokenAddress: tokenAddress.trim(),
          tokenSymbol: undefined,
          tokenName: undefined,
          tokenLogo: undefined,
          minStakingPeriod: minStakingPeriod || undefined,
          minStakeAmount: parseFloat(minStakeAmount) || 0,
          maxStakeAmount: maxStakeAmount ? parseFloat(maxStakeAmount) : undefined,
          stakeModificationFee: stakeModificationFee,
          timeBoost: timeBoost,
          timeBoostConfig: timeBoost ? {} : undefined,
          country: country || undefined,
          stakePoolCreationFee: parseFloat(stakePoolCreationFee) || 0.15,
          rewardPoolCreationFee: rewardPoolCreationFee || undefined,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to update staking pool");
      }

      // Close modal and refresh
      onOpenChange(false);
      window.dispatchEvent(new Event("stakingPoolUpdated"));
    } catch (error: any) {
      console.error("Error updating staking pool:", error);
      alert(error.message || "Failed to update staking pool. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between mb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            Edit Staking Pool
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="flex items-center gap-2 text-[#b1f128] hover:text-[#9dd81f] transition-colors font-medium"
          >
            <IoCloseOutline className="w-5 h-5" />
            <span>Cancel</span>
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Chain Selection */}
          <div className="relative" ref={chainRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Chain Selection
            </label>
            <button
              onClick={() => {
                setShowChainDropdown(!showChainDropdown);
              }}
              disabled={chainsLoading}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <div className="flex items-center gap-2">
                {selectedChain ? (
                  <>
                    <span>{selectedChain.name}</span>
                  </>
                ) : (
                  <span className="text-[#7c7c7c]">Select chain</span>
                )}
              </div>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showChainDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {chains.map((chain) => (
                  <button
                    key={chain.id}
                    onClick={() => {
                      setSelectedChain({ id: chain.id, name: chain.name });
                      setShowChainDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors flex items-center gap-2"
                  >
                    <span>{chain.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Select Token */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Select Token
            </label>
            <input
              type="text"
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              placeholder="Token Address"
            />
          </div>

          {/* Minimum staking period */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Minimum staking period
            </label>
            <input
              type="text"
              value={minStakingPeriod}
              onChange={(e) => setMinStakingPeriod(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              placeholder="In"
            />
          </div>

          {/* Min Stake Amount */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Min Stake Amount
            </label>
            <input
              type="text"
              value={minStakeAmount}
              onChange={(e) => setMinStakeAmount(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              placeholder="0.00"
            />
          </div>

          {/* Max Stake Amount */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Max Stake Amount
            </label>
            <input
              type="text"
              value={maxStakeAmount}
              onChange={(e) => setMaxStakeAmount(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              placeholder="0.00"
            />
          </div>

          {/* Stake modification fee */}
          <div className="flex items-center justify-between">
            <label className="block text-[#b5b5b5] text-sm font-medium">
              Stake modification fee
            </label>
            <button
              onClick={() => setStakeModificationFee(!stakeModificationFee)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                stakeModificationFee ? "bg-[#b1f128]" : "bg-[#1f261e]"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  stakeModificationFee ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
          </div>

          {/* Time boost */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Time boost
            </label>
            <button
              onClick={handleTimeBoostToggle}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-[#b1f128] hover:border-[#b1f128] transition-colors font-medium flex items-center justify-center gap-2"
            >
              {timeBoost ? "Reset Option" : "+ Add Option"}
            </button>
          </div>

          {/* Select your country */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Select your country
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              placeholder="Select country"
            />
          </div>

          {/* Fee Information */}
          <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-[#b5b5b5] text-sm">Stake Pool Creation Fee</span>
              <span className="text-white text-sm font-medium">
                {stakePoolCreationFee} {selectedChain?.name === "Ethereum" ? "ETH" : selectedChain?.name || "ETH"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#b5b5b5] text-sm">Reward Pool Creation Fee</span>
              <span className="text-white text-sm font-medium">
                {rewardPoolCreationFee || "%"}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end gap-4 pt-4 border-t border-[#1f261e]">
            <button
              onClick={() => onOpenChange(false)}
              className="px-6 py-2.5 text-[#b5b5b5] hover:text-white transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={isSubmitting}
              className="px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
