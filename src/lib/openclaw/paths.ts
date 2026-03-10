import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const NEW_STATE_DIRNAME = ".openclaw";

const resolveDefaultHomeDir = (homedir: () => string = os.homedir): string => {
  const home = homedir();
  if (home) {
    try {
      if (fs.existsSync(home)) {
        return home;
      }
    } catch {
      // ignore
    }
  }
  return os.tmpdir();
};

export const resolveUserPath = (
  input: string,
  homedir: () => string = os.homedir
): string => {
  const trimmed = input.trim();
  if (!trimmed) return trimmed;
  if (trimmed.startsWith("~")) {
    const expanded = trimmed.replace(/^~(?=$|[\\/])/, homedir());
    return path.resolve(expanded);
  }
  return path.resolve(trimmed);
};

export const resolveStateDir = (
  env: NodeJS.ProcessEnv = process.env,
  homedir: () => string = os.homedir
): string => {
  const override = env.OPENCLAW_STATE_DIR?.trim();
  if (override) return resolveUserPath(override, homedir);
  const defaultHome = resolveDefaultHomeDir(homedir);
  return path.join(defaultHome, NEW_STATE_DIRNAME);
};
