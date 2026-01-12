"use client";

import Image from "next/image";
import { useEffect, useState, useCallback, useRef } from "react";
import type { HomeBanner } from "@/lib/frontend/api/home-banners";
import { fetchHomeBanners } from "@/lib/frontend/api/home-banners";

/**
 * Hero banner carousel
 *
 * - Uses SVG banner assets exported from Figma (admin-driven adverts)
 * - Mimics banners being served from the backend via `fetchHomeBanners`
 * - Supports auto-slide and manual slide via indicators
 * - Responsive: uses mobile-specific images on mobile, desktop images on larger screens
 * - Handles different image sizes from backend by ensuring proper container filling
 */
export function HeroBanner() {
  const [banners, setBanners] = useState<HomeBanner[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const touchStartXRef = useRef<number | null>(null);

  // Fetch banners from published adverts
  useEffect(() => {
    let mounted = true;
    setIsLoading(true);
    (async () => {
      try {
        const data = await fetchHomeBanners();
        if (mounted) {
          // Ensure deterministic order
          setBanners(data.sort((a, b) => a.order - b.order));
          setIsLoading(false);
        }
      } catch (error) {
        console.error("[HeroBanner] Error fetching banners:", error);
        if (mounted) {
          setIsLoading(false);
        }
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  // Auto-slide every 8 seconds
  useEffect(() => {
    if (banners.length <= 1) return;
    const id = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % banners.length);
    }, 8000);
    return () => clearInterval(id);
  }, [banners.length]);

  const goToIndex = useCallback(
    (index: number) => {
      if (!banners.length) return;
      const nextIndex = ((index % banners.length) + banners.length) % banners.length;
      setActiveIndex(nextIndex);
    },
    [banners.length]
  );

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    touchStartXRef.current = e.touches[0]?.clientX ?? null;
  };

  const handleTouchEnd = (e: React.TouchEvent<HTMLDivElement>) => {
    if (touchStartXRef.current == null || banners.length <= 1) return;
    const deltaX = e.changedTouches[0]?.clientX - touchStartXRef.current;
    const threshold = 40; // minimal swipe distance in px
    if (deltaX > threshold) {
      goToIndex(activeIndex - 1);
    } else if (deltaX < -threshold) {
      goToIndex(activeIndex + 1);
    }
    touchStartXRef.current = null;
  };

  if (isLoading || !banners.length) {
    // Show skeleton loader while loading
    return (
      <div className="w-full flex flex-col">
        <div className="w-full h-[114px] lg:h-[140px] xl:h-[160px] 2xl:h-[180px] rounded-2xl overflow-hidden">
          <div className="w-full h-full bg-[#0b0f0a] animate-shimmer rounded-2xl" />
        </div>
        {/* Skeleton pagination */}
        <div className="mt-2 flex items-center justify-center gap-1.5">
          <div className="h-1 w-6 rounded-full bg-[#1F261E] animate-pulse" />
          <div className="h-1 w-6 rounded-full bg-[#1F261E] animate-pulse" />
          <div className="h-1 w-6 rounded-full bg-[#1F261E] animate-pulse" />
        </div>
      </div>
    );
  }

  const current = banners[activeIndex];
  const imageUrl = current.imageUrl;

  return (
    <div className="w-full flex flex-col">
      <div
        className="relative w-full rounded-2xl overflow-hidden"
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        {/* Fixed-size container - all images will have the same dimensions and take full width */}
        <div 
          key={current.id} 
          className="relative w-full hero-slide-in overflow-hidden h-[114px] lg:h-[140px] xl:h-[160px] 2xl:h-[180px]"
        >
          <Image
            src={imageUrl}
            alt={current.alt}
            fill
            priority
            className="pointer-events-none select-none"
            sizes="100vw"
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'contain',
              objectPosition: 'center',
            }}
          />
        </div>
      </div>

      {/* Pagination bars under banner */}
      <div className="mt-2 flex items-center justify-center gap-1.5">
        {banners.map((banner, index) => {
          const isActive = index === activeIndex;
          return (
            <button
              key={banner.id}
              type="button"
              onClick={() => goToIndex(index)}
              aria-label={`Show banner ${index + 1}`}
              className={`h-1 rounded-full transition-colors cursor-pointer ${
                isActive ? "bg-[#b1f128] w-2" : "bg-[#1F261E] w-6"
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}
