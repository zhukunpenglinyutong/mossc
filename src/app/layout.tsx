import type { Metadata } from "next"
import { cookies, headers } from "next/headers"
import { Geist, Geist_Mono } from "next/font/google"
import { RootProviders } from "@/components/providers/root-providers"
import {
  getLocaleDirection,
  parseLocalePreference,
  LOCALE_PREFERENCE_COOKIE,
  resolveLocale,
  resolveLocaleFromAcceptLanguage,
  getDictionary,
} from "@/i18n"
import "./globals.css"

async function resolveRequestLocale() {
  const [cookieStore, headerStore] = await Promise.all([cookies(), headers()])
  const preference = parseLocalePreference(
    cookieStore.get(LOCALE_PREFERENCE_COOKIE)?.value
  )
  const locale = resolveLocale(
    preference,
    resolveLocaleFromAcceptLanguage(headerStore.get("accept-language"))
  )
  return { locale, preference }
}

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
})

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
})

export async function generateMetadata(): Promise<Metadata> {
  const { locale } = await resolveRequestLocale()
  const dictionary = getDictionary(locale)
  const meta = dictionary.meta as { title: string; description: string }

  return {
    title: meta.title,
    description: meta.description,
    icons: {
      icon: "/mossclogo.png",
      shortcut: "/mossclogo.png",
      apple: "/mossclogo.png",
    },
  }
}

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  const { locale: initialLocale, preference: initialPreference } = await resolveRequestLocale()
  const initialDirection = getLocaleDirection(initialLocale)

  return (
    <html lang={initialLocale} dir={initialDirection}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <RootProviders
          initialLocale={initialLocale}
          initialPreference={initialPreference}
        >
          {children}
        </RootProviders>
      </body>
    </html>
  )
}
