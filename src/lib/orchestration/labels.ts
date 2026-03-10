import type { Translate } from "@/i18n"
import type { OrchestrationStrategy } from "@/types"

export const STRATEGY_OPTIONS: OrchestrationStrategy[] = [
  "skill-match",
  "coordinator",
  "round-robin",
  "all",
]

export const getStrategyLabel = (
  strategy: OrchestrationStrategy,
  t: Translate
): string => t(`orchestration.strategy.${strategy}.label`)

export const getStrategyDescription = (
  strategy: OrchestrationStrategy,
  t: Translate
): string => t(`orchestration.strategy.${strategy}.description`)
