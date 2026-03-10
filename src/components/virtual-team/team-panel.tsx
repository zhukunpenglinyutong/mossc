"use client"

import { Loader2, MessageSquare, Pause, Settings, Trash2, X } from "lucide-react"
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
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet"
import { getAgentAvatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"
import { useApp } from "@/store/app-context"
import type { Agent, AgentStatus } from "@/types"
import { CreateAgentDialog } from "./create-agent-dialog"

interface TeamPanelProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onStartChat: (agentId: string) => void
}

const statusColors: Record<string, string> = {
  idle: "bg-green-500",
  working: "bg-yellow-500",
  busy: "bg-red-500",
  chatting: "bg-yellow-500",
  thinking: "bg-yellow-500",
  completed: "bg-green-500",
}

const statusLabels: Record<string, string> = {
  idle: "空闲",
  working: "工作中",
  busy: "忙碌",
  chatting: "对话中",
  thinking: "思考中",
  completed: "已完成",
}

type FilterType = "all" | "working" | "idle" | "busy"

export function TeamPanel({ open, onOpenChange, onStartChat }: TeamPanelProps) {
  const { state } = useApp()
  const [filter, setFilter] = useState<FilterType>("all")
  const [showCreateAgent, setShowCreateAgent] = useState(false)

  const agents = state.agents
  const filtered = filterAgents(agents, filter)

  const counts = {
    all: agents.length,
    working: agents.filter((a) => a.status === "working" || a.status === "thinking").length,
    idle: agents.filter((a) => a.status === "idle" || a.status === "completed").length,
    busy: agents.filter((a) => a.status === "busy").length,
  }

  return (
    <>
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[400px] sm:w-[400px] p-0">
        <SheetHeader className="px-4 pt-4 pb-3 border-b">
          <div className="flex items-center justify-between">
            <SheetTitle>团队面板</SheetTitle>
          </div>
        </SheetHeader>

        <div className="px-4 py-3 flex gap-1">
          {(
            [
              ["all", `全部 (${counts.all})`],
              ["working", `工作 (${counts.working})`],
              ["idle", `空闲 (${counts.idle})`],
              ["busy", `忙碌 (${counts.busy})`],
            ] as const
          ).map(([key, label]) => (
            <Button
              key={key}
              variant={filter === key ? "default" : "outline"}
              size="sm"
              className="text-xs h-7 px-2.5"
              onClick={() => setFilter(key)}
            >
              {label}
            </Button>
          ))}
        </div>

        <ScrollArea className="flex-1 px-4">
          <div className="space-y-2 pb-4">
            {filtered.map((agent) => (
              <AgentCard
                key={agent.id}
                agent={agent}
                onChat={() => onStartChat(agent.id)}
              />
            ))}

            <Button
              variant="outline"
              className="w-full border-dashed h-12 text-muted-foreground"
              onClick={() => setShowCreateAgent(true)}
            >
              + 添加新成员
            </Button>
          </div>
        </ScrollArea>

      </SheetContent>
    </Sheet>

    <CreateAgentDialog
      open={showCreateAgent}
      onOpenChange={setShowCreateAgent}
    />
    </>
  )
}

function AgentCard({ agent, onChat }: { agent: Agent; onChat: () => void }) {
  const { dispatch, refreshFleet } = useApp()
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleDelete = async () => {
    setDeleting(true)
    try {
      const res = await fetch("/api/intents/agent-delete", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ agentId: agent.id }),
      })
      const data = await res.json()

      if (!res.ok || data.error) {
        toast.error(data.error || "删除失败，请重试")
        return
      }

      dispatch({ type: "REMOVE_AGENT", payload: { agentId: agent.id } })
      toast.success(`Agent "${agent.name}" 已删除`)
      setTimeout(() => refreshFleet(), 1500)
    } catch {
      toast.error("网络错误，请检查连接后重试")
    } finally {
      setDeleting(false)
      setShowDeleteConfirm(false)
    }
  }

  return (
    <>
      <Card className="p-3 gap-2">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Avatar className="h-10 w-10">
              <AvatarImage src={getAgentAvatarUrl(agent.id, agent.name)} alt={agent.name} />
              <AvatarFallback className="text-sm bg-blue-100 text-blue-700" />
            </Avatar>
            <span
              className={cn(
                "absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-background",
                statusColors[agent.status] ?? "bg-gray-400"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium">{agent.name}</p>
            <p className="text-xs text-muted-foreground">{agent.role}</p>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={cn("h-2 w-2 rounded-full", statusColors[agent.status])} />
            <span className="text-xs text-muted-foreground">
              {statusLabels[agent.status]}
            </span>
          </div>
        </div>

        {agent.currentTask && (
          <div className="text-xs text-muted-foreground">{agent.currentTask}</div>
        )}

        {agent.taskProgress !== undefined && (
          <div className="flex items-center gap-2">
            <Progress value={agent.taskProgress} className="h-1.5 flex-1" />
            <span className="text-xs text-muted-foreground">{agent.taskProgress}%</span>
          </div>
        )}

        {!agent.currentTask && (
          <p className="text-xs text-muted-foreground">
            {agent.lastActiveAt}活跃
          </p>
        )}

        <div className="flex gap-1">
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1" onClick={onChat}>
            <MessageSquare className="h-3 w-3 mr-1" />
            对话
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
            <Pause className="h-3 w-3 mr-1" />
            暂停
          </Button>
          <Button size="sm" variant="outline" className="h-7 text-xs flex-1">
            <Settings className="h-3 w-3 mr-1" />
            设置
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-7 text-xs px-2 text-destructive hover:text-destructive hover:bg-destructive/10"
            onClick={() => setShowDeleteConfirm(true)}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </Card>

      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>确认删除 Agent</AlertDialogTitle>
            <AlertDialogDescription>
              确定要删除 &ldquo;{agent.name}&rdquo; 吗？此操作将移除该 Agent 及其工作区数据，且无法撤销。
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleting}>取消</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={deleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleting && <Loader2 className="h-4 w-4 mr-1.5 animate-spin" />}
              {deleting ? "删除中" : "删除"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}

function filterAgents(agents: Agent[], filter: FilterType): Agent[] {
  switch (filter) {
    case "working":
      return agents.filter((a) => a.status === "working" || a.status === "thinking")
    case "idle":
      return agents.filter((a) => a.status === "idle" || a.status === "completed")
    case "busy":
      return agents.filter((a) => a.status === "busy")
    default:
      return agents
  }
}
