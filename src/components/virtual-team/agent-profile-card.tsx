"use client"

import { MessageSquare } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { getAgentAvatarUrl } from "@/lib/avatar"
import { cn } from "@/lib/utils"
import type { Agent } from "@/types"

interface AgentProfileCardProps {
  agent: Agent
  onChat: () => void
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

const statusLabels: Record<string, string> = {
  idle: "空闲",
  working: "工作中",
  busy: "忙碌",
  chatting: "对话中",
  thinking: "思考中",
  completed: "已完成",
}

export function AgentProfileCard({ agent, onChat, onClose }: AgentProfileCardProps) {
  return (
    <Card className="w-80 p-4 shadow-lg gap-3">
      <div className="flex items-start gap-3">
        <Avatar className="h-16 w-16">
          <AvatarImage src={getAgentAvatarUrl(agent.id, agent.name)} alt={agent.name} />
          <AvatarFallback
            className="text-lg bg-blue-100 text-blue-700 font-medium"
          >
            {agent.avatar}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h3 className="font-semibold text-base">{agent.name}</h3>
          <p className="text-sm text-muted-foreground">{agent.role}</p>
        </div>
        <button
          onClick={onClose}
          className="text-muted-foreground hover:text-foreground text-lg leading-none"
        >
          ×
        </button>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-sm">状态:</span>
        <div className="flex items-center gap-1.5">
          <span className={cn("h-2.5 w-2.5 rounded-full", statusColors[agent.status])} />
          <span className="text-sm">{statusLabels[agent.status]}</span>
        </div>
      </div>

      {agent.currentTask && (
        <div className="space-y-2">
          <p className="text-sm font-medium">当前任务:</p>
          <Card className="p-3 bg-muted/50 gap-1">
            <p className="text-sm">{agent.currentTask}</p>
            {agent.taskProgress !== undefined && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>进度</span>
                  <span>{agent.taskProgress}%</span>
                </div>
                <Progress value={agent.taskProgress} className="h-2" />
              </div>
            )}
          </Card>
        </div>
      )}

      <div className="flex flex-wrap gap-1">
        {agent.skills.map((skill) => (
          <Badge key={skill} variant="secondary" className="text-xs">
            {skill}
          </Badge>
        ))}
      </div>

      <div className="flex gap-2 mt-1">
        <Button onClick={onChat} className="flex-1 gap-1.5">
          <MessageSquare className="h-4 w-4" />
          发起对话
        </Button>
        <Button variant="outline" className="flex-1">
          查看详情
        </Button>
      </div>
    </Card>
  )
}
