"use client";

import { useState } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import AddTokenModal from "@/components/admin/add-token-modal";
import TokenSpotlightModal from "@/components/admin/token-spotlight-modal";
import {
  IoSearchOutline,
  IoStarOutline,
  IoAddOutline,
  IoChevronBackOutline,
  IoChevronForwardOutline,
} from "react-icons/io5";

const tokens = [
  {
    icon: "BNO",
    symbol: "BNO",
    change24h: "+5.30%",
    changeType: "positive",
    volume24h: "$50.0M",
    liquidity: "$1.2B",
    category: "New",
    status: "3.7V",
  },
  {
    icon: "ETH",
    symbol: "ETH",
    change24h: "+7.60%",
    changeType: "positive",
    volume24h: "$350.0M",
    liquidity: "$8.5B",
    category: "Memes",
    status: "3.7V",
  },
  {
    icon: "BNB",
    symbol: "BNB",
    change24h: "+1.70%",
    changeType: "positive",
    volume24h: "$298.5M",
    liquidity: "$2.0B",
    category: "FIBA",
    status: "3.7V",
  },
  {
    icon: "SOL",
    symbol: "SOL",
    change24h: "-5%",
    changeType: "negative",
    volume24h: "$150.0M",
    liquidity: "$5.2B",
    category: "Gainers",
    status: "3.7V",
  },
  {
    icon: "TWC",
    symbol: "TWC",
    change24h: "+3.20%",
    changeType: "positive",
    volume24h: "$80.0M",
    liquidity: "$1.5B",
    category: "Losers",
    status: "3.7V",
  },
  {
    icon: "FNF",
    symbol: "FNF",
    change24h: "+2.10%",
    changeType: "positive",
    volume24h: "$45.0M",
    liquidity: "$900M",
    category: "New",
    status: "3.7V",
  },
  {
    icon: "ZORA",
    symbol: "ZORA",
    change24h: "-2.50%",
    changeType: "negative",
    volume24h: "$30.0M",
    liquidity: "$600M",
    category: "Memes",
    status: "3.7V",
  },
  {
    icon: "AVA",
    symbol: "AVA",
    change24h: "+4.80%",
    changeType: "positive",
    volume24h: "$65.0M",
    liquidity: "$1.1B",
    category: "FIBA",
    status: "3.7V",
  },
];

const categories = ["All", "Favourite", "New", "Governance", "Memes", "FIBA"];

export default function TokensPage() {
  const [activeCategory, setActiveCategory] = useState("All");
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [isAddTokenModalOpen, setIsAddTokenModalOpen] = useState(false);
  const [isSpotlightModalOpen, setIsSpotlightModalOpen] = useState(false);

  return (
    <AdminLayout pageTitle="Admin - Add Tokens">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Token Management Section */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
            Token Management
          </h2>
          <p className="text-[#b5b5b5] text-xs lg:text-sm">
            Add, categorize and manage tokens supported across the TIWI ecosystem.
          </p>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-4 lg:mb-6">
          {categories.map((category) => (
            <button
              key={category}
              onClick={() => setActiveCategory(category)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeCategory === category
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              {category}
            </button>
          ))}
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
            <button
              onClick={() => setIsAddTokenModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium text-sm"
            >
              <IoAddOutline className="w-5 h-5" />
              <span>Add Token</span>
            </button>
          </div>
        </div>

        {/* Modals */}
        <AddTokenModal
          open={isAddTokenModalOpen}
          onOpenChange={setIsAddTokenModalOpen}
        />
        <TokenSpotlightModal
          open={isSpotlightModalOpen}
          onOpenChange={setIsSpotlightModalOpen}
        />

        {/* Token Table */}
        <div className="bg-[#121712] border border-[#1f261e] rounded-xl overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[#1f261e]">
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Token
                  </th>
                  <th className="text-right px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    24h Change
                  </th>
                  <th className="text-right px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    24h Vol
                  </th>
                  <th className="text-right px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Liquidity
                  </th>
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Category
                  </th>
                  <th className="text-left px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Status
                  </th>
                  <th className="text-center px-6 py-4 text-[#b5b5b5] text-xs font-medium uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tokens.map((token, index) => (
                  <tr
                    key={index}
                    className="border-b border-[#1f261e] last:border-b-0 hover:bg-[#0b0f0a] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-[#b1f128] rounded-full flex items-center justify-center text-[#010501] font-semibold text-xs">
                          {token.icon}
                        </div>
                        <span className="text-white font-medium">{token.symbol}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <span
                        className={`font-medium ${
                          token.changeType === "positive"
                            ? "text-[#4ade80]"
                            : "text-[#ff5c5c]"
                        }`}
                      >
                        {token.change24h}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right text-white font-medium">
                      {token.volume24h}
                    </td>
                    <td className="px-6 py-4 text-right text-white font-medium">
                      {token.liquidity}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#b5b5b5] text-sm">{token.category}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-[#b5b5b5] text-sm">{token.status}</span>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <input
                        type="checkbox"
                        className="w-4 h-4 rounded border-[#1f261e] bg-[#0b0f0a] text-[#b1f128] focus:ring-[#b1f128] focus:ring-offset-0 focus:ring-offset-[#0b0f0a]"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Table View */}
          <div className="lg:hidden divide-y divide-[#1f261e]">
            {tokens.map((token, index) => (
              <div key={index} className="p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-[#b1f128] rounded-full flex items-center justify-center text-[#010501] font-semibold text-sm">
                      {token.icon}
                    </div>
                    <div>
                      <div className="text-white font-medium">{token.symbol}</div>
                      <div className="text-[#b5b5b5] text-xs">{token.category}</div>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded border-[#1f261e] bg-[#0b0f0a] text-[#b1f128] focus:ring-[#b1f128]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div>
                    <div className="text-[#7c7c7c] text-xs mb-1">24h Change</div>
                    <div
                      className={`font-medium ${
                        token.changeType === "positive"
                          ? "text-[#4ade80]"
                          : "text-[#ff5c5c]"
                      }`}
                    >
                      {token.change24h}
                    </div>
                  </div>
                  <div>
                    <div className="text-[#7c7c7c] text-xs mb-1">24h Vol</div>
                    <div className="text-white font-medium">{token.volume24h}</div>
                  </div>
                  <div>
                    <div className="text-[#7c7c7c] text-xs mb-1">Liquidity</div>
                    <div className="text-white font-medium">{token.liquidity}</div>
                  </div>
                  <div>
                    <div className="text-[#7c7c7c] text-xs mb-1">Status</div>
                    <div className="text-[#b5b5b5]">{token.status}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between mt-4 lg:mt-6">
          <div className="text-[#b5b5b5] text-sm hidden lg:block">
            Showing 1-8 of 108 tokens
          </div>
          <div className="flex items-center gap-2 mx-auto lg:mx-0">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-9 h-9 flex items-center justify-center bg-[#121712] border border-[#1f261e] rounded-lg text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IoChevronBackOutline className="w-5 h-5" />
            </button>
            <button
              onClick={() => setCurrentPage(1)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                currentPage === 1
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              1
            </button>
            <button
              onClick={() => setCurrentPage(2)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                currentPage === 2
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              2
            </button>
            <button
              onClick={() => setCurrentPage(3)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                currentPage === 3
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              3
            </button>
            <span className="text-[#b5b5b5] px-2">...</span>
            <button
              onClick={() => setCurrentPage(108)}
              className={`w-9 h-9 flex items-center justify-center rounded-lg font-medium text-sm transition-colors ${
                currentPage === 108
                  ? "bg-[#b1f128] text-[#010501]"
                  : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
              }`}
            >
              108
            </button>
            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === 108}
              className="w-9 h-9 flex items-center justify-center bg-[#121712] border border-[#1f261e] rounded-lg text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <IoChevronForwardOutline className="w-5 h-5" />
            </button>
          </div>
        </div>
      </main>
    </AdminLayout>
  );
}

