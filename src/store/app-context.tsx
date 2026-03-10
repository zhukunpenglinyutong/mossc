"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  type ReactNode,
} from "react"
import type { ChatAttachment } from "@/types"
import { resolveRoutingDecision, parseMentions, resolveMentionedAgentIds } from "@/lib/orchestration/router"
import {
  useRuntimeEventStream,
  useAgentFleet,
  useChatHistory,
  useSendMessage,
  type GatewayEvent,
} from "@/hooks/use-openclaw"
import type { AppContextValue } from "./app-types"
import { initialState } from "./app-types"
import { appReducer } from "./app-reducer"
import {
  saveGroupMessagesToStorage,
  loadGroupsFromStorage,
  loadGroupMessagesFromStorage,
} from "./app-storage"
import { uniqueId, parseViewFromHash } from "./app-utils"

const AppContext = createContext<AppContextValue | null>(null)

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const { loadFleet } = useAgentFleet()
  const { loadHistory } = useChatHistory()
  const { send } = useSendMessage()
  const initializedRef = useRef(false)
  const stateRef = useRef(state)
  stateRef.current = state
  const processedCoordinatorMsgsRef = useRef(new Set<string>())

  const handleEvent = useCallback((event: GatewayEvent) => {
    dispatch({ type: "GATEWAY_EVENT", payload: event })
  }, [])

  const { status, connect } = useRuntimeEventStream(handleEvent)

  useEffect(() => {
    dispatch({ type: "SET_CONNECTION_STATUS", payload: status })
  }, [status])

  // Persist group messages to localStorage whenever messages change
  // Skip until initialization is complete to avoid overwriting saved data with empty state
  useEffect(() => {
    if (!initializedRef.current) return
    saveGroupMessagesToStorage(state.messages, state.conversations)
  }, [state.messages, state.conversations])

  // Coordinator auto-routing: when the coordinator's finalized response contains @mentions,
  // automatically send the original user message to those mentioned agents
  useEffect(() => {
    for (const conv of state.conversations) {
      if (conv.type !== "group" || conv.orchestration?.strategy !== "coordinator") continue
      const coordinatorId = conv.orchestration.coordinatorId
      if (!coordinatorId) continue

      const msgs = state.messages[conv.id]
      if (!msgs || msgs.length < 2) continue

      // Find the last finalized coordinator message (not streaming)
      const lastCoordinatorMsg = msgs
        .filter((m) => m.senderId === coordinatorId && !m.id.startsWith("streaming-"))
        .at(-1)
      if (!lastCoordinatorMsg) continue
      if (processedCoordinatorMsgsRef.current.has(lastCoordinatorMsg.id)) continue

      // Check for @mentions in the coordinator's response
      const mentions = parseMentions(lastCoordinatorMsg.content)
      if (mentions.length === 0) continue

      const agentMemberIds = conv.members.filter((id) => id !== "user" && id !== coordinatorId)
      const mentionedIds = resolveMentionedAgentIds(mentions, state.agents, agentMemberIds)
      if (mentionedIds.length === 0) continue

      // Find the last user message before the coordinator's response
      const coordinatorMsgIdx = msgs.indexOf(lastCoordinatorMsg)
      const lastUserMsg = msgs
        .slice(0, coordinatorMsgIdx)
        .filter((m) => m.senderId === "user")
        .at(-1)
      if (!lastUserMsg) continue

      // Mark as processed before sending to prevent re-triggering
      processedCoordinatorMsgsRef.current.add(lastCoordinatorMsg.id)

      // Show orchestration decision
      const names = mentionedIds
        .map((id) => state.agents.find((a) => a.id === id)?.name ?? id)
        .join("\u3001")
      dispatch({
        type: "ADD_ORCHESTRATION_MESSAGE",
        payload: {
          conversationId: conv.id,
          strategy: "coordinator",
          selectedAgents: mentionedIds,
          reason: `\u534f\u8c03\u4eba\u5df2\u5206\u6d3e \u2192 ${names}`,
        },
      })

      // Send original user message to mentioned agents
      mentionedIds.forEach((agentId, index) => {
        const sessionKey = `agent:${agentId}:group:${conv.id}`
        setTimeout(() => {
          send(agentId, lastUserMsg.content, sessionKey)
        }, index * 500)
      })
    }
  }, [state.messages, state.conversations, state.agents, send, dispatch])

  useEffect(() => {
    if (initializedRef.current) return
    initializedRef.current = true

    // Restore persisted group conversations and their messages from localStorage
    const savedGroups = loadGroupsFromStorage()
    if (savedGroups.length > 0) {
      dispatch({ type: "LOAD_GROUPS", payload: savedGroups })
    }
    const savedGroupMessages = loadGroupMessagesFromStorage()
    if (Object.keys(savedGroupMessages).length > 0) {
      dispatch({ type: "LOAD_GROUP_MESSAGES", payload: savedGroupMessages })
    }

    connect()

    loadFleet().then((result) => {
      if (result?.seeds) {
        dispatch({ type: "SET_FLEET", payload: result.seeds })
        // Load chat history for each agent
        for (const seed of result.seeds) {
          loadHistory(seed.agentId).then((messages) => {
            if (messages.length > 0) {
              dispatch({
                type: "LOAD_HISTORY",
                payload: {
                  conversationId: `conv-${seed.agentId}`,
                  agentId: seed.agentId,
                  messages,
                },
              })
            }
          })
        }
      }
    })
  }, [connect, loadFleet, loadHistory])

  // Restore view from URL hash on mount
  useEffect(() => {
    const initialView = parseViewFromHash()
    if (initialView !== "chat") {
      dispatch({ type: "SET_VIEW", payload: initialView })
    }
  }, [])

  // Sync view state -> URL hash
  useEffect(() => {
    const hash = `#${state.view}`
    if (window.location.hash !== hash) {
      window.location.hash = hash
    }
  }, [state.view])

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handleHashChange = () => {
      const view = parseViewFromHash()
      if (view !== stateRef.current.view) {
        dispatch({ type: "SET_VIEW", payload: view })
      }
    }
    window.addEventListener("hashchange", handleHashChange)
    return () => window.removeEventListener("hashchange", handleHashChange)
  }, [])

  const sendMessage = useCallback(
    (conversationId: string, content: string, attachments?: ChatAttachment[]) => {
      dispatch({ type: "SEND_MESSAGE", payload: { conversationId, content, attachments } })

      const conv = stateRef.current.conversations.find((c) => c.id === conversationId)
      if (!conv) return

      const agentMemberIds = conv.members.filter((id) => id !== "user")
      if (agentMemberIds.length === 0) return

      const sendError = (error: string) => {
        dispatch({
          type: "ADD_AGENT_MESSAGE",
          payload: {
            id: uniqueId("msg-err"),
            conversationId,
            senderId: "system",
            senderName: "\u7cfb\u7edf",
            senderAvatar: "SY",
            content: `\u53d1\u9001\u5931\u8d25: ${error}`,
            timestamp: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
            read: true,
            type: "system",
          },
        })
      }

      if (conv.type !== "group") {
        // Direct conversation -- send to the single agent
        send(agentMemberIds[0], content, undefined, attachments).then((result) => {
          if (!result.ok) {
            const agent = stateRef.current.agents.find((a) => a.id === agentMemberIds[0])
            sendError(`${agent?.name ?? agentMemberIds[0]}: ${result.data?.error ?? "\u672a\u77e5\u9519\u8bef"}`)
          }
        })
        return
      }

      // Group conversation -- use orchestration router
      const mentions = parseMentions(content)
      const agents = stateRef.current.agents
      const decision = resolveRoutingDecision(content, conv, agents, mentions)

      // Show orchestration decision for non-trivial routing
      if (
        decision.strategy !== "all" &&
        mentions.length === 0 &&
        decision.targetAgentIds.length < agentMemberIds.length
      ) {
        dispatch({
          type: "ADD_ORCHESTRATION_MESSAGE",
          payload: {
            conversationId,
            strategy: decision.strategy,
            selectedAgents: decision.targetAgentIds,
            reason: decision.reason,
          },
        })
      }

      // Send to selected agents
      decision.targetAgentIds.forEach((agentId, index) => {
        const delay = index * 500
        const sessionKey = `agent:${agentId}:group:${conversationId}`
        const messageContent =
          decision.coordinatorMessage && agentId === conv.orchestration?.coordinatorId
            ? decision.coordinatorMessage
            : content

        setTimeout(() => {
          send(agentId, messageContent, sessionKey, attachments).then((result) => {
            if (!result.ok) {
              const agent = stateRef.current.agents.find((a) => a.id === agentId)
              sendError(`${agent?.name ?? agentId}: ${result.data?.error ?? "\u672a\u77e5\u9519\u8bef"}`)
            }
          })
        }, delay)
      })

      // Advance round-robin pointer
      if (decision.strategy === "round-robin") {
        dispatch({ type: "ADVANCE_ROUND_ROBIN", payload: { conversationId } })
      }
    },
    [send]
  )

  const simulateAgentReply = useCallback(
    (_conversationId: string, _agentId: string) => {
      // no-op: real replies come through SSE
    },
    []
  )

  const refreshFleet = useCallback(async () => {
    const result = await loadFleet()
    if (result?.seeds && result.seeds.length > 0) {
      dispatch({ type: "SET_FLEET", payload: result.seeds })
      for (const seed of result.seeds) {
        loadHistory(seed.agentId).then((messages) => {
          if (messages.length > 0) {
            dispatch({
              type: "LOAD_HISTORY",
              payload: {
                conversationId: `conv-${seed.agentId}`,
                agentId: seed.agentId,
                messages,
              },
            })
          }
        })
      }
    }
  }, [loadFleet, loadHistory])

  const resetSession = useCallback(
    (conversationId: string) => {
      const conv = stateRef.current.conversations.find((c) => c.id === conversationId)
      if (!conv) return

      const agentMemberIds = conv.members.filter((id) => id !== "user")

      // Send "/new" command to each agent -- this is how OpenClaw triggers
      // a real session reset via the auto-reply system, which creates a new
      // session ID, archives the old transcript, and resets context.
      for (const agentId of agentMemberIds) {
        const sessionKey =
          conv.type === "group"
            ? `agent:${agentId}:group:${conversationId}`
            : undefined
        send(agentId, "/new", sessionKey)
      }

      dispatch({ type: "RESET_SESSION", payload: { conversationId } })
    },
    [send]
  )

  const value = useMemo(
    () => ({ state, dispatch, sendMessage, simulateAgentReply, refreshFleet, resetSession }),
    [state, sendMessage, simulateAgentReply, refreshFleet, resetSession]
  )

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error("useApp must be used within AppProvider")
  return ctx
}
