import { NextResponse } from "next/server"

import { isAgentFileName } from "@/lib/agents/agentFiles"
import { executeRuntimeGatewayRead } from "@/lib/controlplane/runtime-read-route"

export const runtime = "nodejs"

type AgentFilePayload = {
  file?: { missing?: boolean; content?: string }
}

export async function GET(
  request: Request,
  context: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await context.params
  const normalizedAgentId = agentId.trim()
  if (!normalizedAgentId) {
    return NextResponse.json({ error: "agentId is required." }, { status: 400 })
  }

  const url = new URL(request.url)
  const name = (url.searchParams.get("name") ?? "").trim()
  if (!name || !isAgentFileName(name)) {
    return NextResponse.json(
      { error: "Invalid or missing file name." },
      { status: 400 }
    )
  }

  return await executeRuntimeGatewayRead<AgentFilePayload>("agents.files.get", {
    agentId: normalizedAgentId,
    name,
  })
}
