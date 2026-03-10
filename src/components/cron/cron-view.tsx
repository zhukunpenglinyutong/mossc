"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { useI18n } from "@/i18n"
import { useCronJobs, useCronStatus, useCronRuns } from "@/hooks/use-cron"
import { CronJobCard } from "./cron-job-card"
import { CronJobForm } from "./cron-job-form"
import { CronRunHistory } from "./cron-run-history"
import type { CronJob } from "@/types/cron"

function formatNextWake(ms: number | null | undefined, expiredLabel: string): string {
  if (!ms) return "--"
  const date = new Date(ms)
  const now = Date.now()
  const diff = ms - now

  const dateStr = date.toLocaleString(undefined, {
    weekday: "short",
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  })

  if (diff <= 0) return `${dateStr} (${expiredLabel})`
  if (diff < 60_000) return `${dateStr} (in ${Math.ceil(diff / 1000)}s)`
  if (diff < 3_600_000) return `${dateStr} (in ${Math.ceil(diff / 60_000)}m)`
  return dateStr
}

export function CronView() {
  const { t } = useI18n()
  const { jobs, total, loading: jobsLoading, error: jobsError, loadJobs } = useCronJobs()
  const { status, loadStatus } = useCronStatus()
  const { runs, loadRuns } = useCronRuns()
  const [refreshing, setRefreshing] = useState(false)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null)
  const [editingJob, setEditingJob] = useState<CronJob | null>(null)
  const formRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async () => {
    setRefreshing(true)
    await Promise.all([loadJobs(), loadStatus(), loadRuns()])
    setRefreshing(false)
  }, [loadJobs, loadStatus, loadRuns])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const handleJobCreated = useCallback(async () => {
    await refresh()
  }, [refresh])

  const handleJobAction = useCallback(async () => {
    await refresh()
  }, [refresh])

  const handleViewHistory = useCallback(
    async (job: CronJob) => {
      setSelectedJobId(job.id)
      await loadRuns(job.id)
    },
    [loadRuns]
  )

  const handleClearHistoryFilter = useCallback(async () => {
    setSelectedJobId(null)
    await loadRuns()
  }, [loadRuns])

  const handleEdit = useCallback((job: CronJob) => {
    setEditingJob(job)
    setTimeout(() => {
      formRef.current?.scrollIntoView({ behavior: "smooth", block: "start" })
    }, 50)
  }, [])

  const handleCancelEdit = useCallback(() => {
    setEditingJob(null)
  }, [])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="px-6 py-3 border-b">
        <div className="flex items-center justify-between">
          <h1 className="text-base font-semibold">{t("cronView.title")}</h1>
          <Button
            variant="outline"
            size="sm"
            className="h-7 text-xs"
            onClick={refresh}
            disabled={refreshing}
          >
            <RefreshCw
              className={`h-3.5 w-3.5 mr-1 ${refreshing ? "animate-spin" : ""}`}
            />
            {t("cronView.refresh")}
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="p-4 space-y-4 max-w-[960px] mx-auto">
          {/* Status Bar - single compact row */}
          <Card className="px-4 py-3">
            <div className="flex items-center gap-6 text-sm">
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("cronView.status")}</span>
                {status?.enabled ? (
                  <Badge className="bg-green-500/10 text-green-600 border-green-200 text-xs">
                    {t("cronView.enabled")}
                  </Badge>
                ) : (
                  <Badge variant="secondary" className="text-xs">{t("cronView.disabled")}</Badge>
                )}
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2">
                <span className="text-muted-foreground">{t("cronView.jobCount")}</span>
                <span className="font-semibold">{status?.jobs ?? total}</span>
              </div>
              <Separator orientation="vertical" className="h-4" />
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-muted-foreground shrink-0">{t("cronView.nextWake")}</span>
                <span className="font-medium truncate">
                  {formatNextWake(status?.nextWakeAtMs, t("cronView.expired"))}
                </span>
              </div>
            </div>
          </Card>

          {/* Task List - full width */}
          <Card className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold">{t("cronView.jobList")}</h2>
              <span className="text-xs text-muted-foreground">
                {t("cronView.showCount", { shown: String(jobs.length), total: String(total) })}
              </span>
            </div>

            {jobsError && (
              <div className="text-sm text-destructive mb-3 p-2.5 rounded-md bg-destructive/10">
                {jobsError}
              </div>
            )}

            {jobsLoading && jobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("cronView.loading")}
              </div>
            ) : jobs.length === 0 ? (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {t("cronView.empty")}
              </div>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <CronJobCard
                    key={job.id}
                    job={job}
                    onAction={handleJobAction}
                    onViewHistory={handleViewHistory}
                    onEdit={handleEdit}
                  />
                ))}
              </div>
            )}
          </Card>

          {/* Task Form - full width */}
          <div ref={formRef}>
            <CronJobForm
              editingJob={editingJob}
              onCreated={handleJobCreated}
              onCancelEdit={handleCancelEdit}
            />
          </div>

          {/* Run History */}
          <CronRunHistory
            runs={runs}
            selectedJobId={selectedJobId}
            onClearFilter={handleClearHistoryFilter}
          />
        </div>
      </div>
    </div>
  )
}
