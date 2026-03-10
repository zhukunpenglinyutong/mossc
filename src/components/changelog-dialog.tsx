"use client"

import { useCallback, useEffect, useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { useI18n } from "@/i18n"
import { cn } from "@/lib/utils"
import type { ChangelogEntry } from "@/lib/changelog"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"

interface ChangelogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  entries: ChangelogEntry[]
  initialPage?: number
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function renderChangelogMarkdown(text: string): string {
  if (!text) return ""

  const lines = text.split("\n")
  const htmlParts: string[] = []
  let inList = false

  for (const line of lines) {
    const trimmed = line.trim()

    if (!trimmed) {
      if (inList) {
        htmlParts.push("</ul>")
        inList = false
      }
      continue
    }

    if (trimmed.startsWith("- ")) {
      if (!inList) {
        htmlParts.push("<ul>")
        inList = true
      }
      const itemText = escapeHtml(trimmed.substring(2)).replace(
        /`([^`]+)`/g,
        "<code>$1</code>"
      )
      htmlParts.push(`<li>${itemText}</li>`)
      continue
    }

    if (inList) {
      htmlParts.push("</ul>")
      inList = false
    }

    if (/^[✨🐛🔧🎉🚀💡⚡️🔥📦🛠️🏗️]/.test(trimmed)) {
      htmlParts.push(`<h4>${escapeHtml(trimmed)}</h4>`)
      continue
    }

    htmlParts.push(`<p>${escapeHtml(trimmed)}</p>`)
  }

  if (inList) {
    htmlParts.push("</ul>")
  }

  return htmlParts.join("\n")
}

function resolveContent(entry: ChangelogEntry): string[] {
  const { en, zh } = entry.content
  const parts: string[] = []
  if (en) parts.push(en)
  if (zh) parts.push(zh)
  return parts
}

export function ChangelogDialog({
  open,
  onOpenChange,
  entries,
  initialPage = 0,
}: ChangelogDialogProps) {
  const { t } = useI18n()
  const [currentPage, setCurrentPage] = useState(initialPage)

  useEffect(() => {
    if (open) {
      setCurrentPage(initialPage)
    }
  }, [open, initialPage])

  const handlePrev = useCallback(() => {
    setCurrentPage((prev) => Math.max(0, prev - 1))
  }, [])

  const handleNext = useCallback(() => {
    setCurrentPage((prev) => Math.min(entries.length - 1, prev + 1))
  }, [entries.length])

  useEffect(() => {
    if (!open) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "ArrowLeft") handlePrev()
      else if (e.key === "ArrowRight") handleNext()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [open, handlePrev, handleNext])

  if (entries.length === 0) return null

  const entry = entries[currentPage]
  const contentParts = resolveContent(entry)
  const totalPages = entries.length
  const hasPrev = currentPage > 0
  const hasNext = currentPage < totalPages - 1

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="sm:max-w-[540px] max-h-[80vh] flex flex-col gap-0 p-0"
        showCloseButton
      >
        <DialogHeader className="px-5 pt-4 pb-3 border-b">
          <div className="flex items-center gap-2.5">
            <DialogTitle>{t("changelog.title")}</DialogTitle>
            <Badge
              variant="secondary"
              className="bg-violet-500/15 text-violet-600 border-violet-500/40 dark:text-violet-300 text-xs px-2 py-0"
            >
              v{entry.version}
            </Badge>
            <span className="text-xs text-muted-foreground">{entry.date}</span>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0 overflow-y-auto">
          <div className="px-5 py-4">
            {contentParts.map((part, idx) => (
              <div key={idx}>
                {idx > 0 && (
                  <hr className="border-t border-border my-3.5" />
                )}
                <div
                  className="changelog-content text-sm leading-relaxed text-foreground"
                  dangerouslySetInnerHTML={{
                    __html: renderChangelogMarkdown(part),
                  }}
                />
              </div>
            ))}
          </div>
        </div>

        {totalPages > 1 && (
          <DialogFooter className="px-5 py-3 border-t flex-row items-center justify-between">
            <Button
              variant="outline"
              size="icon-sm"
              onClick={handlePrev}
              disabled={!hasPrev}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex items-center gap-1.5">
              {totalPages <= 10 ? (
                entries.map((_, idx) => (
                  <button
                    key={idx}
                    onClick={() => setCurrentPage(idx)}
                    className={cn(
                      "w-1.5 h-1.5 rounded-full transition-all",
                      idx === currentPage
                        ? "bg-primary scale-125"
                        : "bg-muted-foreground/30 hover:bg-muted-foreground/50"
                    )}
                    aria-label={`Page ${idx + 1}`}
                  />
                ))
              ) : (
                <span className="text-xs text-muted-foreground">
                  {currentPage + 1} / {totalPages}
                </span>
              )}
            </div>

            <Button
              variant="outline"
              size="icon-sm"
              onClick={handleNext}
              disabled={!hasNext}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
