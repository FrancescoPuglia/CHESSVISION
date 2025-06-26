// src/core/i18n/useTranslation.ts
import { useState, useCallback } from "react";
import { translations } from "./translations";

export type Language = "en" | "it";

export const useTranslation = () => {
  const [language, setLanguage] = useState<Language>(() => {
    // Check localStorage first, then browser language, default to EN
    const saved = localStorage.getItem("chessvision-language") as Language;
    if (saved && (saved === "en" || saved === "it")) {
      return saved;
    }

    const browserLang = navigator.language.toLowerCase();
    if (browserLang.startsWith("it")) return "it";
    return "en";
  });

  const changeLanguage = useCallback((newLang: Language) => {
    setLanguage(newLang);
    localStorage.setItem("chessvision-language", newLang);
  }, []);

  const t = useCallback(
    (key: keyof typeof translations.en): string => {
      return translations[language][key] || translations.en[key] || key;
    },
    [language],
  );

  return {
    language,
    changeLanguage,
    t,
    isItalian: language === "it",
    isEnglish: language === "en",
  };
};
