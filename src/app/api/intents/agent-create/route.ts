import { randomBytes } from "node:crypto";
import path from "node:path";

import { NextResponse } from "next/server";

import { ensureDomainIntentRuntime, parseIntentBody } from "@/lib/controlplane/intent-route";
import { ControlPlaneGatewayError } from "@/lib/controlplane/openclaw-adapter";

export const runtime = "nodejs";

type GatewayConfigSnapshot = {
  path?: string | null;
};

const generateAgentId = (): string => randomBytes(4).toString("hex");

export async function POST(request: Request) {
  const bodyOrError = await parseIntentBody(request);
  if (bodyOrError instanceof Response) {
    return bodyOrError as NextResponse;
  }

  const name = typeof bodyOrError.name === "string" ? bodyOrError.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "name is required." }, { status: 400 });
  }

  const runtimeOrError = await ensureDomainIntentRuntime();
  if (runtimeOrError instanceof Response) {
    return runtimeOrError as NextResponse;
  }

  try {
    const snapshot = await runtimeOrError.callGateway<GatewayConfigSnapshot>("config.get", {});
    const configPath = typeof snapshot.path === "string" ? snapshot.path.trim() : "";
    if (!configPath) {
      throw new Error(
        'Gateway did not return a config path; cannot compute a default workspace for "agents.create".'
      );
    }
    const stateDir = path.dirname(configPath);
    if (!stateDir || stateDir === ".") {
      throw new Error(
        `Gateway config path "${configPath}" is missing a directory; cannot compute workspace.`
      );
    }
    const uniqueSuffix = generateAgentId();
    const gatewayName = `${uniqueSuffix}-${name}`;
    const workspace = path.join(stateDir, `workspace-${uniqueSuffix}`);
    const payload = await runtimeOrError.callGateway("agents.create", {
      name: gatewayName,
      workspace,
    });
    return NextResponse.json({ ok: true, payload, displayName: name });
  } catch (err) {
    if (err instanceof ControlPlaneGatewayError) {
      if (err.code.trim().toUpperCase() === "GATEWAY_UNAVAILABLE") {
        return NextResponse.json(
          { error: err.message, code: "GATEWAY_UNAVAILABLE", reason: "gateway_unavailable" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: err.message, code: err.code, details: err.details },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "intent_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
