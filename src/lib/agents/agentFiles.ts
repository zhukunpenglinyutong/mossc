export const AGENT_FILE_NAMES = [
  "AGENTS.md",
  "SOUL.md",
  "IDENTITY.md",
  "USER.md",
  "TOOLS.md",
  "HEARTBEAT.md",
  "MEMORY.md",
] as const;

export type AgentFileName = (typeof AGENT_FILE_NAMES)[number];

export const isAgentFileName = (value: string): value is AgentFileName =>
  AGENT_FILE_NAMES.includes(value as AgentFileName);

export const createAgentFilesState = () =>
  Object.fromEntries(
    AGENT_FILE_NAMES.map((name) => [name, { content: "", exists: false }])
  ) as Record<AgentFileName, { content: string; exists: boolean }>;
