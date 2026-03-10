import { NextResponse } from "next/server";

import { ControlPlaneGatewayError } from "@/lib/controlplane/openclaw-adapter";
import { serializeRuntimeInitFailure } from "@/lib/controlplane/runtime-init-errors";
import { bootstrapDomainRuntime } from "@/lib/controlplane/runtime-route-bootstrap";
import type { ControlPlaneRuntime } from "@/lib/controlplane/runtime";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const isConfigConflict = (error: ControlPlaneGatewayError): boolean => {
  const code = error.code.trim().toUpperCase();
  const message = error.message.toLowerCase();
  return (
    code === "INVALID_REQUEST" &&
    (message.includes("basehash") ||
      message.includes("base hash") ||
      message.includes("changed since last load") ||
      message.includes("re-run config.get"))
  );
};

export const ensureDomainIntentRuntime = async (): Promise<
  ControlPlaneRuntime | Response
> => {
  const bootstrap = await bootstrapDomainRuntime();
  if (bootstrap.kind === "mode-disabled") {
    return NextResponse.json({ error: "domain_api_mode_disabled" }, { status: 404 });
  }
  if (bootstrap.kind === "runtime-init-failed") {
    return NextResponse.json(
      serializeRuntimeInitFailure(bootstrap.failure),
      { status: 503 }
    );
  }
  if (bootstrap.kind === "start-failed") {
    return NextResponse.json(
      { error: bootstrap.message, code: "GATEWAY_UNAVAILABLE", reason: "gateway_unavailable" },
      { status: 503 }
    );
  }
  return bootstrap.runtime;
};

export const parseIntentBody = async (request: Request): Promise<Record<string, unknown> | Response> => {
  try {
    const body = (await request.json()) as unknown;
    if (!isRecord(body)) {
      return NextResponse.json({ error: "Invalid intent payload." }, { status: 400 });
    }
    return body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }
};

export const executeGatewayIntent = async <T>(
  method: string,
  params: unknown
): Promise<NextResponse> => {
  const runtimeOrError = await ensureDomainIntentRuntime();
  if (runtimeOrError instanceof Response) {
    return runtimeOrError as NextResponse;
  }
  try {
    const payload = await runtimeOrError.callGateway<T>(method, params);
    return NextResponse.json({ ok: true, payload });
  } catch (err) {
    if (err instanceof ControlPlaneGatewayError) {
      if (err.code.trim().toUpperCase() === "GATEWAY_UNAVAILABLE") {
        return NextResponse.json(
          {
            error: err.message,
            code: "GATEWAY_UNAVAILABLE",
            reason: "gateway_unavailable",
          },
          { status: 503 }
        );
      }
      if (isConfigConflict(err)) {
        return NextResponse.json(
          {
            error: err.message,
            code: err.code,
            conflict: "base_hash_mismatch",
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        {
          error: err.message,
          code: err.code,
          details: err.details,
        },
        { status: 400 }
      );
    }
    const message = err instanceof Error ? err.message : "intent_failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
};
