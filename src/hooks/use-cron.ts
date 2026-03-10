"use client"

import { useCallback, useState } from "react"
import { fetchJson } from "@/lib/http"
import { postStudioIntent } from "@/lib/controlplane/intents-client"
import type {
  CronJob,
  CronJobCreateInput,
  CronListResult,
  CronRunLogResult,
  CronStatus,
} from "@/types/cron"

interface GatewayResponse<T> {
  ok: boolean
  payload: T
}

export function useCronJobs() {
  const [jobs, setJobs] = useState<CronJob[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadJobs = useCallback(async (includeDisabled = true) => {
    setLoading(true)
    setError(null)
    try {
      const params = new URLSearchParams({ includeDisabled: String(includeDisabled) })
      const result = await fetchJson<GatewayResponse<CronListResult>>(
        `/api/runtime/cron?${params}`
      )
      const list = result.payload
      setJobs(list.jobs)
      setTotal(list.total)
      return list
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to load cron jobs"
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { jobs, total, loading, error, loadJobs }
}

export function useCronStatus() {
  const [status, setStatus] = useState<CronStatus | null>(null)
  const [loading, setLoading] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchJson<GatewayResponse<CronStatus>>(
        "/api/runtime/cron/status"
      )
      setStatus(result.payload)
      return result.payload
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { status, loading, loadStatus }
}

export function useCronRuns() {
  const [runs, setRuns] = useState<CronRunLogResult | null>(null)
  const [loading, setLoading] = useState(false)

  const loadRuns = useCallback(async (jobId?: string) => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (jobId) params.set("jobId", jobId)
      const result = await fetchJson<GatewayResponse<CronRunLogResult>>(
        `/api/runtime/cron/runs?${params}`
      )
      setRuns(result.payload)
      return result.payload
    } catch {
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { runs, loading, loadRuns }
}

export function useCronMutations() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const addJob = useCallback(async (input: CronJobCreateInput) => {
    setLoading(true)
    setError(null)
    try {
      const result = await postStudioIntent<GatewayResponse<CronJob>>(
        "/api/intents/cron-add",
        input as unknown as Record<string, unknown>
      )
      return result.payload
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add cron job"
      setError(msg)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  const removeJob = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await postStudioIntent<GatewayResponse<{ removed: boolean }>>(
        "/api/intents/cron-remove",
        { id }
      )
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to remove cron job"
      setError(msg)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const runJob = useCallback(async (id: string) => {
    setLoading(true)
    setError(null)
    try {
      await postStudioIntent<GatewayResponse<{ executed: boolean }>>(
        "/api/intents/cron-run",
        { id }
      )
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to run cron job"
      setError(msg)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  const updateJob = useCallback(async (id: string, patch: Record<string, unknown>) => {
    setLoading(true)
    setError(null)
    try {
      await postStudioIntent<GatewayResponse<CronJob>>(
        "/api/intents/cron-update",
        { id, patch }
      )
      return true
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to update cron job"
      setError(msg)
      return false
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, error, addJob, removeJob, runJob, updateJob }
}
