type GatewayStateVersion = {
  presence: number;
  health: number;
};

type ReqFrame = {
  type: "req";
  id: string;
  method: string;
  params: unknown;
};

type ResFrame = {
  type: "res";
  id: string;
  ok: boolean;
  payload?: unknown;
  error?: {
    code: string;
    message: string;
    details?: unknown;
    retryable?: boolean;
    retryAfterMs?: number;
  };
};

export type EventFrame = {
  type: "event";
  event: string;
  payload?: unknown;
  seq?: number;
  stateVersion?: GatewayStateVersion;
};

type GatewayFrame = ReqFrame | ResFrame | EventFrame;

const VALID_FRAME_TYPES = new Set(["req", "res", "event"]);

export const parseGatewayFrame = (raw: string): GatewayFrame | null => {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const frame = parsed as Record<string, unknown>;
    if (typeof frame.type !== "string" || !VALID_FRAME_TYPES.has(frame.type)) return null;
    return frame as unknown as GatewayFrame;
  } catch {
    return null;
  }
};
