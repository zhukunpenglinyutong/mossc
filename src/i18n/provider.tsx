"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import {
  getLocaleDirection,
  LOCALE_PREFERENCE_COOKIE,
  LOCALE_PREFERENCE_STORAGE_KEY,
  parseLocalePreference,
  resolveLocale,
  resolveLocaleFromNavigator,
} from "./config"
import { translateMessage } from "./messages"
import type { Locale, LocalePreference, Translate, TranslationValues } from "./types"

interface LanguageContextValue {
  locale: Locale
  preference: LocalePreference
  setPreference: (nextPreference: LocalePreference) => void
  t: Translate
}

const LanguageContext = createContext<LanguageContextValue | null>(null)

const persistPreference = (preference: LocalePreference) => {
  try {
    localStorage.setItem(LOCALE_PREFERENCE_STORAGE_KEY, preference)
  } catch {
    // localStorage unavailable
  }
  document.cookie = `${LOCALE_PREFERENCE_COOKIE}=${encodeURIComponent(preference)}; path=/; max-age=31536000; samesite=lax`
}

const readStoredPreference = (): LocalePreference | null => {
  try {
    const stored = localStorage.getItem(LOCALE_PREFERENCE_STORAGE_KEY)
    return stored ? parseLocalePreference(stored) : null
  } catch {
    return null
  }
}

export function LanguageProvider({
  children,
  initialLocale,
  initialPreference,
}: {
  children: ReactNode
  initialLocale: Locale
  initialPreference: LocalePreference
}) {
  const [preference, setPreferenceState] = useState<LocalePreference>(() => {
    if (typeof window === "undefined") return initialPreference
    return readStoredPreference() ?? initialPreference
  })
  const [locale, setLocale] = useState<Locale>(() => {
    if (typeof window === "undefined") return initialLocale
    const resolvedPreference = readStoredPreference() ?? initialPreference
    return resolveLocale(
      resolvedPreference,
      resolveLocaleFromNavigator(navigator.languages ?? [navigator.language])
    )
  })

  const applyPreference = useCallback((nextPreference: LocalePreference) => {
    const detectedLocale = resolveLocaleFromNavigator(
      typeof navigator !== "undefined" ? navigator.languages ?? [navigator.language] : []
    )
    const nextLocale = resolveLocale(nextPreference, detectedLocale)

    setPreferenceState(nextPreference)
    setLocale(nextLocale)

    if (typeof document !== "undefined") {
      document.documentElement.lang = nextLocale
      document.documentElement.dir = getLocaleDirection(nextLocale)
    }

    persistPreference(nextPreference)
  }, [])

  useEffect(() => {
    document.documentElement.lang = locale
    document.documentElement.dir = getLocaleDirection(locale)
    persistPreference(preference)
  }, [locale, preference])

  const t = useCallback(
    (key: string, values?: TranslationValues) =>
      translateMessage(locale, key, values),
    [locale]
  )

  useEffect(() => {
    document.title = t("meta.title")
    const description = document.querySelector('meta[name="description"]')
    if (description) {
      description.setAttribute("content", t("meta.description"))
    }
  }, [t])

  const value = useMemo<LanguageContextValue>(
    () => ({
      locale,
      preference,
      setPreference: applyPreference,
      t,
    }),
    [applyPreference, locale, preference, t]
  )

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  )
}

export const useI18n = () => {
  const context = useContext(LanguageContext)
  if (!context) {
    throw new Error("useI18n must be used within LanguageProvider")
  }
  return context
}
