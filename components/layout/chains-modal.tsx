"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import { useChains } from "@/hooks/useChains";
import type { Chain } from "@/lib/frontend/types/tokens";
import Skeleton from "@/components/ui/skeleton";

interface ChainsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ChainsModal({ isOpen, onClose }: ChainsModalProps) {
  const { chains, isLoading } = useChains();

  // Lock body scroll when modal is open
  useEffect(() => {
    if (isOpen) {
      // Save current scroll position
      const scrollY = window.scrollY;
      // Lock body scroll
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
      
      return () => {
        // Restore scroll position
        const scrollY = document.body.style.top;
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
        if (scrollY) {
          window.scrollTo(0, parseInt(scrollY || '0') * -1);
        }
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black/50 z-50"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div 
          className="bg-[#010501] border border-[#1f261e] rounded-xl max-w-4xl w-full max-h-[80vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-[#1f261e]">
            <h2 className="text-white text-xl font-semibold">Supported Chains</h2>
            <button
              onClick={onClose}
              className="text-[#7c7c7c] hover:text-white transition-colors"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {Array.from({ length: 20 }).map((_, i) => (
                  <div key={i} className="flex flex-col items-center gap-2 p-3 border border-[#1f261e] rounded-lg">
                    <Skeleton className="w-12 h-12 rounded-full" />
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : chains.length === 0 ? (
              <div className="text-center py-12 text-[#7c7c7c]">
                No chains available
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {chains.map((chain: Chain) => (
                    <div
                      key={chain.id}
                      className="flex flex-col items-center gap-2 p-3 border border-[#1f261e] rounded-lg hover:bg-[#0b0f0a] transition-colors cursor-pointer"
                    >
                      <div className="relative w-12 h-12 rounded-full overflow-hidden">
                        <Image
                          src={chain.logo || '/assets/chains/chain-1.svg'}
                          alt={chain.name}
                          width={48}
                          height={48}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            e.currentTarget.src = '/assets/chains/chain-1.svg';
                          }}
                        />
                      </div>
                      <span className="text-white text-sm font-medium text-center">{chain.name}</span>
                      {chain.symbol && (
                        <span className="text-[#7c7c7c] text-xs">{chain.symbol}</span>
                      )}
                    </div>
                  ))}
                </div>
                <div className="text-center mt-6 pt-6 border-t border-[#1f261e]">
                  <span className="text-[#7c7c7c] text-sm font-medium">and more</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
