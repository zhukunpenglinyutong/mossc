"use client"

import { getParticipantAvatarUrl, useAvatarVersion } from "@/lib/avatar"
import { cn } from "@/lib/utils"

interface GroupAvatarProps {
  members: { id: string; name: string }[]
  size?: number
  className?: string
}

export function GroupAvatar({ members, size = 40, className }: GroupAvatarProps) {
  useAvatarVersion()
  const avatars = members.slice(0, 9)
  const count = avatars.length

  // Grid layout: 1→1x1, 2→1x2, 3→2+1, 4→2x2, 5-6→2x3, 7-9→3x3
  const cols = count <= 1 ? 1 : count <= 4 ? 2 : 3
  const gap = 1

  return (
    <div
      className={cn("shrink-0 rounded-lg overflow-hidden bg-muted", className)}
      style={{
        width: size,
        height: size,
        display: "grid",
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gap,
        padding: gap,
      }}
    >
      {avatars.map((member) => (
        <img
          key={member.id}
          src={getParticipantAvatarUrl(member.id, member.name)}
          alt={member.name}
          className="w-full h-full object-cover rounded-sm"
          style={{ aspectRatio: "1 / 1" }}
        />
      ))}
    </div>
  )
}
