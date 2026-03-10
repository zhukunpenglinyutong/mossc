"use client"

import { Loader2 } from "lucide-react"
import { useRef, useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useI18n } from "@/i18n"
import { useApp } from "@/store/app-context"

export function RenameAgentDialog({
  open,
  onOpenChange,
  agentId,
  currentName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string
  currentName: string
}) {
  const { dispatch } = useApp()
  const { t } = useI18n()
  const [name, setName] = useState(currentName)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // sync input when dialog opens or currentName prop changes
  const prevOpen = useRef(open)
  if (open && !prevOpen.current) {
    setName(currentName)
    setError(null)
  }
  prevOpen.current = open

  const handleRename = async () => {
    const trimmed = name.trim()
    if (!trimmed || trimmed === currentName) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/intents/agent-rename", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId, name: trimmed }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        setError(data.error || t("header.renameFailed"))
        return
      }

      dispatch({ type: "RENAME_AGENT", payload: { agentId, name: trimmed } })
      toast.success(t("header.renameSuccess", { name: trimmed }))
      onOpenChange(false)
    } catch {
      setError(t("header.networkError"))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (loading) return
        onOpenChange(v)
        if (!v) {
          setName(currentName)
          setError(null)
        }
      }}
    >
      <DialogContent className="sm:max-w-[400px]">
        <DialogHeader>
          <DialogTitle>{t("header.renameTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}
          <div className="space-y-2">
            <Label>{t("header.newName")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, 30))}
              placeholder={t("header.newNamePlaceholder")}
              disabled={loading}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleRename()
              }}
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleRename}
            disabled={!name.trim() || name.trim() === currentName || loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {loading ? t("common.saving") : t("common.save")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
