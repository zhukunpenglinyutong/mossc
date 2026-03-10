import { useEffect, useState } from "react"

const STORAGE_KEY = "mossb-agent-avatars"
export const USER_AVATAR_URL = "/mossclogo.png"
const USER_AVATAR_STORAGE_KEY = "mossb-user-avatar"

/** 12 preset avatar seeds for the picker grid */
export const PRESET_AVATAR_SEEDS = [
  "avatar-preset-01",
  "avatar-preset-02",
  "avatar-preset-03",
  "avatar-preset-04",
  "avatar-preset-05",
  "avatar-preset-06",
  "avatar-preset-07",
  "avatar-preset-08",
  "avatar-preset-09",
  "avatar-preset-10",
  "avatar-preset-11",
  "avatar-preset-12",
]

function loadAvatarMap(): Record<string, string> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {}
    return parsed as Record<string, string>
  } catch {
    return {}
  }
}

function loadUserAvatar(): string | null {
  try {
    const raw = localStorage.getItem(USER_AVATAR_STORAGE_KEY)
    if (!raw) return null
    return raw
  } catch {
    return null
  }
}

export function getUserAvatarUrl(): string {
  if (typeof window !== "undefined") {
    return loadUserAvatar() ?? USER_AVATAR_URL
  }
  return USER_AVATAR_URL
}

/**
 * Get avatar URL for an agent.
 * Priority: custom avatar (localStorage) > pravatar.cc fallback
 */
export function getAgentAvatarUrl(agentId: string, name: string): string {
  if (typeof window !== "undefined") {
    const map = loadAvatarMap()
    if (map[agentId]) return map[agentId]
  }
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(name)}`
}

export function getParticipantAvatarUrl(participantId: string, name: string): string {
  if (participantId === "user") return getUserAvatarUrl()
  return getAgentAvatarUrl(participantId, name)
}

/**
 * Save custom avatar URL for an agent into localStorage.
 * Dispatches a custom "avatar-changed" event so React components can re-render.
 */
export function setAgentAvatar(agentId: string, url: string): void {
  try {
    const map = loadAvatarMap()
    const next = { ...map, [agentId]: url }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
    window.dispatchEvent(new CustomEvent("avatar-changed", { detail: { agentId } }))
  } catch {
    // localStorage unavailable
  }
}

export function setUserAvatar(url: string): void {
  try {
    localStorage.setItem(USER_AVATAR_STORAGE_KEY, url)
    window.dispatchEvent(new CustomEvent("avatar-changed", { detail: { agentId: "user" } }))
  } catch {
    // localStorage unavailable
  }
}

/** Global avatar version counter — incremented on every avatar change. */
let _avatarVersion = 0

/**
 * Subscribe to avatar changes. Returns an unsubscribe function.
 * Calls `onChanged` whenever any agent avatar is updated.
 */
export function subscribeAvatarChange(onChanged: () => void): () => void {
  const handler = () => {
    _avatarVersion++
    onChanged()
  }
  window.addEventListener("avatar-changed", handler)
  return () => window.removeEventListener("avatar-changed", handler)
}

/** Current avatar version (for cache-busting in React deps). */
export function getAvatarVersion(): number {
  return _avatarVersion
}

/**
 * Build a pravatar.cc URL from a seed string.
 */
export function presetAvatarUrl(seed: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(seed)}`
}

/**
 * React hook — returns a version number that increments whenever any agent avatar changes.
 * Use this in components that display avatars to trigger re-render on avatar updates.
 */
export function useAvatarVersion(): number {
  const [version, setVersion] = useState(0)
  useEffect(() => {
    return subscribeAvatarChange(() => setVersion((v) => v + 1))
  }, [])
  return version
}
