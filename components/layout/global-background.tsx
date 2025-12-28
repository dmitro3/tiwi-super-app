"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

/**
 * Global Background System
 * 
 * Implements the Figma design background with:
 * - Base dark background (#010501)
 * - Central green glow vector (centered, responsive)
 * - Footer decorative images (bottom, various opacities)
 * 
 * Designed to be pixel-stable across screen sizes (1200px - 1720px+)
 * Reference design width: 1728px
 */
export default function GlobalBackground() {
  const [scale, setScale] = useState(1);

  // Calculate scale factor based on viewport width
  // Reference width: 1728px (from Figma)
  useEffect(() => {
    const calculateScale = () => {
      const viewportWidth = window.innerWidth;
      // Scale proportionally, but don't go below 0.6 or above 1.0
      const calculatedScale = Math.max(0.6, Math.min(1, viewportWidth / 1728));
      setScale(calculatedScale);
    };

    calculateScale();
    window.addEventListener("resize", calculateScale);
    return () => window.removeEventListener("resize", calculateScale);
  }, []);

  // Figma asset URLs (updated with latest asset IDs)
  const centralVectorUrl = "/assets/background/gradient-vector-large.svg";
  const footerImageUrl = "https://www.figma.com/api/mcp/asset/47e59de7-fc86-4517-85a8-0e5294bba63a";

  // Dimensions from Figma (at 1728px reference) - Increased size for better visibility
  const centralVectorWidth = 550; // Increased from 367.244 (~1.9x larger)
  const centralVectorHeight = 845; // Increased from 563 (~1.9x larger, maintaining aspect ratio)
  const footerImageWidth = 454;
  const footerImageHeight = 302;

  // Calculate positions relative to center
  // Central vector is centered: left = 50% - 0.62px (from Figma)
  // Vector center = 864px (50% of 1728px)
  // Vector left edge = 864 - (367.244/2) = 680.378px
  // Vector right edge = 864 + (367.244/2) = 1047.622px

  // Footer images should "tail" the glow - align to glow's edges
  // Group 1 (left side): Images 14 & 15 should be to the left of glow's left edge
  // Group 2 (right side): Images 16 & 17 should be to the right of glow's right edge
  // Spacing between images should scale proportionally

  return (
    <div className="fixed inset-0 pointer-events-none overflow-visible z-10" aria-hidden="true">
      {/* Base Layer - Dark Background (handled by layout, but ensuring it's here) */}
      <div className="absolute inset-0 bg-[#010501]" />

      {/* Central Glow Vector - CENTERED as per Figma: left-[calc(50%-0.62px)] */}
      <div
        className="absolute left-1/2"
        style={{
          left: `calc(50% - ${0.62 * scale}px)`,
          top: `calc(50% + ${150 * scale}px)`,
          transform: `translate(-50%, -50%) scale(${scale})`,
          width: `${centralVectorWidth}px`,
          height: `${centralVectorHeight}px`,
        }}
      >
        <div className="relative w-full h-full rotate-180 scale-y-[-1]">
          <Image
            src={centralVectorUrl}
            alt=""
            fill
            className="object-contain"
            unoptimized
            priority
          />
        </div>
      </div>

      {/* Footer Decorative Images - Exact Figma structure
          From Figma metadata:
          - Container: y=1000, extends to y=1495 (495px height)
          - Group 1: y=1000, height=378 (Images 14 & 15)
          - Group 2: y=1117, height=378 (Images 16 & 17)
          - Frame height: 1236px, so images extend below frame
          - For viewport: position from bottom, convert negative to positive
      */}
      <div
        className="absolute left-1/2 bottom-0 z-0"
        style={{
          transform: `translateX(-50%)`,
          // Position container so images are visible at bottom
          bottom: 0,
        }}
      >
        {/* Group 1 - Left side images (Images 14 & 15)
            From Figma: Group at left-[-23px] relative to center, bottom-[-142px]
            Image 14: right-[-23px] (23px right of group), y=1000
            Image 15: left-[-23px] (23px left of group), y=1000
            Frame height: 1236px, so y=1000 means 236px from bottom
        */}
        <div
          className="absolute"
          style={{
            left: `${-23 * scale}px`,
            // Position from bottom: frame height (1236) - image y (1000) = 236px from bottom
            bottom: `${236 * scale}px`,
          }}
        >
          {/* Image 14 - Right side of group */}
          <div
            className="absolute"
            style={{
              right: `${250 * scale}px`,
              width: `${(footerImageWidth * scale)}px`,
              height: `${(footerImageHeight * scale)}px`,
              opacity: 0.5,
              filter: "blur(2px)"
            }}
          >
            <Image
              src="/assets/images/image 15.svg"
              alt=""
              fill
              className="object-contain object-center bg-transparent"
              unoptimized
            />
          </div>

          {/* Image 15 - Left side of group (rotated) */}
          <div
            className="absolute flex items-center justify-center bg-transparent"
            style={{
              left: `${300 * scale}px`,
              width: `${footerImageWidth * scale}px`,
              height: `${footerImageHeight * scale}px`,
            }}
          >
            <div className="rotate-180 scale-y-[-1] relative w-full h-full bg-transparent">
              <div
                className="relative w-full h-full bg-transparent"
                style={{
                  opacity: 0.5,
                  filter: "blur(2px)"
                }}
              >
                <Image
                  src="/assets/images/image 14.svg"
                  alt=""
                  fill
                  className="object-contain object-center bg-transparent"
                  unoptimized
                />
              </div>
            </div>
          </div>
        </div>

        {/* Group 2 - Right side images (Images 16 & 17) */}
        <div
          className="absolute"
          style={{
            // left: `calc(16.67% + ${132 * scale}px)`,
            right: `calc(16.67% + ${380 * scale}px)`,
            bottom: `${200 * scale}px`,
          }}
        >
          {/* Image 16 - Right side of group (rotated) */}
          <div
            className="absolute flex items-center justify-center"
            style={{
              left: 0,
              width: `${footerImageWidth * scale}px`,
              height: `${footerImageHeight * scale}px`,
            }}
          >
            <div className="rotate-180 scale-y-[-1] relative w-full h-full ">
              <div
                className="relative w-full h-full"
                style={{
                  opacity: 0.5,
                  filter: "blur(2px)"
                }}
              >
                <Image
                  src="/assets/images/image 16.svg"
                  alt=""
                  fill
                  className="object-contain object-center"
                  unoptimized
                />
              </div>
            </div>
          </div>

          {/* Image 17 - Left side of group */}
          <div
            className="absolute"
            style={{
              left: `${321 * scale}px`,
              width: `${footerImageWidth * scale}px`,
              height: `${footerImageHeight * scale}px`,
              opacity: 0.5,
              filter: "blur(2px)"
            }}
          >
            <Image
              src="/assets/images/image 17.svg"
              alt=""
              fill
              className="object-contain object-center"
              unoptimized
            />
          </div>
        </div>
      </div>
    </div>
  );
}

