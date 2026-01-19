"use client";

import { useState, useEffect, useRef, useMemo } from "react";
import { IoChevronDown, IoArrowBack, IoSearch } from "react-icons/io5";
import { LANGUAGES, getLanguageByCode, type LanguageOption } from "@/lib/locale/constants";
import { useLocaleStore } from "@/lib/locale/locale-store";
import { getLocaleFromLanguage } from "@/lib/locale/language-to-region";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface LanguageRegionProps {
  onGoBack: () => void;
}

export default function LanguageRegion({ onGoBack }: LanguageRegionProps) {
  const { language, currency, dateFormat, region, applySettings } = useLocaleStore();
  const { t } = useTranslation();
  const [selectedLanguage, setSelectedLanguage] = useState<LanguageOption>(
    () => getLanguageByCode(language) ?? LANGUAGES[0]
  );
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [languageSearch, setLanguageSearch] = useState("");
  const [applied, setApplied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-derive region, currency, and date format from selected language
  const derivedLocale = useMemo(() => {
    return getLocaleFromLanguage(selectedLanguage.code);
  }, [selectedLanguage.code]);

  const filteredLanguages = useMemo(() => {
    const q = languageSearch.trim().toLowerCase();
    if (!q) return LANGUAGES;
    return LANGUAGES.filter((l) => l.name.toLowerCase().includes(q));
  }, [languageSearch]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        if (openDropdown === "language") setLanguageSearch("");
        setOpenDropdown(null);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

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
        {t("settings.language_region")}
      </h2>

      <div className="space-y-6" ref={dropdownRef}>
        {/* Application Language Dropdown */}
        <div className="relative">
          <label className="text-sm text-[#B5B5B5] mb-2 block">
            {t("settings.application_language")}
          </label>
          <div className="relative">
            <button
              onClick={() => {
                if (openDropdown === "language") {
                  setOpenDropdown(null);
                  setLanguageSearch("");
                } else {
                  setLanguageSearch("");
                  setOpenDropdown("language");
                }
              }}
              className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-white flex items-center justify-between hover:border-[#B1F128] transition-colors"
            >
              <span>{selectedLanguage.name}</span>
              <IoChevronDown
                size={20}
                className={`text-[#B5B5B5] transition-transform ${
                  openDropdown === "language" ? "rotate-180" : ""
                }`}
              />
            </button>
            {openDropdown === "language" && (
              <div className="absolute z-10 w-full mt-2 bg-[#0B0F0A] border border-[#1f261e] rounded-xl shadow-lg overflow-hidden flex flex-col max-h-[min(70vh,420px)]">
                <div className="p-2 border-b border-[#1f261e] shrink-0">
                  <div className="relative">
                    <IoSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E7873]" size={18} />
                    <input
                      type="text"
                      value={languageSearch}
                      onChange={(e) => setLanguageSearch(e.target.value)}
                    onKeyDown={(e) => e.stopPropagation()}
                    placeholder={`${t("common.search")} languages...`}
                      className="w-full bg-[#010501] border border-[#1f261e] rounded-lg pl-9 pr-3 py-2.5 text-sm text-white placeholder-[#6E7873] outline-none focus:ring-2 focus:ring-[#B1F128] focus:border-[#B1F128]"
                    />
                  </div>
                </div>
                <div className="overflow-y-auto overscroll-contain flex-1 min-h-0">
                  {filteredLanguages.length === 0 ? (
                    <p className="px-4 py-6 text-sm text-[#6E7873] text-center">No languages match &quot;{languageSearch}&quot;</p>
                  ) : (
                    filteredLanguages.map((lang) => (
                      <button
                        key={lang.code}
                        onClick={() => {
                          setSelectedLanguage(lang);
                          setOpenDropdown(null);
                          setLanguageSearch("");
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-[#121712] transition-colors"
                      >
                        <div
                          className={`w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0 ${
                            selectedLanguage.code === lang.code
                              ? "border-[#B1F128] bg-[#B1F128]"
                              : "border-[#3E453E]"
                          }`}
                        >
                          {selectedLanguage.code === lang.code && (
                            <div className="w-2 h-2 rounded-full bg-[#010501]" />
                          )}
                        </div>
                        <span
                          className={`text-sm ${
                            selectedLanguage.code === lang.code
                              ? "text-white"
                              : "text-[#B5B5B5]"
                          }`}
                        >
                          {lang.name}
                        </span>
                      </button>
                    ))
                  )}
                </div>
                <p className="px-4 py-2 text-xs text-[#6E7873] border-t border-[#1f261e] shrink-0">
                  {filteredLanguages.length} of {LANGUAGES.length} languages
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Currency Display (auto from language, read-only) */}
        <div>
          <label className="text-sm text-[#B5B5B5] mb-2 block">
            {t("settings.currency_display")}
          </label>
          <div className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-[#B5B5B5]">
            {derivedLocale.currency}
          </div>
          <p className="text-xs text-[#6E7873] mt-1">{t("settings.auto_detected")}</p>
        </div>

        {/* Regional Format (auto from language, read-only) */}
        <div>
          <label className="text-sm text-[#B5B5B5] mb-2 block">
            {t("settings.regional_format")}
          </label>
          <div className="w-full bg-[#010501] border border-[#1f261e] rounded-xl px-4 py-4 text-[#B5B5B5]">
            {derivedLocale.dateFormat}
          </div>
          <p className="text-xs text-[#6E7873] mt-1">{t("settings.auto_detected")}</p>
        </div>

        {/* Apply: persist and apply site-wide */}
        <div className="pt-2">
          <button
            onClick={() => {
              applySettings(selectedLanguage.code);
              setApplied(true);
              setTimeout(() => setApplied(false), 2000);
            }}
            className="w-full bg-[#B1F128] text-[#010501] font-semibold py-4 px-6 rounded-full hover:opacity-90 transition-opacity"
          >
            {applied ? t("common.applied") : t("common.apply")}
          </button>
          <p className="text-xs text-[#6E7873] mt-2 text-center">
            {t("settings.applies_sitewide")}
          </p>
        </div>
      </div>
    </div>
  );
}

