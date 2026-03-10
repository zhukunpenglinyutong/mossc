"use client"

import { Loader2, MoreHorizontal, Phone, Search, Trash2, Users, Video } from "lucide-react"
import { useState } from "react"
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
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { getAgentAvatarUrl, useAvatarVersion } from "@/lib/avatar"
import { useI18n } from "@/i18n"
import { getStrategyLabel } from "@/lib/orchestration/labels"
import { cn } from "@/lib/utils"
import { useApp } from "@/store/app-context"
import { ChangeAvatarDialog } from "./change-avatar-dialog"
import { GroupAvatar } from "./group-avatar"
import { RenameAgentDialog } from "./rename-agent-dialog"
import type { Conversation } from "@/types"

interface ChatHeaderProps {
  conversation: Conversation
  onToggleMembers?: () => void
  onAgentAvatarClick?: (agentId: string, agentName: string) => void
}

export function ChatHeader({ conversation, onToggleMembers, onAgentAvatarClick }: ChatHeaderProps) {
  const { state, dispatch, refreshFleet } = useApp()
  const { t } = useI18n()
  const [renameOpen, setRenameOpen] = useState(false)
  const [avatarOpen, setAvatarOpen] = useState(false)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)
  useAvatarVersion() // re-render when avatar changes
  const isGroup = conversation.type === "group"
  const agent = !isGroup ? state.agents.find((a) => a.id === conversation.members[0]) : null
  const statusColor =
    agent?.status === "idle"
      ? "bg-green-500"
      : agent?.status === "busy"
        ? "bg-red-500"
        : "bg-yellow-500"

  const statusLabel =
    agent?.status === "idle"
      ? t("header.status.online")
      : agent?.status === "working"
        ? t("header.status.working")
        : agent?.status === "busy"
          ? t("header.status.busy")
          : agent?.status === "thinking"
          ? t("header.status.thinking")
            : t("header.status.online")

  const handleUnavailableAction = (actionLabel: string) => {
    toast.info(t("header.unavailableAction", { action: actionLabel }))
  }

  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b bg-background">
      <div className="flex items-center gap-3 min-w-0">
        {isGroup ? (
          <GroupAvatar
            members={conversation.members.map((id) => {
              if (id === "user") return { id, name: t("common.meHuman") }
              const a = state.agents.find((ag) => ag.id === id)
              return { id, name: a?.name ?? id }
            })}
            size={36}
          />
        ) : (
          <button
            className="relative cursor-pointer rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            onClick={() => agent && onAgentAvatarClick?.(agent.id, agent.name)}
          >
            <Avatar className="h-9 w-9">
              <AvatarImage src={getAgentAvatarUrl(agent?.id ?? conversation.members[0] ?? "", conversation.name)} alt={conversation.name} />
              <AvatarFallback className="text-sm font-medium bg-blue-100 text-blue-700">
                {conversation.avatar}
              </AvatarFallback>
            </Avatar>
            {agent && (
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background",
                statusColor
              )} />
            )}
          </button>
        )}

        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm truncate">{conversation.name}</span>
            {isGroup && (
              <>
                <span className="text-xs text-muted-foreground shrink-0">
                  ({conversation.members.length})
                </span>
                {conversation.orchestration?.strategy && conversation.orchestration.strategy !== "all" && (
                  <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
                    {getStrategyLabel(conversation.orchestration.strategy, t)}
                  </Badge>
                )}
              </>
            )}
          </div>
          <div className="text-xs text-muted-foreground truncate">
            {isGroup ? (
              conversation.purpose ?? t("common.memberCount", { count: conversation.members.length })
            ) : agent ? (
              <span className="flex items-center gap-1">
                {agent.role && <span>{agent.role}</span>}
                {agent.role && <span className="text-muted-foreground/40">·</span>}
                <span>{statusLabel}</span>
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-0.5 shrink-0">
        <HeaderButton
          icon={<Phone className="h-4 w-4" />}
          tooltip={t("header.tooltips.voiceCall")}
          unavailable
          onClick={() => handleUnavailableAction(t("header.tooltips.voiceCall"))}
        />
        <HeaderButton
          icon={<Video className="h-4 w-4" />}
          tooltip={t("header.tooltips.videoCall")}
          unavailable
          onClick={() => handleUnavailableAction(t("header.tooltips.videoCall"))}
        />
        <HeaderButton
          icon={<Search className="h-4 w-4" />}
          tooltip={t("header.tooltips.searchMessages")}
          unavailable
          onClick={() => handleUnavailableAction(t("header.tooltips.searchMessages"))}
        />

        {isGroup && onToggleMembers && (
          <HeaderButton
            icon={<Users className="h-4 w-4" />}
            tooltip={t("header.tooltips.membersList")}
            onClick={onToggleMembers}
          />
        )}

        <DropdownMenu>
          <DropdownMenuTrigger
            render={<Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground" />}
          >
            <MoreHorizontal className="h-4 w-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              className="cursor-not-allowed text-muted-foreground opacity-50 focus:text-muted-foreground"
              onClick={() => handleUnavailableAction(t("header.menu.viewProfile"))}
            >
              {t("header.menu.viewProfile")}
            </DropdownMenuItem>
            {!isGroup && agent && (
              <>
                <DropdownMenuItem onClick={() => setRenameOpen(true)}>
                  {t("header.menu.rename")}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setAvatarOpen(true)}>
                  {t("header.menu.changeAvatar")}
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuItem
              className="cursor-not-allowed text-muted-foreground opacity-50 focus:text-muted-foreground"
              onClick={() => handleUnavailableAction(t("header.menu.pinConversation"))}
            >
              {t("header.menu.pinConversation")}
            </DropdownMenuItem>
            <DropdownMenuItem
              className="cursor-not-allowed text-muted-foreground opacity-50 focus:text-muted-foreground"
              onClick={() => handleUnavailableAction(t("header.menu.muteNotifications"))}
            >
              {t("header.menu.muteNotifications")}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="cursor-not-allowed text-muted-foreground opacity-50 focus:text-muted-foreground"
              onClick={() => handleUnavailableAction(t("header.menu.clearHistory"))}
            >
              {t("header.menu.clearHistory")}
            </DropdownMenuItem>
            {isGroup && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (window.confirm(t("header.dissolveGroupConfirm", { name: conversation.name }))) {
                    dispatch({ type: "DISSOLVE_GROUP", payload: { conversationId: conversation.id } })
                    toast.success(t("header.dissolveGroupSuccess", { name: conversation.name }))
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2" />
                {t("header.menu.dissolveGroup")}
              </DropdownMenuItem>
            )}
            {!isGroup && agent && (
              <DropdownMenuItem
                variant="destructive"
                onClick={() => setDeleteConfirmOpen(true)}
              >
                {t("header.menu.deleteAgent")}
              </DropdownMenuItem>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {!isGroup && agent && (
        <>
          <RenameAgentDialog
            open={renameOpen}
            onOpenChange={setRenameOpen}
            agentId={agent.id}
            currentName={agent.name}
          />
          <ChangeAvatarDialog
            open={avatarOpen}
            onOpenChange={setAvatarOpen}
            agentId={agent.id}
            agentName={agent.name}
          />
          <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("header.deleteAgentTitle")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("header.deleteAgentDescription", { name: agent.name })}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleting}>{t("common.cancel")}</AlertDialogCancel>
                <AlertDialogAction
                  disabled={deleting}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  onClick={async () => {
                    setDeleting(true)
                    try {
                      const res = await fetch("/api/intents/agent-delete", {
                        method: "POST",
                        headers: { "content-type": "application/json" },
                        body: JSON.stringify({ agentId: agent.id }),
                      })
                      const data = await res.json()

                      if (!res.ok || data.error) {
                        toast.error(data.error || t("header.deleteFailed"))
                        return
                      }

                      dispatch({ type: "REMOVE_AGENT", payload: { agentId: agent.id } })
                      toast.success(t("header.deleteSuccess", { name: agent.name }))
                      setTimeout(() => refreshFleet(), 1500)
                    } catch {
                      toast.error(t("header.networkError"))
                    } finally {
                      setDeleting(false)
                      setDeleteConfirmOpen(false)
                    }
                  }}
                >
                  {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
                  {deleting ? t("common.deleting") : t("common.delete")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      )}
    </div>
  )
}

function HeaderButton({
  icon,
  tooltip,
  onClick,
  unavailable = false,
}: {
  icon: React.ReactNode
  tooltip: string
  onClick?: () => void
  unavailable?: boolean
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon"
            aria-disabled={unavailable}
            className={cn(
              "h-8 w-8 text-muted-foreground",
              unavailable && "cursor-not-allowed opacity-50"
            )}
            onClick={onClick}
          />
        }
      >
        {icon}
      </TooltipTrigger>
      <TooltipContent side="bottom" className="text-xs">
        {tooltip}
      </TooltipContent>
    </Tooltip>
  )
}
