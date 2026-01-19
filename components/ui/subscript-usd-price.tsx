"use client";

import { formatUSDPrice } from "@/lib/shared/utils/price-formatting-subscript";

interface SubscriptUSDPriceProps {
  price: string | number | undefined;
  className?: string;
}

/**
 * Reusable USD price component using the same subscript formatting
 * as the TradingView chart utilities (DexScreener-style).
 *
 * - Displays a compact value (e.g. "$0.0₉₄₄₃₆")
 * - Shows the full raw decimal value in a native tooltip on hover
 */
export function SubscriptUSDPrice({
  price,
  className = "",
}: SubscriptUSDPriceProps) {
  if (price === undefined || price === null) {
    return <span className={className}>$0.00</span>;
  }

  const raw =
    typeof price === "string"
      ? price
      : Number.isFinite(price)
      ? (price as number).toString()
      : "0";

  const formatted = formatUSDPrice(price as any);
  const tooltip = `$${raw}`;

  return (
    <span className={className} title={tooltip}>
      {formatted}
    </span>
  );
}


