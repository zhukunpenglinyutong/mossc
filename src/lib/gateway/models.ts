export type GatewayModelChoice = {
  id: string;
  name: string;
  provider: string;
  contextWindow?: number;
  reasoning?: boolean;
};

type GatewayModelAliasEntry = {
  alias?: string;
};

type GatewayModelDefaults = {
  model?: string | { primary?: string; fallbacks?: string[] };
  models?: Record<string, GatewayModelAliasEntry>;
};

export type GatewayModelPolicySnapshot = {
  config?: {
    agents?: {
      defaults?: GatewayModelDefaults;
      list?: Array<{
        id?: string;
        model?: string | { primary?: string; fallbacks?: string[] };
      }>;
    };
  };
};

export const resolveConfiguredModelKey = (
  raw: string,
  models?: Record<string, GatewayModelAliasEntry>
) => {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (trimmed.includes("/")) return trimmed;
  if (models) {
    const target = Object.entries(models).find(
      ([, entry]) => entry?.alias?.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (target?.[0]) return target[0];
  }
  return `anthropic/${trimmed}`;
};

export const buildAllowedModelKeys = (snapshot: GatewayModelPolicySnapshot | null) => {
  const allowedList: string[] = [];
  const allowedSet = new Set<string>();
  const defaults = snapshot?.config?.agents?.defaults;
  const modelDefaults = defaults?.model;
  const modelAliases = defaults?.models;
  const pushKey = (raw?: string | null) => {
    if (!raw) return;
    const resolved = resolveConfiguredModelKey(raw, modelAliases);
    if (!resolved) return;
    if (allowedSet.has(resolved)) return;
    allowedSet.add(resolved);
    allowedList.push(resolved);
  };
  if (typeof modelDefaults === "string") {
    pushKey(modelDefaults);
  } else if (modelDefaults && typeof modelDefaults === "object") {
    pushKey(modelDefaults.primary ?? null);
    for (const fallback of modelDefaults.fallbacks ?? []) {
      pushKey(fallback);
    }
  }
  if (modelAliases) {
    for (const key of Object.keys(modelAliases)) {
      pushKey(key);
    }
  }
  return allowedList;
};

export const buildGatewayModelChoices = (
  catalog: GatewayModelChoice[],
  snapshot: GatewayModelPolicySnapshot | null
) => {
  const allowedKeys = buildAllowedModelKeys(snapshot);
  if (allowedKeys.length === 0) return catalog;
  const filtered = catalog.filter((entry) => allowedKeys.includes(`${entry.provider}/${entry.id}`));
  const filteredKeys = new Set(filtered.map((entry) => `${entry.provider}/${entry.id}`));
  const extras: GatewayModelChoice[] = [];
  for (const key of allowedKeys) {
    if (filteredKeys.has(key)) continue;
    const [provider, id] = key.split("/");
    if (!provider || !id) continue;
    extras.push({ provider, id, name: key });
  }
  return [...filtered, ...extras];
};
