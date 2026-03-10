import { NextResponse } from "next/server";

import { executeGatewayIntent, parseIntentBody } from "@/lib/controlplane/intent-route";

export const runtime = "nodejs";

const VALID_DECISIONS = new Set(["allow-once", "allow-always", "deny"]);

export async function POST(request: Request) {
  const bodyOrError = await parseIntentBody(request);
  if (bodyOrError instanceof Response) {
    return bodyOrError as NextResponse;
  }
  const id = typeof bodyOrError.id === "string" ? bodyOrError.id.trim() : "";
  const decision = typeof bodyOrError.decision === "string" ? bodyOrError.decision.trim() : "";
  if (!id || !VALID_DECISIONS.has(decision)) {
    return NextResponse.json({ error: "id and valid decision are required." }, { status: 400 });
  }
  return await executeGatewayIntent("exec.approval.resolve", { id, decision });
}
