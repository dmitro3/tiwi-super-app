"use client";

import { useState } from "react";
import { formatPriceWithSubscript } from "@/lib/shared/utils/price-formatting-subscript";

interface SubscriptUSDPriceProps {
  price: string | number | undefined | null;
  className?: string;
}

/**
 * Enhanced USD price component with subscript notation and floating tooltip.
 * Standardizes price display across the app (Header, Tables, etc).
 */
export function SubscriptUSDPrice({
  price,
  className = "",
}: SubscriptUSDPriceProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (price === undefined || price === null || isNaN(Number(price))) {
    return <span className={className}>$--</span>;
  }

  const numPrice = Number(price);
  if (numPrice === 0) return <span className={className}>$0.00</span>;

  // For prices >= 0.01, standard formatting is usually fine
  if (numPrice >= 0.01) {
    const formatted = numPrice.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    });
    return <span className={className}>${formatted}</span>;
  }

  // Smart formatting with subscript for small numbers
  // Example: $0.000000123 -> $0.0₆123
  const formatted = formatPriceWithSubscript(numPrice, { prefix: '$' });
  const fullValue = `$${numPrice.toFixed(12).replace(/\.?0+$/, '')}`;

  return (
    <span 
      className={`inline-block relative cursor-help ${className}`}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      {formatted}

      {showTooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-1.5 bg-[#121712] border border-[#b1f128]/20 rounded shadow-2xl z-[9999] pointer-events-none whitespace-nowrap">
          <p className="text-[#b1f128] text-xs font-mono">{fullValue}</p>
          {/* Tooltip Arrow */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-x-4 border-x-transparent border-t-4 border-t-[#121712]"></div>
        </div>
      )}
    </span>
  );
}


