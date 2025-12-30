"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline, IoCalendarOutline } from "react-icons/io5";
import PoolSuccessModal from "./pool-success-modal";

interface CreatePoolModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const poolTypes = ["Fixed Term", "Flexible", "Locked", "Dynamic"];

export default function CreatePoolModal({
  open,
  onOpenChange,
}: CreatePoolModalProps) {
  const [step, setStep] = useState(1);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  
  // Step 1 fields
  const [poolName, setPoolName] = useState("");
  const [poolDescription, setPoolDescription] = useState("");
  const [poolType, setPoolType] = useState("Fixed Term");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [minStakeAmount, setMinStakeAmount] = useState("");
  const [maxStakeAmount, setMaxStakeAmount] = useState("");
  const [rewardRate, setRewardRate] = useState("");
  const [showTypeDropdown, setShowTypeDropdown] = useState(false);
  
  // Step 2 fields
  const [rewardToken, setRewardToken] = useState("");
  const [rewardDistribution, setRewardDistribution] = useState("Daily");
  const [earlyUnstakePenalty, setEarlyUnstakePenalty] = useState("");
  const [showDistributionDropdown, setShowDistributionDropdown] = useState(false);

  const typeRef = useRef<HTMLDivElement>(null);
  const distributionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      setStep(1);
      // Reset all fields
      setPoolName("");
      setPoolDescription("");
      setPoolType("Fixed Term");
      setStartDate("");
      setEndDate("");
      setMinStakeAmount("");
      setMaxStakeAmount("");
      setRewardRate("");
      setRewardToken("");
      setRewardDistribution("Daily");
      setEarlyUnstakePenalty("");
    }
  }, [open]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (typeRef.current && !typeRef.current.contains(event.target as Node)) {
        setShowTypeDropdown(false);
      }
      if (distributionRef.current && !distributionRef.current.contains(event.target as Node)) {
        setShowDistributionDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleNext = () => {
    if (step === 1) {
      setStep(2);
    } else if (step === 2) {
      // Create pool and show success
      setShowSuccessModal(true);
      onOpenChange(false);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
          showCloseButton={false}
        >
          <DialogHeader className="flex flex-row items-center justify-between mb-6">
            <DialogTitle className="text-xl font-semibold text-white">
              Create New Pool
            </DialogTitle>
            <button
              onClick={() => onOpenChange(false)}
              className="text-[#b5b5b5] hover:text-white transition-colors"
            >
              Cancel
            </button>
          </DialogHeader>

          {step === 1 && (
            <div className="space-y-6">
              {/* Pool Name */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Pool Name
                </label>
                <input
                  type="text"
                  value={poolName}
                  onChange={(e) => setPoolName(e.target.value)}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                  placeholder="Enter pool name"
                />
              </div>

              {/* Pool Description */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Pool Description
                </label>
                <textarea
                  value={poolDescription}
                  onChange={(e) => setPoolDescription(e.target.value)}
                  rows={3}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128] resize-none"
                  placeholder="Enter pool description"
                />
              </div>

              {/* Pool Type */}
              <div className="relative" ref={typeRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Pool Type
                </label>
                <button
                  onClick={() => {
                    setShowTypeDropdown(!showTypeDropdown);
                    setShowDistributionDropdown(false);
                  }}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
                >
                  <span>{poolType}</span>
                  <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
                </button>
                {showTypeDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                    {poolTypes.map((type) => (
                      <button
                        key={type}
                        onClick={() => {
                          setPoolType(type);
                          setShowTypeDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors"
                      >
                        {type}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Start Date and End Date */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Start Date
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      placeholder="Select date"
                      className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 pr-10 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                    />
                    <IoCalendarOutline className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7c7c]" />
                  </div>
                </div>
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    End Date
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      placeholder="Select date"
                      className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 pr-10 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                    />
                    <IoCalendarOutline className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7c7c]" />
                  </div>
                </div>
              </div>

              {/* Minimum and Maximum Stake Amount */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Minimum Stake Amount
                  </label>
                  <input
                    type="text"
                    value={minStakeAmount}
                    onChange={(e) => setMinStakeAmount(e.target.value)}
                    className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                    Maximum Stake Amount
                  </label>
                  <input
                    type="text"
                    value={maxStakeAmount}
                    onChange={(e) => setMaxStakeAmount(e.target.value)}
                    className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                    placeholder="0.00"
                  />
                </div>
              </div>

              {/* Reward Rate */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Reward Rate (%)
                </label>
                <input
                  type="text"
                  value={rewardRate}
                  onChange={(e) => setRewardRate(e.target.value)}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                  placeholder="0.00"
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-end gap-4 pt-4 border-t border-[#1f261e]">
                <button
                  onClick={() => onOpenChange(false)}
                  className="px-6 py-2.5 text-[#b5b5b5] hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              {/* Reward Token */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Reward Token
                </label>
                <input
                  type="text"
                  value={rewardToken}
                  onChange={(e) => setRewardToken(e.target.value)}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                  placeholder="Enter reward token address or symbol"
                />
              </div>

              {/* Reward Distribution Frequency */}
              <div className="relative" ref={distributionRef}>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Reward Distribution Frequency
                </label>
                <button
                  onClick={() => {
                    setShowDistributionDropdown(!showDistributionDropdown);
                    setShowTypeDropdown(false);
                  }}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
                >
                  <span>{rewardDistribution}</span>
                  <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
                </button>
                {showDistributionDropdown && (
                  <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                    {["Daily", "Weekly", "Monthly", "At Maturity"].map((freq) => (
                      <button
                        key={freq}
                        onClick={() => {
                          setRewardDistribution(freq);
                          setShowDistributionDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors"
                      >
                        {freq}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Early Unstake Penalty */}
              <div>
                <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                  Early Unstake Penalty (%)
                </label>
                <input
                  type="text"
                  value={earlyUnstakePenalty}
                  onChange={(e) => setEarlyUnstakePenalty(e.target.value)}
                  className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                  placeholder="0.00"
                />
              </div>

              {/* Navigation */}
              <div className="flex justify-end gap-4 pt-4 border-t border-[#1f261e]">
                <button
                  onClick={handleBack}
                  className="px-6 py-2.5 text-[#b5b5b5] hover:text-white transition-colors"
                >
                  Back
                </button>
                <button
                  onClick={handleNext}
                  className="px-6 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <PoolSuccessModal
        open={showSuccessModal}
        onOpenChange={setShowSuccessModal}
        poolId="1"
      />
    </>
  );
}

