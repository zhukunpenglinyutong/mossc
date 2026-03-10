"use client"

import { Crown, MessageSquare, X } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { useI18n } from "@/i18n"
import { getAgentAvatarUrl, getUserAvatarUrl, useAvatarVersion } from "@/lib/avatar"
import { getStrategyLabel } from "@/lib/orchestration/labels"
import { cn } from "@/lib/utils"
import { useApp } from "@/store/app-context"
import type { Conversation } from "@/types"

interface GroupMembersPanelProps {
  conversation: Conversation
  onClose: () => void
}

const statusColors: Record<string, string> = {
  idle: "bg-green-500",
  working: "bg-yellow-500",
  busy: "bg-red-500",
  chatting: "bg-yellow-500",
  thinking: "bg-yellow-500",
  completed: "bg-green-500",
}

export function GroupMembersPanel({ conversation, onClose }: GroupMembersPanelProps) {
  const { dispatch, state } = useApp()
  const { t } = useI18n()
  useAvatarVersion()
  const memberIds = conversation.members
  const hasUser = memberIds.includes("user")
  const agentMembers = state.agents.filter((a) => memberIds.includes(a.id))
  const orchestration = conversation.orchestration
  const coordinatorId = orchestration?.coordinatorId

  const handleStartChat = (agentId: string) => {
    const existing = state.conversations.find(
      (c) => c.type === "direct" && c.members.includes(agentId)
    )
    if (existing) {
      dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: existing.id })
    }
  }

  const totalCount = (hasUser ? 1 : 0) + agentMembers.length

  return (
    <div className="w-60 border-l flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 border-b">
        <span className="font-medium text-sm">
          {t("groupMembers.title", { count: totalCount })}
        </span>
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onClose}>
          <X className="h-4 w-4" />
        </Button>
      </div>
      {orchestration && orchestration.strategy !== "all" && (
        <div className="px-4 py-2 border-b">
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-muted-foreground">{t("groupMembers.collaborationMode")}</span>
            <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4 font-normal">
              {getStrategyLabel(orchestration.strategy, t)}
            </Badge>
          </div>
          {orchestration.strategy === "skill-match" && orchestration.maxResponders && (
            <p className="text-[11px] text-muted-foreground mt-1">
              {t("groupMembers.maxResponders", { count: orchestration.maxResponders })}
            </p>
          )}
        </div>
      )}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {hasUser && (
            <div className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent">
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getUserAvatarUrl()} alt={t("common.meHuman")} />
                  <AvatarFallback className="text-xs bg-green-100 text-green-700">
                    {t("common.meHuman")}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                    "bg-green-500"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t("common.meHuman")}</p>
                <p className="text-xs text-muted-foreground truncate">
                  {t("groupMembers.admin")}
                </p>
              </div>
            </div>
          )}
          {agentMembers.map((agent) => (
            <div
              key={agent.id}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-accent"
            >
              <div className="relative">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={getAgentAvatarUrl(agent.id, agent.name)} alt={agent.name} />
                  <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                    {agent.avatar}
                  </AvatarFallback>
                </Avatar>
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                    statusColors[agent.status] ?? "bg-gray-400"
                  )}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1">
                  <p className="text-sm font-medium truncate">{agent.name}</p>
                  {coordinatorId === agent.id && (
                    <Crown className="h-3 w-3 text-amber-500 shrink-0" />
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">
                  {agent.role}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 shrink-0"
                onClick={() => handleStartChat(agent.id)}
              >
                <MessageSquare className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      </ScrollArea>
      <div className="p-3 border-t">
        <Button variant="outline" size="sm" className="w-full text-xs">
          {t("groupMembers.addMembers")}
        </Button>
      </div>
    </div>
  )
}
