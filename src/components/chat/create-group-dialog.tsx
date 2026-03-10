"use client"

import { Search, X } from "lucide-react"
import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { useI18n } from "@/i18n"
import { getAgentAvatarUrl } from "@/lib/avatar"
import {
  getStrategyDescription,
  getStrategyLabel,
  STRATEGY_OPTIONS,
} from "@/lib/orchestration/labels"
import { cn } from "@/lib/utils"
import { useApp } from "@/store/app-context"
import type { Conversation, OrchestrationStrategy } from "@/types"

interface CreateGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CreateGroupDialog({ open, onOpenChange }: CreateGroupDialogProps) {
  const { dispatch, state } = useApp()
  const { locale, t } = useI18n()
  const [name, setName] = useState("")
  const [purpose, setPurpose] = useState("")
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState("")
  const [strategy, setStrategy] = useState<OrchestrationStrategy>("skill-match")
  const [coordinatorId, setCoordinatorId] = useState("")
  const [maxResponders, setMaxResponders] = useState(2)

  const categories: Record<string, typeof state.agents> = {}
  for (const agent of state.agents) {
    const category = agent.category || "OpenClaw"
    if (!categories[category]) categories[category] = []
    categories[category].push(agent)
  }

  const toggle = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((value) => value !== id) : [...prev, id]
    )
  }

  const remove = (id: string) => {
    setSelectedIds((prev) => prev.filter((value) => value !== id))
  }

  const resetForm = () => {
    setName("")
    setPurpose("")
    setSelectedIds([])
    setSearch("")
    setStrategy("skill-match")
    setCoordinatorId("")
    setMaxResponders(2)
  }

  const handleCreate = () => {
    if (!name.trim() || selectedIds.length === 0) return

    const newConversation: Conversation = {
      id: `conv-${Date.now()}`,
      type: "group",
      name: name.trim(),
      avatar: "GR",
      purpose: purpose.trim() || undefined,
      members: ["user", ...selectedIds],
      orchestration: {
        strategy,
        ...(strategy === "coordinator" && coordinatorId ? { coordinatorId } : {}),
        ...(strategy === "skill-match" ? { maxResponders } : {}),
        ...(strategy === "round-robin" ? { roundRobinIndex: 0 } : {}),
      },
      lastMessage: t("groupCreate.createdMessage"),
      lastMessageTime: t("common.justNow"),
      unreadCount: 0,
    }

    dispatch({ type: "CREATE_CONVERSATION", payload: newConversation })
    onOpenChange(false)
    resetForm()
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        onOpenChange(nextOpen)
        if (!nextOpen) resetForm()
      }}
    >
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] flex flex-col overflow-hidden p-0">
        <DialogHeader className="px-6 pt-6 pb-0 shrink-0">
          <DialogTitle>{t("groupCreate.title")}</DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto px-6 py-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>{t("groupCreate.nameLabel")}</Label>
              <Input
                value={name}
                onChange={(event) => setName(event.target.value.slice(0, 30))}
                placeholder={t("groupCreate.namePlaceholder")}
              />
              <p className="text-xs text-muted-foreground text-right">{name.length}/30</p>
            </div>

            <div className="space-y-2">
              <Label>{t("groupCreate.purposeLabel")}</Label>
              <Textarea
                value={purpose}
                onChange={(event) => setPurpose(event.target.value.slice(0, 200))}
                placeholder={t("groupCreate.purposePlaceholder")}
                rows={2}
              />
              <p className="text-xs text-muted-foreground">{t("groupCreate.purposeHelper")}</p>
            </div>

            <Separator />

            <div className="space-y-2">
              <Label>{t("groupCreate.strategyLabel")}</Label>
              <div className="grid grid-cols-2 gap-2">
                {STRATEGY_OPTIONS.map((option) => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setStrategy(option)}
                    className={cn(
                      "flex flex-col items-start gap-0.5 rounded-lg border p-2.5 text-left transition-colors",
                      strategy === option
                        ? "border-primary bg-primary/5"
                        : "border-border hover:bg-accent"
                    )}
                  >
                    <span className="text-sm font-medium">{getStrategyLabel(option, t)}</span>
                    <span className="text-[11px] text-muted-foreground leading-tight">
                      {getStrategyDescription(option, t)}
                    </span>
                  </button>
                ))}
              </div>

              {strategy === "skill-match" && (
                <div className="flex items-center gap-2 pt-1">
                  <Label className="text-xs whitespace-nowrap">{t("groupCreate.maxResponders")}</Label>
                  <div className="flex items-center gap-1">
                    {[1, 2, 3].map((count) => (
                      <button
                        key={count}
                        type="button"
                        onClick={() => setMaxResponders(count)}
                        className={cn(
                          "h-7 w-7 rounded-md text-xs font-medium transition-colors",
                          maxResponders === count
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted hover:bg-accent"
                        )}
                      >
                        {count}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {strategy === "coordinator" && selectedIds.length > 0 && (
                <div className="space-y-1 pt-1">
                  <Label className="text-xs">{t("groupCreate.coordinatorLabel")}</Label>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedIds.map((id) => {
                      const agent = state.agents.find((item) => item.id === id)
                      if (!agent) return null

                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => setCoordinatorId(id)}
                          className={cn(
                            "px-2.5 py-1 rounded-md text-xs font-medium transition-colors",
                            coordinatorId === id
                              ? "bg-primary text-primary-foreground"
                              : "bg-muted hover:bg-accent"
                          )}
                        >
                          {agent.name}
                        </button>
                      )
                    })}
                  </div>
                  {!coordinatorId && (
                    <p className="text-[11px] text-amber-600">{t("groupCreate.coordinatorRequired")}</p>
                  )}
                </div>
              )}
            </div>

            <Separator />

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>{t("groupCreate.selectMembers")}</Label>
                <span className="text-xs text-muted-foreground">
                  {t("common.selectedCount", { count: selectedIds.length })}
                </span>
              </div>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder={t("groupCreate.searchMembers")}
                  className="pl-8"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>

              <ScrollArea className="h-[200px]">
                {Object.entries(categories).map(([category, agents]) => {
                  const filtered = agents.filter(
                    (agent) => agent.name.includes(search) || agent.role.includes(search)
                  )
                  if (filtered.length === 0) return null

                  return (
                    <div key={category} className="mb-3">
                      <p className="text-xs font-medium text-muted-foreground mb-1 px-1">
                        {category}
                      </p>
                      {filtered.map((agent) => (
                        <label
                          key={agent.id}
                          className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent cursor-pointer"
                        >
                          <Checkbox
                            checked={selectedIds.includes(agent.id)}
                            onCheckedChange={() => toggle(agent.id)}
                          />
                          <Avatar className="h-8 w-8 shrink-0">
                            <AvatarImage src={getAgentAvatarUrl(agent.id, agent.name)} alt={agent.name} />
                            <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                              {agent.avatar}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <span className="text-sm font-medium">{agent.name}</span>
                            <span className="text-xs text-muted-foreground ml-2">{agent.role}</span>
                          </div>
                          <span className="text-xs text-muted-foreground truncate max-w-[140px] shrink-0">
                            {agent.skills.join(locale.startsWith("zh") ? "、" : " · ")}
                          </span>
                        </label>
                      ))}
                    </div>
                  )
                })}
              </ScrollArea>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t bg-background px-6 py-4 space-y-3">
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {selectedIds.map((id) => {
                const agent = Object.values(categories)
                  .flat()
                  .find((item) => item.id === id)

                return (
                  <Badge key={id} variant="secondary" className="gap-1 pr-1">
                    {agent?.name}
                    <button
                      type="button"
                      onClick={() => remove(id)}
                      className="hover:bg-muted-foreground/20 rounded-full p-0.5"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                )
              })}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              {t("common.cancel")}
            </Button>
            <Button
              onClick={handleCreate}
              disabled={
                !name.trim() ||
                selectedIds.length === 0 ||
                (strategy === "coordinator" && !coordinatorId)
              }
            >
              {t("groupCreate.createWithCount", { count: selectedIds.length })}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
