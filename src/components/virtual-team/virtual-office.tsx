"use client"

import { useState } from "react"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { getAgentAvatarUrl } from "@/lib/avatar"
import { Button } from "@/components/ui/button"
import { useI18n } from "@/i18n"
import { useApp } from "@/store/app-context"
import { PixelCharacter } from "./pixel-character"
import { AgentProfileCard } from "./agent-profile-card"
import { TeamPanel } from "./team-panel"
import type { Agent } from "@/types"

export function VirtualOffice() {
  const { state, dispatch } = useApp()
  const { t } = useI18n()
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null)
  const [teamPanelOpen, setTeamPanelOpen] = useState(false)

  const agents = state.agents
  const workingCount = agents.filter(
    (a) => a.status === "working" || a.status === "busy" || a.status === "thinking"
  ).length
  const idleCount = agents.filter(
    (a) => a.status === "idle" || a.status === "completed"
  ).length

  const handleStartChat = (agentId: string) => {
    const existing = state.conversations.find(
      (c) => c.type === "direct" && c.members.includes(agentId)
    )
    if (existing) {
      dispatch({ type: "SET_ACTIVE_CONVERSATION", payload: existing.id })
    }
    dispatch({ type: "SET_VIEW", payload: "chat" })
    setSelectedAgent(null)
    setTeamPanelOpen(false)
  }

  // Workstation layout positions
  const workstations = [
    { row: 0, col: 0 },
    { row: 0, col: 1 },
    { row: 0, col: 2 },
    { row: 1, col: 0 },
    { row: 1, col: 1 },
    { row: 1, col: 2 },
  ]

  return (
    <div className="flex-1 flex flex-col bg-gradient-to-b from-sky-50 to-blue-50 relative overflow-hidden">
      {/* Office scene */}
      <div className="flex-1 relative p-8">
        {/* Decorative elements */}
        <div className="absolute top-6 left-8 bg-white/80 border-2 border-gray-300 rounded-lg p-3 text-xs font-mono">
          <p className="font-bold text-sm mb-1">{t("virtualOffice.boardTitle")}</p>
          <div className="space-y-0.5 text-muted-foreground">
            <p>~~~ ~~~~</p>
            <p>~~~ ~~</p>
          </div>
        </div>

        {/* Window */}
        <div className="absolute top-4 right-12">
          <div className="w-24 h-16 border-2 border-blue-200 rounded bg-sky-100/50 flex items-center justify-center">
            <div className="text-2xl">
              ☁️ ☁️
            </div>
          </div>
        </div>

        {/* Ceiling light */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 flex flex-col items-center">
          <div className="w-0.5 h-6 bg-gray-300" />
          <div className="w-8 h-3 bg-yellow-100 border border-yellow-300 rounded-b-full" />
        </div>

        {/* Plant top-left */}
        <div className="absolute top-[140px] left-[60px] text-2xl">🌿</div>

        {/* Plant right */}
        <div className="absolute top-[140px] right-[60px] text-2xl">🌿</div>

        {/* Workstation grid */}
        <div className="mt-24 max-w-4xl mx-auto">
          <div className="grid grid-cols-3 gap-x-16 gap-y-20">
            {agents.map((agent, i) => {
              const pos = workstations[i]
              if (!pos) return null

              return (
                <div key={agent.id} className="flex flex-col items-center">
                  {/* Desk */}
                  <div className="w-32 h-14 bg-amber-100/80 border-2 border-amber-300 rounded-t-lg flex items-center justify-center mb-2 relative">
                    {/* Monitor */}
                    <div className="w-16 h-10 bg-gray-800 border-2 border-gray-600 rounded-sm flex items-center justify-center">
                      <div className="w-12 h-7 bg-blue-200 rounded-sm flex items-center justify-center text-[8px] font-mono">
                        {agent.status === "working" ? "||||" : "====="}
                      </div>
                    </div>
                  </div>

                  {/* Character */}
                  <div className="relative">
                    <PixelCharacter
                      name={agent.name}
                      status={agent.status}
                      onClick={() => setSelectedAgent(agent)}
                    />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Coffee machine */}
        <div className="absolute bottom-16 right-16 flex flex-col items-center">
          <div className="text-xs text-muted-foreground mb-1">{t("virtualOffice.coffeeMachine")}</div>
          <div className="w-12 h-14 bg-gray-200 border-2 border-gray-400 rounded-lg flex flex-col items-center justify-center">
            <span className="text-sm">☕</span>
            <div className="flex gap-0.5 mt-0.5">
              <span className="text-[8px] animate-pulse">（</span>
              <span className="text-[8px] animate-pulse [animation-delay:200ms]">（</span>
              <span className="text-[8px] animate-pulse [animation-delay:400ms]">（</span>
            </div>
          </div>
        </div>

        {/* Bookshelf */}
        <div className="absolute bottom-16 right-40 text-2xl">📚</div>

        {/* Selected agent profile card */}
        {selectedAgent && (
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-10">
            <AgentProfileCard
              agent={selectedAgent}
              onChat={() => handleStartChat(selectedAgent.id)}
              onClose={() => setSelectedAgent(null)}
            />
          </div>
        )}
      </div>

      {/* Bottom status bar */}
      <div className="h-16 bg-background/95 border-t flex items-center justify-between px-6">
        <div className="flex items-center gap-4">
          <span className="text-sm text-muted-foreground">
            {t("virtualOffice.statusBar", { working: String(workingCount), idle: String(idleCount) })}
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            {agents.map((agent) => (
              <Avatar
                key={agent.id}
                className="h-8 w-8 border-2 border-background cursor-pointer hover:z-10 hover:scale-110 transition-transform"
                onClick={() => setSelectedAgent(agent)}
              >
                <AvatarImage src={getAgentAvatarUrl(agent.id, agent.name)} alt={agent.name} />
                <AvatarFallback className="text-xs bg-blue-100 text-blue-700">
                  {agent.avatar}
                </AvatarFallback>
              </Avatar>
            ))}
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => setTeamPanelOpen(true)}
          >
            {t("virtualOffice.viewTeamPanel")}
          </Button>
        </div>
      </div>

      <TeamPanel
        open={teamPanelOpen}
        onOpenChange={setTeamPanelOpen}
        onStartChat={handleStartChat}
      />
    </div>
  )
}
