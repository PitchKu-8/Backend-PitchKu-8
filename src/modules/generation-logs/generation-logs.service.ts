// src/modules/generation-logs/generation-logs.service.ts
import { LLM_PRICING_PER_MILLION_TOKENS } from "@config/constants";
import { createModuleLogger } from "@shared/lib/logger";

import { insertGenerationLog } from "./generation-logs.repository";
import type { LogGenerationInput } from "./generation-logs.types";

const log = createModuleLogger("generation-logs");

/**
 * Computes estimated cost from token usage and the model's per-million
 * pricing. Returns 0 (never throws) for unknown models — this is a
 * best-effort estimate for NFR-K01, not a billing-critical calculation.
 */
function estimateCostUsd(
  modelName: string,
  promptTokens: number,
  completionTokens: number,
): number {
  const pricing = LLM_PRICING_PER_MILLION_TOKENS[modelName];
  if (!pricing) {
    log.warn(
      { action: "estimateCostUsd", modelName },
      "No pricing entry for model, defaulting to 0",
    );
    return 0;
  }

  const inputCost = (promptTokens / 1_000_000) * pricing.input;
  const outputCost = (completionTokens / 1_000_000) * pricing.output;
  return Number((inputCost + outputCost).toFixed(6));
}

/**
 * Records a single LLM call outcome to generation_logs (FR-06.2).
 * Deliberately swallows its own errors — called via fire-and-forget
 * from ai-engine.service.ts, so a logging failure never blocks or
 * fails the actual outline/content generation the user is waiting on.
 */
export async function logGeneration(input: LogGenerationInput): Promise<void> {
  const estimatedCostUsd = estimateCostUsd(
    input.modelName,
    input.promptTokens,
    input.completionTokens,
  );

  try {
    await insertGenerationLog({ ...input, estimatedCostUsd });
  } catch (error) {
    log.error(
      { action: "logGeneration", input, error },
      "Failed to write generation log",
    );
  }
}
