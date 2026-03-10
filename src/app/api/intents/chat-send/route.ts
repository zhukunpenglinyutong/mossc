import { NextResponse } from "next/server";

import {
  ensureDomainIntentRuntime,
  executeGatewayIntent,
  parseIntentBody,
} from "@/lib/controlplane/intent-route";
import {
  resolveVisionFallbackModelRef,
  type GatewayConfigSnapshot,
} from "@/lib/gateway/vision-model";

export const runtime = "nodejs";

type GatewayConfigGetResult = {
  config?: GatewayConfigSnapshot["config"]
}

export async function POST(request: Request) {
  const bodyOrError = await parseIntentBody(request);
  if (bodyOrError instanceof Response) {
    return bodyOrError as NextResponse;
  }

  const sessionKey = typeof bodyOrError.sessionKey === "string" ? bodyOrError.sessionKey.trim() : "";
  const agentId = typeof bodyOrError.agentId === "string" ? bodyOrError.agentId.trim() : "";
  const message = typeof bodyOrError.message === "string" ? bodyOrError.message : "";
  const idempotencyKey =
    typeof bodyOrError.idempotencyKey === "string" ? bodyOrError.idempotencyKey.trim() : "";
  const deliver = Boolean(bodyOrError.deliver);
  const attachments = Array.isArray(bodyOrError.attachments) ? bodyOrError.attachments : undefined;

  const hasContent = message.trim().length > 0 || (attachments && attachments.length > 0);
  if (!sessionKey || !hasContent || !idempotencyKey) {
    return NextResponse.json(
      { error: "sessionKey, message (or attachments), and idempotencyKey are required." },
      { status: 400 }
    );
  }

  const intentPayload: Record<string, unknown> = {
    sessionKey,
    message,
    idempotencyKey,
    deliver,
  };
  if (attachments) {
    intentPayload.attachments = attachments;
  }

  if (attachments && attachments.length > 0) {
    const runtimeOrError = await ensureDomainIntentRuntime()
    if (runtimeOrError instanceof Response) {
      return runtimeOrError as NextResponse
    }

    try {
      const configSnapshot = await runtimeOrError.callGateway<GatewayConfigGetResult>("config.get", {})
      const visionFallbackModelRef = resolveVisionFallbackModelRef(configSnapshot, agentId || undefined)
      if (visionFallbackModelRef) {
        await runtimeOrError.callGateway("sessions.patch", {
          key: sessionKey,
          model: visionFallbackModelRef,
        })
      } else {
        // current preferred model already supports images or no fallback needed
      }
    } catch {
      // vision model fallback is best-effort; proceed with the original model
    }
  }

  // Validate attachment shape before forwarding
  if (attachments) {
    const valid = attachments.every((att: unknown) => {
      if (!att || typeof att !== "object") return false;
      const rec = att as Record<string, unknown>;
      return typeof rec.type === "string" && typeof rec.mimeType === "string" && typeof rec.content === "string";
    });
    if (!valid) {
      return NextResponse.json(
        { error: "Each attachment must have type, mimeType, and content fields." },
        { status: 400 }
      );
    }
  }

  return await executeGatewayIntent("chat.send", intentPayload);
}
