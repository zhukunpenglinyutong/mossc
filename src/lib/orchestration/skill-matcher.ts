import type { Agent } from "@/types"

export interface SkillMatchResult {
  agentId: string
  score: number
  matchedSkills: string[]
  matchedRole: boolean
  matchedCategory: boolean
}

export function computeSkillRelevance(
  message: string,
  agent: Agent,
  groupPurpose?: string
): SkillMatchResult {
  const lowerMessage = message.toLowerCase()
  const matchedSkills: string[] = []
  let score = 0

  for (const skill of agent.skills) {
    if (skill && lowerMessage.includes(skill.toLowerCase())) {
      matchedSkills.push(skill)
      score += 3
    }
  }

  const matchedRole = Boolean(
    agent.role && agent.role !== "Agent" && lowerMessage.includes(agent.role.toLowerCase())
  )
  if (matchedRole) score += 2

  const matchedCategory = Boolean(
    agent.category &&
    agent.category !== "OpenClaw" &&
    lowerMessage.includes(agent.category.toLowerCase())
  )
  if (matchedCategory) score += 1

  if (groupPurpose && agent.skills.length > 0) {
    const lowerPurpose = groupPurpose.toLowerCase()
    for (const skill of agent.skills) {
      if (skill && lowerPurpose.includes(skill.toLowerCase())) {
        score += 1
        break
      }
    }
  }

  return { agentId: agent.id, score, matchedSkills, matchedRole, matchedCategory }
}

export function selectRespondingAgents(
  message: string,
  agents: Agent[],
  maxResponders: number = 2,
  groupPurpose?: string
): SkillMatchResult[] {
  if (agents.length === 0) return []

  const results = agents.map((agent) =>
    computeSkillRelevance(message, agent, groupPurpose)
  )

  results.sort((a, b) => b.score - a.score)

  const hasMatch = results.some((r) => r.score > 0)

  if (!hasMatch) {
    return results
  }

  return results.filter((r) => r.score > 0).slice(0, maxResponders)
}
