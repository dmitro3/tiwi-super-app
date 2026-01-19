/**
 * Translation hook for React components.
 * Automatically updates when language changes in locale store.
 * Uses async translation API for languages not in cache.
 */

import { useState, useEffect, useCallback } from "react";
import { useLocaleStore } from "@/lib/locale/locale-store";
import { getTranslation, getEnglishText, type TranslationKey } from "./translations";
import { getTranslationAsync } from "./translation-service";

// Cache for in-memory translations (avoids re-fetching during session)
const translationCache = new Map<string, string>();

/**
 * Hook to translate text based on current language.
 * Re-renders when language changes.
 * Uses async translation API for languages without translations.
 */
export function useTranslation() {
  const language = useLocaleStore((s) => s.language);
  const [translations, setTranslations] = useState<Map<string, string>>(new Map());

  // Normalize language code
  const normalizedLang = language.split("-")[0].toLowerCase();

  // Load translations asynchronously for languages without translations
  useEffect(() => {
    if (normalizedLang === 'en') {
      setTranslations(new Map());
      return;
    }

    // Check if we have translations defined
    const hasTranslations = normalizedLang === 'es' || normalizedLang === 'fr' || 
                           normalizedLang === 'de' || normalizedLang === 'zh' || 
                           normalizedLang === 'ja' || normalizedLang === 'ar';
    
    if (hasTranslations) {
      // Use static translations for supported languages
      setTranslations(new Map());
      return;
    }

    // For other languages, fetch translations async
    const loadTranslations = async () => {
      // Get all translation keys
      const keys: TranslationKey[] = [
        "nav.home", "nav.market", "nav.swap", "nav.pool", "nav.earn", "nav.portfolio",
        "nav.referral", "nav.settings", "nav.connect_wallet", "nav.disconnect", "nav.notifications",
        "common.apply", "common.applied", "common.save", "common.cancel",
        "common.close", "common.search", "common.loading", "common.error",
        "common.just_now", "common.minutes_ago", "common.hours_ago", "common.days_ago",
        "status.active_chains", "status.smart_markets",
        "sidebar.collapse", "sidebar.quick_actions", "sidebar.swap", "sidebar.stake",
        "sidebar.history", "sidebar.lend", "sidebar.coming_soon", "sidebar.download_app", "sidebar.support_hub",
        "settings.language_region", "settings.application_language",
        "settings.currency_display", "settings.regional_format",
        "settings.auto_detected", "settings.applies_sitewide", "settings.notifications",
        "home.title", "home.market", "home.favorites", "home.favourite",
        "home.hot", "home.new", "home.gainers", "home.losers",
        "home.top", "home.spotlight",
        "wallet.connect_wallet", "wallet.create_new_wallet", "wallet.import_wallet",
        "wallet.my_wallets", "wallet.create_description", "wallet.import_description",
        "wallet.connect_external_wallets", "wallet.edit_name", "wallet.current_name",
        "wallet.new_name", "wallet.enter_new_name", "wallet.save",
        "notifications.title", "notifications.close", "notifications.loading", "notifications.no_notifications",
        "account.settings", "account.account_details", "account.wallet_name", "account.wallet_address",
        "account.account_type", "account.networks_connected", "account.my_wallets",
        "account.active_wallet_description", "account.local_wallet", "account.local_tiwi_wallet",
        "account.active", "account.no_wallet_connected",
        "settings.account_details", "settings.connected_devices", "settings.support",
        "settings.add_new_wallet", "settings.import_wallet", "settings.go_back",
      ];

      const newTranslations = new Map<string, string>();

      // Fetch translations for each key
      await Promise.all(
        keys.map(async (key) => {
          const cacheKey = `${normalizedLang}_${key}`;
          
          // Check in-memory cache first
          if (translationCache.has(cacheKey)) {
            newTranslations.set(key, translationCache.get(cacheKey)!);
            return;
          }

          const englishText = getEnglishText(key);
          try {
            const translated = await getTranslationAsync(key, normalizedLang, englishText);
            newTranslations.set(key, translated);
            translationCache.set(cacheKey, translated);
          } catch {
            // Fallback to English on error
            newTranslations.set(key, englishText);
          }
        })
      );

      setTranslations(newTranslations);
    };

    loadTranslations();
  }, [normalizedLang]);

  const t = useCallback((key: TranslationKey): string => {
    // Check if we have async translation for this language
    if (translations.has(key)) {
      return translations.get(key)!;
    }

    // Use static translation or English fallback
    return getTranslation(key, language);
  }, [language, translations]);

  return { t, language: normalizedLang };
}
