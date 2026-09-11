// src/modules/generation-logs/generation-logs.repository.ts
import { supabaseAdmin } from "@shared/lib/supabase-client";

import type { LogGenerationInput } from "./generation-logs.types";

/**
 * Inserts a generation_logs row (FRD 5.2). Fire-and-forget by design in
 * the service layer — a logging failure must never surface as an error
 * to the user, since it's purely observability, not business logic.
 */
export async function insertGenerationLog(
  input: LogGenerationInput & { estimatedCostUsd: number },
): Promise<void> {
  const { error } = await supabaseAdmin.from("generation_logs").insert({
    project_id: input.projectId,
    stage: input.stage,
    model_name: input.modelName,
    prompt_tokens: input.promptTokens,
    completion_tokens: input.completionTokens,
    duration_ms: input.durationMs,
    estimated_cost_usd: input.estimatedCostUsd,
    status: input.status,
    error_message: input.errorMessage ?? null,
  });

  if (error) {
    throw error;
  }
}
