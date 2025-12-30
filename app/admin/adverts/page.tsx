"use client";

import { useState } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import CreateAdvertModal from "@/components/admin/create-advert-modal";
import TargetAdvertModal from "@/components/admin/target-advert-modal";
import {
  IoSearchOutline,
  IoAddOutline,
  IoShieldCheckmarkOutline,
} from "react-icons/io5";

const adverts = [
  { id: 1, name: "ADVERT NAME", advertId: "ADVERT ID" },
  { id: 2, name: "ADVERT NAME", advertId: "ADVERT ID" },
  { id: 3, name: "ADVERT NAME", advertId: "ADVERT ID" },
  { id: 4, name: "ADVERT NAME", advertId: "ADVERT ID" },
  { id: 5, name: "ADVERT NAME", advertId: "ADVERT ID" },
  { id: 6, name: "ADVERT NAME", advertId: "ADVERT ID" },
  { id: 7, name: "ADVERT NAME", advertId: "ADVERT ID" },
  { id: 8, name: "ADVERT NAME", advertId: "ADVERT ID" },
];

const filters = ["All Adverts", "Active", "Inactive", "Draft", "Archived"];

export default function AdvertsPage() {
  const [activeFilter, setActiveFilter] = useState("All Adverts");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);

  return (
    <AdminLayout pageTitle="Admin - Adverts & Promotions" activeNavItem="create-adverts">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
            Adverts & Promotions
          </h2>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-4 mb-4 lg:mb-6">
          {/* Search Input */}
          <div className="relative flex-1">
            <IoSearchOutline className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#7c7c7c]" />
            <input
              type="text"
              placeholder="Search Adverts"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#121712] border border-[#1f261e] rounded-lg pl-10 pr-4 py-2.5 text-sm text-white placeholder-[#7c7c7c] focus:outline-none focus:border-[#b1f128]"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            {filters.map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`px-4 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                  activeFilter === filter
                    ? "bg-[#b1f128] text-[#010501]"
                    : "bg-[#121712] border border-[#1f261e] text-[#b5b5b5] hover:bg-[#1a1f1a] hover:text-white"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>

          {/* Create Advert Button */}
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-[#b1f128] text-[#010501] rounded-lg hover:bg-[#9dd81f] transition-colors font-medium text-sm whitespace-nowrap"
          >
            <IoAddOutline className="w-5 h-5" />
            <span>Create Advert</span>
          </button>
        </div>

        {/* Adverts Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {adverts.map((advert) => (
            <div
              key={advert.id}
              className="bg-[#121712] border border-[#1f261e] rounded-xl p-4 hover:border-[#b1f128] transition-colors cursor-pointer relative"
            >
              <div className="flex flex-col items-center text-center">
                <div className="mb-4">
                  <div className="w-16 h-16 bg-[#081f02] border-2 border-[#b1f128] rounded-full flex items-center justify-center relative">
                    <IoShieldCheckmarkOutline className="w-8 h-8 text-[#b1f128]" />
                  </div>
                </div>
                <div className="text-white font-medium text-sm mb-1">{advert.name}</div>
                <div className="text-[#b5b5b5] text-xs mb-4">{advert.advertId}</div>
                <button className="px-4 py-2 bg-[#121712] border border-[#1f261e] text-[#b5b5b5] rounded-lg hover:bg-[#1a1f1a] hover:text-white transition-colors text-xs font-medium mb-3">
                  View
                </button>
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2">
                  <input
                    type="radio"
                    name={`advert-${advert.id}`}
                    className="w-4 h-4 text-[#b1f128] focus:ring-[#b1f128]"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Create Advert Modal */}
        <CreateAdvertModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
        />
      </main>
    </AdminLayout>
  );
}

