"use client"

import { useRef, useState } from "react"
import { Clock, Loader2, MessageSquare, Settings, Users } from "lucide-react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { getUserAvatarUrl, setUserAvatar, useAvatarVersion } from "@/lib/avatar"
import { cn } from "@/lib/utils"
import { useApp } from "@/store/app-context"
import { SettingsDialog } from "@/components/settings/settings-dialog"
import type { ViewType } from "@/types"

interface NavItem {
  id: ViewType
  label: string
  icon: React.ReactNode
  unavailable?: boolean
}

export function NavRail() {
  const { state, dispatch } = useApp()
  const { t } = useI18n()
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [avatarConfirmOpen, setAvatarConfirmOpen] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  useAvatarVersion()

  const handleUserAvatarChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""

    if (!file) return

    if (!file.type.startsWith("image/")) {
      toast.error(t("header.selectImageFile"))
      return
    }

    if (file.size > 2 * 1024 * 1024) {
      toast.error(t("header.imageSizeLimit"))
      return
    }

    setAvatarUploading(true)

    try {
      const formData = new FormData()
      formData.append("agentId", "user")
      formData.append("file", file)

      const response = await fetch("/api/intents/agent-avatar", {
        method: "POST",
        body: formData,
      })
      const data = await response.json()

      if (!response.ok || data.error) {
        toast.error(data.error || t("header.uploadFailed"))
        return
      }

      setUserAvatar(data.avatarUrl)
      toast.success(t("header.personalAvatarUpdated"))
    } catch {
      toast.error(t("header.networkError"))
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleAvatarConfirm = () => {
    setAvatarConfirmOpen(false)
    fileInputRef.current?.click()
  }

  const navItems: NavItem[] = [
    {
      id: "chat",
      label: t("nav.chat"),
      icon: <MessageSquare className="h-5 w-5" />,
    },
    {
      id: "virtual-team",
      label: t("nav.virtualTeam"),
      icon: <Users className="h-5 w-5" />,
      unavailable: true,
    },
    {
      id: "cron",
      label: t("nav.cron"),
      icon: <Clock className="h-5 w-5" />,
    },
  ]

  return (
    <div className="shrink-0 w-[56px] flex flex-col items-center border-r bg-muted/50 py-3 gap-1">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={handleUserAvatarChange}
      />

      {/* User Avatar */}
      <Tooltip>
        <TooltipTrigger
          render={
            <button
              type="button"
              className="mb-2 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed"
              onClick={() => setAvatarConfirmOpen(true)}
              disabled={avatarUploading}
            />
          }
        >
          <div className="relative">
            <Avatar className="h-9 w-9">
              <AvatarImage src={getUserAvatarUrl()} alt={t("common.me")} />
              <AvatarFallback className="text-xs font-medium bg-green-100 text-green-700">
                {t("common.me")}
              </AvatarFallback>
            </Avatar>
            {avatarUploading && (
              <span className="absolute inset-0 flex items-center justify-center rounded-full bg-black/35 text-white">
                <Loader2 className="h-4 w-4 animate-spin" />
              </span>
            )}
          </div>
        </TooltipTrigger>
        <TooltipContent side="right">{t("nav.changeMyAvatar")}</TooltipContent>
      </Tooltip>

      {/* Nav Items */}
      {navItems.map((item) => (
        <Tooltip key={item.id}>
          <TooltipTrigger
            render={
              <button
                aria-disabled={item.unavailable}
                onClick={() => {
                  if (item.unavailable) {
                    toast.info(t("header.unavailableAction", { action: item.label }))
                    return
                  }
                  dispatch({ type: "SET_VIEW", payload: item.id })
                }}
                className={cn(
                  "flex items-center justify-center w-10 h-10 rounded-lg transition-colors",
                  item.unavailable
                    ? "cursor-not-allowed opacity-45 text-muted-foreground"
                    : "hover:bg-accent",
                  !item.unavailable && state.view === item.id
                    ? "bg-accent text-primary"
                    : "text-muted-foreground"
                )}
              />
            }
          >
            {item.icon}
          </TooltipTrigger>
          <TooltipContent side="right">{item.label}</TooltipContent>
        </Tooltip>
      ))}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Settings at bottom */}
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              variant="ghost"
              size="icon"
              className="h-10 w-10 rounded-lg text-muted-foreground hover:bg-accent"
              onClick={() => setSettingsOpen(true)}
            />
          }
        >
          <Settings className="h-5 w-5" />
        </TooltipTrigger>
        <TooltipContent side="right">{t("nav.settings")}</TooltipContent>
      </Tooltip>

      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />

      <AlertDialog open={avatarConfirmOpen} onOpenChange={setAvatarConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("nav.changeMyAvatar")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("nav.changeMyAvatarDescription")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleAvatarConfirm}>
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
