"use client";

import { useState } from "react";
import { formatPriceDexScreener } from "@/lib/frontend/utils/price-formatter";

interface DexScreenerPriceProps {
  price: string | number | undefined;
  className?: string;
}

/**
 * Component to display price in DexScreener style
 * Shows 0.0 with decimal places as subscript for very small prices
 * Displays full decimal value in tooltip on hover
 */
export function DexScreenerPrice({ price, className = "" }: DexScreenerPriceProps) {
  const [showTooltip, setShowTooltip] = useState(false);
  const formatted = formatPriceDexScreener(price);

  // Don't show tooltip if price is 0 or invalid
  const hasTooltip = formatted.fullValue && formatted.fullValue !== '$0' && formatted.fullValue !== formatted.prefix + formatted.suffix;

  if (!formatted.subscript) {
    return (
      <span 
        className={`${className} ${hasTooltip ? 'cursor-help relative' : ''}`}
        onMouseEnter={() => hasTooltip && setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
      >
        {formatted.prefix}{formatted.suffix}
        {showTooltip && hasTooltip && (
          <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black text-xs rounded border border-gray-300 whitespace-nowrap z-50 pointer-events-none">
            {formatted.fullValue}
            <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></span>
          </span>
        )}
      </span>
    );
  }

  return (
    <span 
      className={`${className} ${hasTooltip ? 'cursor-help relative' : ''}`}
      onMouseEnter={() => hasTooltip && setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {formatted.prefix}
      {formatted.subscript && (
        <span 
          className="text-[0.65em] leading-none inline-block" 
          style={{ 
            verticalAlign: 'sub',
            transform: 'translateY(0.1em)',
            fontFeatureSettings: '"subs"'
          }}
        >
          {formatted.subscript}
        </span>
      )}
      {formatted.suffix}
      {showTooltip && hasTooltip && (
        <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-white text-black text-xs rounded border border-gray-300 whitespace-nowrap z-50 pointer-events-none">
          {formatted.fullValue}
          <span className="absolute top-full left-1/2 transform -translate-x-1/2 -mt-1 border-4 border-transparent border-t-white"></span>
        </span>
      )}
    </span>
  );
}

