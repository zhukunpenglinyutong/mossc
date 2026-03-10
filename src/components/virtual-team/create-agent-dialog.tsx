"use client"

import { AlertCircle, Loader2 } from "lucide-react"
import { useState } from "react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n"
import { useApp } from "@/store/app-context"

interface CreateAgentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated?: () => void
}

const MAX_NAME_LENGTH = 30

export function CreateAgentDialog({ open, onOpenChange }: CreateAgentDialogProps) {
  const { dispatch } = useApp()
  const { t } = useI18n()
  const [name, setName] = useState("")
  const [description, setDescription] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const resetForm = () => {
    setName("")
    setDescription("")
    setLoading(false)
    setError(null)
  }

  const handleCreate = async () => {
    const trimmed = name.trim()
    if (!trimmed) return

    setLoading(true)
    setError(null)

    try {
      const res = await fetch("/api/intents/agent-create", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: trimmed, description: description.trim() || undefined }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        const message =
          data.code === "GATEWAY_UNAVAILABLE"
            ? t("createAgent.gatewayUnavailable")
            : data.error || t("createAgent.createFailed")
        setError(message)
        return
      }

      const agentId = data.payload?.agentId ?? data.payload?.name ?? trimmed
      const displayName = data.displayName ?? trimmed
      // Persist display name mapping so SET_FLEET can restore it
      try {
        const raw = localStorage.getItem("mossb-agent-display-names")
        const map: Record<string, string> = raw ? JSON.parse(raw) : {}
        map[agentId] = displayName
        localStorage.setItem("mossb-agent-display-names", JSON.stringify(map))
      } catch { /* localStorage unavailable */ }
      dispatch({ type: "ADD_AGENT", payload: { agentId, name: displayName } })
      toast.success(t("createAgent.success", { name: displayName }))
      onOpenChange(false)
      resetForm()
    } catch {
      setError(t("createAgent.networkError"))
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
        if (!v) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("createAgent.title")}</DialogTitle>
          <DialogDescription>{t("createAgent.description")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {error && (
            <div className="flex items-start gap-2 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-2">
            <Label>{t("createAgent.nameLabel")}</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value.slice(0, MAX_NAME_LENGTH))}
              placeholder={t("createAgent.namePlaceholder")}
              disabled={loading}
              autoFocus
            />
            <p className="text-xs text-muted-foreground text-right">
              {name.length}/{MAX_NAME_LENGTH}
            </p>
          </div>

          <div className="space-y-2">
            <Label>{t("createAgent.descriptionLabel")}</Label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t("createAgent.descriptionPlaceholder")}
              rows={2}
              disabled={loading}
            />
            <p className="text-xs text-muted-foreground">
              {t("createAgent.descriptionHelper")}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button onClick={handleCreate} disabled={!name.trim() || loading}>
            {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {loading ? t("common.creating") : t("common.create")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
