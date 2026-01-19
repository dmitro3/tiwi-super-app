/**
 * Locale store: language, region, currency, date format.
 * Region, currency, and dateFormat are automatically derived from language.
 * Persisted so selections apply site-wide.
 */

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getLocaleFromLanguage } from "./language-to-region";

export type DateFormatType = "MM/DD/YY" | "DD/MM/YY" | "YYYY-MM-DD";

interface LocaleState {
  language: string;
  region: string;
  currency: string;
  dateFormat: DateFormatType;

  /** Set language and auto-derive region, currency, and dateFormat. */
  setLanguage: (code: string) => void;
  /** Apply language (region/currency/format auto-derived). */
  applySettings: (languageCode: string) => void;
  /** BCP 47 locale string for Intl (e.g. en-US). */
  getLocale: () => string;
}

const STORAGE_KEY = "tiwi_locale_v2";

const DEFAULT_LANGUAGE = "en";

function getDefaults() {
  const locale = getLocaleFromLanguage(DEFAULT_LANGUAGE);
  return {
    language: locale.languageCode,
    region: locale.regionCode,
    currency: locale.currency,
    dateFormat: locale.dateFormat,
  };
}

export const useLocaleStore = create<LocaleState>()(
  persist(
    (set, get) => ({
      ...getDefaults(),

      setLanguage: (code) => {
        const locale = getLocaleFromLanguage(code);
        set({
          language: locale.languageCode,
          region: locale.regionCode,
          currency: locale.currency,
          dateFormat: locale.dateFormat,
        });
      },

      applySettings: (languageCode) => {
        const locale = getLocaleFromLanguage(languageCode);
        set({
          language: locale.languageCode,
          region: locale.regionCode,
          currency: locale.currency,
          dateFormat: locale.dateFormat,
        });
      },

      getLocale: () => {
        const { language, region } = get();
        return `${language}-${region}`;
      },
    }),
    {
      name: STORAGE_KEY,
      partialize: (s) => ({
        language: s.language,
        region: s.region,
        currency: s.currency,
        dateFormat: s.dateFormat,
      }),
    }
  )
);

