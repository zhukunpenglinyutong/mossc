"use client"

import { cn } from "@/lib/utils"
import type { AgentStatus } from "@/types"

interface PixelCharacterProps {
  name: string
  status: AgentStatus
  onClick?: () => void
  size?: "sm" | "md"
}

const statusColors: Record<AgentStatus, string> = {
  idle: "#4ADE80",
  working: "#FBBF24",
  busy: "#F87171",
  chatting: "#FBBF24",
  thinking: "#FBBF24",
  completed: "#4ADE80",
}

const statusLabels: Record<AgentStatus, string> = {
  idle: "空闲",
  working: "工作中",
  busy: "忙碌",
  chatting: "对话中",
  thinking: "思考中",
  completed: "已完成",
}

export function PixelCharacter({ name, status, onClick, size = "md" }: PixelCharacterProps) {
  const scale = size === "sm" ? 0.7 : 1
  const animClass =
    status === "working" || status === "busy"
      ? "animate-pixel-typing"
      : status === "thinking"
        ? "animate-pixel-thinking"
        : status === "completed"
          ? "animate-pixel-celebrate"
          : "animate-pixel-idle"

  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-center gap-1 cursor-pointer transition-transform hover:scale-110 focus:outline-none",
        animClass
      )}
      style={{ transform: `scale(${scale})` }}
    >
      {/* Thinking bubble */}
      {status === "thinking" && (
        <div className="relative mb-1 animate-bounce">
          <div className="bg-white border-2 border-gray-800 rounded-lg px-2 py-0.5 text-xs font-mono">
            ?!
          </div>
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-white border-r-2 border-b-2 border-gray-800 rotate-45" />
        </div>
      )}

      {/* Pixel character body */}
      <div className="relative">
        {/* Head */}
        <div
          className="w-10 h-10 bg-amber-200 border-2 border-gray-800 rounded-sm mx-auto relative"
          style={{ imageRendering: "pixelated" }}
        >
          {/* Eyes */}
          <div className="absolute top-2 left-1.5 w-1.5 h-1.5 bg-gray-800 rounded-full" />
          <div className="absolute top-2 right-1.5 w-1.5 h-1.5 bg-gray-800 rounded-full" />
          {/* Mouth */}
          <div
            className={cn(
              "absolute bottom-1.5 left-1/2 -translate-x-1/2",
              status === "busy"
                ? "w-3 h-1.5 border border-gray-800 rounded-full bg-red-300"
                : status === "completed"
                  ? "w-4 h-1.5 border-b-2 border-gray-800"
                  : "w-3 h-0.5 bg-gray-800"
            )}
          />
        </div>

        {/* Body */}
        <div
          className={cn(
            "w-8 h-6 mx-auto border-2 border-gray-800 rounded-sm -mt-0.5",
            status === "busy"
              ? "bg-red-400"
              : status === "working"
                ? "bg-blue-400"
                : "bg-blue-300"
          )}
          style={{ imageRendering: "pixelated" }}
        >
          {(status === "working" || status === "busy") && (
            <div className="flex justify-center pt-0.5 gap-px">
              <div className="w-1 h-2 bg-gray-800 animate-pulse" />
              <div className="w-1 h-2 bg-gray-800 animate-pulse [animation-delay:150ms]" />
              <div className="w-1 h-2 bg-gray-800 animate-pulse [animation-delay:300ms]" />
            </div>
          )}
        </div>
      </div>

      {/* Name and status */}
      <div className="text-center">
        <p className="text-xs font-medium text-foreground font-mono leading-tight">
          &quot;{name}&quot;
        </p>
        <div className="flex items-center justify-center gap-1 mt-0.5">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: statusColors[status] }}
          />
          <span className="text-[10px] text-muted-foreground">
            {statusLabels[status]}
          </span>
        </div>
      </div>
    </button>
  )
}
