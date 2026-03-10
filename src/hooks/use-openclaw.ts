"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import type { ChatAttachment } from "@/types"

export type ConnectionStatus = "disconnected" | "connecting" | "connected" | "error"

export type GatewayEvent = {
  type: "runtime.status" | "gateway.event"
  event?: string
  status?: string
  payload?: unknown
  asOf?: string
  reason?: string | null
  seq?: number | null
}

export type AgentSeed = {
  agentId: string
  name: string
  sessionKey: string
}

export type FleetResult = {
  seeds: AgentSeed[]
  sessionCreatedAgentIds: string[]
  suggestedSelectedAgentId: string | null
  configSnapshot: unknown
}

export type HistoryMessage = {
  role: "user" | "assistant" | "system" | "toolResult"
  content: unknown
  timestamp?: number
  thinkingDurationMs?: number
}

export function useRuntimeEventStream(onEvent: (event: GatewayEvent) => void) {
  const [status, setStatus] = useState<ConnectionStatus>("disconnected")
  const eventSourceRef = useRef<EventSource | null>(null)
  const onEventRef = useRef(onEvent)
  onEventRef.current = onEvent

  const connect = useCallback(function connectToRuntime() {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
    }

    setStatus("connecting")
    const es = new EventSource("/api/runtime/stream")
    eventSourceRef.current = es

    es.addEventListener("runtime.status", (e) => {
      try {
        const data = JSON.parse(e.data) as GatewayEvent
        if (data.status === "connected") {
          setStatus("connected")
        } else if (data.status === "error" || data.status === "stopped") {
          setStatus("error")
        } else if (data.status === "connecting" || data.status === "reconnecting") {
          setStatus("connecting")
        }
        onEventRef.current(data)
      } catch {
        // ignore parse errors
      }
    })

    es.addEventListener("gateway.event", (e) => {
      try {
        const data = JSON.parse(e.data) as GatewayEvent
        onEventRef.current(data)
      } catch {
        // ignore parse errors
      }
    })

    es.onerror = () => {
      setStatus("error")
      es.close()
      eventSourceRef.current = null
      // auto-reconnect after 3 seconds
      setTimeout(() => {
        connectToRuntime()
      }, 3000)
    }
  }, [])

  const disconnect = useCallback(() => {
    if (eventSourceRef.current) {
      eventSourceRef.current.close()
      eventSourceRef.current = null
    }
    setStatus("disconnected")
  }, [])

  useEffect(() => {
    return () => {
      if (eventSourceRef.current) {
        eventSourceRef.current.close()
        eventSourceRef.current = null
      }
    }
  }, [])

  return { status, connect, disconnect }
}

export function useAgentFleet() {
  const [fleet, setFleet] = useState<FleetResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const loadFleet = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch("/api/runtime/fleet", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({}),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || "Failed to load fleet")
        return null
      }
      setFleet(data.result)
      return data.result as FleetResult
    } catch (err) {
      const message = err instanceof Error ? err.message : "Failed to load fleet"
      setError(message)
      return null
    } finally {
      setLoading(false)
    }
  }, [])

  return { fleet, loading, error, loadFleet }
}

export function useChatHistory() {
  const [loading, setLoading] = useState(false)

  const loadHistory = useCallback(async (agentId: string): Promise<HistoryMessage[]> => {
    setLoading(true)
    try {
      const res = await fetch(`/api/runtime/agents/${encodeURIComponent(agentId)}/history`)
      const data = await res.json()
      if (!res.ok || data.error) {
        return []
      }
      return (data.messages ?? []) as HistoryMessage[]
    } catch {
      return []
    } finally {
      setLoading(false)
    }
  }, [])

  return { loading, loadHistory }
}

export function useSendMessage() {
  const [sending, setSending] = useState(false)

  const send = useCallback(async (agentId: string, content: string, sessionKey?: string, attachments?: ChatAttachment[]) => {
    setSending(true)
    try {
      const idempotencyKey = `${agentId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const payload: Record<string, unknown> = {
        agentId,
        message: content,
        sessionKey: sessionKey ?? `agent:${agentId}:main`,
        idempotencyKey,
      }
      if (attachments && attachments.length > 0) {
        payload.attachments = attachments
          .map((att) => {
            const match = /^data:([^;]+);base64,(.+)$/.exec(att.dataUrl)
            if (!match) return null
            return {
              type: "image",
              mimeType: match[1],
              content: match[2],
            }
          })
          .filter((a): a is NonNullable<typeof a> => a !== null)
      }
      const res = await fetch("/api/intents/chat-send", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      return { ok: res.ok, data }
    } catch (err) {
      return { ok: false, data: { error: err instanceof Error ? err.message : "send_failed" } }
    } finally {
      setSending(false)
    }
  }, [])

  return { sending, send }
}

export function useConnectionSummary() {
  const [summary, setSummary] = useState<{
    status: string
    version: string | null
  } | null>(null)

  const loadSummary = useCallback(async () => {
    try {
      const res = await fetch("/api/runtime/summary")
      const data = await res.json()
      if (typeof data.version === "string" || typeof data.summary?.status === "string") {
        setSummary({
          status: typeof data.summary?.status === "string" ? data.summary.status : "unknown",
          version: typeof data.version === "string" ? data.version : null,
        })
      }
      return data
    } catch {
      return null
    }
  }, [])

  return { summary, loadSummary }
}
