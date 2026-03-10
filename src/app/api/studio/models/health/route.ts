import { NextResponse } from "next/server"

export const runtime = "nodejs"

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value))

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown
    if (!isRecord(body)) {
      return NextResponse.json({ ok: false, error: "Invalid body" }, { status: 400 })
    }

    const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : ""
    const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : ""
    const apiType = typeof body.apiType === "string" ? body.apiType.trim() : "openai-completions"
    const modelId = typeof body.modelId === "string" ? body.modelId.trim() : ""

    if (!baseUrl) {
      return NextResponse.json({ ok: false, error: "baseUrl is required" }, { status: 400 })
    }

    const startMs = Date.now()
    let response: Response

    if (apiType === "anthropic-messages") {
      const url = `${baseUrl.replace(/\/+$/, "")}/messages`
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: modelId || "claude-sonnet-4-5",
          max_tokens: 5,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: AbortSignal.timeout(15000),
      })
    } else if (apiType === "google-generative-ai") {
      const model = modelId || "gemini-2.5-flash"
      const url = `${baseUrl.replace(/\/+$/, "")}/models/${model}:generateContent?key=${apiKey}`
      response = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: "hi" }] }],
          generationConfig: { maxOutputTokens: 5 },
        }),
        signal: AbortSignal.timeout(15000),
      })
    } else {
      // OpenAI-compatible (default)
      const url = `${baseUrl.replace(/\/+$/, "")}/chat/completions`
      response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: modelId || "gpt-4o",
          max_tokens: 5,
          messages: [{ role: "user", content: "hi" }],
        }),
        signal: AbortSignal.timeout(15000),
      })
    }

    const latencyMs = Date.now() - startMs
    const healthy = response.ok

    if (!healthy) {
      let errorMsg = `HTTP ${response.status}`
      try {
        const errBody = await response.text()
        if (errBody.length < 500) errorMsg += `: ${errBody}`
      } catch {
        // ignore
      }
      return NextResponse.json({
        ok: true,
        healthy: false,
        status: response.status,
        latencyMs,
        error: errorMsg,
      })
    }

    return NextResponse.json({
      ok: true,
      healthy: true,
      status: response.status,
      latencyMs,
    })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return NextResponse.json({
      ok: true,
      healthy: false,
      latencyMs: 0,
      error: message.includes("abort") ? "Request timed out (15s)" : message,
    })
  }
}
