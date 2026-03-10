"use client"

import { useState } from "react"
import { ChevronDown, X } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import type { CronRunLogEntry, CronRunLogResult } from "@/types/cron"

function formatDuration(ms?: number): string {
  if (!ms) return "--"
  if (ms < 1000) return `${ms}ms`
  if (ms < 60_000) return `${(ms / 1000).toFixed(1)}s`
  return `${(ms / 60_000).toFixed(1)}m`
}

function formatTokens(usage?: CronRunLogEntry["usage"]): string | null {
  if (!usage) return null
  if (typeof usage.total_tokens === "number") return `${usage.total_tokens} tokens`
  if (typeof usage.input_tokens === "number" && typeof usage.output_tokens === "number") {
    return `${usage.input_tokens} in / ${usage.output_tokens} out`
  }
  return null
}

function formatRelativeTime(ms: number): string {
  const now = Date.now()
  const diff = ms - now
  if (diff <= 0) {
    const ago = now - ms
    if (ago < 60_000) return `${Math.floor(ago / 1000)}s 前`
    if (ago < 3_600_000) return `${Math.floor(ago / 60_000)}m 前`
    return `${Math.floor(ago / 3_600_000)}h 前`
  }
  if (diff < 60_000) return `${Math.ceil(diff / 1000)}s 后`
  if (diff < 3_600_000) return `${Math.ceil(diff / 60_000)}m 后`
  return `${Math.ceil(diff / 3_600_000)}h 后`
}

function getRunStatusBadge(status?: string) {
  switch (status) {
    case "ok":
      return <Badge className="bg-green-500/10 text-green-600 border-green-200 text-[11px]">成功</Badge>
    case "error":
      return <Badge variant="destructive" className="text-[11px]">错误</Badge>
    case "skipped":
      return <Badge variant="secondary" className="text-[11px]">跳过</Badge>
    default:
      return <Badge variant="outline" className="text-[11px]">--</Badge>
  }
}

function getDeliveryBadge(status?: string) {
  switch (status) {
    case "delivered":
      return <Badge variant="outline" className="text-[11px] text-green-600">已投递</Badge>
    case "not-delivered":
      return <Badge variant="outline" className="text-[11px] text-orange-600">未投递</Badge>
    case "not-requested":
      return <Badge variant="outline" className="text-[11px] text-muted-foreground">未请求</Badge>
    default:
      return null
  }
}

function DetailRow({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null
  return (
    <div className="flex items-start gap-2 text-xs">
      <span className="text-muted-foreground shrink-0 w-[72px] text-right">{label}</span>
      <span className="flex-1 min-w-0 break-words">{value}</span>
    </div>
  )
}

function RunEntryDetail({ entry }: { entry: CronRunLogEntry }) {
  const tokens = formatTokens(entry.usage)

  return (
    <div className="px-3 pb-3 pt-1 space-y-2">
      {/* Summary / Error */}
      {entry.summary && (
        <div className="text-xs whitespace-pre-wrap bg-muted/50 rounded-md px-3 py-2">
          {entry.summary}
        </div>
      )}
      {entry.error && (
        <div className="text-xs text-destructive whitespace-pre-wrap bg-destructive/5 rounded-md px-3 py-2">
          {entry.error}
        </div>
      )}

      <Separator />

      {/* Detail fields */}
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5">
        <DetailRow label="任务名" value={entry.jobName ?? entry.jobId} />
        <DetailRow
          label="运行时间"
          value={new Date(entry.ts).toLocaleString("zh-CN", {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        />
        <DetailRow label="耗时" value={formatDuration(entry.durationMs)} />
        <DetailRow label="状态" value={getRunStatusBadge(entry.status)} />
        <DetailRow label="模型" value={entry.model} />
        <DetailRow label="服务商" value={entry.provider} />
        <DetailRow label="Token" value={tokens} />
        <DetailRow label="投递" value={getDeliveryBadge(entry.deliveryStatus)} />
        {entry.deliveryError && (
          <DetailRow
            label="投递错误"
            value={<span className="text-destructive">{entry.deliveryError}</span>}
          />
        )}
        <DetailRow label="会话 ID" value={entry.sessionId} />
        {entry.nextRunAtMs && (
          <DetailRow
            label="下次运行"
            value={`${new Date(entry.nextRunAtMs).toLocaleTimeString("zh-CN", {
              hour: "2-digit",
              minute: "2-digit",
              second: "2-digit",
            })} (${formatRelativeTime(entry.nextRunAtMs)})`}
          />
        )}
      </div>
    </div>
  )
}

interface CronRunHistoryProps {
  runs: CronRunLogResult | null
  selectedJobId: string | null
  onClearFilter: () => void
}

export function CronRunHistory({ runs, selectedJobId, onClearFilter }: CronRunHistoryProps) {
  const entries = runs?.entries ?? []
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null)

  const toggleExpand = (idx: number) => {
    setExpandedIndex((prev) => (prev === idx ? null : idx))
  }

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold">运行历史</h2>
        <div className="flex items-center gap-2">
          {selectedJobId && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={onClearFilter}
            >
              <X className="h-3 w-3 mr-1" />
              清除筛选
            </Button>
          )}
          <span className="text-xs text-muted-foreground">
            显示 {entries.length} / 共 {runs?.total ?? 0}
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-8 text-center text-sm text-muted-foreground">
          暂无运行记录
        </div>
      ) : (
        <div className="space-y-0.5">
          {/* Table Header */}
          <div className="grid grid-cols-[1fr_1.2fr_0.6fr_0.6fr_0.6fr_1fr_24px] gap-2 px-3 py-1.5 text-xs font-medium text-muted-foreground border-b">
            <span>时间</span>
            <span>任务</span>
            <span>状态</span>
            <span>耗时</span>
            <span>投递</span>
            <span>模型</span>
            <span />
          </div>

          {entries.map((entry, idx) => {
            const isExpanded = expandedIndex === idx
            return (
              <div
                key={`${entry.jobId}-${entry.ts}-${idx}`}
                className={`rounded-md transition-colors ${isExpanded ? "bg-accent/40" : "hover:bg-accent/30"}`}
              >
                <div
                  className="grid grid-cols-[1fr_1.2fr_0.6fr_0.6fr_0.6fr_1fr_24px] gap-2 px-3 py-2 text-xs cursor-pointer select-none"
                  onClick={() => toggleExpand(idx)}
                >
                  <span className="text-muted-foreground">
                    {new Date(entry.ts).toLocaleString("zh-CN", {
                      month: "numeric",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                  <span className="truncate font-medium">
                    {entry.jobName ?? entry.jobId}
                  </span>
                  <span>
                    {getRunStatusBadge(entry.status)}
                  </span>
                  <span className="text-muted-foreground">
                    {formatDuration(entry.durationMs)}
                  </span>
                  <span>
                    {getDeliveryBadge(entry.deliveryStatus)}
                  </span>
                  <span className="text-muted-foreground truncate">
                    {entry.model ?? "--"}
                  </span>
                  <ChevronDown
                    className={`h-3.5 w-3.5 text-muted-foreground transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </div>

                {isExpanded && <RunEntryDetail entry={entry} />}
              </div>
            )
          })}
        </div>
      )}
    </Card>
  )
}
