import ar from "./locales/ar.json"
import en from "./locales/en.json"
import fr from "./locales/fr.json"
import hi from "./locales/hi.json"
import ja from "./locales/ja.json"
import ko from "./locales/ko.json"
import ru from "./locales/ru.json"
import vi from "./locales/vi.json"
import zhCN from "./locales/zh-CN.json"
import zhTW from "./locales/zh-TW.json"
import { DEFAULT_LOCALE } from "./config"
import type { Dictionary, Locale, TranslationValues } from "./types"

const messages: Record<Locale, Dictionary> = {
  "zh-CN": zhCN as Dictionary,
  "zh-TW": zhTW as Dictionary,
  en: en as Dictionary,
  ja: ja as Dictionary,
  ko: ko as Dictionary,
  ru: ru as Dictionary,
  ar: ar as Dictionary,
  hi: hi as Dictionary,
  fr: fr as Dictionary,
  vi: vi as Dictionary,
}

const getMessageByKey = (dictionary: Dictionary, key: string): string | null => {
  let current: string | Dictionary | undefined = dictionary

  for (const part of key.split(".")) {
    if (!current || typeof current === "string") return null
    current = current[part]
  }

  return typeof current === "string" ? current : null
}

const formatTemplate = (template: string, values?: TranslationValues): string => {
  if (!values) return template

  return template.replace(/\{\{(.*?)\}\}/g, (_, rawKey: string) => {
    const key = rawKey.trim()
    const value = values[key]
    return value === undefined ? `{{${key}}}` : String(value)
  })
}

export const getDictionary = (locale: Locale): Dictionary => messages[locale]

export const translateMessage = (
  locale: Locale,
  key: string,
  values?: TranslationValues
): string => {
  const template =
    getMessageByKey(messages[locale], key) ??
    getMessageByKey(messages[DEFAULT_LOCALE], key) ??
    key

  return formatTemplate(template, values)
}
