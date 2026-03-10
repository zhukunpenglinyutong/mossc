type GatewayModelInput = {
  id?: string
  input?: string[]
}

type GatewayProviderConfig = {
  models?: Array<string | GatewayModelInput>
}

type GatewayModelAliasEntry = {
  alias?: string
}

type GatewayAgentModelConfig =
  | string
  | {
      primary?: string
      fallbacks?: string[]
    }

export type GatewayConfigSnapshot = {
  config?: {
    agents?: {
      defaults?: {
        model?: GatewayAgentModelConfig
        models?: Record<string, GatewayModelAliasEntry>
      }
      list?: Array<{
        id?: string
        model?: GatewayAgentModelConfig
      }>
    }
    models?: {
      providers?: Record<string, GatewayProviderConfig>
    }
  }
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const normalizeModelRef = (
  raw: string | undefined,
  aliases?: Record<string, GatewayModelAliasEntry>
): string | null => {
  const trimmed = raw?.trim()
  if (!trimmed) return null
  if (trimmed.includes("/")) return trimmed
  if (aliases) {
    const target = Object.entries(aliases).find(
      ([, entry]) => entry?.alias?.trim().toLowerCase() === trimmed.toLowerCase()
    )
    if (target?.[0]) return target[0]
  }
  return "anthropic/" + trimmed
}

const collectModelRefs = (
  model: GatewayAgentModelConfig | undefined,
  aliases?: Record<string, GatewayModelAliasEntry>
) => {
  const refs: string[] = []
  const seen = new Set<string>()
  const push = (raw: string | undefined) => {
    const resolved = normalizeModelRef(raw, aliases)
    if (!resolved || seen.has(resolved)) return
    seen.add(resolved)
    refs.push(resolved)
  }

  if (typeof model === "string") {
    push(model)
    return refs
  }

  push(model?.primary)
  for (const fallback of model?.fallbacks ?? []) {
    push(fallback)
  }
  return refs
}

const resolveProviderModelEntry = (
  snapshot: GatewayConfigSnapshot,
  modelRef: string
): GatewayModelInput | null => {
  const [provider, modelId] = modelRef.split("/")
  if (!provider || !modelId) return null

  const providers = snapshot.config?.models?.providers
  const providerConfig = providers?.[provider]
  if (!providerConfig?.models) return null

  for (const entry of providerConfig.models) {
    if (typeof entry === "string") {
      if (entry.trim() === modelId) {
        return { id: entry.trim(), input: undefined }
      }
      continue
    }

    if (entry.id?.trim() === modelId) {
      return entry
    }
  }

  return null
}

const modelRefSupportsImages = (snapshot: GatewayConfigSnapshot, modelRef: string) => {
  const entry = resolveProviderModelEntry(snapshot, modelRef)
  return entry?.input?.includes("image") ?? false
}

const listPreferredModelRefs = (snapshot: GatewayConfigSnapshot, agentId?: string) => {
  const aliases = snapshot.config?.agents?.defaults?.models
  const refs: string[] = []
  const seen = new Set<string>()
  const pushMany = (values: string[]) => {
    for (const value of values) {
      if (seen.has(value)) continue
      seen.add(value)
      refs.push(value)
    }
  }

  const agentModel = snapshot.config?.agents?.list?.find((entry) => entry.id?.trim() === agentId)?.model
  pushMany(collectModelRefs(agentModel, aliases))
  pushMany(collectModelRefs(snapshot.config?.agents?.defaults?.model, aliases))

  for (const modelRef of Object.keys(aliases ?? {})) {
    if (seen.has(modelRef)) continue
    seen.add(modelRef)
    refs.push(modelRef)
  }

  return refs
}

export const resolveVisionFallbackModelRef = (
  snapshot: GatewayConfigSnapshot,
  agentId?: string
): string | null => {
  const preferredModelRefs = listPreferredModelRefs(snapshot, agentId)
  const firstPreferredModelRef = preferredModelRefs[0]

  if (firstPreferredModelRef && modelRefSupportsImages(snapshot, firstPreferredModelRef)) {
    return null
  }

  for (const modelRef of preferredModelRefs) {
    if (modelRefSupportsImages(snapshot, modelRef)) {
      return modelRef
    }
  }

  const providers = snapshot.config?.models?.providers
  if (!isRecord(providers)) {
    return null
  }

  for (const [provider, config] of Object.entries(providers)) {
    const models = config?.models
    if (!Array.isArray(models)) continue

    for (const entry of models) {
      if (typeof entry === "string") continue
      const modelId = entry.id?.trim()
      if (!modelId || !entry.input?.includes("image")) continue
      return provider + "/" + modelId
    }
  }

  return null
}
