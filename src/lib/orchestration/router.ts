import type { Agent, Conversation, OrchestrationStrategy } from "@/types"
import { selectRespondingAgents } from "./skill-matcher"

export interface RoutingDecision {
  targetAgentIds: string[]
  strategy: OrchestrationStrategy
  reason: string
  coordinatorMessage?: string
}

export function parseMentions(content: string): string[] {
  const pattern = /@(\S+)/g
  const mentions: string[] = []
  let match: RegExpExecArray | null
  while ((match = pattern.exec(content)) !== null) {
    mentions.push(match[1])
  }
  return mentions
}

export function resolveMentionedAgentIds(
  mentions: string[],
  agents: Agent[],
  memberIds: string[]
): string[] {
  return mentions
    .map((name) => agents.find((a) => a.name === name)?.id)
    .filter((id): id is string => id != null && memberIds.includes(id))
}

function buildCoordinatorMessage(
  content: string,
  agents: Agent[],
  memberIds: string[],
  coordinatorId: string
): string {
  const teamMembers = agents
    .filter((a) => memberIds.includes(a.id) && a.id !== coordinatorId)
    .map((a) => {
      const skills = a.skills.length > 0 ? a.skills.join("、") : "通用"
      return `- ${a.name} (${a.role}): 擅长 ${skills}`
    })
    .join("\n")

  return [
    `[群组消息] 用户问: "${content}"`,
    "",
    "你是这个群组的协调人。群组成员包括:",
    teamMembers,
    "",
    "请先简要回应用户的问题，然后用 @成员名 的格式指定哪些成员应该参与回答。",
  ].join("\n")
}

export function resolveRoutingDecision(
  content: string,
  conversation: Conversation,
  agents: Agent[],
  mentions: string[]
): RoutingDecision {
  const agentMemberIds = conversation.members.filter((id) => id !== "user")
  const strategy = conversation.orchestration?.strategy ?? "all"

  // @mentions always take priority over any automatic strategy
  if (mentions.length > 0) {
    const mentionedIds = resolveMentionedAgentIds(mentions, agents, agentMemberIds)
    if (mentionedIds.length > 0) {
      const names = mentionedIds
        .map((id) => agents.find((a) => a.id === id)?.name ?? id)
        .join("、")
      return {
        targetAgentIds: mentionedIds,
        strategy,
        reason: `已 @${names}`,
      }
    }
  }

  switch (strategy) {
    case "skill-match": {
      const memberAgents = agents.filter((a) => agentMemberIds.includes(a.id))
      const maxResponders = conversation.orchestration?.maxResponders ?? 2
      const results = selectRespondingAgents(
        content,
        memberAgents,
        maxResponders,
        conversation.purpose
      )

      const hasMatch = results.some((r) => r.score > 0)

      if (!hasMatch) {
        return {
          targetAgentIds: agentMemberIds,
          strategy: "skill-match",
          reason: "未匹配到特定技能，全员回应",
        }
      }

      const selectedIds = results.map((r) => r.agentId)
      const details = results
        .map((r) => {
          const agent = agents.find((a) => a.id === r.agentId)
          const skillInfo = r.matchedSkills.length > 0 ? r.matchedSkills.join("、") : agent?.role ?? ""
          return `${agent?.name ?? r.agentId}(${skillInfo})`
        })
        .join(" 和 ")

      return {
        targetAgentIds: selectedIds,
        strategy: "skill-match",
        reason: `智能匹配 → ${details}`,
      }
    }

    case "coordinator": {
      const coordinatorId = conversation.orchestration?.coordinatorId
      if (!coordinatorId || !agentMemberIds.includes(coordinatorId)) {
        // Fallback: no valid coordinator, send to all
        return {
          targetAgentIds: agentMemberIds,
          strategy: "coordinator",
          reason: "协调人未设置，全员回应",
        }
      }

      const coordinator = agents.find((a) => a.id === coordinatorId)
      return {
        targetAgentIds: [coordinatorId],
        strategy: "coordinator",
        reason: `协调人 ${coordinator?.name ?? coordinatorId} 正在分析任务`,
        coordinatorMessage: buildCoordinatorMessage(
          content,
          agents,
          agentMemberIds,
          coordinatorId
        ),
      }
    }

    case "round-robin": {
      const idx = conversation.orchestration?.roundRobinIndex ?? 0
      const targetId = agentMemberIds[idx % agentMemberIds.length]
      const agent = agents.find((a) => a.id === targetId)
      return {
        targetAgentIds: [targetId],
        strategy: "round-robin",
        reason: `轮到 ${agent?.name ?? targetId} 发言`,
      }
    }

    case "all":
    default:
      return {
        targetAgentIds: agentMemberIds,
        strategy: "all",
        reason: "全员回应",
      }
  }
}
