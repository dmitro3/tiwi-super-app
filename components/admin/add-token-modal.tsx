"use client";

import { useState, useEffect, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline } from "react-icons/io5";

interface AddTokenModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const tokenCategories = [
  "Stablecoin",
  "Governance",
  "Utility",
  "Meme",
  "NFT",
  "FIBA",
  "New",
  "Gainers",
  "Losers",
];

const riskLevels = ["Low | Medium | High"];

export default function AddTokenModal({ open, onOpenChange }: AddTokenModalProps) {
  const [tokenName, setTokenName] = useState("");
  const [tokenSymbol, setTokenSymbol] = useState("");
  const [contractAddress, setContractAddress] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Stablecoin");
  const [visibility, setVisibility] = useState("All");
  const [enableStaking, setEnableStaking] = useState(false);
  const [enableWalletDisplay, setEnableWalletDisplay] = useState(false);
  const [riskLevel, setRiskLevel] = useState("Low | Medium | High");
  const [showCategoryDropdown, setShowCategoryDropdown] = useState(false);
  const [showVisibilityDropdown, setShowVisibilityDropdown] = useState(false);
  const [showRiskDropdown, setShowRiskDropdown] = useState(false);
  const categoryRef = useRef<HTMLDivElement>(null);
  const visibilityRef = useRef<HTMLDivElement>(null);
  const riskRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryRef.current && !categoryRef.current.contains(event.target as Node)) {
        setShowCategoryDropdown(false);
      }
      if (visibilityRef.current && !visibilityRef.current.contains(event.target as Node)) {
        setShowVisibilityDropdown(false);
      }
      if (riskRef.current && !riskRef.current.contains(event.target as Node)) {
        setShowRiskDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="bg-[#121712] border-[#1f261e] text-white max-w-2xl max-h-[90vh] overflow-y-auto"
        showCloseButton={false}
      >
        <DialogHeader className="flex flex-row items-center justify-between mb-6">
          <DialogTitle className="text-xl font-semibold text-white">
            Add Token
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#b1f128] hover:text-[#9dd81f] transition-colors"
          >
            Cancel
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Token Information - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Token Name
              </label>
              <input
                type="text"
                placeholder="USDT"
                value={tokenName}
                onChange={(e) => setTokenName(e.target.value)}
                className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              />
            </div>
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Token Symbol
              </label>
              <input
                type="text"
                placeholder="USDT"
                value={tokenSymbol}
                onChange={(e) => setTokenSymbol(e.target.value)}
                className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Contract Address
            </label>
            <input
              type="text"
              placeholder="0x..."
              value={contractAddress}
              onChange={(e) => setContractAddress(e.target.value)}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
            />
          </div>

          {/* Token Category Dropdown */}
          <div className="relative" ref={categoryRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Token Category
            </label>
            <button
              onClick={() => {
                setShowCategoryDropdown(!showCategoryDropdown);
                setShowVisibilityDropdown(false);
                setShowRiskDropdown(false);
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
            >
              <span>{selectedCategory}</span>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showCategoryDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg max-h-60 overflow-y-auto">
                {tokenCategories.map((category) => (
                  <button
                    key={category}
                    onClick={() => {
                      setSelectedCategory(category);
                      setShowCategoryDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors"
                  >
                    {category}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Visibility Settings */}
          <div ref={visibilityRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Visibility Settings
            </label>
            <div className="relative mb-4">
              <button
                onClick={() => {
                  setShowVisibilityDropdown(!showVisibilityDropdown);
                  setShowCategoryDropdown(false);
                  setShowRiskDropdown(false);
                }}
                className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
              >
                <span>{visibility}</span>
                <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
              </button>
              {showVisibilityDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                  <button
                    onClick={() => {
                      setVisibility("All");
                      setShowVisibilityDropdown(false);
                    }}
                    className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors"
                  >
                    All
                  </button>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableStaking}
                  onChange={(e) => setEnableStaking(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1f261e] bg-[#0b0f0a] text-[#b1f128] focus:ring-[#b1f128]"
                />
                <span className="text-[#b5b5b5] text-sm">Enable for Staking</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={enableWalletDisplay}
                  onChange={(e) => setEnableWalletDisplay(e.target.checked)}
                  className="w-4 h-4 rounded border-[#1f261e] bg-[#0b0f0a] text-[#b1f128] focus:ring-[#b1f128]"
                />
                <span className="text-[#b5b5b5] text-sm">Enable for Wallet Display</span>
              </label>
            </div>
          </div>

          {/* Risk & Metadata */}
          <div ref={riskRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Risk Level (Low | Medium | High)
            </label>
            <div className="relative">
              <button
                onClick={() => {
                  setShowRiskDropdown(!showRiskDropdown);
                  setShowCategoryDropdown(false);
                  setShowVisibilityDropdown(false);
                }}
                className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between hover:border-[#b1f128] transition-colors"
              >
                <span>{riskLevel}</span>
                <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
              </button>
              {showRiskDropdown && (
                <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg">
                  {riskLevels.map((level) => (
                    <button
                      key={level}
                      onClick={() => {
                        setRiskLevel(level);
                        setShowRiskDropdown(false);
                      }}
                      className="w-full text-left px-4 py-2 text-white hover:bg-[#121712] transition-colors"
                    >
                      {level}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4 pt-4 border-t border-[#1f261e]">
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 bg-transparent border border-[#b1f128] text-[#b1f128] rounded-lg hover:bg-[#081f02] transition-colors font-medium"
            >
              Save
            </button>
            <button
              onClick={() => onOpenChange(false)}
              className="flex-1 px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium"
            >
              Save & Publish
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

