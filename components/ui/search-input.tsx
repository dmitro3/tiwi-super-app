"use client";

import Image from "next/image";

interface SearchInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export default function SearchInput({
  value,
  onChange,
  placeholder = "Search...",
  className = "",
  disabled = false,
}: SearchInputProps) {
  return (
    <div className={`bg-[#121712] border border-[#1f261e] border-solid flex items-center overflow-hidden px-3 sm:px-4 lg:px-[16px] py-2.5 sm:py-3 lg:py-[17px] rounded-full lg:rounded-[100px] shrink-0 w-full ${className}`}>
      <div className="flex gap-2 sm:gap-[8px] items-center relative shrink-0 w-full">
        {/* Search Icon */}
        <div className="relative shrink-0 size-4 sm:size-5 lg:size-[20px]">
          <Image
            src="/assets/icons/search-01.svg"
            alt="Search"
            width={20}
            height={20}
            className="w-full h-full object-contain"
          />
        </div>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled}
          className="bg-transparent border-0 px-0 py-0 text-[#7c7c7c] font-medium text-sm sm:text-[16px] placeholder:text-[#7c7c7c] placeholder:font-medium focus:outline-none flex-1 disabled:opacity-50 disabled:cursor-not-allowed"
        />
        {value && (
          <button
            onClick={() => onChange("")}
            className="shrink-0 size-4 sm:size-6 hover:opacity-80 transition-opacity cursor-pointer"
            aria-label="Clear search"
          >
            <Image
              src="/assets/icons/cancel-circle.svg"
              alt="Clear"
              width={20}
              height={20}
              className="w-full h-full object-contain opacity-60"
            />
          </button>
        )}
      </div>
    </div>
  );
}

