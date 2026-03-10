import type { ControlPlaneRuntime } from "@/lib/controlplane/runtime";
import { ControlPlaneGatewayError } from "@/lib/controlplane/openclaw-adapter";

type GatewayExecApprovalSecurity = "deny" | "allowlist" | "full";
type GatewayExecApprovalAsk = "off" | "on-miss" | "always";
export type ExecutionRoleId = "conservative" | "collaborative" | "autonomous";

type ExecAllowlistEntry = {
  pattern: string;
};

type ExecApprovalsAgent = {
  security?: GatewayExecApprovalSecurity;
  ask?: GatewayExecApprovalAsk;
  askFallback?: string;
  autoAllowSkills?: boolean;
  allowlist?: ExecAllowlistEntry[];
};

type ExecApprovalsFile = {
  version: 1;
  socket?: {
    path?: string;
    token?: string;
  };
  defaults?: {
    security?: string;
    ask?: string;
    askFallback?: string;
    autoAllowSkills?: boolean;
  };
  agents?: Record<string, ExecApprovalsAgent>;
};

type ExecApprovalsSnapshot = {
  path: string;
  exists: boolean;
  hash: string;
  file?: ExecApprovalsFile;
};

const normalizeAllowlist = (patterns: Array<{ pattern: string }>): Array<{ pattern: string }> => {
  const next = patterns
    .map((entry) => entry.pattern.trim())
    .filter((pattern) => pattern.length > 0);
  return Array.from(new Set(next)).map((pattern) => ({ pattern }));
};

const resolvePolicyForRole = (params: {
  role: ExecutionRoleId;
  allowlist: Array<{ pattern: string }>;
}):
  | {
      security: "full" | "allowlist";
      ask: "off" | "always";
      allowlist: Array<{ pattern: string }>;
    }
  | null => {
  if (params.role === "conservative") return null;
  if (params.role === "autonomous") {
    return { security: "full", ask: "off", allowlist: params.allowlist };
  }
  return { security: "allowlist", ask: "always", allowlist: params.allowlist };
};

const isRetryableSetError = (err: unknown): boolean => {
  if (!(err instanceof ControlPlaneGatewayError)) return false;
  const message = err.message.toLowerCase();
  if (err.code.trim().toUpperCase() !== "INVALID_REQUEST") return false;
  if (!message.includes("exec approvals")) return false;
  return (
    message.includes("re-run exec.approvals.get") ||
    message.includes("reload and retry") ||
    message.includes("base hash unavailable") ||
    message.includes("base hash required") ||
    message.includes("changed since last load") ||
    message.includes("exec approvals changed")
  );
};

const buildNextExecApprovalsFile = (
  snapshotFile: ExecApprovalsFile | undefined,
  agentId: string,
  role: ExecutionRoleId
): ExecApprovalsFile => {
  const baseFile: ExecApprovalsFile =
    snapshotFile && typeof snapshotFile === "object"
      ? {
          version: 1,
          socket: snapshotFile.socket,
          defaults: snapshotFile.defaults,
          agents: { ...(snapshotFile.agents ?? {}) },
        }
      : { version: 1, agents: {} };

  const existingAllowlist = Array.isArray(baseFile.agents?.[agentId]?.allowlist)
    ? baseFile.agents?.[agentId]?.allowlist?.filter(
        (entry): entry is ExecAllowlistEntry =>
          Boolean(entry && typeof entry.pattern === "string" && entry.pattern.trim().length > 0)
      ) ?? []
    : [];
  const policy = resolvePolicyForRole({
    role,
    allowlist: existingAllowlist.map((entry) => ({ pattern: entry.pattern })),
  });

  const nextAgents = { ...(baseFile.agents ?? {}) };
  if (!policy) {
    delete nextAgents[agentId];
  } else {
    const existing = nextAgents[agentId] ?? {};
    nextAgents[agentId] = {
      ...existing,
      security: policy.security,
      ask: policy.ask,
      allowlist: normalizeAllowlist(policy.allowlist),
    };
  }

  return {
    ...baseFile,
    version: 1,
    agents: nextAgents,
  };
};

export const upsertAgentExecApprovalsPolicyViaRuntime = async (params: {
  runtime: ControlPlaneRuntime;
  agentId: string;
  role: ExecutionRoleId;
}): Promise<void> => {
  const agentId = params.agentId.trim();
  if (!agentId) {
    throw new Error("Agent id is required.");
  }

  const snapshot = await params.runtime.callGateway<ExecApprovalsSnapshot>("exec.approvals.get", {});
  const nextFile = buildNextExecApprovalsFile(snapshot.file, agentId, params.role);

  const MAX_RETRIES = 3;
  let lastSnapshot = snapshot;
  let lastNextFile = nextFile;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const payload = { file: lastNextFile, ...(lastSnapshot.exists ? { baseHash: lastSnapshot.hash } : {}) };
    try {
      await params.runtime.callGateway("exec.approvals.set", payload);
      return;
    } catch (err) {
      if (!isRetryableSetError(err) || attempt === MAX_RETRIES) throw err;
      // Exponential backoff: 50ms, 100ms, 200ms
      await new Promise((resolve) => setTimeout(resolve, 50 * Math.pow(2, attempt)));
      lastSnapshot = await params.runtime.callGateway<ExecApprovalsSnapshot>("exec.approvals.get", {});
      lastNextFile = buildNextExecApprovalsFile(lastSnapshot.file, agentId, params.role);
    }
  }
};
