import type { Conversation, Message } from "@/types"

// --- Agent Display Names ---

const AGENT_NAMES_STORAGE_KEY = "mossb-agent-display-names"

export const loadAgentDisplayNames = (): Record<string, string> => {
  try {
    const raw = localStorage.getItem(AGENT_NAMES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

export const saveAgentDisplayName = (agentId: string, displayName: string) => {
  try {
    const map = loadAgentDisplayNames()
    map[agentId] = displayName
    localStorage.setItem(AGENT_NAMES_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // localStorage unavailable
  }
}

export const removeAgentDisplayName = (agentId: string) => {
  try {
    const map = loadAgentDisplayNames()
    delete map[agentId]
    localStorage.setItem(AGENT_NAMES_STORAGE_KEY, JSON.stringify(map))
  } catch {
    // localStorage unavailable
  }
}

export const resolveAgentDisplayName = (agentId: string, gatewayName: string): string => {
  if (typeof window !== "undefined") {
    const map = loadAgentDisplayNames()
    if (map[agentId]) return map[agentId]
  }
  return gatewayName || agentId
}

// --- Group Conversations ---

const GROUPS_STORAGE_KEY = "mossb-group-conversations"
const GROUP_MESSAGES_STORAGE_KEY = "mossb-group-messages"

export const saveGroupsToStorage = (conversations: Conversation[]) => {
  try {
    const groups = conversations.filter((c) => c.type === "group")
    localStorage.setItem(GROUPS_STORAGE_KEY, JSON.stringify(groups))
  } catch {
    // localStorage unavailable (SSR or quota exceeded)
  }
}

export const loadGroupsFromStorage = (): Conversation[] => {
  try {
    const raw = localStorage.getItem(GROUPS_STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed as Conversation[]
  } catch {
    return []
  }
}

export const saveGroupMessagesToStorage = (
  messages: Record<string, Message[]>,
  conversations: Conversation[]
) => {
  try {
    const groupIds = new Set(
      conversations.filter((c) => c.type === "group").map((c) => c.id)
    )
    const groupMessages: Record<string, Message[]> = {}
    for (const [convId, msgs] of Object.entries(messages)) {
      if (groupIds.has(convId) && msgs.length > 0) {
        // Only persist finalized messages (not streaming)
        groupMessages[convId] = msgs.filter((m) => !m.id.startsWith("streaming-"))
      }
    }
    localStorage.setItem(GROUP_MESSAGES_STORAGE_KEY, JSON.stringify(groupMessages))
  } catch {
    // localStorage unavailable (SSR or quota exceeded)
  }
}

export const loadGroupMessagesFromStorage = (): Record<string, Message[]> => {
  try {
    const raw = localStorage.getItem(GROUP_MESSAGES_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, Message[]>
  } catch {
    return {}
  }
}

// --- Pinned Conversations ---

const PINNED_STORAGE_KEY = "mossb-pinned-conversations"

export const loadPinnedFromStorage = (): Record<string, number> => {
  try {
    const raw = localStorage.getItem(PINNED_STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, number>
  } catch {
    return {}
  }
}

export const savePinnedToStorage = (conversations: Conversation[]) => {
  try {
    const pinned: Record<string, number> = {}
    for (const c of conversations) {
      if (c.pinned && c.pinnedAt) {
        pinned[c.id] = c.pinnedAt
      }
    }
    localStorage.setItem(PINNED_STORAGE_KEY, JSON.stringify(pinned))
  } catch {
    // localStorage unavailable
  }
}
