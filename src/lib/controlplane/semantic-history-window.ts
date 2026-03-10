export type SemanticHistoryMessage = Record<string, unknown>;

type SemanticTurnRole = "user" | "assistant";

export type SemanticMessageWindowResult = {
  messages: SemanticHistoryMessage[];
  semanticTurnsIncluded: number;
  windowTruncated: boolean;
};

const toRole = (message: SemanticHistoryMessage): string => {
  const role = message.role;
  if (typeof role === "string") {
    const normalized = role.trim().toLowerCase();
    if (normalized) return normalized;
  }
  const stopReason = message.stopReason;
  if (typeof stopReason === "string") {
    const normalized = stopReason.trim().toLowerCase();
    if (normalized === "aborted" || normalized === "error") {
      return "assistant";
    }
  }
  const errorMessage = message.errorMessage;
  if (typeof errorMessage === "string" && errorMessage.trim()) {
    return "assistant";
  }
  return "";
};

const resolveSemanticTurnRole = (message: SemanticHistoryMessage): SemanticTurnRole | null => {
  const role = toRole(message);
  if (role === "user") return "user";
  if (role === "assistant") return "assistant";
  return null;
};

export const countSemanticTurns = (messages: SemanticHistoryMessage[]): number => {
  let count = 0;
  for (const message of messages) {
    if (resolveSemanticTurnRole(message)) {
      count += 1;
    }
  }
  return count;
};

export const selectSemanticHistoryWindow = (params: {
  messages: SemanticHistoryMessage[];
  turnLimit: number;
  hasMoreBefore: boolean;
}): SemanticMessageWindowResult => {
  const safeTurnLimit =
    Number.isFinite(params.turnLimit) && params.turnLimit > 0 ? Math.floor(params.turnLimit) : 50;

  if (params.messages.length === 0) {
    return {
      messages: [],
      semanticTurnsIncluded: 0,
      windowTruncated: params.hasMoreBefore,
    };
  }

  let startIndex = 0;
  let turnCount = 0;
  for (let index = params.messages.length - 1; index >= 0; index -= 1) {
    if (!resolveSemanticTurnRole(params.messages[index]!)) continue;
    turnCount += 1;
    if (turnCount > safeTurnLimit) {
      startIndex = index + 1;
      break;
    }
  }

  const selectedMessages = params.messages.slice(startIndex);
  return {
    messages: selectedMessages,
    semanticTurnsIncluded: countSemanticTurns(selectedMessages),
    windowTruncated: startIndex > 0 || params.hasMoreBefore,
  };
};
