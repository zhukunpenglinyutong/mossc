type GatewayErrorPayload = {
  code: string;
  message: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;
};

export class GatewayResponseError extends Error {
  code: string;
  details?: unknown;
  retryable?: boolean;
  retryAfterMs?: number;

  constructor(payload: GatewayErrorPayload) {
    super(payload.message || "Gateway request failed");
    this.name = "GatewayResponseError";
    this.code = payload.code;
    this.details = payload.details;
    this.retryable = payload.retryable;
    this.retryAfterMs = payload.retryAfterMs;
  }
}

