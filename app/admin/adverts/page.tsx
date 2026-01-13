"use client";

import { useState, useRef, useEffect } from "react";
import AdminLayout from "@/components/admin/admin-layout";
import CreateAdvertModal from "@/components/admin/create-advert-modal";
import TargetAdvertModal from "@/components/admin/target-advert-modal";
import ViewAdvertModal from "@/components/admin/view-advert-modal";
import {
  IoSearchOutline,
  IoAddOutline,
  IoEllipsisVertical,
  IoCreateOutline,
  IoEyeOutline,
  IoTrashOutline,
} from "react-icons/io5";
import Image from "next/image";
import { fetchAdverts, deleteAdvert } from "@/lib/frontend/api/adverts";
import type { Advert } from "@/lib/shared/types/adverts";

const filters = ["All", "Internal", "Partner", "Sponsored"];

export default function AdvertsPage() {
  const [activeFilter, setActiveFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedAdvert, setSelectedAdvert] = useState<Advert | null>(null);
  const [advertsList, setAdvertsList] = useState<Advert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentAdvertId, setCurrentAdvertId] = useState<string | null>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const menuRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Fetch adverts from API
  useEffect(() => {
    loadAdverts();
  }, [activeFilter]);

  const loadAdverts = async () => {
    try {
      setIsLoading(true);
      let status: Advert['status'] | undefined;
      
      // Map filter to status (for now, we'll fetch all and filter client-side)
      // You can extend this to use API filters later
      const adverts = await fetchAdverts();
      setAdvertsList(adverts);
    } catch (error) {
      console.error('Error loading adverts:', error);
      // Keep existing adverts on error
    } finally {
      setIsLoading(false);
    }
  };

  // Filter adverts based on active filter and search query
  const filteredAdverts = advertsList.filter((advert) => {
    // Filter by campaign type
    if (activeFilter !== "All") {
      if (activeFilter === "Internal" && !advert.campaignType?.includes("Internal")) return false;
      if (activeFilter === "Partner" && !advert.campaignType?.includes("Partner")) return false;
      if (activeFilter === "Sponsored" && !advert.campaignType?.includes("Sponsored")) return false;
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (!advert.name.toLowerCase().includes(query) && 
          !advert.headline?.toLowerCase().includes(query) &&
          !advert.messageBody?.toLowerCase().includes(query)) {
        return false;
      }
    }
    
    return true;
  });

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (openMenuId !== null) {
        const menuElement = menuRefs.current[openMenuId];
        if (menuElement && !menuElement.contains(event.target as Node)) {
          setOpenMenuId(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openMenuId]);

  const handleView = (advert: Advert) => {
    setSelectedAdvert(advert);
    setIsViewModalOpen(true);
    setOpenMenuId(null);
  };

  const handleEdit = (advert: Advert) => {
    setSelectedAdvert(advert);
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleDelete = async (advertId: string) => {
    if (confirm("Are you sure you want to delete this advert?")) {
      try {
        await deleteAdvert(advertId);
        setAdvertsList(advertsList.filter((a) => a.id !== advertId));
        setOpenMenuId(null);
      } catch (error) {
        console.error('Error deleting advert:', error);
        alert('Failed to delete advert. Please try again.');
      }
    }
  };

  const handleSaveEdit = async () => {
    try {
      // Reload adverts to get updated data
      await loadAdverts();
      setIsEditModalOpen(false);
      setSelectedAdvert(null);
    } catch (error) {
      console.error('Error saving advert:', error);
      alert('Failed to save advert. Please try again.');
    }
  };

  const handleAdvertCreated = () => {
    // Reload adverts after creation
    loadAdverts();
    setIsCreateModalOpen(false);
    setIsTargetModalOpen(false);
    setCurrentAdvertId(null);
  };

  const handleCreateNext = (advertId: string) => {
    setCurrentAdvertId(advertId);
    setIsCreateModalOpen(false);
    setIsTargetModalOpen(true);
  };

  return (
    <AdminLayout activeNavItem="create-adverts">
      <main className="flex-1 overflow-y-auto p-4 lg:p-6">
        {/* Header */}
        <div className="mb-6 lg:mb-8">
          <h2 className="text-2xl lg:text-3xl font-semibold text-white mb-2">
            Adverts & Promotions
          </h2>
          <p className="text-[#b5b5b5] text-sm">
            Understand, manage, promote and monitor advertisements for Two Protocol.
          </p>
        </div>

        {/* Search, Filter, and Create Button */}
        <div className="flex flex-col lg:flex-row gap-4 mb-6 lg:mb-8">
          {/* Filter Tabs */}
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
        {isLoading ? (
          <div className="text-center text-[#b5b5b5] py-12">Loading adverts...</div>
        ) : filteredAdverts.length === 0 ? (
          <div className="text-center text-[#b5b5b5] py-12">No adverts found</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredAdverts.map((advert) => (
              <div
                key={advert.id}
                className="bg-[#121712] border border-[#1f261e] rounded-xl overflow-hidden hover:border-[#b1f128] transition-colors relative group"
              >
                {/* Image */}
                <div className="w-full bg-[#0b0f0a] flex items-center justify-center relative min-h-56">
                  {advert.imageUrl ? (
                    <Image
                      src={advert.imageUrl}
                      alt={advert.name}
                      width={400}
                      height={300}
                      className="w-full h-auto object-contain"
                    />
                  ) : (
                    <div className="w-full min-h-56 bg-[#081f02] flex items-center justify-center py-12">
                      <span className="text-[#b5b5b5] text-sm">No Image</span>
                    </div>
                  )}
                </div>
                
                {/* Title */}
                <div className="p-4">
                  <h3 className="text-white font-medium text-sm truncate">{advert.name}</h3>
                </div>

                {/* Three Dots Menu */}
                <div className="absolute top-2 right-2" ref={(el) => { menuRefs.current[advert.id] = el; }}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setOpenMenuId(openMenuId === advert.id ? null : advert.id);
                    }}
                    className="p-2 bg-[#0b0f0a] bg-opacity-80 hover:bg-opacity-100 rounded-lg transition-opacity"
                  >
                    <IoEllipsisVertical className="w-5 h-5 text-[#b5b5b5] hover:text-white" />
                  </button>

                  {/* Dropdown Menu */}
                  {openMenuId === advert.id && (
                    <div className="absolute right-0 top-10 z-50 w-40 bg-[#0b0f0a] border border-[#1f261e] rounded-lg shadow-lg overflow-hidden">
                      <button
                        onClick={() => handleView(advert)}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#b5b5b5] hover:bg-[#121712] hover:text-white transition-colors flex items-center gap-2"
                      >
                        <IoEyeOutline className="w-4 h-4" />
                        <span>View</span>
                      </button>
                      <button
                        onClick={() => handleEdit(advert)}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#b5b5b5] hover:bg-[#121712] hover:text-white transition-colors flex items-center gap-2"
                      >
                        <IoCreateOutline className="w-4 h-4" />
                        <span>Edit</span>
                      </button>
                      <button
                        onClick={() => handleDelete(advert.id)}
                        className="w-full px-4 py-2.5 text-left text-sm text-[#b5b5b5] hover:bg-[#121712] hover:text-red-500 transition-colors flex items-center gap-2"
                      >
                        <IoTrashOutline className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Create Advert Modal */}
        <CreateAdvertModal
          open={isCreateModalOpen}
          onOpenChange={setIsCreateModalOpen}
          onNext={handleCreateNext}
        />

        {/* Target Advert Modal */}
        <TargetAdvertModal
          open={isTargetModalOpen}
          onOpenChange={setIsTargetModalOpen}
          advertId={currentAdvertId || undefined}
          onPublish={handleAdvertCreated}
        />

        {/* View Advert Modal */}
        {selectedAdvert && (
          <ViewAdvertModal
            open={isViewModalOpen}
            onOpenChange={setIsViewModalOpen}
            advert={selectedAdvert}
          />
        )}

        {/* Edit Advert Modal */}
        {selectedAdvert && (
          <CreateAdvertModal
            open={isEditModalOpen}
            onOpenChange={setIsEditModalOpen}
            advert={selectedAdvert}
            onSave={handleSaveEdit}
            mode="edit"
          />
        )}
      </main>
    </AdminLayout>
  );
}
