"use client";

import Image from "next/image";
import { useState } from "react";

interface TokenIconProps {
  src?: string | null;
  symbol: string;
  alt?: string;
  width: number;
  height: number;
  className?: string;
}

/**
 * TokenIcon Component
 * 
 * Displays token icon with fallback to circular icon with first character
 * if image fails to load or is not provided
 */
export function TokenIcon({
  src,
  symbol,
  alt,
  width,
  height,
  className = "",
}: TokenIconProps) {
  const [imageError, setImageError] = useState(false);
  const firstChar = symbol.charAt(0).toUpperCase();

  // If no src or image error, show fallback
  if (!src || imageError) {
    return (
      <div
        className={`rounded-full bg-[#1F261E] flex items-center justify-center text-white font-semibold shrink-0 ${className}`}
        style={{ width, height, minWidth: width, minHeight: height }}
      >
        <span 
          className="text-white font-medium"
          style={{ fontSize: `${Math.max(width * 0.4, 10)}px` }}
        >
          {firstChar}
        </span>
      </div>
    );
  }

  return (
    <Image
      src={src}
      alt={alt || symbol}
      width={width}
      height={height}
      className={`shrink-0 rounded-full ${className}`}
      onError={() => setImageError(true)}
    />
  );
}

