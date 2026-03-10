import type { Agent, Conversation, ViewType } from "@/types"
import type { AgentSeed } from "@/hooks/use-openclaw"
import { resolveAgentDisplayName } from "./app-storage"

export const extractTextContent = (content: unknown): string => {
  if (typeof content === "string") return content
  if (Array.isArray(content)) {
    return content
      .map((part) => {
        if (typeof part === "string") return part
        if (part && typeof part === "object") {
          const rec = part as Record<string, unknown>
          if (rec.type === "text" && typeof rec.text === "string") return rec.text
        }
        return ""
      })
      .filter(Boolean)
      .join("\n")
  }
  return ""
}

export const agentSeedToAgent = (seed: AgentSeed): Agent => {
  const name = resolveAgentDisplayName(seed.agentId, seed.name || seed.agentId)
  return {
    id: seed.agentId,
    name,
    role: "Agent",
    avatar: name.slice(0, 2).toUpperCase(),
    skills: [],
    category: "OpenClaw",
    status: "idle",
    lastActiveAt: "",
  }
}

export const agentSeedToConversation = (seed: AgentSeed): Conversation => {
  const name = resolveAgentDisplayName(seed.agentId, seed.name || seed.agentId)
  return {
    id: `conv-${seed.agentId}`,
    type: "direct",
    name,
    avatar: name.slice(0, 2).toUpperCase(),
    members: [seed.agentId],
    lastMessage: "",
    lastMessageTime: "",
    unreadCount: 0,
  }
}

let _idCounter = 0
export const uniqueId = (prefix: string): string =>
  `${prefix}-${Date.now()}-${(++_idCounter).toString(36)}`

export const VALID_VIEWS: ViewType[] = ["chat", "virtual-team", "cron"]

export const parseViewFromHash = (): ViewType => {
  if (typeof window === "undefined") return "chat"
  const hash = window.location.hash.replace("#", "")
  return VALID_VIEWS.includes(hash as ViewType) ? (hash as ViewType) : "chat"
}

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

export const resolveAgentIdFromPayload = (payload: Record<string, unknown>): string | null => {
  if (typeof payload.agentId === "string" && payload.agentId.trim()) {
    return payload.agentId.trim()
  }
  if (typeof payload.sessionKey === "string") {
    const match = payload.sessionKey.match(/^agent:([^:]+):/)
    if (match) return match[1]
  }
  return null
}
