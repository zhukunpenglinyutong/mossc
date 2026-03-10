import { GatewayResponseError, type GatewayClient } from "@/lib/gateway/GatewayClient";

export type GatewayConfigSnapshot = {
  config?: Record<string, unknown>;
  hash?: string;
  exists?: boolean;
  path?: string | null;
};

export const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

export const callGateway = async <T>(
  client: GatewayClient,
  method: string,
  params: unknown
): Promise<T> => {
  const invoke = (
    client as unknown as { call?: (nextMethod: string, nextParams: unknown) => Promise<unknown> }
  ).call;
  if (typeof invoke !== "function") {
    throw new Error("Legacy gateway client call transport is unavailable.");
  }
  return (await invoke(method, params)) as T;
};

export type ConfigAgentEntry = Record<string, unknown> & { id: string };

type GatewayAgentSandboxOverrides = {
  mode?: "off" | "non-main" | "all";
  workspaceAccess?: "none" | "ro" | "rw";
};

type GatewayAgentToolsOverrides = {
  profile?: "minimal" | "coding" | "messaging" | "full";
  allow?: string[];
  alsoAllow?: string[];
  deny?: string[];
  sandbox?: {
    tools?: {
      allow?: string[];
      deny?: string[];
    };
  };
};

type GatewayAgentOverrides = {
  sandbox?: GatewayAgentSandboxOverrides;
  tools?: GatewayAgentToolsOverrides;
};

const DEFAULT_AGENT_ID = "main";

export const readConfigAgentList = (
  config: Record<string, unknown> | undefined
): ConfigAgentEntry[] => {
  if (!config) return [];
  const agents = isRecord(config.agents) ? config.agents : null;
  const list = Array.isArray(agents?.list) ? agents.list : [];
  return list.filter((entry): entry is ConfigAgentEntry => {
    if (!isRecord(entry)) return false;
    if (typeof entry.id !== "string") return false;
    return entry.id.trim().length > 0;
  });
};

export const resolveDefaultConfigAgentId = (
  config: Record<string, unknown> | undefined
): string => {
  const list = readConfigAgentList(config);
  if (list.length === 0) {
    return DEFAULT_AGENT_ID;
  }
  const defaults = list.filter((entry) => entry.default === true);
  const selected = defaults[0] ?? list[0];
  const resolved = selected.id.trim();
  return resolved || DEFAULT_AGENT_ID;
};

export const writeConfigAgentList = (
  config: Record<string, unknown>,
  list: ConfigAgentEntry[]
): Record<string, unknown> => {
  const agents = isRecord(config.agents) ? { ...config.agents } : {};
  return { ...config, agents: { ...agents, list } };
};

export const upsertConfigAgentEntry = (
  list: ConfigAgentEntry[],
  agentId: string,
  updater: (entry: ConfigAgentEntry) => ConfigAgentEntry
): { list: ConfigAgentEntry[]; entry: ConfigAgentEntry } => {
  let updatedEntry: ConfigAgentEntry | null = null;
  const nextList = list.map((entry) => {
    if (entry.id !== agentId) return entry;
    const next = updater({ ...entry, id: agentId });
    updatedEntry = next;
    return next;
  });
  if (!updatedEntry) {
    updatedEntry = updater({ id: agentId });
    nextList.push(updatedEntry);
  }
  return { list: nextList, entry: updatedEntry };
};

export const slugifyAgentName = (name: string): string => {
  const slug = name
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) {
    throw new Error("Name produced an empty folder name.");
  }
  return slug;
};

export const shouldRetryConfigWrite = (err: unknown) => {
  if (!(err instanceof GatewayResponseError)) return false;
  return /re-run config\.get|config changed since last load/i.test(err.message);
};

export const applyGatewayConfigPatch = async (params: {
  client: GatewayClient;
  patch: Record<string, unknown>;
  baseHash?: string | null;
  exists?: boolean;
  attempt?: number;
}): Promise<void> => {
  const attempt = params.attempt ?? 0;
  const requiresBaseHash = params.exists !== false;
  const baseHash = requiresBaseHash ? params.baseHash?.trim() : undefined;
  if (requiresBaseHash && !baseHash) {
    throw new Error("Gateway config hash unavailable; re-run config.get.");
  }
  const payload: Record<string, unknown> = {
    raw: JSON.stringify(params.patch, null, 2),
  };
  if (baseHash) payload.baseHash = baseHash;
  try {
    await callGateway(params.client, "config.patch", payload);
  } catch (err) {
    if (attempt < 1 && shouldRetryConfigWrite(err)) {
      const snapshot = await callGateway<GatewayConfigSnapshot>(params.client, "config.get", {});
      return applyGatewayConfigPatch({
        ...params,
        baseHash: snapshot.hash ?? undefined,
        exists: snapshot.exists,
        attempt: attempt + 1,
      });
    }
    throw err;
  }
};

export const renameGatewayAgent = async (params: {
  client: GatewayClient;
  agentId: string;
  name: string;
}) => {
  const trimmed = params.name.trim();
  if (!trimmed) {
    throw new Error("Agent name is required.");
  }
  await callGateway(params.client, "agents.update", {
    agentId: params.agentId,
    name: trimmed,
  });
  return { id: params.agentId, name: trimmed };
};

const dirnameLike = (value: string): string => {
  const lastSlash = value.lastIndexOf("/");
  const lastBackslash = value.lastIndexOf("\\");
  const idx = Math.max(lastSlash, lastBackslash);
  if (idx < 0) return "";
  return value.slice(0, idx);
};

const joinPathLike = (dir: string, leaf: string): string => {
  const sep = dir.includes("\\") ? "\\" : "/";
  const trimmedDir = dir.endsWith("/") || dir.endsWith("\\") ? dir.slice(0, -1) : dir;
  return `${trimmedDir}${sep}${leaf}`;
};

const generateAgentId = (): string => {
  const chars = "abcdefghijklmnopqrstuvwxyz0123456789";
  let id = chars[Math.floor(Math.random() * 26)];
  for (let i = 1; i < 8; i++) {
    id += chars[Math.floor(Math.random() * chars.length)];
  }
  return id;
};

export const createGatewayAgent = async (params: {
  client: GatewayClient;
  name: string;
}): Promise<ConfigAgentEntry> => {
  const trimmed = params.name.trim();
  if (!trimmed) {
    throw new Error("Agent name is required.");
  }

  const snapshot = await callGateway<GatewayConfigSnapshot>(params.client, "config.get", {});
  const configPath = typeof snapshot.path === "string" ? snapshot.path.trim() : "";
  if (!configPath) {
    throw new Error(
      'Gateway did not return a config path; cannot compute a default workspace for "agents.create".',
    );
  }
  const stateDir = dirnameLike(configPath);
  if (!stateDir) {
    throw new Error(
      `Gateway config path "${configPath}" is missing a directory; cannot compute workspace.`,
    );
  }
  const uniqueSuffix = generateAgentId();
  const gatewayName = `${uniqueSuffix}-${trimmed}`;
  const workspace = joinPathLike(stateDir, `workspace-${uniqueSuffix}`);

  const result = await callGateway<{ ok?: boolean; agentId?: string; name?: string; workspace?: string }>(
    params.client,
    "agents.create",
    {
      name: gatewayName,
      workspace,
    }
  );
  const agentId = typeof result?.agentId === "string" ? result.agentId.trim() : "";
  if (!agentId) {
    throw new Error("Gateway returned an invalid agents.create response (missing agentId).");
  }
  return { id: agentId, name: trimmed };
};

export const deleteGatewayAgent = async (params: {
  client: GatewayClient;
  agentId: string;
}) => {
  try {
    const result = await callGateway<{ ok?: boolean; removedBindings?: unknown }>(params.client, "agents.delete", {
      agentId: params.agentId,
    });
    const removedBindings =
      typeof result?.removedBindings === "number" && Number.isFinite(result.removedBindings)
        ? Math.max(0, Math.floor(result.removedBindings))
        : 0;
    return { removed: true, removedBindings };
  } catch (err) {
    if (err instanceof GatewayResponseError && /not found/i.test(err.message)) {
      return { removed: false, removedBindings: 0 };
    }
    throw err;
  }
};

const normalizeToolList = (values: string[] | undefined): string[] | undefined => {
  if (!values) return undefined;
  const next = values
    .map((value) => value.trim())
    .filter((value) => value.length > 0);
  return Array.from(new Set(next));
};

export const updateGatewayAgentOverrides = async (params: {
  client: GatewayClient;
  agentId: string;
  overrides: GatewayAgentOverrides;
}): Promise<void> => {
  const agentId = params.agentId.trim();
  if (!agentId) {
    throw new Error("Agent id is required.");
  }
  if (params.overrides.tools?.allow !== undefined && params.overrides.tools?.alsoAllow !== undefined) {
    throw new Error("Agent tools overrides cannot set both allow and alsoAllow.");
  }
  const hasSandboxOverrides =
    Boolean(params.overrides.sandbox?.mode) || Boolean(params.overrides.sandbox?.workspaceAccess);
  const hasToolsOverrides =
    Boolean(params.overrides.tools?.profile) ||
    params.overrides.tools?.allow !== undefined ||
    params.overrides.tools?.alsoAllow !== undefined ||
    params.overrides.tools?.deny !== undefined ||
    params.overrides.tools?.sandbox?.tools?.allow !== undefined ||
    params.overrides.tools?.sandbox?.tools?.deny !== undefined;
  if (!hasSandboxOverrides && !hasToolsOverrides) {
    return;
  }

  const buildNextConfig = (baseConfig: Record<string, unknown>): Record<string, unknown> => {
    const list = readConfigAgentList(baseConfig);
    const { list: nextList } = upsertConfigAgentEntry(list, agentId, (entry) => {
      const next: ConfigAgentEntry = { ...entry, id: agentId };

      if (hasSandboxOverrides) {
        const currentSandbox = isRecord(next.sandbox) ? { ...next.sandbox } : {};
        if (params.overrides.sandbox?.mode) {
          currentSandbox.mode = params.overrides.sandbox.mode;
        }
        if (params.overrides.sandbox?.workspaceAccess) {
          currentSandbox.workspaceAccess = params.overrides.sandbox.workspaceAccess;
        }
        next.sandbox = currentSandbox;
      }

      if (hasToolsOverrides) {
        const currentTools = isRecord(next.tools) ? { ...next.tools } : {};
        if (params.overrides.tools?.profile) {
          currentTools.profile = params.overrides.tools.profile;
        }
        const allow = normalizeToolList(params.overrides.tools?.allow);
        if (allow !== undefined) {
          currentTools.allow = allow;
          delete currentTools.alsoAllow;
        }
        const alsoAllow = normalizeToolList(params.overrides.tools?.alsoAllow);
        if (alsoAllow !== undefined) {
          currentTools.alsoAllow = alsoAllow;
          delete currentTools.allow;
        }
        const deny = normalizeToolList(params.overrides.tools?.deny);
        if (deny !== undefined) {
          currentTools.deny = deny;
        }

        const sandboxAllow = normalizeToolList(params.overrides.tools?.sandbox?.tools?.allow);
        const sandboxDeny = normalizeToolList(params.overrides.tools?.sandbox?.tools?.deny);
        if (sandboxAllow !== undefined || sandboxDeny !== undefined) {
          const sandboxRaw = (currentTools as Record<string, unknown>).sandbox;
          const sandbox = isRecord(sandboxRaw) ? { ...sandboxRaw } : {};
          const sandboxToolsRaw = (sandbox as Record<string, unknown>).tools;
          const sandboxTools = isRecord(sandboxToolsRaw) ? { ...sandboxToolsRaw } : {};
          if (sandboxAllow !== undefined) {
            (sandboxTools as Record<string, unknown>).allow = sandboxAllow;
          }
          if (sandboxDeny !== undefined) {
            (sandboxTools as Record<string, unknown>).deny = sandboxDeny;
          }
          (sandbox as Record<string, unknown>).tools = sandboxTools;
          (currentTools as Record<string, unknown>).sandbox = sandbox;
        }
        next.tools = currentTools;
      }

      return next;
    });
    return writeConfigAgentList(baseConfig, nextList);
  };

  const attemptWrite = async (attempt: number): Promise<void> => {
    const snapshot = await callGateway<GatewayConfigSnapshot>(params.client, "config.get", {});
    const baseConfig = isRecord(snapshot.config) ? snapshot.config : {};
    const nextConfig = buildNextConfig(baseConfig);
    const payload: Record<string, unknown> = {
      raw: JSON.stringify(nextConfig, null, 2),
    };
    const requiresBaseHash = snapshot.exists !== false;
    const baseHash = requiresBaseHash ? snapshot.hash?.trim() : undefined;
    if (requiresBaseHash && !baseHash) {
      throw new Error("Gateway config hash unavailable; re-run config.get.");
    }
    if (baseHash) payload.baseHash = baseHash;
    try {
      await callGateway(params.client, "config.set", payload);
    } catch (err) {
      if (attempt < 1 && shouldRetryConfigWrite(err)) {
        return attemptWrite(attempt + 1);
      }
      throw err;
    }
  };

  await attemptWrite(0);
};
