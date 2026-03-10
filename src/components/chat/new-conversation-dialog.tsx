"use client"

import { Search } from "lucide-react"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAgentAvatarUrl } from "@/lib/avatar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/i18n"
import { useApp } from "@/store/app-context"
import type { Conversation } from "@/types"

interface NewConversationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function NewConversationDialog({
  open,
  onOpenChange,
}: NewConversationDialogProps) {
  const { state, dispatch } = useApp()
  const { t } = useI18n()
  const [search, setSearch] = useState("")

  const filtered = state.agents.filter(
    (a) =>
      a.name.includes(search) ||
      a.role.includes(search) ||
      a.skills.some((s) => s.includes(search))
  )

  const recommended = filtered.slice(0, 2)
  const rest = filtered.slice(2)

  const handleSelect = (agentId: string) => {
    const existing = state.conversations.find(
      (c) => c.type === "direct" && c.members.includes(agentId)
    )
    if (existing) {
      dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: existing.id })
    } else {
      const agent = state.agents.find((a) => a.id === agentId)!
      const newConv: Conversation = {
        id: `conv-${crypto.randomUUID()}`,
        type: "direct",
        name: agent.name,
        avatar: agent.avatar,
        members: [agentId],
        lastMessage: "",
        lastMessageTime: t("common.justNow"),
        unreadCount: 0,
      }
      dispatch({ type: "CREATE_CONVERSATION", payload: newConv })
    }
    onOpenChange(false)
    setSearch("")
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{t("newConversation.title")}</DialogTitle>
        </DialogHeader>

        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("newConversation.searchMembers")}
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <ScrollArea className="max-h-[400px]">
          {recommended.length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
                {t("newConversation.recommended")}
              </p>
              {recommended.map((agent) => (
                <AgentRow
                  key={agent.id}
                  agentId={agent.id}
                  name={agent.name}
                  role={agent.role}
                  avatar={agent.avatar}
                  skills={agent.skills}
                  onClick={() => handleSelect(agent.id)}
                />
              ))}
            </>
          )}

          {rest.length > 0 && (
            <>
              <Separator className="my-2" />
              <p className="text-xs font-medium text-muted-foreground px-1 mb-2">
                {t("newConversation.allMembers")}
              </p>
              {rest.map((agent) => (
                <AgentRow
                  key={agent.id}
                  agentId={agent.id}
                  name={agent.name}
                  role={agent.role}
                  avatar={agent.avatar}
                  skills={agent.skills}
                  onClick={() => handleSelect(agent.id)}
                />
              ))}
            </>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}

function AgentRow({
  agentId,
  name,
  role,
  avatar,
  skills,
  onClick,
}: {
  agentId: string
  name: string
  role: string
  avatar: string
  skills: string[]
  onClick: () => void
}) {
  const { t } = useI18n()

  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-3 rounded-lg hover:bg-accent text-left"
    >
      <Avatar className="h-10 w-10">
        <AvatarImage src={getAgentAvatarUrl(agentId, name)} alt={name} />
        <AvatarFallback className="text-sm bg-blue-100 text-blue-700">
          {avatar}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{name}</span>
          <span className="text-xs text-muted-foreground">{role}</span>
        </div>
        <p className="text-xs text-muted-foreground truncate">
          {t("newConversation.skillsPrefix")}: {skills.join(" · ")}
        </p>
      </div>
    </button>
  )
}
