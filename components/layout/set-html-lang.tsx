"use client";

import { useEffect } from "react";
import { useLocaleStore } from "@/lib/locale/locale-store";

/**
 * Sets document.documentElement.lang from the locale store.
 * Ensures html lang updates when user applies Language & Region settings.
 */
export default function SetHtmlLang() {
  const language = useLocaleStore((s) => s.language);
  const region = useLocaleStore((s) => s.region);

  useEffect(() => {
    const locale = useLocaleStore.getState().getLocale();
    if (typeof document !== "undefined" && document.documentElement) {
      document.documentElement.lang = locale;
    }
  }, [language, region]);

  return null;
}

