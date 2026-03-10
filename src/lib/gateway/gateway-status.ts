export type GatewayStatus =
  | "disconnected"
  | "connecting"
  | "connected"
  | "reconnecting"
  | "error";

export const isGatewayConnected = (status: GatewayStatus): boolean => status === "connected";

export const isGatewayTransitioning = (status: GatewayStatus): boolean =>
  status === "connecting" || status === "reconnecting";

export type GatewayGapInfo = {
  expected: number;
  received: number;
};
