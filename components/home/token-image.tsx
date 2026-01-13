"use client";

import { useState } from "react";
import Image from "next/image";

interface TokenImageProps {
  src: string;
  alt: string;
  width: number;
  height: number;
  className?: string;
  symbol?: string;
}

export function TokenImage({
  src,
  alt,
  width,
  height,
  className = "",
  symbol,
}: TokenImageProps) {
  const hasInitialImage = Boolean(src);
  const [imgSrc, setImgSrc] = useState(src);
  const [isLoading, setIsLoading] = useState(hasInitialImage);
  const [hasError, setHasError] = useState(false);

  const firstLetter =
    (symbol || alt || "?").trim().charAt(0).toUpperCase() || "?";

  const handleError = () => {
    setHasError(true);
    setIsLoading(false);
  };

  const handleLoad = () => {
    setIsLoading(false);
  };

  return (
    <div className={`relative ${className}`} style={{ width, height }}>
      {hasError || !imgSrc ? (
        <div
          className="flex items-center justify-center rounded-full bg-[#1f261e] text-[10px] lg:text-xs font-semibold text-[#b5b5b5]"
          style={{ width, height }}
        >
          {firstLetter}
        </div>
      ) : (
        <>
          {isLoading && (
            <div
              className="absolute inset-0 bg-[#1f261e] animate-pulse rounded-full flex items-center justify-center"
              style={{ width, height }}
            >
              <div className="w-1/2 h-1/2 bg-[#0b0f0a] rounded-full" />
            </div>
          )}
          <Image
            src={imgSrc}
            alt={alt}
            width={width}
            height={height}
            className={`${className} ${
              isLoading ? "opacity-0" : "opacity-100"
            } transition-opacity rounded-full`}
            onError={handleError}
            onLoad={handleLoad}
            unoptimized
          />
        </>
      )}
    </div>
  );
}

