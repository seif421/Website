import { useRouterState } from "@tanstack/react-router";
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { ar } from "./ar";
import { setMoneyUnit } from "@/lib/store/format";

export type Lang = "en" | "ar";
export const LANG_COOKIE = "rivvo_lang";

type Vars = Record<string, string | number>;

type I18n = {
  lang: Lang;
  /** The visitor's choice, even inside the English-only admin. */
  chosen: Lang;
  dir: "ltr" | "rtl";
  setLang: (l: Lang) => void;
  /** Translate an English sentence. Falls back to the English text when no Arabic one exists. */
  t: (en: string, vars?: Vars) => string;
};

function fill(s: string, vars?: Vars) {
  if (!vars) return s;
  return s.replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));
}

export function translate(lang: Lang, en: string, vars?: Vars) {
  const text = lang === "ar" ? (ar[en] ?? en) : en;
  return fill(text, vars);
}

const Ctx = createContext<I18n>({
  lang: "en",
  chosen: "en",
  dir: "ltr",
  setLang: () => {},
  t: (en, vars) => fill(en, vars),
});

export function I18nProvider({ initial, children }: { initial: Lang; children: ReactNode }) {
  const [chosen, setLangState] = useState<Lang>(initial);
  // The admin area stays in English.
  const inAdmin = useRouterState({ select: (s) => s.location.pathname.startsWith("/admin") });
  const lang: Lang = inAdmin ? "en" : chosen;

  // Prices read this while the page renders.
  setMoneyUnit(lang === "ar" ? "ج.م" : "EGP");

  const setLang = useCallback((l: Lang) => {
    try {
      document.cookie = `${LANG_COOKIE}=${l}; path=/; max-age=31536000; samesite=lax`;
    } catch {
      /* cookies blocked: the choice lasts until the page is closed */
    }
    setLangState(l);
    // Reload so every page, price and piece of content comes back in the new language.
    window.location.reload();
  }, []);

  const dir = lang === "ar" ? "rtl" : "ltr";

  useEffect(() => {
    document.documentElement.lang = lang;
    document.documentElement.dir = dir;
  }, [lang, dir]);

  const value = useMemo<I18n>(
    () => ({ lang, chosen, dir, setLang, t: (en, vars) => translate(lang, en, vars) }),
    [lang, chosen, dir, setLang],
  );
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useI18n() {
  return useContext(Ctx);
}
