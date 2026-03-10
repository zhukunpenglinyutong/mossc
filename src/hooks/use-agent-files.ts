"use client"

import { useCallback, useState } from "react"
import type { AgentFileName } from "@/lib/agents/agentFiles"

type FileState = {
  loading: boolean
  saving: boolean
  error: string | null
  content: string
  exists: boolean
}

const initialFileState: FileState = {
  loading: false,
  saving: false,
  error: null,
  content: "",
  exists: false,
}

export function useAgentFiles() {
  const [fileState, setFileState] = useState<FileState>(initialFileState)

  const loadFile = useCallback(async (agentId: string, name: AgentFileName) => {
    setFileState((prev) => ({ ...prev, loading: true, error: null }))
    try {
      const res = await fetch(
        `/api/runtime/agents/${encodeURIComponent(agentId)}/files?name=${encodeURIComponent(name)}`
      )
      const data = await res.json()
      if (!res.ok || data.error) {
        setFileState((prev) => ({
          ...prev,
          loading: false,
          error: data.error ?? "Failed to load file",
        }))
        return
      }
      const file = data.payload?.file
      const content = typeof file?.content === "string" ? file.content : ""
      const exists = file?.missing !== true
      setFileState({ loading: false, saving: false, error: null, content, exists })
    } catch (err) {
      setFileState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load file",
      }))
    }
  }, [])

  const saveFile = useCallback(
    async (agentId: string, name: AgentFileName, content: string) => {
      setFileState((prev) => ({ ...prev, saving: true, error: null }))
      try {
        const res = await fetch("/api/intents/agent-file-set", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ agentId, name, content }),
        })
        const data = await res.json()
        if (!res.ok || data.error) {
          setFileState((prev) => ({
            ...prev,
            saving: false,
            error: data.error ?? "Failed to save file",
          }))
          return false
        }
        setFileState((prev) => ({ ...prev, saving: false, content, exists: true }))
        return true
      } catch (err) {
        setFileState((prev) => ({
          ...prev,
          saving: false,
          error: err instanceof Error ? err.message : "Failed to save file",
        }))
        return false
      }
    },
    []
  )

  const resetFile = useCallback(() => {
    setFileState(initialFileState)
  }, [])

  return { fileState, loadFile, saveFile, resetFile }
}
