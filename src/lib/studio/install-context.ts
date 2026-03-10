import { isLocalGatewayUrl } from "@/lib/gateway/local-gateway";

export type StudioInstallContext = {
  studioHost: {
    hostname: string | null;
    configuredHosts: string[];
    publicHosts: string[];
    loopbackOnly: boolean;
    remoteShell: boolean;
    studioAccessTokenConfigured: boolean;
  };
  localGateway: {
    defaultsDetected: boolean;
    url: string | null;
    hasToken: boolean;
    cliAvailable: boolean;
    statusProbeOk: boolean;
    sessionsProbeOk: boolean;
    probeHealthy: boolean;
    issues: string[];
  };
  studioCli: {
    installed: boolean;
    currentVersion: string | null;
    latestVersion: string | null;
    updateAvailable: boolean;
    checkedAt: string | null;
    checkError: string | null;
  };
  tailscale: {
    installed: boolean;
    loggedIn: boolean;
    dnsName: string | null;
  };
};

export type StudioSetupScenario =
  | "same-computer"
  | "remote-gateway"
  | "same-cloud-host";

export type StudioConnectionWarningTone = "info" | "warn";

export type StudioConnectionWarning = {
  id: string;
  tone: StudioConnectionWarningTone;
  message: string;
};

export const defaultStudioInstallContext = (): StudioInstallContext => ({
  studioHost: {
    hostname: null,
    configuredHosts: [],
    publicHosts: [],
    loopbackOnly: true,
    remoteShell: false,
    studioAccessTokenConfigured: false,
  },
  localGateway: {
    defaultsDetected: false,
    url: null,
    hasToken: false,
    cliAvailable: false,
    statusProbeOk: false,
    sessionsProbeOk: false,
    probeHealthy: false,
    issues: [],
  },
  studioCli: {
    installed: false,
    currentVersion: null,
    latestVersion: null,
    updateAvailable: false,
    checkedAt: null,
    checkError: null,
  },
  tailscale: {
    installed: false,
    loggedIn: false,
    dnsName: null,
  },
});

const isPrivateIpv4 = (hostname: string): boolean => {
  const match = hostname.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (!match) return false;
  const octets = match.slice(1).map((part) => Number(part));
  if (octets.some((value) => !Number.isInteger(value) || value < 0 || value > 255)) {
    return false;
  }
  const [first, second] = octets;
  if (first === 10) return true;
  if (first === 127) return true;
  if (first === 192 && second === 168) return true;
  if (first === 172 && second >= 16 && second <= 31) return true;
  if (first === 100 && second >= 64 && second <= 127) return true;
  if (first === 169 && second === 254) return true;
  return false;
};

const isPrivateIpv6 = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized) return false;
  if (normalized === "::1" || normalized === "[::1]") return true;
  return normalized.startsWith("fc") || normalized.startsWith("fd") || normalized.startsWith("fe80:");
};

const isPrivateHost = (hostname: string): boolean => {
  const normalized = hostname.trim().toLowerCase();
  if (!normalized || normalized === "localhost") return false;
  return isPrivateIpv4(normalized) || isPrivateIpv6(normalized);
};

const isTailscaleHostname = (hostname: string): boolean => {
  return hostname.trim().toLowerCase().endsWith(".ts.net");
};

const normalizeUrl = (value: string): string => value.trim();

const resolveParsedUrl = (gatewayUrl: string): URL | null => {
  const trimmed = normalizeUrl(gatewayUrl);
  if (!trimmed) return null;
  try {
    return new URL(trimmed);
  } catch {
    return null;
  }
};

export const isStudioLikelyRemote = (installContext: StudioInstallContext | null): boolean => {
  if (!installContext) return false;
  return installContext.studioHost.remoteShell || installContext.studioHost.publicHosts.length > 0;
};

export const resolveDefaultSetupScenario = (params: {
  installContext: StudioInstallContext | null;
  gatewayUrl: string;
}): StudioSetupScenario => {
  const trimmedGatewayUrl = normalizeUrl(params.gatewayUrl);
  if (trimmedGatewayUrl && !isLocalGatewayUrl(trimmedGatewayUrl)) {
    return "remote-gateway";
  }
  if (isStudioLikelyRemote(params.installContext)) {
    return "same-cloud-host";
  }
  return "same-computer";
};

export const resolveGatewayConnectionWarnings = (params: {
  gatewayUrl: string;
  installContext: StudioInstallContext | null;
  scenario: StudioSetupScenario;
  hasStoredToken: boolean;
  hasLocalGatewayToken: boolean;
}): StudioConnectionWarning[] => {
  const warnings: StudioConnectionWarning[] = [];
  const trimmedGatewayUrl = normalizeUrl(params.gatewayUrl);
  if (!trimmedGatewayUrl) {
    return warnings;
  }

  const parsed = resolveParsedUrl(trimmedGatewayUrl);
  if (!parsed) {
    warnings.push({
      id: "invalid-url",
      tone: "warn",
      message: "Enter a full gateway URL such as ws://localhost:18789 or wss://your-host.ts.net.",
    });
    return warnings;
  }

  const hostname = parsed.hostname.trim().toLowerCase();
  const localGateway = isLocalGatewayUrl(trimmedGatewayUrl);
  const storedTokenAvailable = params.hasStoredToken || params.hasLocalGatewayToken;

  if (isTailscaleHostname(hostname) && parsed.protocol === "ws:") {
    warnings.push({
      id: "tailscale-ws",
      tone: "warn",
      message: "Use wss:// for .ts.net gateway URLs. Tailscale Serve exposes HTTPS and secure WebSocket upgrades.",
    });
  }

  if (!localGateway && isPrivateHost(hostname)) {
    warnings.push({
      id: "private-ip-advanced",
      tone: "warn",
      message:
        "Direct private-IP WebSocket URLs are an advanced path. For beginners, prefer Tailscale Serve or keep the gateway on loopback and use an SSH tunnel.",
    });
  }

  if (
    params.scenario === "same-cloud-host" &&
    localGateway &&
    isStudioLikelyRemote(params.installContext)
  ) {
    warnings.push({
      id: "remote-localhost",
      tone: "info",
      message:
        "localhost points to the cloud machine running Studio. This is the right upstream when Studio and OpenClaw share that host.",
    });
  }

  if (params.scenario === "same-cloud-host" && !localGateway) {
    warnings.push({
      id: "prefer-localhost-same-host",
      tone: "info",
      message:
        "If Studio and OpenClaw are on the same cloud machine, prefer ws://localhost:18789 for the upstream and solve browser access to Studio separately.",
    });
  }

  if (isTailscaleHostname(hostname) && !storedTokenAvailable) {
    warnings.push({
      id: "tailscale-still-needs-token",
      tone: "info",
      message:
        "Studio still needs a gateway token for upstream connections, even when the OpenClaw Control UI can use Tailscale identity headers.",
    });
  }

  return warnings;
};
