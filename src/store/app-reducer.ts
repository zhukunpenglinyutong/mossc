import type { Agent, Conversation, Message } from "@/types"
import type { AppState, AppAction } from "./app-types"
import { saveAgentDisplayName, removeAgentDisplayName, saveGroupsToStorage, saveGroupMessagesToStorage, loadPinnedFromStorage, savePinnedToStorage } from "./app-storage"
import { extractTextContent, agentSeedToAgent, agentSeedToConversation, uniqueId, isRecord, resolveAgentIdFromPayload } from "./app-utils"

export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "SET_VIEW":
      return { ...state, view: action.payload }
    case "SET_ACTIVE_CONVERSATION": {
      const convId = action.payload
      if (!convId) return { ...state, activeConversationId: null }
      const updatedConvs = state.conversations.map((c) =>
        c.id === convId ? { ...c, unreadCount: 0 } : c
      )
      return { ...state, activeConversationId: convId, conversations: updatedConvs }
    }
    case "SEND_MESSAGE": {
      const { conversationId, content, attachments } = action.payload
      const newMsg: Message = {
        id: uniqueId("msg"),
        conversationId,
        senderId: "user",
        senderName: "\u6211",
        senderAvatar: "ZK",
        content,
        timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        read: true,
        type: "text",
        ...(attachments && attachments.length > 0 ? { attachments } : {}),
      }
      const existing = state.messages[conversationId] ?? []
      const updatedConvs = state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: content, lastMessageTime: newMsg.timestamp }
          : c
      )
      return {
        ...state,
        messages: { ...state.messages, [conversationId]: [...existing, newMsg] },
        conversations: updatedConvs,
      }
    }
    case "ADD_AGENT_MESSAGE": {
      const msg = action.payload
      const existing = state.messages[msg.conversationId] ?? []
      const updatedConvs = state.conversations.map((c) =>
        c.id === msg.conversationId
          ? {
              ...c,
              lastMessage: msg.content.slice(0, 100),
              lastMessageSender: msg.senderName,
              lastMessageTime: msg.timestamp,
              unreadCount:
                state.activeConversationId === msg.conversationId
                  ? 0
                  : c.unreadCount + 1,
            }
          : c
      )
      return {
        ...state,
        messages: { ...state.messages, [msg.conversationId]: [...existing, msg] },
        conversations: updatedConvs,
      }
    }
    case "SET_THINKING": {
      const next = new Set(state.thinkingAgents)
      if (action.payload.thinking) {
        next.add(action.payload.agentId)
      } else {
        next.delete(action.payload.agentId)
      }
      return { ...state, thinkingAgents: next }
    }
    case "CREATE_CONVERSATION": {
      const newConversations = [action.payload, ...state.conversations]
      saveGroupsToStorage(newConversations)
      return {
        ...state,
        conversations: newConversations,
        activeConversationId: action.payload.id,
      }
    }
    case "MARK_READ": {
      const updatedConvs = state.conversations.map((c) =>
        c.id === action.payload ? { ...c, unreadCount: 0 } : c
      )
      return { ...state, conversations: updatedConvs }
    }
    case "UPDATE_AGENT_STATUS": {
      const updatedAgents = state.agents.map((a) =>
        a.id === action.payload.agentId
          ? { ...a, status: action.payload.status }
          : a
      )
      return { ...state, agents: updatedAgents }
    }
    case "SET_CONNECTION_STATUS":
      return { ...state, connectionStatus: action.payload, gatewayConnected: action.payload === "connected" }
    case "SET_FLEET": {
      const seeds = action.payload
      const agents = seeds.map(agentSeedToAgent)
      const directConversations = seeds.map(agentSeedToConversation)
      // Preserve existing group conversations that aren't from fleet
      const existingGroups = state.conversations.filter((c) => c.type === "group")
      // Restore pinned state from localStorage
      const pinnedMap = typeof window !== "undefined" ? loadPinnedFromStorage() : {}
      const conversations = [...directConversations, ...existingGroups].map((c) => {
        const pinnedAt = pinnedMap[c.id]
        if (pinnedAt) return { ...c, pinned: true, pinnedAt }
        return c
      })
      const firstConvId = conversations[0]?.id ?? null

      // Re-resolve agent names/avatars in existing messages (e.g. restored from localStorage)
      const agentMap = new Map(agents.map((a) => [a.id, a]))
      const updatedMessages = { ...state.messages }
      let messagesChanged = false
      for (const [convId, msgs] of Object.entries(updatedMessages)) {
        const updated = msgs.map((m) => {
          if (m.senderId === "user" || m.senderId === "system") return m
          const agent = agentMap.get(m.senderId)
          if (!agent) return m
          if (m.senderName === agent.name && m.senderAvatar === agent.avatar) return m
          return { ...m, senderName: agent.name, senderAvatar: agent.avatar, senderRole: agent.role }
        })
        if (updated !== msgs) {
          updatedMessages[convId] = updated
          messagesChanged = true
        }
      }

      return {
        ...state,
        agents,
        conversations,
        messages: messagesChanged ? updatedMessages : state.messages,
        activeConversationId: state.activeConversationId ?? firstConvId,
      }
    }
    case "APPEND_STREAMING_CONTENT": {
      const { conversationId, messageId, delta } = action.payload
      const existing = state.messages[conversationId] ?? []
      const idx = existing.findIndex((m) => m.id === messageId)
      if (idx === -1) return state
      const updatedMsg = { ...existing[idx], content: existing[idx].content + delta }
      const updatedMsgs = [...existing]
      updatedMsgs[idx] = updatedMsg
      return {
        ...state,
        messages: { ...state.messages, [conversationId]: updatedMsgs },
      }
    }
    case "GATEWAY_EVENT": {
      const event = action.payload
      if (event.type !== "gateway.event") return state
      if (!isRecord(event.payload)) return state

      const payload = event.payload
      const eventName = event.event ?? ""

      const agentId = resolveAgentIdFromPayload(payload)
      if (!agentId) return state
      // Check if sessionKey contains a group conversation target
      const sessionKey = typeof payload.sessionKey === "string" ? payload.sessionKey : ""
      const groupMatch = sessionKey.match(/^agent:[^:]+:group:(.+)$/)
      const conversationId = groupMatch ? groupMatch[1] : `conv-${agentId}`

      const makeTimestamp = () =>
        new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })

      const findAgent = () => state.agents.find((a) => a.id === agentId)

      const finalizeStreaming = (): AppState => {
        const next = new Set(state.thinkingAgents)
        next.delete(agentId)
        const updatedAgents = state.agents.map((a) =>
          a.id === agentId ? { ...a, status: "idle" as const } : a
        )

        const existing = state.messages[conversationId] ?? []
        const lastMsg = existing[existing.length - 1]
        let updatedMsgs = existing
        if (lastMsg && lastMsg.id.startsWith("streaming-")) {
          updatedMsgs = [
            ...existing.slice(0, -1),
            { ...lastMsg, id: uniqueId("msg") },
          ]
        }

        const lastContent = updatedMsgs[updatedMsgs.length - 1]?.content ?? ""
        const updatedConvs = state.conversations.map((c) =>
          c.id === conversationId
            ? {
                ...c,
                lastMessage: lastContent.slice(0, 100),
                lastMessageTime: makeTimestamp(),
                unreadCount:
                  state.activeConversationId === conversationId ? 0 : c.unreadCount + 1,
              }
            : c
        )

        return {
          ...state,
          thinkingAgents: next,
          agents: updatedAgents,
          messages: { ...state.messages, [conversationId]: updatedMsgs },
          conversations: updatedConvs,
        }
      }

      // OpenClaw "chat" event: {runId, sessionKey, state, message, ...}
      if (eventName === "chat") {
        const chatState = typeof payload.state === "string" ? payload.state : ""
        const role = isRecord(payload.message)
          ? (typeof (payload.message as Record<string, unknown>).role === "string"
              ? (payload.message as Record<string, unknown>).role as string
              : "")
          : ""

        if (role === "user" || role === "system") return state

        if (chatState === "delta") {
          // streaming assistant delta
          const content = extractTextContent(
            isRecord(payload.message)
              ? (payload.message as Record<string, unknown>).content ?? (payload.message as Record<string, unknown>).text
              : ""
          )
          if (!content) return state

          // mark as thinking
          const next = new Set(state.thinkingAgents)
          next.add(agentId)
          const updatedAgents = state.agents.map((a) =>
            a.id === agentId ? { ...a, status: "thinking" as const } : a
          )

          const withThinking = { ...state, thinkingAgents: next, agents: updatedAgents }
          const existing = withThinking.messages[conversationId] ?? []
          const lastMsg = existing[existing.length - 1]

          // for chat deltas, replace the entire streaming message content (cumulative text)
          if (lastMsg && lastMsg.senderId === agentId && lastMsg.id.startsWith("streaming-")) {
            const updatedMsg = { ...lastMsg, content }
            return {
              ...withThinking,
              messages: { ...withThinking.messages, [conversationId]: [...existing.slice(0, -1), updatedMsg] },
            }
          }

          const agent = findAgent()
          const newMsg: Message = {
            id: uniqueId(`streaming-${agentId}`),
            conversationId,
            senderId: agentId,
            senderName: agent?.name ?? agentId,
            senderAvatar: agent?.avatar ?? agentId.slice(0, 2).toUpperCase(),
            senderRole: agent?.role,
            content,
            timestamp: makeTimestamp(),
            read: state.activeConversationId === conversationId,
            type: "text",
          }
          return {
            ...withThinking,
            messages: { ...withThinking.messages, [conversationId]: [...existing, newMsg] },
          }
        }

        if (chatState === "final") {
          // final message - extract and show if we don't have it already
          const content = extractTextContent(
            isRecord(payload.message)
              ? (payload.message as Record<string, unknown>).content ?? (payload.message as Record<string, unknown>).text
              : ""
          )
          if (content) {
            const existing = state.messages[conversationId] ?? []
            const lastMsg = existing[existing.length - 1]
            if (lastMsg && lastMsg.id.startsWith("streaming-")) {
              // update the streaming message with final content and finalize
              const updated = { ...lastMsg, content, id: uniqueId("msg") }
              const next = new Set(state.thinkingAgents)
              next.delete(agentId)
              const updatedAgents = state.agents.map((a) =>
                a.id === agentId ? { ...a, status: "idle" as const } : a
              )
              const updatedConvs = state.conversations.map((c) =>
                c.id === conversationId
                  ? { ...c, lastMessage: content.slice(0, 100), lastMessageTime: makeTimestamp(),
                      unreadCount: state.activeConversationId === conversationId ? 0 : c.unreadCount + 1 }
                  : c
              )
              return {
                ...state,
                thinkingAgents: next,
                agents: updatedAgents,
                messages: { ...state.messages, [conversationId]: [...existing.slice(0, -1), updated] },
                conversations: updatedConvs,
              }
            }
          }
          return finalizeStreaming()
        }

        if (chatState === "aborted" || chatState === "error") {
          return finalizeStreaming()
        }

        return state
      }

      // OpenClaw "agent" event: {runId, stream, data: {delta, text, phase}, sessionKey?}
      // NOTE: The gateway emits BOTH "agent" and "chat" events for the same AI response.
      // "chat" events are the UI-facing derived events (delta/final) and already contain
      // the full assistant text. We only use "agent" lifecycle events for thinking-state
      // updates here and intentionally skip "assistant" stream to avoid duplicate messages.
      if (eventName === "agent") {
        const stream = typeof payload.stream === "string" ? payload.stream : ""
        const data = isRecord(payload.data) ? (payload.data as Record<string, unknown>) : null
        const phase = typeof data?.phase === "string" ? data.phase : ""

        if (stream === "lifecycle") {
          if (phase === "start") {
            const next = new Set(state.thinkingAgents)
            next.add(agentId)
            const updatedAgents = state.agents.map((a) =>
              a.id === agentId ? { ...a, status: "thinking" as const } : a
            )
            return { ...state, thinkingAgents: next, agents: updatedAgents }
          }
          // "end" and "error" lifecycle events: only clear thinking state without
          // finalizing streaming messages -- "chat" final event handles that.
          if (phase === "end" || phase === "error") {
            const next = new Set(state.thinkingAgents)
            next.delete(agentId)
            return { ...state, thinkingAgents: next }
          }
          return state
        }

        // Skip "assistant" stream -- handled by "chat" events to avoid duplicates
        return state
      }

      return state
    }
    case "LOAD_GROUPS": {
      const groups = action.payload
      if (groups.length === 0) return state
      const existingIds = new Set(state.conversations.map((c) => c.id))
      const newGroups = groups.filter((g) => !existingIds.has(g.id))
      return {
        ...state,
        conversations: [...state.conversations, ...newGroups],
      }
    }
    case "LOAD_GROUP_MESSAGES": {
      const savedMessages = action.payload
      if (Object.keys(savedMessages).length === 0) return state
      const merged = { ...state.messages }
      for (const [convId, msgs] of Object.entries(savedMessages)) {
        // Only load if we don't already have messages for this conversation
        if (!merged[convId] || merged[convId].length === 0) {
          merged[convId] = msgs
        }
      }
      // Update conversation lastMessage from restored messages
      const updatedConvs = state.conversations.map((c) => {
        const msgs = merged[c.id]
        if (!msgs || msgs.length === 0) return c
        const lastMsg = msgs[msgs.length - 1]
        return {
          ...c,
          lastMessage: lastMsg.content.slice(0, 100),
          lastMessageTime: lastMsg.timestamp,
        }
      })
      return { ...state, messages: merged, conversations: updatedConvs }
    }
    case "LOAD_HISTORY": {
      const { conversationId, agentId, messages: historyMessages } = action.payload
      const agent = state.agents.find((a) => a.id === agentId)
      const isInternalMessage = (content: string) =>
        content.startsWith("A new session was started via") ||
        content.startsWith("Execute your Session Startup") ||
        content.startsWith("I'll read the required session startup")

      const converted: Message[] = historyMessages
        .filter((m) => m.role === "user" || m.role === "assistant")
        .map((m) => {
          const isUser = m.role === "user"
          const content = extractTextContent(m.content)
          const ts = m.timestamp
            ? new Date(m.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })
            : ""
          return {
            id: uniqueId("hist"),
            conversationId,
            senderId: isUser ? "user" : agentId,
            senderName: isUser ? "\u6211" : (agent?.name ?? agentId),
            senderAvatar: isUser ? "ZK" : (agent?.avatar ?? agentId.slice(0, 2).toUpperCase()),
            senderRole: isUser ? undefined : agent?.role,
            content,
            timestamp: ts,
            read: true,
            type: "text" as const,
          }
        })
        .filter((m) => m.content.trim() && !isInternalMessage(m.content.trim()))

      if (converted.length === 0) return state

      // Keep any in-progress streaming messages that arrived via SSE
      const existing = state.messages[conversationId] ?? []
      const streamingMsgs = existing.filter((m) => m.id.startsWith("streaming-"))

      const lastMsg = converted[converted.length - 1]
      const updatedConvs = state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: lastMsg.content.slice(0, 100), lastMessageTime: lastMsg.timestamp }
          : c
      )
      return {
        ...state,
        messages: { ...state.messages, [conversationId]: [...converted, ...streamingMsgs] },
        conversations: updatedConvs,
      }
    }
    case "UPDATE_GROUP_ORCHESTRATION": {
      const { conversationId, orchestration } = action.payload
      const updatedConvs = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, orchestration } : c
      )
      saveGroupsToStorage(updatedConvs)
      return { ...state, conversations: updatedConvs }
    }
    case "ADD_ORCHESTRATION_MESSAGE": {
      const { conversationId, strategy, selectedAgents, reason } = action.payload
      const orchestrationMsg: Message = {
        id: uniqueId("orch"),
        conversationId,
        senderId: "system",
        senderName: "\u7f16\u6392\u7cfb\u7edf",
        senderAvatar: "OC",
        content: reason,
        timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        read: true,
        type: "orchestration",
        orchestrationInfo: {
          strategy: strategy as import("@/types").OrchestrationStrategy,
          selectedAgents,
          reason,
        },
      }
      const existing = state.messages[conversationId] ?? []
      return {
        ...state,
        messages: { ...state.messages, [conversationId]: [...existing, orchestrationMsg] },
      }
    }
    case "ADVANCE_ROUND_ROBIN": {
      const { conversationId } = action.payload
      const updatedConvs = state.conversations.map((c) => {
        if (c.id !== conversationId || !c.orchestration) return c
        const agentMembers = c.members.filter((id) => id !== "user")
        const currentIdx = c.orchestration.roundRobinIndex ?? 0
        const nextIdx = (currentIdx + 1) % agentMembers.length
        return {
          ...c,
          orchestration: { ...c.orchestration, roundRobinIndex: nextIdx },
        }
      })
      saveGroupsToStorage(updatedConvs)
      return { ...state, conversations: updatedConvs }
    }
    case "DISSOLVE_GROUP": {
      const { conversationId } = action.payload
      const updatedConvs = state.conversations.filter((c) => c.id !== conversationId)
      const { [conversationId]: _removed, ...remainingMessages } = state.messages
      saveGroupsToStorage(updatedConvs)
      saveGroupMessagesToStorage(remainingMessages, updatedConvs)
      return {
        ...state,
        conversations: updatedConvs,
        messages: remainingMessages,
        activeConversationId:
          state.activeConversationId === conversationId
            ? (updatedConvs[0]?.id ?? null)
            : state.activeConversationId,
      }
    }
    case "RESET_SESSION": {
      const { conversationId } = action.payload
      const updatedConvs = state.conversations.map((c) =>
        c.id === conversationId
          ? { ...c, lastMessage: "", lastMessageTime: "" }
          : c
      )
      return {
        ...state,
        messages: { ...state.messages, [conversationId]: [] },
        conversations: updatedConvs,
      }
    }
    case "RENAME_AGENT": {
      const { agentId, name } = action.payload
      saveAgentDisplayName(agentId, name)
      const avatar = name.slice(0, 2).toUpperCase()
      const conversationId = `conv-${agentId}`
      const updatedAgents = state.agents.map((a) =>
        a.id === agentId ? { ...a, name, avatar } : a
      )
      const updatedConvs = state.conversations.map((c) =>
        c.id === conversationId ? { ...c, name, avatar } : c
      )
      return { ...state, agents: updatedAgents, conversations: updatedConvs }
    }
    case "ADD_AGENT": {
      const { agentId, name } = action.payload
      if (state.agents.some((a) => a.id === agentId)) return state
      saveAgentDisplayName(agentId, name)
      const newAgent: Agent = {
        id: agentId,
        name,
        role: "Agent",
        avatar: name.slice(0, 2).toUpperCase(),
        skills: [],
        category: "OpenClaw",
        status: "idle",
        lastActiveAt: "",
      }
      const newConv: Conversation = {
        id: `conv-${agentId}`,
        type: "direct",
        name,
        avatar: name.slice(0, 2).toUpperCase(),
        members: [agentId],
        lastMessage: "",
        lastMessageTime: "",
        unreadCount: 0,
      }
      return {
        ...state,
        agents: [...state.agents, newAgent],
        conversations: [...state.conversations, newConv],
      }
    }
    case "REMOVE_AGENT": {
      const { agentId } = action.payload
      const conversationId = `conv-${agentId}`
      removeAgentDisplayName(agentId)
      const updatedAgents = state.agents.filter((a) => a.id !== agentId)
      const updatedConvs = state.conversations.filter((c) => c.id !== conversationId)
      const { [conversationId]: _removed, ...remainingMessages } = state.messages
      const next = new Set(state.thinkingAgents)
      next.delete(agentId)
      return {
        ...state,
        agents: updatedAgents,
        conversations: updatedConvs,
        messages: remainingMessages,
        thinkingAgents: next,
        activeConversationId:
          state.activeConversationId === conversationId
            ? (updatedConvs[0]?.id ?? null)
            : state.activeConversationId,
      }
    }
    case "TOGGLE_PIN": {
      const { conversationId } = action.payload
      const updatedConvs = state.conversations.map((c) => {
        if (c.id !== conversationId) return c
        const isPinned = !c.pinned
        return { ...c, pinned: isPinned, pinnedAt: isPinned ? Date.now() : undefined }
      })
      savePinnedToStorage(updatedConvs)
      return { ...state, conversations: updatedConvs }
    }
    default:
      return state
  }
}
