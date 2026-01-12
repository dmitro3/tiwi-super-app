"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { IoChevronDownOutline, IoSearchOutline } from "react-icons/io5";
import { fetchTokens } from "@/lib/frontend/api/tokens";
import type { Token } from "@/lib/frontend/types/tokens";
import { TokenIcon } from "@/components/portfolio/token-icon";
import { getTokenFallbackIcon } from "@/lib/shared/utils/portfolio-formatting";
import { useDebounce } from "@/hooks/useDebounce";

interface TokenSpotlightModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editingToken?: {
    id: string;
    symbol: string;
    name?: string;
    address?: string;
    rank: number;
    startDate?: string;
    endDate?: string;
  } | null;
  onSave?: (tokenData: {
    id?: string;
    symbol: string;
    rank?: number; // Optional - API will auto-assign if not provided
    startDate: string;
    endDate: string;
  }) => void;
}

export default function TokenSpotlightModal({
  open,
  onOpenChange,
  editingToken = null,
  onSave,
}: TokenSpotlightModalProps) {
  const isEditMode = !!editingToken;
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [tokenSearchQuery, setTokenSearchQuery] = useState("");
  const [selectedToken, setSelectedToken] = useState<{
    symbol: string;
    name: string;
    address: string;
    logo: string;
  } | null>(null);
  const [rank, setRank] = useState<number>(editingToken?.rank || 1);
  const [startDate, setStartDate] = useState(editingToken?.startDate || "");
  const [endDate, setEndDate] = useState(editingToken?.endDate || "");
  const [showTokenDropdown, setShowTokenDropdown] = useState(false);
  const tokenRef = useRef<HTMLDivElement>(null);

  // Debounce search query for API calls (400ms delay)
  const debouncedSearchQuery = useDebounce(tokenSearchQuery, 400);

  // Fetch all tokens from DexScreener across all chains (like portfolio receive)
  // Initial load: fetch all tokens, then refetch with debounced search query
  useEffect(() => {
    if (open) {
      setIsLoadingTokens(true);
      // Fetch tokens - use debounced query for server-side search
      // No chains parameter = fetch from all supported chains (all DexScreener tokens)
      fetchTokens({ 
        limit: 1000, // High limit to get all available tokens from DexScreener
        query: debouncedSearchQuery.trim() || undefined, // Pass debounced search query to API
        // No chains parameter = get tokens from all chains
      })
        .then((tokens) => {
          setAllTokens(tokens);
          // Set first token as default if no token selected (only in add mode, no search)
          if (!isEditMode && tokens.length > 0 && !selectedToken && !debouncedSearchQuery.trim()) {
            const firstToken = tokens[0];
            setSelectedToken({
              symbol: firstToken.symbol,
              name: firstToken.name,
              address: firstToken.address,
              logo: firstToken.logo || getTokenFallbackIcon(firstToken.symbol),
            });
          }
        })
        .catch((error) => {
          console.error("Error fetching tokens:", error);
          setAllTokens([]);
        })
        .finally(() => {
          setIsLoadingTokens(false);
        });
    }
  }, [open, isEditMode, debouncedSearchQuery]); // Refetch when debounced search query changes

  // Client-side filtering for instant results while typing (before debounce)
  const filteredTokens = useMemo(() => {
    // If no search query, show all tokens
    if (!tokenSearchQuery.trim()) {
      return allTokens;
    }
    
    // Instant client-side filtering while user types
    const query = tokenSearchQuery.toLowerCase().trim();
    return allTokens.filter(
      (token) =>
        token.symbol.toLowerCase().includes(query) ||
        token.name.toLowerCase().includes(query) ||
        token.address.toLowerCase().includes(query)
    );
  }, [allTokens, tokenSearchQuery]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (tokenRef.current && !tokenRef.current.contains(event.target as Node)) {
        setShowTokenDropdown(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Get today's date in YYYY-MM-DD format for date input
  const getTodayDate = () => {
    const today = new Date();
    return today.toISOString().split('T')[0];
  };

  // Get default end date (30 days from today)
  const getDefaultEndDate = () => {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(today.getDate() + 30);
    return endDate.toISOString().split('T')[0];
  };

  // Initialize dates when modal opens, reset form when it closes
  useEffect(() => {
    if (open) {
      if (editingToken) {
        // Edit mode: populate with existing data
        setRank(editingToken.rank);
        setStartDate(editingToken.startDate || getTodayDate());
        setEndDate(editingToken.endDate || getDefaultEndDate());
        // Find the token in allTokens to get its logo, or use fallback
        // This will be updated once tokens are fetched
        const tokenLogo = allTokens.find(t => t.symbol === editingToken.symbol)?.logo || getTokenFallbackIcon(editingToken.symbol);
        setSelectedToken({
          symbol: editingToken.symbol,
          name: editingToken.name || editingToken.symbol,
          address: editingToken.address || "",
          logo: tokenLogo,
        });
      } else {
        // Add mode: reset form (but don't clear search query - let user keep typing)
        setRank(0); // 0 means auto-assign
        setStartDate(getTodayDate());
        setEndDate(getDefaultEndDate());
        // Don't clear search query here - let user keep their search
        // Set first token as default if available (only in add mode, no search)
        if (allTokens.length > 0 && !selectedToken && !tokenSearchQuery.trim()) {
          const firstToken = allTokens[0];
          setSelectedToken({
            symbol: firstToken.symbol,
            name: firstToken.name,
            address: firstToken.address,
            logo: firstToken.logo || getTokenFallbackIcon(firstToken.symbol),
          });
        }
      }
    } else {
      // Reset when modal closes
      setShowTokenDropdown(false);
      setTokenSearchQuery("");
    }
  }, [open, editingToken, allTokens]); // eslint-disable-line react-hooks/exhaustive-deps

  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    // Validate dates
    if (!startDate || !endDate) {
      alert("Please select both start and end dates");
      return;
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (end < start) {
      alert("End date must be after start date");
      return;
    }

    // Rank validation - allow 0 or empty to trigger auto-assignment
    // API will auto-assign if rank is not provided or invalid

    if (!selectedToken) {
      alert("Please select a token");
      return;
    }

    setIsSubmitting(true);
    try {
      const tokenData = {
        symbol: selectedToken.symbol,
        name: selectedToken.name,
        address: selectedToken.address,
        logo: selectedToken.logo, // Save the logo so table can display the same icon
        rank: rank >= 1 ? rank : undefined, // Only send rank if valid, let API auto-assign if not
        startDate,
        endDate,
      };

      if (isEditMode && editingToken) {
        // Update existing token
        const response = await fetch("/api/v1/token-spotlight", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            id: editingToken.id,
            ...tokenData,
          }),
        });

        if (response.ok) {
          // Trigger refresh
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("spotlightTokenUpdated"));
          }
          if (onSave) {
            onSave({ ...tokenData, id: editingToken.id });
          }
          onOpenChange(false);
        } else {
          const error = await response.json();
          alert(error.error || "Failed to update spotlight token");
        }
      } else {
        // Create new token
        const response = await fetch("/api/v1/token-spotlight", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(tokenData),
        });

        if (response.ok) {
          // Trigger refresh
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("spotlightTokenUpdated"));
          }
          if (onSave) {
            onSave({ ...tokenData });
          }
          onOpenChange(false);
        } else {
          const error = await response.json();
          alert(error.error || "Failed to create spotlight token");
        }
      }
    } catch (error) {
      console.error("Error saving spotlight token:", error);
      alert("Failed to save spotlight token. Please try again.");
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
            {isEditMode ? "Edit Token Spotlight" : "Add Token Spotlight"}
          </DialogTitle>
          <button
            onClick={() => onOpenChange(false)}
            className="text-[#b1f128] hover:text-[#9dd81f] transition-colors"
          >
            Cancel
          </button>
        </DialogHeader>

        <div className="space-y-6">
          {/* Select Token Dropdown */}
          <div className="relative" ref={tokenRef}>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Select Token
            </label>
            <button
              onClick={() => {
                if (!isEditMode) {
                  setShowTokenDropdown(!showTokenDropdown);
                }
              }}
              disabled={isEditMode}
              className={`w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white flex items-center justify-between transition-colors ${
                isEditMode
                  ? "opacity-50 cursor-not-allowed"
                  : "hover:border-[#b1f128]"
              }`}
            >
              <div className="flex items-center gap-3">
                {selectedToken ? (
                  <>
                    <TokenIcon
                      src={selectedToken.logo || getTokenFallbackIcon(selectedToken.symbol)}
                      symbol={selectedToken.symbol}
                      alt={selectedToken.symbol}
                      width={32}
                      height={32}
                    />
                    <div className="text-left">
                      <div className="text-white font-medium text-sm">
                        {selectedToken.symbol}
                      </div>
                      <div className="text-[#b5b5b5] text-xs">
                        {selectedToken.name}
                      </div>
                    </div>
                  </>
                ) : (
                  <span className="text-[#7c7c7c] text-sm">Select a token</span>
                )}
              </div>
              <IoChevronDownOutline className="w-5 h-5 text-[#b5b5b5]" />
            </button>
            {showTokenDropdown && (
              <div className="absolute z-10 w-full mt-1 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg max-h-96 overflow-y-auto">
                <div className="p-2 border-b border-[#1f261e] sticky top-0 bg-[#0b0f0a]">
                  <div className="relative">
                    <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#7c7c7c]" />
                    <input
                      type="text"
                      placeholder="Search by symbol, name, or address"
                      value={tokenSearchQuery}
                      onChange={(e) => setTokenSearchQuery(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-full bg-[#121712] border border-[#1f261e] rounded-lg pl-10 pr-3 py-2 text-sm text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
                      autoFocus
                    />
                  </div>
                </div>
                {isLoadingTokens ? (
                  <div className="p-8 text-center">
                    <p className="text-[#b5b5b5] text-sm">Loading tokens...</p>
                  </div>
                ) : filteredTokens.length === 0 ? (
                  <div className="p-8 text-center">
                    <p className="text-[#b5b5b5] text-sm">
                      {tokenSearchQuery ? "No tokens found matching your search." : "No tokens available."}
                    </p>
                  </div>
                ) : (
                  <div className="max-h-80 overflow-y-auto">
                    {filteredTokens.map((token) => (
                      <button
                        key={token.id}
                        onClick={() => {
                          setSelectedToken({
                            symbol: token.symbol,
                            name: token.name,
                            address: token.address,
                            logo: token.logo || getTokenFallbackIcon(token.symbol),
                          });
                          setShowTokenDropdown(false);
                          // Don't clear search query - keep it for next time dropdown opens
                        }}
                        className="w-full text-left px-4 py-3 text-white hover:bg-[#121712] transition-colors flex items-center gap-3 border-b border-[#1f261e] last:border-b-0"
                      >
                        <TokenIcon
                          src={token.logo || getTokenFallbackIcon(token.symbol)}
                          symbol={token.symbol}
                          alt={token.symbol}
                          width={24}
                          height={24}
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm text-white">
                            {token.symbol}
                          </div>
                          <div className="text-[#b5b5b5] text-xs truncate">
                            {token.name}
                          </div>
                          <div className="text-[#7c7c7c] text-xs font-mono truncate">
                            {token.address}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Rank Input */}
          <div>
            <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
              Rank (Optional - Auto-assigned if not set or taken)
            </label>
            <input
              type="number"
              min="0"
              placeholder="Enter rank (leave empty for auto-assignment)"
              value={rank || ""}
              onChange={(e) => {
                const value = e.target.value === "" ? 0 : parseInt(e.target.value, 10);
                if (!isNaN(value) && value >= 0) {
                  setRank(value);
                }
              }}
              className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
            />
            <p className="text-[#7c7c7c] text-xs mt-1">
              Lower numbers indicate higher priority. Leave empty or set to 0 for auto-assignment. If rank is taken, it will be auto-assigned.
            </p>
          </div>

          {/* Date Pickers - Two Columns */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                min={getTodayDate()}
                className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              />
            </div>
            <div>
              <label className="block text-[#b5b5b5] text-sm font-medium mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={startDate || getTodayDate()}
                className="w-full bg-[#0b0f0a] border border-[#1f261e] rounded-lg px-4 py-2.5 text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
              />
            </div>
          </div>

          {/* Info Message */}
          <div className="bg-[#0b0f0a] border border-[#1f261e] rounded-lg p-4">
            <p className="text-[#b5b5b5] text-sm">
              <span className="font-medium text-white">Note:</span> The token will be ranked based on the specified rank number within the selected date range. Tokens with lower rank numbers will appear first. If multiple tokens have overlapping date ranges, they will be ordered by rank.
            </p>
          </div>

          {/* Publish Button */}
          <div className="pt-4 border-t border-[#1f261e]">
            <button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="w-full px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting 
                ? (isEditMode ? "Updating..." : "Adding...") 
                : (isEditMode ? "Update Spotlight Token" : "Add Spotlight Token")
              }
            </button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

