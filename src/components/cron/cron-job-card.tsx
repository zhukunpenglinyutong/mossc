"use client"

import { useState } from "react"
import { History, Loader2, Pencil, Play, Power, Trash2 } from "lucide-react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { getAgentAvatarUrl } from "@/lib/avatar"
import { Separator } from "@/components/ui/separator"
import { useCronMutations } from "@/hooks/use-cron"
import { useApp } from "@/store/app-context"
import type { CronJob } from "@/types/cron"

function formatSchedule(job: CronJob): string {
  const s = job.schedule
  switch (s.kind) {
    case "at":
      return `一次性 ${new Date(s.at).toLocaleString("zh-CN")}`
    case "every": {
      const ms = s.everyMs
      if (ms < 60_000) return `每 ${Math.round(ms / 1000)} 秒`
      if (ms < 3_600_000) return `每 ${Math.round(ms / 60_000)} 分钟`
      if (ms < 86_400_000) return `每 ${Math.round(ms / 3_600_000)} 小时`
      return `每 ${Math.round(ms / 86_400_000)} 天`
    }
    case "cron":
      return `${s.expr}${s.tz ? ` (${s.tz})` : ""}`
    default:
      return "未知"
  }
}

function formatTimestamp(ms?: number): string {
  if (!ms) return "--"
  const now = Date.now()
  const diff = ms - now
  if (diff > 0 && diff < 3_600_000) return `${Math.ceil(diff / 60_000)}m 后`
  return new Date(ms).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
}

interface CronJobCardProps {
  job: CronJob
  onAction: () => void
  onViewHistory: (job: CronJob) => void
  onEdit?: (job: CronJob) => void
}

export function CronJobCard({ job, onAction, onViewHistory, onEdit }: CronJobCardProps) {
  const { state } = useApp()
  const { runJob, removeJob, updateJob } = useCronMutations()
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)

  const agent = state.agents.find((a) => a.id === job.agentId)

  const handleRun = async () => {
    setActionLoading("run")
    setActionError(null)
    const ok = await runJob(job.id)
    setActionLoading(null)
    if (!ok) setActionError("运行失败")
    onAction()
  }

  const handleRemove = async () => {
    setActionLoading("remove")
    setActionError(null)
    const ok = await removeJob(job.id)
    setActionLoading(null)
    if (!ok) setActionError("删除失败")
    onAction()
  }

  const handleToggleEnabled = async () => {
    setActionLoading("toggle")
    setActionError(null)
    const ok = await updateJob(job.id, { enabled: !job.enabled })
    setActionLoading(null)
    if (!ok) setActionError(job.enabled ? "禁用失败" : "启用失败")
    onAction()
  }

  const statusLabel = job.state.runningAtMs
    ? "运行中"
    : job.enabled
      ? "就绪"
      : "已禁用"

  const statusColor = job.state.runningAtMs
    ? "bg-blue-500"
    : job.enabled
      ? "bg-green-500"
      : "bg-muted-foreground/40"

  return (
    <div className="space-y-1">
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border hover:bg-accent/30 transition-colors">
      {/* Status dot */}
      <div className={`h-2 w-2 rounded-full shrink-0 ${statusColor}`} />

      {/* Agent avatar */}
      <Avatar className="h-7 w-7 shrink-0">
        <AvatarImage
          src={getAgentAvatarUrl(job.agentId ?? "", agent?.name ?? job.agentId ?? "default")}
          alt={agent?.name ?? job.agentId}
        />
        <AvatarFallback className="text-[10px] bg-blue-100 text-blue-700">
          {(agent?.name ?? job.agentId ?? "?").slice(0, 2).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      {/* Name + meta */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium truncate">{job.name}</span>
        </div>
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground mt-0.5">
          <span>{formatSchedule(job)}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>{statusLabel}</span>
          <Separator orientation="vertical" className="h-3" />
          <span>下次 {formatTimestamp(job.state.nextRunAtMs)}</span>
          {job.state.lastRunStatus && (
            <>
              <Separator orientation="vertical" className="h-3" />
              <span>
                上次{" "}
                {job.state.lastRunStatus === "ok"
                  ? "成功"
                  : job.state.lastRunStatus === "error"
                    ? "错误"
                    : job.state.lastRunStatus}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-0.5 shrink-0">
        {/* Toggle enabled */}
        <Button
          variant="ghost"
          size="icon"
          className={`h-7 w-7 ${job.enabled ? "text-green-600 hover:text-green-700" : "text-muted-foreground hover:text-foreground"}`}
          onClick={(e) => {
            e.stopPropagation()
            void handleToggleEnabled()
          }}
          disabled={actionLoading !== null}
          title={job.enabled ? "禁用" : "启用"}
        >
          {actionLoading === "toggle" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Power className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Run */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation()
            void handleRun()
          }}
          disabled={actionLoading !== null}
          title="立即运行"
        >
          {actionLoading === "run" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Play className="h-3.5 w-3.5" />
          )}
        </Button>

        {/* Edit */}
        {onEdit && (
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={(e) => {
              e.stopPropagation()
              onEdit(job)
            }}
            title="编辑"
          >
            <Pencil className="h-3.5 w-3.5" />
          </Button>
        )}

        {/* History */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7"
          onClick={(e) => {
            e.stopPropagation()
            onViewHistory(job)
          }}
          title="运行历史"
        >
          <History className="h-3.5 w-3.5" />
        </Button>

        {/* Delete */}
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-destructive hover:text-destructive"
          onClick={(e) => {
            e.stopPropagation()
            void handleRemove()
          }}
          disabled={actionLoading !== null}
          title="删除"
        >
          {actionLoading === "remove" ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
        </Button>
      </div>
    </div>
    {actionError && (
      <div className="text-[11px] text-destructive px-3">{actionError}</div>
    )}
    </div>
  )
}
