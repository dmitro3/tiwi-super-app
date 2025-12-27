"use client";

import Image from "next/image";
import { useState } from "react";

interface ExternalWalletIconProps {
  icon: string;
  name: string;
  onClick?: () => void;
}

export default function ExternalWalletIcon({
  icon,
  name,
  onClick,
}: ExternalWalletIconProps) {
  const [imgError, setImgError] = useState(false);
  
  // Validate icon URL - must be a valid URL or relative path starting with /
  // Also check for common invalid values that would cause URL construction to fail
  const isValidIcon = icon && 
    typeof icon === 'string' &&
    icon.trim() !== '' &&
    !icon.includes('undefined') &&
    !icon.includes('null') &&
    (icon.startsWith('/') || 
     icon.startsWith('http://') || 
     icon.startsWith('https://') ||
     icon.startsWith('data:'));
  
  const iconSrc = isValidIcon && !imgError ? icon : '/assets/icons/wallet/wallet-04.svg';

  return (
    <button
      onClick={onClick}
      className="bg-[#121712] flex items-center justify-center overflow-hidden p-4 rounded-xl shrink-0 hover:bg-[#1a1f1a] transition-colors cursor-pointer"
      aria-label={`Connect ${name}`}
    >
      <div className="bg-[#0b0f0a] flex items-center justify-center p-2 rounded-full shrink-0">
        <div className="relative size-8">
          <Image
            src={iconSrc}
            alt={name}
            width={32}
            height={32}
            className="w-full h-full object-contain"
            onError={() => setImgError(true)}
          />
        </div>
      </div>
    </button>
  );
}


