"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { getTokenImageUrls } from "@/lib/shared/utils/token-icons";

interface TokenIconProps {
  logo?: string;
  symbol: string;
  address?: string;
  chainId?: number;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
}

const sizeClasses = {
  sm: "w-5 h-5",
  md: "w-6 h-6 lg:w-6 lg:h-6",
  lg: "w-8 h-8 lg:w-8 lg:h-8 xl:w-8 xl:h-8",
  xl: "w-10 h-10 lg:w-12 lg:h-12",
};

/**
 * TokenIcon Component
 * 
 * Reliable token icon display using native img tag for better compatibility.
 * Automatically tries multiple CDNs until an image successfully loads.
 */
export default function TokenIcon({ 
  logo, 
  symbol,
  address,
  chainId,
  size = "md",
  className = "" 
}: TokenIconProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [allImageUrls, setAllImageUrls] = useState<string[]>([]);
  const [imageLoaded, setImageLoaded] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);

  // Generate all possible image URLs
  useEffect(() => {
    // Always generate URLs even if logo is empty - fallbacks will be used
    const urls = getTokenImageUrls(logo, symbol, address, chainId);
    
    // Ensure we have at least some URLs to try
    if (urls.length === 0) {
      console.warn(`[TokenIcon] No image URLs generated for token ${symbol} (address: ${address}, chainId: ${chainId})`);
    }
    
    setAllImageUrls(urls);
    setCurrentImageIndex(0);
    setImageLoaded(false);
  }, [logo, symbol, address, chainId]);

  // Get current image URL to try
  const currentImageUrl = allImageUrls[currentImageIndex];

  const handleImageError = useCallback((e: React.SyntheticEvent<HTMLImageElement, Event>) => {
    const img = e.currentTarget;
    
    // Try next image URL in the fallback list
    if (currentImageIndex < allImageUrls.length - 1) {
      // Clear the failed image src to prevent caching issues
      img.src = '';
      setCurrentImageIndex(prev => prev + 1);
      setImageLoaded(false);
    } else {
      // All images failed - log for debugging
      console.warn(`[TokenIcon] All image sources failed for token ${symbol}:`, allImageUrls);
    }
  }, [currentImageIndex, allImageUrls.length, symbol, allImageUrls]);

  const handleImageLoad = useCallback(() => {
    setImageLoaded(true);
  }, []);

  // Reset image state when URL changes
  useEffect(() => {
    setImageLoaded(false);
  }, [currentImageUrl]);

  // If no images available, don't render
  if (!currentImageUrl || allImageUrls.length === 0) {
    return null;
  }

  return (
    <div className={`${sizeClasses[size]} shrink-0 relative ${className}`}>
      {!imageLoaded && (
        // Loading indicator
        <div className="absolute inset-0 bg-[#1f261e] rounded-full animate-pulse" />
      )}
      <img
        ref={imgRef}
        key={`${currentImageIndex}-${currentImageUrl}`}
        src={currentImageUrl}
        alt={symbol}
        className={`rounded-full object-cover w-full h-full transition-opacity duration-200 ${
          imageLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        onError={handleImageError}
        onLoad={handleImageLoad}
        loading="lazy"
        decoding="async"
      />
    </div>
  );
}

