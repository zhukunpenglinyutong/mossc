"use client"

import { Toaster } from "@/components/ui/sonner"
import { TooltipProvider } from "@/components/ui/tooltip"
import { LanguageProvider } from "@/i18n"
import type { Locale, LocalePreference } from "@/i18n"

export function RootProviders({
  children,
  initialLocale,
  initialPreference,
}: {
  children: React.ReactNode
  initialLocale: Locale
  initialPreference: LocalePreference
}) {
  return (
    <LanguageProvider
      initialLocale={initialLocale}
      initialPreference={initialPreference}
    >
      <TooltipProvider>
        {children}
        <Toaster />
      </TooltipProvider>
    </LanguageProvider>
  )
}
