"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import TokenSpotlightModal from "@/components/admin/token-spotlight-modal";
import { TokenIcon } from "@/components/portfolio/token-icon";
import { getTokenFallbackIcon } from "@/lib/shared/utils/portfolio-formatting";
import { fetchTokens } from "@/lib/frontend/api/tokens";
import type { Token } from "@/lib/frontend/types/tokens";
import {
  IoSearchOutline,
  IoStarOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
  IoTrashOutline,
  IoCreateOutline,
} from "react-icons/io5";

interface SpotlightToken {
  id: string;
  symbol: string;
  name?: string;
  address?: string;
  logo?: string;
  rank: number;
  startDate: string;
  endDate: string;
  createdAt: string;
  updatedAt: string;
}

export default function TokensPage() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isSpotlightModalOpen, setIsSpotlightModalOpen] = useState(false);
  const [spotlightTokens, setSpotlightTokens] = useState<SpotlightToken[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editingToken, setEditingToken] = useState<SpotlightToken | null>(null);
  const [allTokens, setAllTokens] = useState<Token[]>([]);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);

  // Fetch spotlight tokens
  const fetchSpotlightTokens = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/v1/token-spotlight");
      if (response.ok) {
        const data = await response.json();
        setSpotlightTokens(data.tokens || []);
      }
    } catch (error) {
      console.error("Error fetching spotlight tokens:", error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSpotlightTokens();
  }, [fetchSpotlightTokens]);

  // Fetch all tokens from all chains to get logos (like token spotlight modal)
  useEffect(() => {
    setIsLoadingTokens(true);
    // Fetch all tokens without chain filter to get tokens from all chains (DexScreener)
    fetchTokens({ 
      limit: 1000, // High limit to get all available tokens
      // No chains parameter = fetch from all supported chains
    })
      .then((tokens) => {
        setAllTokens(tokens);
      })
      .catch((error) => {
        console.error("Error fetching tokens for logos:", error);
        setAllTokens([]);
      })
      .finally(() => {
        setIsLoadingTokens(false);
      });
  }, []);

  // Get token logo for a spotlight token - use stored logo first, then lookup
  // This ensures the EXACT same icon from the dropdown appears in the table
  const getTokenLogo = useCallback((token: SpotlightToken): string => {
    // First priority: Use the logo that was saved when token was selected (same as dropdown)
    if (token.logo && token.logo.trim()) {
      return token.logo;
    }
    
    // Second priority: Find the exact token object from allTokens (same source as modal dropdown)
    let matchedToken: Token | undefined;
    
    // First, try exact address match (most specific - same as modal)
    if (token.address) {
      matchedToken = allTokens.find(
        (t) => t.address.toLowerCase() === token.address?.toLowerCase()
      );
    }
    
    // If no address match, try symbol match (case-insensitive)
    if (!matchedToken && token.symbol) {
      matchedToken = allTokens.find(
        (t) => t.symbol.toUpperCase() === token.symbol.toUpperCase()
      );
    }
    
    // If we found a match, use its logo exactly like modal does: token.logo || getTokenFallbackIcon(token.symbol)
    if (matchedToken) {
      return matchedToken.logo || getTokenFallbackIcon(matchedToken.symbol);
    }
    
    // Final fallback - use fallback icon (same as modal)
    return getTokenFallbackIcon(token.symbol || '?');
  }, [allTokens]);

  // Listen for spotlight token updates
  useEffect(() => {
    const handleTokenUpdate = () => {
      fetchSpotlightTokens();
    };

    window.addEventListener("spotlightTokenUpdated", handleTokenUpdate);
    return () => {
      window.removeEventListener("spotlightTokenUpdated", handleTokenUpdate);
    };
  }, [fetchSpotlightTokens]);

  // Delete spotlight token
  const handleDeleteToken = async (id: string) => {
    if (!confirm("Are you sure you want to delete this spotlight token?")) {
      return;
    }

    try {
      const response = await fetch(`/api/v1/token-spotlight?id=${id}`, {
        method: "DELETE",
      });

      if (response.ok) {
        fetchSpotlightTokens();
      } else {
        const error = await response.json();
        alert(error.error || "Failed to delete token");
      }
    } catch (error) {
      console.error("Error deleting spotlight token:", error);
      alert("Failed to delete token. Please try again.");
    }
  };

  // Edit spotlight token
  const handleEditToken = (token: SpotlightToken) => {
    setEditingToken(token);
    setIsSpotlightModalOpen(true);
  };

  // Handle modal close
  const handleModalClose = () => {
    setIsSpotlightModalOpen(false);
    setEditingToken(null);
  };

  // Handle modal save
  const handleModalSave = () => {
    fetchSpotlightTokens();
    handleModalClose();
  };

  // Filter tokens by search query
  const filteredTokens = spotlightTokens.filter((token) => {
    if (!searchQuery) return true;
    const query = searchQuery.toLowerCase();
    return (
      token.symbol.toLowerCase().includes(query) ||
      (token.name && token.name.toLowerCase().includes(query)) ||
      (token.address && token.address.toLowerCase().includes(query))
    );
  });

  // Pagination
  const tokensPerPage = 10;
  const totalPages = Math.ceil(filteredTokens.length / tokensPerPage);
  const startIndex = (currentPage - 1) * tokensPerPage;
  const paginatedTokens = filteredTokens.slice(startIndex, startIndex + tokensPerPage);

  // Check if token is currently active
  const isTokenActive = (token: SpotlightToken) => {
    const now = new Date().toISOString().split('T')[0];
    return token.startDate <= now && token.endDate >= now;
  };

  return (
    <AdminLayout activeNavItem="tokens">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Token Spotlight Section */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
            Token Spotlight
          </h2>
          <p className="text-[#b5b5b5] text-xs lg:text-sm">
            Manage spotlight tokens that are featured on the platform.
          </p>
        </div>

        {/* Search and Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 lg:mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7c7c]" />
            <input
              type="text"
              placeholder="Search by tokens"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121712] border border-[#1f261e] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
            />
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <button
              onClick={() => setIsSpotlightModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#121712] border border-[#b1f128] text-[#b1f128] rounded-lg hover:bg-[#081f02] transition-colors font-medium text-sm"
            >
              <IoStarOutline className="w-5 h-5" />
              <span className="hidden sm:inline">Token Spotlight</span>
              <span className="sm:hidden">Spotlight</span>
            </button>
          </div>
        </div>

        {/* Token Spotlight Modal */}
        <TokenSpotlightModal
          open={isSpotlightModalOpen}
          onOpenChange={handleModalClose}
          editingToken={editingToken}
          onSave={handleModalSave}
        />

        {/* Spotlight Tokens Table */}
        {isLoading ? (
          <div className="text-center py-12">
            <p className="text-[#b5b5b5]">Loading spotlight tokens...</p>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="bg-[#121712] border border-[#1f261e] rounded-xl p-12 text-center">
            <p className="text-[#b5b5b5] text-sm mb-4">
              {searchQuery ? "No spotlight tokens found matching your search." : "No spotlight tokens yet. Click 'Token Spotlight' to add one."}
            </p>
          </div>
        ) : (
          <div className="bg-[#121712] border border-[#1f261e] rounded-xl overflow-hidden">
            {/* Desktop Table */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#1f261e]">
                    <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                      Token
                    </th>
                    <th className="text-center px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                      Rank
                    </th>
                    <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                      Start Date
                    </th>
                    <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                      End Date
                    </th>
                    <th className="text-center px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                      Status
                    </th>
                    <th className="text-center px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTokens.map((token) => {
                    const active = isTokenActive(token);
                    return (
                      <tr
                        key={token.id}
                        className="border-b border-[#1f261e] last:border-b-0 hover:bg-[#0b0f0a] transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-3">
                            <TokenIcon
                              src={getTokenLogo(token)}
                              symbol={token.symbol}
                              alt={token.symbol}
                              width={32}
                              height={32}
                            />
                            <div>
                              <div className="text-white font-medium">{token.symbol}</div>
                              {token.name && (
                                <div className="text-[#b5b5b5] text-xs">{token.name}</div>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className="text-white font-medium">#{token.rank}</span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#b5b5b5] text-sm">
                            {new Date(token.startDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className="text-[#b5b5b5] text-sm">
                            {new Date(token.endDate).toLocaleDateString()}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`px-3 py-1 rounded-full text-xs font-medium ${
                              active
                                ? "bg-[#4ade80] text-[#010501]"
                                : "bg-[#7c7c7c] text-white"
                            }`}
                          >
                            {active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              onClick={() => handleEditToken(token)}
                              className="p-2 text-[#b1f128] hover:bg-[#081f02] rounded-lg transition-colors"
                              title="Edit"
                            >
                              <IoCreateOutline className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteToken(token.id)}
                              className="p-2 text-[#ff5c5c] hover:bg-[#2a1a1a] rounded-lg transition-colors"
                              title="Delete"
                            >
                              <IoTrashOutline className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Table View */}
            <div className="lg:hidden divide-y divide-[#1f261e]">
              {paginatedTokens.map((token) => {
                const active = isTokenActive(token);
                return (
                  <div key={token.id} className="p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <TokenIcon
                          src={getTokenLogo(token)}
                          symbol={token.symbol}
                          alt={token.symbol}
                          width={40}
                          height={40}
                        />
                        <div>
                          <div className="text-white font-medium">{token.symbol}</div>
                          {token.name && (
                            <div className="text-[#b5b5b5] text-xs">{token.name}</div>
                          )}
                        </div>
                      </div>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-medium ${
                          active
                            ? "bg-[#4ade80] text-[#010501]"
                            : "bg-[#7c7c7c] text-white"
                        }`}
                      >
                        {active ? "Active" : "Inactive"}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-sm mb-3">
                      <div>
                        <div className="text-[#7c7c7c] text-xs mb-1">Rank</div>
                        <div className="text-white font-medium">#{token.rank}</div>
                      </div>
                      <div>
                        <div className="text-[#7c7c7c] text-xs mb-1">Start Date</div>
                        <div className="text-[#b5b5b5] text-xs">
                          {new Date(token.startDate).toLocaleDateString()}
                        </div>
                      </div>
                      <div>
                        <div className="text-[#7c7c7c] text-xs mb-1">End Date</div>
                        <div className="text-[#b5b5b5] text-xs">
                          {new Date(token.endDate).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditToken(token)}
                        className="flex-1 px-4 py-2 bg-[#121712] border border-[#b1f128] text-[#b1f128] rounded-lg hover:bg-[#081f02] transition-colors text-xs font-medium flex items-center justify-center gap-2"
                      >
                        <IoCreateOutline className="w-4 h-4" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteToken(token.id)}
                        className="flex-1 px-4 py-2 bg-[#121712] border border-[#ff5c5c] text-[#ff5c5c] rounded-lg hover:bg-[#2a1a1a] transition-colors text-xs font-medium flex items-center justify-center gap-2"
                      >
                        <IoTrashOutline className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredTokens.length > 0 && (
          <div className="flex items-center justify-between mt-4 lg:mt-6">
            <div className="text-[#b5b5b5] text-sm hidden lg:block">
              Showing {startIndex + 1}-{Math.min(startIndex + tokensPerPage, filteredTokens.length)} of {filteredTokens.length} tokens
            </div>
            <div className="flex items-center gap-2 mx-auto lg:mx-0">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="w-9 h-9 flex items-center justify-center bg-[#121712] border border-[#1f261e] rounded-lg text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IoChevronBackOutline className="w-5 h-5" />
              </button>
              {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                let pageNum;
                if (totalPages <= 5) {
                  pageNum = i + 1;
                } else if (currentPage <= 3) {
                  pageNum = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  pageNum = totalPages - 4 + i;
                } else {
                  pageNum = currentPage - 2 + i;
                }
                return (
                  <button
                    key={pageNum}
                    onClick={() => setCurrentPage(pageNum)}
                    className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                      currentPage === pageNum
                        ? "bg-[#b1f128] text-[#010501]"
                        : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
                    }`}
                  >
                    {pageNum}
                  </button>
                );
              })}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="w-9 h-9 flex items-center justify-center bg-[#121712] border border-[#1f261e] rounded-lg text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <IoChevronForwardOutline className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </main>
    </AdminLayout>
  );
}

