"use client"

import { useI18n } from "@/i18n"

interface TypingIndicatorProps {
  agentId: string
  agentName: string
  agentAvatar: string
}

export function TypingIndicator({ agentName }: TypingIndicatorProps) {
  const { t } = useI18n()

  return (
    <div className="flex items-start py-1.5 pl-[46px]">
      <div className="bg-muted rounded-lg rounded-tl-sm px-3 py-2.5 flex items-center gap-1.5">
        <div className="flex gap-1">
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:0ms]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:150ms]" />
          <span className="w-1.5 h-1.5 bg-muted-foreground/50 rounded-full animate-bounce [animation-delay:300ms]" />
        </div>
        <span className="text-xs text-muted-foreground/70 ml-1">
          {t("typingIndicator.thinking", { name: agentName })}
        </span>
      </div>
    </div>
  )
}
