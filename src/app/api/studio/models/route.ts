import fs from "node:fs"
import path from "node:path"
import { NextResponse } from "next/server"

import { resolveStateDir } from "@/lib/openclaw/paths"

export const runtime = "nodejs"

const OPENCLAW_CONFIG_FILENAME = "openclaw.json"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

const readOpenclawConfig = (): Record<string, unknown> => {
  const configPath = path.join(resolveStateDir(), OPENCLAW_CONFIG_FILENAME)
  if (!fs.existsSync(configPath)) return {}
  const raw = fs.readFileSync(configPath, "utf8")
  const parsed = JSON.parse(raw) as unknown
  if (!isRecord(parsed)) return {}
  return parsed
}

const writeOpenclawConfig = (config: Record<string, unknown>) => {
  const stateDir = resolveStateDir()
  if (!fs.existsSync(stateDir)) {
    fs.mkdirSync(stateDir, { recursive: true })
  }
  const configPath = path.join(stateDir, OPENCLAW_CONFIG_FILENAME)
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8")
}

const normalizeProviderAPI = (api: string): string => {
  switch (api) {
    case "anthropic":
      return "anthropic-messages"
    case "google-genai":
      return "google-generative-ai"
    default:
      return api
  }
}

const normalizeProviderAPIs = (providers: Record<string, unknown>) => {
  for (const prov of Object.values(providers)) {
    if (!isRecord(prov)) continue
    if (typeof prov.api === "string") {
      prov.api = normalizeProviderAPI(prov.api)
    }
    const models = prov.models
    if (Array.isArray(models)) {
      for (const m of models) {
        if (isRecord(m) && typeof m.api === "string") {
          m.api = normalizeProviderAPI(m.api)
        }
      }
    }
  }
}

const syncAllowedModels = (config: Record<string, unknown>) => {
  const agents = isRecord(config.agents) ? config.agents : null
  const defaults = isRecord(agents?.defaults) ? (agents.defaults as Record<string, unknown>) : null
  if (!defaults) return

  const currentModels = isRecord(defaults.models) ? defaults.models : null
  if (!currentModels) return

  const next: Record<string, unknown> = {}
  const providers = isRecord((config.models as Record<string, unknown>)?.providers)
    ? ((config.models as Record<string, unknown>).providers as Record<string, unknown>)
    : {}

  for (const [pid, prov] of Object.entries(providers)) {
    if (!isRecord(prov)) continue
    const models = Array.isArray(prov.models) ? prov.models : []
    for (const model of models) {
      const mid = typeof model === "string" ? model : isRecord(model) ? (model.id as string) : null
      if (!pid || !mid) continue
      const key = `${pid}/${mid}`
      next[key] = isRecord(currentModels[key]) ? currentModels[key] : {}
    }
  }

  defaults.models = next
}

export async function GET() {
  try {
    const config = readOpenclawConfig()
    const models = isRecord(config.models) ? config.models : {}
    const providers = isRecord(models.providers) ? models.providers : {}
    const agents = isRecord(config.agents) ? config.agents : {}
    const defaults = isRecord(agents.defaults) ? agents.defaults : {}
    const model = isRecord(defaults.model) ? defaults.model : {}

    return NextResponse.json({
      ok: true,
      providers,
      defaults: {
        primary: typeof model.primary === "string" ? model.primary : "",
        fallbacks: Array.isArray(model.fallbacks) ? model.fallbacks : [],
      },
    })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}

export async function PUT(request: Request) {
  try {
    const body = (await request.json()) as unknown
    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 })
    }

    const config = readOpenclawConfig()

    // Update providers
    if (isRecord(body.providers)) {
      if (!isRecord(config.models)) {
        config.models = {}
      }
      const modelsObj = config.models as Record<string, unknown>
      normalizeProviderAPIs(body.providers as Record<string, unknown>)
      modelsObj.providers = body.providers
    }

    // Update defaults (primary model)
    if (isRecord(body.defaults)) {
      if (!isRecord(config.agents)) {
        config.agents = {}
      }
      const agentsObj = config.agents as Record<string, unknown>
      if (!isRecord(agentsObj.defaults)) {
        agentsObj.defaults = {}
      }
      const defaultsObj = agentsObj.defaults as Record<string, unknown>

      const currentModel = isRecord(defaultsObj.model)
        ? { ...(defaultsObj.model as Record<string, unknown>) }
        : {}

      if (typeof (body.defaults as Record<string, unknown>).primary === "string") {
        const primary = ((body.defaults as Record<string, unknown>).primary as string).trim()
        if (primary) {
          currentModel.primary = primary
        } else {
          delete currentModel.primary
        }
      }

      if (Array.isArray((body.defaults as Record<string, unknown>).fallbacks)) {
        const fallbacks = ((body.defaults as Record<string, unknown>).fallbacks as string[])
          .filter((x) => typeof x === "string" && x.trim())
          .map((x) => x.trim())
        if (fallbacks.length > 0) {
          currentModel.fallbacks = fallbacks
        } else {
          delete currentModel.fallbacks
        }
      }

      if (Object.keys(currentModel).length > 0) {
        defaultsObj.model = currentModel
      } else {
        delete defaultsObj.model
      }
    }

    syncAllowedModels(config)
    writeOpenclawConfig(config)

    return NextResponse.json({ ok: true })
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: String(err) },
      { status: 500 }
    )
  }
}
