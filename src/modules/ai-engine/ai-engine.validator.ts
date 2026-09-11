// src/modules/ai-engine/ai-engine.validator.ts
import type { ZodError, ZodType } from "zod";

export type ValidationOutcome<T> =
  | { success: true; data: T }
  | { success: false; errorSummary: string; rawError: ZodError };

/**
 * Converts a ZodError into a concise, LLM-readable list of what went
 * wrong and where (e.g. "slides.2.bullets.1: String must contain at
 * most 90 character(s)"). This is fed back into the retry prompt
 * (ai-engine.retry.ts) so the model can fix the specific field instead
 * of regenerating the entire response from scratch — see the
 * "smart retry" strategy from the original architecture plan (FR-03.4).
 */
export function describeZodIssues(error: ZodError): string {
  return error.issues
    .map((issue) => `- ${issue.path.join(".") || "(root)"}: ${issue.message}`)
    .join("\n");
}

/**
 * Generic validation wrapper used for both the outline schema (Stage 1)
 * and the full deck payload schema (Stage 2). Never throws — callers
 * decide what to do with a failure (e.g. trigger a corrective retry).
 */
export function validateWithSchema<T>(
  schema: ZodType<T>,
  data: unknown,
): ValidationOutcome<T> {
  const result = schema.safeParse(data);

  if (result.success) {
    return { success: true, data: result.data };
  }

  return {
    success: false,
    errorSummary: describeZodIssues(result.error),
    rawError: result.error,
  };
}
