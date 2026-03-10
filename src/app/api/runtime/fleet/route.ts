import { NextResponse } from "next/server";

import type { GatewayModelPolicySnapshot } from "@/lib/gateway/models";
import { deriveRuntimeFreshness, probeOpenClawLocalState } from "@/lib/controlplane/degraded-read";
import type { ControlPlaneOutboxEntry, ControlPlaneRuntimeSnapshot } from "@/lib/controlplane/contracts";
import { serializeRuntimeInitFailure } from "@/lib/controlplane/runtime-init-errors";
import { ControlPlaneGatewayError } from "@/lib/controlplane/openclaw-adapter";
import { bootstrapDomainRuntime } from "@/lib/controlplane/runtime-route-bootstrap";
import { loadStudioSettings } from "@/lib/studio/settings-store";
import { buildAgentMainSessionKey } from "@/lib/gateway/session-keys";

export const runtime = "nodejs";

const DEGRADED_FLEET_OUTBOX_SCAN_LIMIT = 5000;
const AGENT_SESSION_KEY_RE = /^agent:([^:]+):/i;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const normalizeAgentId = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim().toLowerCase();
};

const normalizeAgentName = (value: unknown): string => {
  if (typeof value !== "string") return "";
  return value.trim();
};

const parseAgentIdFromSessionKey = (value: unknown): string => {
  if (typeof value !== "string") return "";
  const match = value.trim().match(AGENT_SESSION_KEY_RE);
  return match?.[1]?.trim().toLowerCase() ?? "";
};

const resolveAgentIdentityFromOutboxEntry = (
  entry: ControlPlaneOutboxEntry
): { agentId: string; name: string } | null => {
  if (entry.event.type !== "gateway.event") return null;
  if (!isRecord(entry.event.payload)) return null;
  const payload = entry.event.payload;

  const directAgentId = normalizeAgentId(payload.agentId);
  const sessionAgentId =
    parseAgentIdFromSessionKey(payload.sessionKey) ||
    parseAgentIdFromSessionKey(payload.key) ||
    parseAgentIdFromSessionKey(payload.runSessionKey);
  const agentId = directAgentId || sessionAgentId;
  if (!agentId) return null;

  const name =
    normalizeAgentName(payload.agentName) || normalizeAgentName(payload.name) || agentId;
  return { agentId, name };
};

const deriveDegradedFleetResult = (
  entries: ControlPlaneOutboxEntry[],
  cachedConfigSnapshot: GatewayModelPolicySnapshot | null
) => {
  const recoveredNewest: Array<{ agentId: string; name: string; sessionKey: string }> = [];
  const recoveredByAgentId = new Map<
    string,
    { agentId: string; name: string; sessionKey: string }
  >();

  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const identity = resolveAgentIdentityFromOutboxEntry(entries[index]);
    if (!identity) continue;

    const existing = recoveredByAgentId.get(identity.agentId);
    if (existing) {
      if (existing.name === existing.agentId && identity.name !== identity.agentId) {
        existing.name = identity.name;
      }
      continue;
    }

    const seed = {
      agentId: identity.agentId,
      name: identity.name,
      sessionKey: `agent:${identity.agentId}:main`,
    };
    recoveredByAgentId.set(identity.agentId, seed);
    recoveredNewest.push(seed);
  }

  const seeds = [...recoveredNewest].reverse();
  const sessionCreatedAgentIds = seeds.map((seed) => seed.agentId);

  return {
    seeds,
    sessionCreatedAgentIds,
    sessionSettingsSyncedAgentIds: [] as string[],
    summaryPatches: [] as Array<{ agentId: string; patch: Record<string, unknown> }>,
    suggestedSelectedAgentId: sessionCreatedAgentIds[0] ?? null,
    configSnapshot: cachedConfigSnapshot,
  };
};

const resolveGatewayErrorCode = (error: unknown): string => {
  if (error instanceof ControlPlaneGatewayError) {
    return error.code.trim().toUpperCase();
  }
  if (isRecord(error) && typeof error.code === "string") {
    return error.code.trim().toUpperCase();
  }
  return "";
};

const resolveErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

const isMissingScopeGatewayError = (error: unknown): boolean => {
  const code = resolveGatewayErrorCode(error);
  if (code !== "INVALID_REQUEST") return false;
  return resolveErrorMessage(error).toLowerCase().includes("missing scope");
};

const isGatewayUnavailableError = (error: unknown): boolean =>
  resolveGatewayErrorCode(error) === "GATEWAY_UNAVAILABLE";

const buildDegradedFleetResponse = async (params: {
  controlPlane: {
    snapshot: () => ControlPlaneRuntimeSnapshot;
    eventsAfter: (lastSeenId: number, limit?: number) => ControlPlaneOutboxEntry[];
  };
  cachedConfigSnapshot: GatewayModelPolicySnapshot | null;
  error: string;
  code: string;
  reason: string;
}) => {
  const snapshot = params.controlPlane.snapshot();
  const floorOutboxId = Math.max(0, snapshot.outboxHead - DEGRADED_FLEET_OUTBOX_SCAN_LIMIT);
  const entries = params.controlPlane.eventsAfter(floorOutboxId, DEGRADED_FLEET_OUTBOX_SCAN_LIMIT);
  const probe = await probeOpenClawLocalState();
  return NextResponse.json({
    enabled: true,
    degraded: true,
    error: params.error,
    code: params.code,
    reason: params.reason,
    freshness: deriveRuntimeFreshness(snapshot, probe),
    probe,
    result: deriveDegradedFleetResult(entries, params.cachedConfigSnapshot),
  });
};

type AgentsListResult = {
  defaultId: string;
  mainKey: string;
  scope?: string;
  agents: Array<{
    id: string;
    name?: string;
    identity?: {
      name?: string;
      theme?: string;
      emoji?: string;
      avatar?: string;
      avatarUrl?: string;
    };
  }>;
};

type SessionsListEntry = {
  key: string;
  updatedAt?: number | null;
  displayName?: string;
};

type SessionsListResult = {
  sessions?: SessionsListEntry[];
};

const hydrateFleetDirectly = async (
  controlPlane: { callGateway: (method: string, params: unknown) => Promise<unknown> },
  cachedConfigSnapshot: GatewayModelPolicySnapshot | null
) => {
  let configSnapshot = cachedConfigSnapshot;
  if (!configSnapshot) {
    try {
      configSnapshot = (await controlPlane.callGateway("config.get", {})) as GatewayModelPolicySnapshot;
    } catch {
      // config not critical
    }
  }

  const agentsResult = (await controlPlane.callGateway("agents.list", {})) as AgentsListResult;
  const mainKey = agentsResult.mainKey?.trim() || "main";

  const seeds = agentsResult.agents.map((agent) => ({
    agentId: agent.id,
    name: agent.identity?.name || agent.name || agent.id,
    sessionKey: buildAgentMainSessionKey(agent.id, mainKey),
  }));

  const sessionCreatedAgentIds = seeds.map((s) => s.agentId);

  return {
    seeds,
    sessionCreatedAgentIds,
    sessionSettingsSyncedAgentIds: [] as string[],
    summaryPatches: [] as Array<{ agentId: string; patch: Record<string, unknown> }>,
    suggestedSelectedAgentId: sessionCreatedAgentIds[0] ?? null,
    configSnapshot,
  };
};

export async function POST(request: Request) {
  const bootstrap = await bootstrapDomainRuntime();
  if (bootstrap.kind === "mode-disabled") {
    return NextResponse.json({ enabled: false, error: "domain_api_mode_disabled" }, { status: 404 });
  }

  let cachedConfigSnapshot: GatewayModelPolicySnapshot | null = null;
  try {
    const body = (await request.json()) as unknown;
    if (body && typeof body === "object" && !Array.isArray(body)) {
      const record = body as { cachedConfigSnapshot?: unknown };
      if (record.cachedConfigSnapshot && typeof record.cachedConfigSnapshot === "object") {
        cachedConfigSnapshot = record.cachedConfigSnapshot as GatewayModelPolicySnapshot;
      }
    }
  } catch {}

  if (bootstrap.kind === "runtime-init-failed") {
    return NextResponse.json(
      {
        enabled: true,
        ...serializeRuntimeInitFailure(bootstrap.failure),
      },
      { status: 503 }
    );
  }
  const controlPlane = bootstrap.runtime;

  if (bootstrap.kind === "start-failed") {
    return await buildDegradedFleetResponse({
      controlPlane,
      cachedConfigSnapshot,
      error: bootstrap.message,
      code: "GATEWAY_UNAVAILABLE",
      reason: "gateway_unavailable",
    });
  }

  try {
    const settings = loadStudioSettings();
    const gatewayUrl = settings.gateway?.url?.trim() ?? "";
    if (!gatewayUrl) {
      return NextResponse.json({ enabled: true, error: "gateway_url_not_configured" }, { status: 503 });
    }
    const result = await hydrateFleetDirectly(controlPlane, cachedConfigSnapshot);
    return NextResponse.json({ enabled: true, result });
  } catch (err) {
    if (isMissingScopeGatewayError(err)) {
      return await buildDegradedFleetResponse({
        controlPlane,
        cachedConfigSnapshot,
        error: resolveErrorMessage(err),
        code: "INSUFFICIENT_SCOPE",
        reason: "insufficient_scope",
      });
    }
    if (isGatewayUnavailableError(err)) {
      return await buildDegradedFleetResponse({
        controlPlane,
        cachedConfigSnapshot,
        error: resolveErrorMessage(err),
        code: "GATEWAY_UNAVAILABLE",
        reason: "gateway_unavailable",
      });
    }
    const message = err instanceof Error ? err.message : "fleet_load_failed";
    return NextResponse.json({ enabled: true, error: message }, { status: 500 });
  }
}
