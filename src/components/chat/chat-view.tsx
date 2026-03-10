"use client"

import { useState } from "react"
import { ConversationList } from "./conversation-list"
import { ChatWindow } from "./chat-window"
import { NewConversationDialog } from "./new-conversation-dialog"
import { CreateAgentDialog } from "@/components/virtual-team/create-agent-dialog"

export function ChatView() {
  const [newConvOpen, setNewConvOpen] = useState(false)
  const [newAgentOpen, setNewAgentOpen] = useState(false)

  return (
    <>
      <div className="flex-1 flex overflow-hidden">
        {/* 左侧对话列表 - 固定宽度，类飞书 */}
        <div className="shrink-0 w-[280px] overflow-hidden border-r bg-muted/30">
          <ConversationList
            onNewConversation={() => setNewConvOpen(true)}
            onNewAgent={() => setNewAgentOpen(true)}
          />
        </div>

        {/* 右侧聊天区 */}
        <div className="flex-1 flex flex-col min-w-0">
          <ChatWindow />
        </div>
      </div>

      <NewConversationDialog open={newConvOpen} onOpenChange={setNewConvOpen} />
      <CreateAgentDialog open={newAgentOpen} onOpenChange={setNewAgentOpen} />
    </>
  )
}
