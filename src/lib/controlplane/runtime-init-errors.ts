type RuntimeInitFailureCode =
  | "CONTROLPLANE_RUNTIME_INIT_FAILED"
  | "NATIVE_MODULE_MISMATCH";

type RuntimeInitFailureReason = "runtime_init_failed" | "native_module_mismatch";

type RuntimeInitFailureRemediation = {
  summary: string;
  commands: string[];
};

export type RuntimeInitFailure = {
  code: RuntimeInitFailureCode;
  reason: RuntimeInitFailureReason;
  message: string;
  remediation?: RuntimeInitFailureRemediation;
};

const NATIVE_MISMATCH_COMMANDS = ["npm rebuild better-sqlite3", "npm install"] as const;

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === "object" && !Array.isArray(value));

const resolveErrorMessage = (error: unknown, fallback: string): string => {
  if (error instanceof Error) {
    const message = error.message.trim();
    if (message) return message;
  }
  if (isRecord(error) && typeof error.message === "string") {
    const message = error.message.trim();
    if (message) return message;
  }
  return fallback;
};

const resolveErrorCode = (error: unknown): string => {
  if (!isRecord(error)) return "";
  const code = error.code;
  if (typeof code !== "string") return "";
  return code.trim().toUpperCase();
};

const isNativeAddonAbiMismatch = (error: unknown, message: string): boolean => {
  const code = resolveErrorCode(error);
  const normalized = message.toLowerCase();
  const hasNodeModuleVersionSignal =
    normalized.includes("node_module_version") ||
    normalized.includes("compiled against a different node.js version");
  const hasBetterSqliteSignal =
    normalized.includes("better_sqlite3.node") || normalized.includes("better-sqlite3");
  if (!hasNodeModuleVersionSignal || !hasBetterSqliteSignal) return false;
  return code.length === 0 || code === "ERR_DLOPEN_FAILED";
};

const isMissingBetterSqliteModule = (error: unknown, message: string): boolean => {
  const code = resolveErrorCode(error);
  const normalized = message.toLowerCase();
  if (!normalized.includes("better-sqlite3")) return false;
  if (code === "MODULE_NOT_FOUND") return true;
  return normalized.includes("cannot find module");
};

export const classifyRuntimeInitError = (error: unknown): RuntimeInitFailure => {
  const message = resolveErrorMessage(error, "controlplane_runtime_init_failed");
  if (isNativeAddonAbiMismatch(error, message)) {
    return {
      code: "NATIVE_MODULE_MISMATCH",
      reason: "native_module_mismatch",
      message,
      remediation: {
        summary:
          "Native dependency binary does not match the current Node.js runtime ABI.",
        commands: [...NATIVE_MISMATCH_COMMANDS],
      },
    };
  }
  if (isMissingBetterSqliteModule(error, message)) {
    return {
      code: "CONTROLPLANE_RUNTIME_INIT_FAILED",
      reason: "runtime_init_failed",
      message,
      remediation: {
        summary: "Native dependency module is missing from node_modules.",
        commands: ["npm install", "npm rebuild better-sqlite3"],
      },
    };
  }
  return {
    code: "CONTROLPLANE_RUNTIME_INIT_FAILED",
    reason: "runtime_init_failed",
    message,
  };
};

export const serializeRuntimeInitFailure = (
  failure: RuntimeInitFailure
): {
  error: string;
  code: RuntimeInitFailureCode;
  reason: RuntimeInitFailureReason;
  remediation?: RuntimeInitFailureRemediation;
} => ({
  error: failure.message,
  code: failure.code,
  reason: failure.reason,
  ...(failure.remediation ? { remediation: failure.remediation } : {}),
});
