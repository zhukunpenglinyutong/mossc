export type CronSchedule =
  | { kind: "at"; at: string }
  | { kind: "every"; everyMs: number; anchorMs?: number }
  | { kind: "cron"; expr: string; tz?: string; staggerMs?: number }

export type CronSessionTarget = "main" | "isolated"
export type CronWakeMode = "next-heartbeat" | "now"

export type CronPayload =
  | { kind: "systemEvent"; text: string }
  | {
      kind: "agentTurn"
      message: string
      model?: string
      fallbacks?: string[]
      thinking?: string
      timeoutSeconds?: number
      deliver?: boolean
      channel?: string
      to?: string
      bestEffortDeliver?: boolean
    }

export interface CronDelivery {
  mode: "none" | "announce" | "webhook"
  channel?: string
  to?: string
  bestEffort?: boolean
}

export interface CronJobState {
  nextRunAtMs?: number
  runningAtMs?: number
  lastRunAtMs?: number
  lastRunStatus?: "ok" | "error" | "skipped"
  lastError?: string
  lastDurationMs?: number
  consecutiveErrors?: number
  lastDeliveryStatus?: "delivered" | "not-delivered" | "unknown" | "not-requested"
  lastDeliveryError?: string
}

export interface CronJob {
  id: string
  agentId?: string
  sessionKey?: string
  name: string
  description?: string
  enabled: boolean
  deleteAfterRun?: boolean
  createdAtMs: number
  updatedAtMs: number
  schedule: CronSchedule
  sessionTarget: CronSessionTarget
  wakeMode: CronWakeMode
  payload: CronPayload
  delivery?: CronDelivery
  state: CronJobState
}

export interface CronListResult {
  jobs: CronJob[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
  nextOffset: number | null
}

export interface CronStatus {
  enabled: boolean
  jobs: number
  nextWakeAtMs: number | null
}

export interface CronRunLogEntry {
  ts: number
  jobId: string
  action: "finished"
  status?: "ok" | "error" | "skipped"
  error?: string
  summary?: string
  delivered?: boolean
  deliveryStatus?: "delivered" | "not-delivered" | "unknown" | "not-requested"
  deliveryError?: string
  sessionId?: string
  durationMs?: number
  nextRunAtMs?: number
  model?: string
  provider?: string
  jobName?: string
  usage?: {
    input_tokens?: number
    output_tokens?: number
    total_tokens?: number
  }
}

export interface CronRunLogResult {
  entries: CronRunLogEntry[]
  total: number
  offset: number
  limit: number
  hasMore: boolean
  nextOffset: number | null
}

export interface CronJobCreateInput {
  name: string
  agentId?: string
  description?: string
  enabled?: boolean
  schedule: CronSchedule
  sessionTarget: CronSessionTarget
  wakeMode: CronWakeMode
  payload: CronPayload
  delivery?: CronDelivery
}
