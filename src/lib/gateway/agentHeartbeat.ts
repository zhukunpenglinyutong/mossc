import type { GatewayClient } from "@/lib/gateway/GatewayClient";
import {
  isRecord,
  callGateway,
  readConfigAgentList,
  writeConfigAgentList,
  upsertConfigAgentEntry,
  applyGatewayConfigPatch,
  type ConfigAgentEntry,
  type GatewayConfigSnapshot,
} from "@/lib/gateway/agentConfig";

type AgentHeartbeatActiveHours = {
  start: string;
  end: string;
};

type AgentHeartbeat = {
  every: string;
  target: string;
  includeReasoning: boolean;
  ackMaxChars?: number | null;
  activeHours?: AgentHeartbeatActiveHours | null;
};

type AgentHeartbeatResult = {
  heartbeat: AgentHeartbeat;
  hasOverride: boolean;
};

type AgentHeartbeatUpdatePayload = {
  override: boolean;
  heartbeat: AgentHeartbeat;
};

type AgentHeartbeatSummary = {
  id: string;
  agentId: string;
  source: "override" | "default";
  enabled: boolean;
  heartbeat: AgentHeartbeat;
};

type HeartbeatListResult = {
  heartbeats: AgentHeartbeatSummary[];
};

type HeartbeatWakeResult = { ok: true } | { ok: false };

type HeartbeatBlock = Record<string, unknown> | null | undefined;

const DEFAULT_EVERY = "30m";
const DEFAULT_TARGET = "last";
const DEFAULT_ACK_MAX_CHARS = 300;

const coerceString = (value: unknown) => (typeof value === "string" ? value : undefined);
const coerceBoolean = (value: unknown) =>
  typeof value === "boolean" ? value : undefined;
const coerceNumber = (value: unknown) =>
  typeof value === "number" && Number.isFinite(value) ? value : undefined;

const coerceActiveHours = (value: unknown) => {
  if (!isRecord(value)) return undefined;
  const start = coerceString(value.start);
  const end = coerceString(value.end);
  if (!start || !end) return undefined;
  return { start, end };
};

const mergeHeartbeat = (defaults: HeartbeatBlock, override: HeartbeatBlock) => {
  const merged = {
    ...(defaults ?? {}),
    ...(override ?? {}),
  } as Record<string, unknown>;
  if (override && typeof override === "object" && "activeHours" in override) {
    merged.activeHours = (override as Record<string, unknown>).activeHours;
  } else if (defaults && typeof defaults === "object" && "activeHours" in defaults) {
    merged.activeHours = (defaults as Record<string, unknown>).activeHours;
  }
  return merged;
};

const normalizeHeartbeat = (
  defaults: HeartbeatBlock,
  override: HeartbeatBlock
): AgentHeartbeatResult => {
  const resolved = mergeHeartbeat(defaults, override);
  const every = coerceString(resolved.every) ?? DEFAULT_EVERY;
  const target = coerceString(resolved.target) ?? DEFAULT_TARGET;
  const includeReasoning = coerceBoolean(resolved.includeReasoning) ?? false;
  const ackMaxChars = coerceNumber(resolved.ackMaxChars) ?? DEFAULT_ACK_MAX_CHARS;
  const activeHours = coerceActiveHours(resolved.activeHours) ?? null;
  return {
    heartbeat: {
      every,
      target,
      includeReasoning,
      ackMaxChars,
      activeHours,
    },
    hasOverride: Boolean(override && typeof override === "object"),
  };
};

const readHeartbeatDefaults = (config: Record<string, unknown>): HeartbeatBlock => {
  const agents = isRecord(config.agents) ? config.agents : null;
  const defaults = agents && isRecord(agents.defaults) ? agents.defaults : null;
  return (defaults?.heartbeat ?? null) as HeartbeatBlock;
};

const buildHeartbeatOverride = (payload: AgentHeartbeat): Record<string, unknown> => {
  const nextHeartbeat: Record<string, unknown> = {
    every: payload.every,
    target: payload.target,
    includeReasoning: payload.includeReasoning,
  };
  if (payload.ackMaxChars !== undefined && payload.ackMaxChars !== null) {
    nextHeartbeat.ackMaxChars = payload.ackMaxChars;
  }
  if (payload.activeHours) {
    nextHeartbeat.activeHours = {
      start: payload.activeHours.start,
      end: payload.activeHours.end,
    };
  }
  return nextHeartbeat;
};

export const resolveHeartbeatSettings = (
  config: Record<string, unknown>,
  agentId: string
): AgentHeartbeatResult => {
  const list = readConfigAgentList(config);
  const entry = list.find((item) => item.id === agentId) ?? null;
  const defaults = readHeartbeatDefaults(config);
  const override =
    entry && typeof entry === "object"
      ? ((entry as Record<string, unknown>).heartbeat as HeartbeatBlock)
      : null;
  return normalizeHeartbeat(defaults, override);
};

type GatewayStatusHeartbeatAgent = {
  agentId?: string;
  enabled?: boolean;
  every?: string;
  everyMs?: number | null;
};

type GatewayStatusSnapshot = {
  heartbeat?: {
    agents?: GatewayStatusHeartbeatAgent[];
  };
};

const resolveHeartbeatAgentId = (agentId: string) => {
  const trimmed = agentId.trim();
  if (!trimmed) {
    throw new Error("Agent id is required.");
  }
  return trimmed;
};

const resolveStatusHeartbeatAgent = (
  status: GatewayStatusSnapshot,
  agentId: string
): GatewayStatusHeartbeatAgent | null => {
  const list = Array.isArray(status.heartbeat?.agents) ? status.heartbeat?.agents : [];
  for (const entry of list) {
    if (!entry || typeof entry.agentId !== "string") continue;
    if (entry.agentId.trim() !== agentId) continue;
    return entry;
  }
  return null;
};

export const listHeartbeatsForAgent = async (
  client: GatewayClient,
  agentId: string
): Promise<HeartbeatListResult> => {
  const resolvedAgentId = resolveHeartbeatAgentId(agentId);
  const [snapshot, status] = await Promise.all([
    callGateway<GatewayConfigSnapshot>(client, "config.get", {}),
    callGateway<GatewayStatusSnapshot>(client, "status", {}),
  ]);
  const config = isRecord(snapshot.config) ? snapshot.config : {};
  const resolved = resolveHeartbeatSettings(config, resolvedAgentId);
  const statusHeartbeat = resolveStatusHeartbeatAgent(status, resolvedAgentId);
  const enabled = Boolean(statusHeartbeat?.enabled);
  const every = typeof statusHeartbeat?.every === "string" ? statusHeartbeat.every.trim() : "";
  const heartbeat = every ? { ...resolved.heartbeat, every } : resolved.heartbeat;
  if (!enabled && !resolved.hasOverride) {
    return { heartbeats: [] };
  }
  return {
    heartbeats: [
      {
        id: resolvedAgentId,
        agentId: resolvedAgentId,
        source: resolved.hasOverride ? "override" : "default",
        enabled,
        heartbeat,
      },
    ],
  };
};

export const triggerHeartbeatNow = async (
  client: GatewayClient,
  agentId: string
): Promise<HeartbeatWakeResult> => {
  const resolvedAgentId = resolveHeartbeatAgentId(agentId);
  return callGateway<HeartbeatWakeResult>(client, "wake", {
    mode: "now",
    text: `OpenClaw Studio heartbeat trigger (${resolvedAgentId}).`,
  });
};

export const updateGatewayHeartbeat = async (params: {
  client: GatewayClient;
  agentId: string;
  payload: AgentHeartbeatUpdatePayload;
}): Promise<AgentHeartbeatResult> => {
  const snapshot = await callGateway<GatewayConfigSnapshot>(params.client, "config.get", {});
  const baseConfig = isRecord(snapshot.config) ? snapshot.config : {};
  const list = readConfigAgentList(baseConfig);
  const { list: nextList } = upsertConfigAgentEntry(list, params.agentId, (entry) => {
    const next = { ...entry };
    if (params.payload.override) {
      next.heartbeat = buildHeartbeatOverride(params.payload.heartbeat);
    } else if ("heartbeat" in next) {
      delete next.heartbeat;
    }
    return next;
  });
  const nextConfig = writeConfigAgentList(baseConfig, nextList);
  await applyGatewayConfigPatch({
    client: params.client,
    patch: { agents: { list: nextList } },
    baseHash: snapshot.hash ?? undefined,
    exists: snapshot.exists,
  });
  return resolveHeartbeatSettings(nextConfig, params.agentId);
};

export const removeGatewayHeartbeatOverride = async (params: {
  client: GatewayClient;
  agentId: string;
}): Promise<AgentHeartbeatResult> => {
  const snapshot = await callGateway<GatewayConfigSnapshot>(params.client, "config.get", {});
  const baseConfig = isRecord(snapshot.config) ? snapshot.config : {};
  const list = readConfigAgentList(baseConfig);
  const nextList = list.map((entry) => {
    if (entry.id !== params.agentId) return entry;
    if (!("heartbeat" in entry)) return entry;
    const next = { ...entry };
    delete next.heartbeat;
    return next;
  });
  const changed = nextList.some((entry, index) => entry !== list[index]);
  if (!changed) {
    return resolveHeartbeatSettings(baseConfig, params.agentId);
  }
  const nextConfig = writeConfigAgentList(baseConfig, nextList);
  await applyGatewayConfigPatch({
    client: params.client,
    patch: { agents: { list: nextList } },
    baseHash: snapshot.hash ?? undefined,
    exists: snapshot.exists,
  });
  return resolveHeartbeatSettings(nextConfig, params.agentId);
};
