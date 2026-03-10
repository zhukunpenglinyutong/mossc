"use client"

import { useCallback, useState } from "react"
import { AppProvider, useApp } from "@/store/app-context"
import { APP_VERSION } from "@/lib/app-meta"
import { CHANGELOG_DATA } from "@/lib/changelog"
import { TopNav } from "@/components/layout/top-nav"
import { NavRail } from "@/components/layout/nav-rail"
import { ChatView } from "@/components/chat/chat-view"
import { VirtualOffice } from "@/components/virtual-team/virtual-office"
import { CronView } from "@/components/cron/cron-view"
import { ChangelogDialog } from "@/components/changelog-dialog"

const LAST_SEEN_VERSION_KEY = "mossc-lastSeenChangelogVersion"

function MainContent() {
  const { state } = useApp()
  const [showChangelog, setShowChangelog] = useState(() => {
    if (typeof window === "undefined") return false
    const lastSeen = localStorage.getItem(LAST_SEEN_VERSION_KEY)
    return lastSeen !== APP_VERSION
  })

  const handleCloseChangelog = useCallback((open: boolean) => {
    if (!open) {
      localStorage.setItem(LAST_SEEN_VERSION_KEY, APP_VERSION)
    }
    setShowChangelog(open)
  }, [])

  const handleVersionClick = useCallback(() => {
    setShowChangelog(true)
  }, [])

  const renderView = () => {
    switch (state.view) {
      case "chat":
        return <ChatView />
      case "virtual-team":
        return <VirtualOffice />
      case "cron":
        return <CronView />
      default:
        return <ChatView />
    }
  }

  return (
    <div className="h-screen flex flex-col">
      <TopNav onVersionClick={handleVersionClick} />
      <main className="flex-1 flex overflow-hidden">
        <NavRail />
        {renderView()}
      </main>
      <ChangelogDialog
        open={showChangelog}
        onOpenChange={handleCloseChangelog}
        entries={CHANGELOG_DATA}
      />
    </div>
  )
}

export default function Home() {
  return (
    <AppProvider>
      <MainContent />
    </AppProvider>
  )
}
