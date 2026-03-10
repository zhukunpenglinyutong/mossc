"use client"

import { useState } from "react"
import { ArrowLeft, Brain, Check, Languages, Users } from "lucide-react"
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import {
  LOCALE_OPTIONS,
  getLocaleLabel,
  useI18n,
  type LocalePreference,
} from "@/i18n"
import { cn } from "@/lib/utils"
import { ModelConfigPanel } from "./model-config"

interface SettingsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

type SettingsSection = "models" | "language" | "community"

export function SettingsDialog({ open, onOpenChange }: SettingsDialogProps) {
  const { t } = useI18n()
  const [activeSection, setActiveSection] = useState<SettingsSection>("models")
  const navItems: { id: SettingsSection; label: string; icon: typeof Brain | typeof Languages }[] = [
    { id: "models", label: t("settings.sections.models"), icon: Brain },
    { id: "language", label: t("settings.sections.language"), icon: Languages },
    { id: "community", label: t("settings.sections.community"), icon: Users },
  ]

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="w-[80vw] !max-w-[1000px] h-[80vh] p-0 gap-0 overflow-hidden"
      >
        <div className="flex h-full overflow-hidden">
          {/* Sidebar */}
          <nav className="w-48 shrink-0 border-r bg-muted/30 flex flex-col">
            <div className="px-3 py-3 border-b">
              <button
                onClick={() => onOpenChange(false)}
                className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="h-3.5 w-3.5" />
                {t("settings.backToApp")}
              </button>
            </div>
            <div className="flex-1 py-2 px-2 space-y-0.5">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={cn(
                    "flex items-center gap-2 w-full rounded-md px-2.5 py-1.5 text-sm transition-colors",
                    activeSection === item.id
                      ? "bg-primary/10 text-primary font-medium"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  )}
                >
                  <item.icon className="h-4 w-4" />
                  {item.label}
                </button>
              ))}
            </div>
          </nav>

          {/* Content */}
            <div className="flex-1 min-w-0 min-h-0 flex flex-col">
              <div className="px-5 py-4 border-b shrink-0">
                <h2 className="text-base font-medium">
                  {navItems.find((n) => n.id === activeSection)?.label}
                </h2>
                {activeSection === "models" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.descriptions.models")}
                  </p>
                )}
                {activeSection === "language" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.descriptions.language")}
                  </p>
                )}
                {activeSection === "community" && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {t("settings.descriptions.community")}
                  </p>
                )}
              </div>

              <div className="flex-1 min-h-0 overflow-y-auto">
                <div className="px-5 py-4">
                  {activeSection === "models" && <ModelConfigPanel />}
                  {activeSection === "language" && <LanguageSettingsPanel />}
                  {activeSection === "community" && <CommunityPanel />}
                </div>
              </div>
            </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function LanguageSettingsPanel() {
  const { locale, preference, setPreference, t } = useI18n()

  const options: Array<{
    value: LocalePreference
    label: string
    description?: string
  }> = [
    {
      value: "system",
      label: t("settings.language.system"),
      description: t("settings.language.systemDescription"),
    },
    ...LOCALE_OPTIONS.map((option) => ({
      value: option.code,
      label: option.label,
    })),
  ]

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-muted/20 px-4 py-3 text-sm text-muted-foreground">
        {t("settings.language.current")}: {getLocaleLabel(locale)}
      </div>
      <div className="space-y-2">
        {options.map((option) => {
          const active = preference === option.value
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setPreference(option.value)}
              className={cn(
                "flex w-full items-start justify-between rounded-lg border px-4 py-3 text-left transition-colors",
                active
                  ? "border-primary bg-primary/5"
                  : "border-border hover:bg-accent"
              )}
            >
              <div className="space-y-1">
                <div className="text-sm font-medium text-foreground">{option.label}</div>
                {option.description && (
                  <div className="text-xs text-muted-foreground">{option.description}</div>
                )}
              </div>
              {active && (
                <div className="rounded-full bg-primary/10 p-1 text-primary">
                  <Check className="h-4 w-4" />
                </div>
              )}
            </button>
          )
        })}
      </div>
      <Button variant="outline" onClick={() => setPreference("system")}>
        {t("settings.language.system")}
      </Button>
    </div>
  )
}

function CommunityPanel() {
  const { t } = useI18n()

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-base font-semibold">{t("settings.community.title")}</h3>
        <p className="text-sm text-muted-foreground">
          {t("settings.community.description")}
        </p>
      </div>

      <div className="flex justify-center py-6">
        <div className="flex flex-col items-center gap-4 rounded-lg border bg-muted/20 p-6 shadow-sm">
          <img
            src="https://mossc-1253302184.cos.ap-beijing.myqcloud.com/wxq.png"
            alt="WeChat QR Code"
            className="h-[280px] w-[280px] rounded bg-white object-contain p-2"
          />
          <p className="text-sm text-muted-foreground">
            {t("settings.community.qrTip")}
          </p>
        </div>
      </div>
    </div>
  )
}
