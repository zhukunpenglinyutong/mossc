"use client"

import { useState } from "react"
import { Plus, Search } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/i18n"

import { KNOWN_PROVIDERS } from "./known-providers"
import type { KnownProvider } from "./model-config-types"

interface AddProviderDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  existingProviderIds: string[]
  onAddKnown: (provider: KnownProvider) => void
  onAddCustom: () => void
}

export function AddProviderDialog({
  open,
  onOpenChange,
  existingProviderIds,
  onAddKnown,
  onAddCustom,
}: AddProviderDialogProps) {
  const { t, locale } = useI18n()
  const [search, setSearch] = useState("")

  const isChinese = locale.startsWith("zh")

  const existingSet = new Set(existingProviderIds)

  const filtered = KNOWN_PROVIDERS.filter((kp) => {
    if (!search.trim()) return true
    const q = search.toLowerCase()
    const name = isChinese && kp.nameZh ? kp.nameZh : kp.name
    return (
      kp.id.toLowerCase().includes(q) ||
      name.toLowerCase().includes(q) ||
      kp.name.toLowerCase().includes(q)
    )
  })

  const cnProviders = filtered.filter((kp) => kp.category === "cn")
  const intlProviders = filtered.filter((kp) => kp.category === "intl")
  const aggProviders = filtered.filter((kp) => kp.category === "agg")

  const handleAdd = (kp: KnownProvider) => {
    onAddKnown(kp)
    onOpenChange(false)
  }

  const handleAddCustom = () => {
    onAddCustom()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:!max-w-md max-h-[80vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>{t("modelConfig.addProvider")}</DialogTitle>
          <DialogDescription>
            {t("modelConfig.addProviderDesc")}
          </DialogDescription>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder={t("modelConfig.searchProviderPlaceholder")}
            className="pl-8 text-sm"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 min-h-0">
          {/* Custom provider */}
          <Button
            variant="outline"
            className="w-full justify-start gap-2"
            onClick={handleAddCustom}
          >
            <Plus className="h-4 w-4" />
            {t("modelConfig.addCustomProvider")}
          </Button>

          <Separator />

          {/* Known providers by category */}
          <ProviderGroup
            label={t("modelConfig.providerCategoryCn")}
            providers={cnProviders}
            existingSet={existingSet}
            isChinese={isChinese}
            onAdd={handleAdd}
          />

          <ProviderGroup
            label={t("modelConfig.providerCategoryIntl")}
            providers={intlProviders}
            existingSet={existingSet}
            isChinese={isChinese}
            onAdd={handleAdd}
          />

          <ProviderGroup
            label={t("modelConfig.providerCategoryAgg")}
            providers={aggProviders}
            existingSet={existingSet}
            isChinese={isChinese}
            onAdd={handleAdd}
          />

          {filtered.length === 0 && (
            <div className="text-center text-sm text-muted-foreground py-4">
              {t("modelConfig.noMatch")}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProviderGroup({
  label,
  providers,
  existingSet,
  isChinese,
  onAdd,
}: {
  label: string
  providers: KnownProvider[]
  existingSet: Set<string>
  isChinese: boolean
  onAdd: (kp: KnownProvider) => void
}) {
  const { t } = useI18n()
  if (providers.length === 0) return null

  return (
    <div className="space-y-1.5">
      <div className="text-xs font-medium text-muted-foreground px-1">{label}</div>
      <div className="grid grid-cols-2 gap-1.5">
        {providers.map((kp) => {
          const already = existingSet.has(kp.id)
          const displayName = isChinese && kp.nameZh ? kp.nameZh : kp.name
          return (
            <button
              key={kp.id}
              disabled={already}
              onClick={() => onAdd(kp)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{displayName}</div>
                <div className="text-[10px] text-muted-foreground truncate">
                  {kp.models.length} {kp.models.length === 1 ? "model" : "models"}
                </div>
              </div>
              {already && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {t("modelConfig.alreadyAdded")}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
