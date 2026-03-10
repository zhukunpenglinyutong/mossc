import { execFile } from "node:child_process";
import { promisify } from "node:util";

import type { ControlPlaneRuntimeSnapshot } from "@/lib/controlplane/contracts";

const execFileAsync = promisify(execFile);
const CLI_TIMEOUT_MS = 1_500;

type RuntimeProbeCommandResult =
  | { ok: true; value: unknown }
  | { ok: false; error: string };

type RuntimeProbeSnapshot = {
  at: string;
  status: RuntimeProbeCommandResult;
  sessions: RuntimeProbeCommandResult;
};

type RuntimeFreshness = {
  source: "gateway" | "projection" | "probe";
  stale: boolean;
  asOf: string | null;
  reason: "gateway_unavailable" | "probe_only" | "startup" | "controlplane_not_connected" | null;
};

const parseJson = (raw: string): unknown => {
  return JSON.parse(raw);
};

const normalizeTrimmedOutput = (raw: string): string | null => {
  const value = raw.trim();
  return value ? value : null;
};

const resolveProbeError = (error: unknown): string => {
  if (!(error instanceof Error)) return "probe_failed";
  if (error.message.includes("ENOENT")) return "openclaw_cli_not_found";
  if (error.message.includes("timed out")) return "probe_timeout";
  const normalized = error.message.trim();
  return normalized || "probe_failed";
};

const runOpenClawJsonCommand = async (args: string[]): Promise<RuntimeProbeCommandResult> => {
  try {
    const { stdout } = await execFileAsync("openclaw", args, {
      timeout: CLI_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return { ok: true, value: parseJson(stdout) };
  } catch (error) {
    return { ok: false, error: resolveProbeError(error) };
  }
};

const runOpenClawTextCommand = async (args: string[]): Promise<string | null> => {
  try {
    const { stdout } = await execFileAsync("openclaw", args, {
      timeout: CLI_TIMEOUT_MS,
      maxBuffer: 1024 * 1024,
      windowsHide: true,
    });
    return normalizeTrimmedOutput(stdout);
  } catch {
    return null;
  }
};

export const probeOpenClawVersion = async (): Promise<string | null> => {
  return await runOpenClawTextCommand(["--version"]);
};

export const probeOpenClawLocalState = async (): Promise<RuntimeProbeSnapshot> => {
  const [status, sessions] = await Promise.all([
    runOpenClawJsonCommand(["status", "--json"]),
    runOpenClawJsonCommand(["sessions", "--json"]),
  ]);
  return {
    at: new Date().toISOString(),
    status,
    sessions,
  };
};

const resolveFallbackReason = (
  snapshot: Pick<ControlPlaneRuntimeSnapshot, "status" | "reason" | "asOf">
): RuntimeFreshness["reason"] => {
  if (snapshot.reason && snapshot.reason.trim()) return "gateway_unavailable";
  if (snapshot.status === "stopped") return "startup";
  return "controlplane_not_connected";
};

export const deriveRuntimeFreshness = (
  snapshot: Pick<ControlPlaneRuntimeSnapshot, "status" | "reason" | "asOf">,
  probe: RuntimeProbeSnapshot | null = null
): RuntimeFreshness => {
  if (snapshot.status === "connected") {
    return {
      source: "gateway",
      stale: false,
      asOf: snapshot.asOf,
      reason: null,
    };
  }

  const probeHealthy = Boolean(probe?.status.ok || probe?.sessions.ok);
  if (probeHealthy) {
    return {
      source: "probe",
      stale: true,
      asOf: probe?.at ?? snapshot.asOf,
      reason: "probe_only",
    };
  }

  return {
    source: "projection",
    stale: true,
    asOf: snapshot.asOf,
    reason: resolveFallbackReason(snapshot),
  };
};
