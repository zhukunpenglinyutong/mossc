"use client"

import { Check, Loader2, RefreshCw, Upload } from "lucide-react"
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
import { Label } from "@/components/ui/label"
import { getAgentAvatarUrl, setAgentAvatar, presetAvatarUrl, PRESET_AVATAR_SEEDS } from "@/lib/avatar"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"

export function ChangeAvatarDialog({
  open,
  onOpenChange,
  agentId,
  agentName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  agentId: string
  agentName: string
}) {
  const { t } = useI18n()
  const [selected, setSelected] = useState<string | null>(null)
  const [uploadPreview, setUploadPreview] = useState<string | null>(null)
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentAvatar = getAgentAvatarUrl(agentId, agentName)

  const seeds = PRESET_AVATAR_SEEDS.map((seed) =>
    refreshKey === 0 ? seed : `${seed}-${refreshKey}`
  )

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith("image/")) {
      setError(t("header.selectImageFile"))
      return
    }
    if (file.size > 2 * 1024 * 1024) {
      setError(t("header.imageSizeLimit"))
      return
    }

    setError(null)
    setUploadFile(file)
    setSelected(null)

    const reader = new FileReader()
    reader.onload = () => setUploadPreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleConfirm = async () => {
    if (!selected && !uploadFile) return

    setLoading(true)
    setError(null)

    try {
      if (uploadFile) {
        const formData = new FormData()
        formData.append("agentId", agentId)
        formData.append("file", uploadFile)

        const res = await fetch("/api/intents/agent-avatar", {
          method: "POST",
          body: formData,
        })
        const data = await res.json()

        if (!res.ok || data.error) {
          setError(data.error || t("header.uploadFailed"))
          return
        }

        setAgentAvatar(agentId, data.avatarUrl)
        toast.success(t("header.avatarUpdated"))
      } else if (selected) {
        setAgentAvatar(agentId, selected)
        toast.success(t("header.avatarUpdated"))
      }

      onOpenChange(false)
    } catch {
      setError(t("header.networkError"))
    } finally {
      setLoading(false)
    }
  }

  const resetState = () => {
    setSelected(null)
    setUploadPreview(null)
    setUploadFile(null)
    setError(null)
    setRefreshKey(0)
  }

  const previewUrl = uploadPreview ?? selected ?? currentAvatar

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (loading) return
        onOpenChange(v)
        if (!v) resetState()
      }}
    >
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle>{t("header.changeAvatarTitle")}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {error && (
            <p className="text-sm text-destructive">{error}</p>
          )}

          {/* Preview */}
          <div className="flex justify-center">
            <div className="relative h-16 w-16 rounded-full overflow-hidden border-2 border-border">
              <img
                src={previewUrl}
                alt={t("header.preview")}
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* Preset avatars */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="text-xs text-muted-foreground">{t("header.chooseAvatar")}</Label>
              <button
                type="button"
                className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                onClick={() => {
                  setRefreshKey((k) => k + 1)
                  setSelected(null)
                }}
              >
                <RefreshCw className="h-3 w-3" />
                {t("header.refreshBatch")}
              </button>
            </div>
            <div className="grid grid-cols-6 gap-2">
              {seeds.map((seed) => {
                const url = presetAvatarUrl(seed)
                const isSelected = selected === url && !uploadPreview
                return (
                  <button
                    key={seed}
                    type="button"
                    className={cn(
                      "relative h-12 w-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer",
                      isSelected
                        ? "border-primary ring-2 ring-primary/30"
                        : "border-transparent hover:border-border"
                    )}
                    onClick={() => {
                      setSelected(url)
                      setUploadPreview(null)
                      setUploadFile(null)
                      setError(null)
                    }}
                  >
                    <img
                      src={url}
                      alt={seed}
                      className="h-full w-full object-cover"
                    />
                    {isSelected && (
                      <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                        <Check className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Upload */}
          <div className="space-y-2">
            <div className="relative flex items-center gap-2 text-xs text-muted-foreground before:flex-1 before:border-t after:flex-1 after:border-t">
              {t("header.orUploadCustom")}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={handleFileSelect}
            />
            <Button
              variant="outline"
              className="w-full gap-2"
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
            >
              <Upload className="h-4 w-4" />
              {uploadFile ? uploadFile.name : t("header.clickToUpload")}
            </Button>
            <p className="text-[11px] text-muted-foreground text-center">
              {t("header.uploadSupport")}
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            {t("common.cancel")}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={(!selected && !uploadFile) || loading}
          >
            {loading && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
            {loading ? t("common.saving") : t("common.confirm")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
