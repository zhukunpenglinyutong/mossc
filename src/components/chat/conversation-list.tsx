"use client"

import { Pin, Plus, Search, Trash2 } from "lucide-react"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getAgentAvatarUrl, useAvatarVersion } from "@/lib/avatar"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"
import { useApp } from "@/store/app-context"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { GroupAvatar } from "./group-avatar"
import type { Conversation } from "@/types"

interface ConversationListProps {
  onNewConversation: () => void
  onNewAgent: () => void
}

export function ConversationList({
  onNewConversation,
  onNewAgent,
}: ConversationListProps) {
  const { state, dispatch } = useApp()
  const { t } = useI18n()
  const [search, setSearch] = useState("")
  useAvatarVersion() // re-render when avatar changes

  const filtered = state.conversations.filter((c) =>
    c.name.toLowerCase().includes(search.toLowerCase())
  )
  const pinnedConvs = filtered
    .filter((c) => c.pinned)
    .sort((a, b) => (b.pinnedAt ?? 0) - (a.pinnedAt ?? 0))
  const unpinnedConvs = filtered.filter((c) => !c.pinned)

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* 顶部标题 + 搜索 */}
      <div className="px-3 pt-3 pb-2 space-y-2">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-semibold text-foreground">{t("conversationList.title")}</h2>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-muted-foreground"
            onClick={onNewConversation}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/60" />
          <Input
            placeholder={t("common.searchPlaceholder")}
            className="h-8 pl-8 text-sm bg-muted/50 border-0 focus-visible:ring-1"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      {/* 对话列表 */}
      <ScrollArea className="flex-1">
        {/* 置顶区域 - 网格头像样式 */}
        {pinnedConvs.length > 0 && (
          <div className="px-2 pt-1 pb-2">
            <div className="flex flex-wrap gap-x-1 gap-y-1">
              {pinnedConvs.map((conv) => {
                const members = conv.members.map((id) => {
                  if (id === "user") return { id, name: t("common.meHuman") }
                  const agent = state.agents.find((a) => a.id === id)
                  return agent ? { id: agent.id, name: agent.name } : { id, name: id }
                })
                return (
                  <ContextMenu key={conv.id}>
                    <ContextMenuTrigger>
                      <button
                        onClick={() =>
                          dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: conv.id })
                        }
                        className={cn(
                          "flex flex-col items-center gap-1.5 w-[62px] rounded-lg py-1.5 px-1 transition-colors",
                          "hover:bg-accent/50",
                          state.activeConversationId === conv.id && "bg-accent"
                        )}
                      >
                        <div className="relative">
                          {conv.type === "group" ? (
                            <GroupAvatar members={members} size={46} />
                          ) : (
                            <Avatar className="h-[46px] w-[46px]">
                              <AvatarImage
                                src={getAgentAvatarUrl(conv.members[0] ?? "", conv.name)}
                                alt={conv.name}
                              />
                              <AvatarFallback className="text-sm font-medium bg-blue-100 text-blue-700">
                                {conv.avatar}
                              </AvatarFallback>
                            </Avatar>
                          )}
                          {conv.unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 h-4 min-w-4 px-0.5 flex items-center justify-center rounded-full bg-[#3370ff] text-[9px] text-white font-medium">
                              {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                            </span>
                          )}
                        </div>
                        <span className="text-[11px] text-muted-foreground truncate w-full text-center leading-tight">
                          {conv.name.length > 5 ? conv.name.slice(0, 5) + "..." : conv.name}
                        </span>
                      </button>
                    </ContextMenuTrigger>
                    <ContextMenuContent>
                      <ContextMenuItem
                        onClick={() =>
                          dispatch({ type: "TOGGLE_PIN", payload: { conversationId: conv.id } })
                        }
                      >
                        <Pin className="h-4 w-4" />
                        {t("conversationList.unpin")}
                      </ContextMenuItem>
                      {conv.type === "group" && (
                        <>
                          <ContextMenuSeparator />
                          <ContextMenuItem
                            variant="destructive"
                            onClick={() =>
                              dispatch({ type: "DISSOLVE_GROUP", payload: { conversationId: conv.id } })
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                            {t("conversationList.dissolveGroup")}
                          </ContextMenuItem>
                        </>
                      )}
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </div>
          </div>
        )}

        {/* 普通会话列表 */}
        <div className="px-2 py-1">
          {unpinnedConvs.map((conv) => {
            const members = conv.members.map((id) => {
              if (id === "user") return { id, name: t("common.meHuman") }
              const agent = state.agents.find((a) => a.id === id)
              return agent ? { id: agent.id, name: agent.name } : { id, name: id }
            })
            return (
              <ContextMenu key={conv.id}>
                <ContextMenuTrigger>
                  <ConversationItem
                    conversation={conv}
                    members={members}
                    isActive={state.activeConversationId === conv.id}
                    onClick={() =>
                      dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: conv.id })
                    }
                  />
                </ContextMenuTrigger>
                <ContextMenuContent>
                  <ContextMenuItem
                    onClick={() =>
                      dispatch({ type: "TOGGLE_PIN", payload: { conversationId: conv.id } })
                    }
                  >
                    <Pin className="h-4 w-4" />
                    {t("conversationList.pin")}
                  </ContextMenuItem>
                  {conv.type === "group" && (
                    <>
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        variant="destructive"
                        onClick={() =>
                          dispatch({ type: "DISSOLVE_GROUP", payload: { conversationId: conv.id } })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                        {t("conversationList.dissolveGroup")}
                      </ContextMenuItem>
                    </>
                  )}
                </ContextMenuContent>
              </ContextMenu>
            )
          })}
        </div>
      </ScrollArea>

      {/* 底部操作 */}
      <div className="px-3 py-2 border-t shrink-0 min-h-[110px] flex flex-col justify-center">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 h-9 text-sm text-muted-foreground"
          onClick={onNewAgent}
        >
          <Plus className="h-4 w-4" />
          {t("conversationList.addNewMember")}
        </Button>
        <Button
          variant="ghost"
          className="w-full h-9 px-2 text-sm text-muted-foreground justify-between cursor-not-allowed opacity-80"
          disabled
        >
          <span className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            {t("conversationList.createGroup")}
          </span>
          <Badge
            variant="secondary"
            className="h-[18px] px-1.5 text-[10px] font-normal shrink-0"
          >
            {t("topNav.comingSoon")}
          </Badge>
        </Button>
      </div>
    </div>
  )
}

function ConversationItem({
  conversation,
  members,
  isActive,
  onClick,
}: {
  conversation: Conversation
  members: { id: string; name: string }[]
  isActive: boolean
  onClick: () => void
}) {
  const { t } = useI18n()
  const isGroup = conversation.type === "group"

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors",
        "hover:bg-accent/50",
        isActive && "bg-accent"
      )}
    >
      {isGroup ? (
        <GroupAvatar members={members} size={42} />
      ) : (
        <Avatar className="h-[42px] w-[42px] shrink-0">
          <AvatarImage src={getAgentAvatarUrl(conversation.members[0] ?? "", conversation.name)} alt={conversation.name} />
          <AvatarFallback className="text-sm font-medium bg-blue-100 text-blue-700">
            {conversation.avatar}
          </AvatarFallback>
        </Avatar>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className={cn(
              "text-sm truncate",
              conversation.unreadCount > 0 ? "font-semibold" : "font-medium"
            )}>
              {conversation.name}
            </span>
            {conversation.type === "direct" && (
              <Badge
                variant="secondary"
                className="h-[16px] px-1 text-[10px] shrink-0 rounded bg-blue-500/10 text-blue-600 border-blue-200 font-medium"
              >
                AI
              </Badge>
            )}
          </div>
          <span className="text-[11px] text-muted-foreground/60 shrink-0">
            {conversation.lastMessageTime}
          </span>
        </div>
        <div className="flex items-center justify-between gap-2 mt-0.5">
          <p className={cn(
            "text-xs truncate",
            conversation.unreadCount > 0 ? "text-foreground/60" : "text-muted-foreground"
          )}>
            {conversation.type === "group" && conversation.lastMessageSender
              ? `${conversation.lastMessageSender}: `
              : ""}
            {conversation.lastMessage ?? t("conversationList.noMessages")}
          </p>
          {conversation.unreadCount > 0 && (
            <Badge
              variant="default"
              className="h-[18px] min-w-[18px] px-1 text-[10px] shrink-0 rounded-full bg-[#3370ff]"
            >
              {conversation.unreadCount > 99
                ? "99+"
                : conversation.unreadCount}
            </Badge>
          )}
        </div>
      </div>
    </button>
  )
}
