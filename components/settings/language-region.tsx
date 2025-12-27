"use client";

import { useState, useEffect, useRef } from "react";
import { IoChevronDown, IoArrowBack } from "react-icons/io5";
import { SettingsView } from "./types";

interface LanguageRegionProps {
  onGoBack: () => void;
}

const languages = ["English", "French", "Spanish", "Chinese", "Arabic", "Portuguese"];
const currencies = ["USD", "EUR", "NGN", "GBP", "CNY", "JPY"];
const regionalFormats = ["MM/DD/YY", "DD/MM/YY", "YYYY-MM-DD"];

export default function LanguageRegion({ onGoBack }: LanguageRegionProps) {
  const [selectedLanguage, setSelectedLanguage] = useState("English");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [selectedFormat, setSelectedFormat] = useState("MM/DD/YY");
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="bg-[#0B0F0A] rounded-2xl border border-[#1f261e] p-6 md:p-8">
      <div className="flex justify-end mb-6">
        <button
          onClick={onGoBack}
          className="flex items-center gap-2 text-[#B1F128] border border-[#B1F128] px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#081F02] transition-colors"
        >
          <IoArrowBack size={16} />
          Go Back
        </button>
      </div>

      <h2 className="text-2xl font-semibold text-white mb-6">
        Language & Region
      </h2>

      <div className="space-y-6" ref={dropdownRef}>
        {/* Application Language Dropdown */}
        <div className="relative">
          <label className="text-sm text-[#B5B5B5] mb-2 block">
            Application Language
          </label>
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === "language" ? null : "language")
              }
              className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white flex items-center justify-between hover:border-[#B1F128] transition-colors"
            >
              <span>{selectedLanguage}</span>
              <IoChevronDown
                size={20}
                className={`text-[#B5B5B5] transition-transform ${
                  openDropdown === "language" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "language" && (
              <div className="absolute z-10 w-full mt-2 bg-[#0B0F0A] border border-[#1f261e] rounded-xl shadow-lg overflow-hidden">
                {languages.map((language) => (
                  <button
                    key={language}
                    onClick={() => {
                      setSelectedLanguage(language);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#121712] transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedLanguage === language
                          ? "border-[#B1F128] bg-[#B1F128]"
                          : "border-[#3E453E]"
                      }`}
                    >
                      {selectedLanguage === language && (
                        <div className="w-2 h-2 rounded-full bg-[#010501]" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        selectedLanguage === language
                          ? "text-white"
                          : "text-[#B5B5B5]"
                      }`}
                    >
                      {language}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Currency Display Dropdown */}
        <div className="relative">
          <label className="text-sm text-[#B5B5B5] mb-2 block">
            Currency Display
          </label>
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === "currency" ? null : "currency")
              }
              className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white flex items-center justify-between hover:border-[#B1F128] transition-colors"
            >
              <span>{selectedCurrency}</span>
              <IoChevronDown
                size={20}
                className={`text-[#B5B5B5] transition-transform ${
                  openDropdown === "currency" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "currency" && (
              <div className="absolute z-10 w-full mt-2 bg-[#0B0F0A] border border-[#1f261e] rounded-xl shadow-lg overflow-hidden">
                {currencies.map((currency) => (
                  <button
                    key={currency}
                    onClick={() => {
                      setSelectedCurrency(currency);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#121712] transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedCurrency === currency
                          ? "border-[#B1F128] bg-[#B1F128]"
                          : "border-[#3E453E]"
                      }`}
                    >
                      {selectedCurrency === currency && (
                        <div className="w-2 h-2 rounded-full bg-[#010501]" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        selectedCurrency === currency
                          ? "text-white"
                          : "text-[#B5B5B5]"
                      }`}
                    >
                      {currency}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Regional Format Dropdown */}
        <div className="relative">
          <label className="text-sm text-[#B5B5B5] mb-2 block">
            Regional Format
          </label>
          <div className="relative">
            <button
              onClick={() =>
                setOpenDropdown(openDropdown === "format" ? null : "format")
              }
              className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white flex items-center justify-between hover:border-[#B1F128] transition-colors"
            >
              <span>{selectedFormat}</span>
              <IoChevronDown
                size={20}
                className={`text-[#B5B5B5] transition-transform ${
                  openDropdown === "format" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "format" && (
              <div className="absolute z-10 w-full mt-2 bg-[#0B0F0A] border border-[#1f261e] rounded-xl shadow-lg overflow-hidden">
                {regionalFormats.map((format) => (
                  <button
                    key={format}
                    onClick={() => {
                      setSelectedFormat(format);
                      setOpenDropdown(null);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#121712] transition-colors"
                  >
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        selectedFormat === format
                          ? "border-[#B1F128] bg-[#B1F128]"
                          : "border-[#3E453E]"
                      }`}
                    >
                      {selectedFormat === format && (
                        <div className="w-2 h-2 rounded-full bg-[#010501]" />
                      )}
                    </div>
                    <span
                      className={`text-sm ${
                        selectedFormat === format ? "text-white" : "text-[#B5B5B5]"
                      }`}
                    >
                      {format}
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

