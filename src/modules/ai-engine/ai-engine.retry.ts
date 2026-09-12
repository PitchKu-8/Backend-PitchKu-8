// src/modules/ai-engine/ai-engine.retry.ts

import { callStructured } from "@shared/lib/llm-client";
import { createModuleLogger } from "@shared/lib/logger";
import type { ZodType } from "zod";

import { validateWithSchema } from "./ai-engine.validator";

const log = createModuleLogger("ai-engine");

const MAX_RETRIES = 2;
const RETRY_BACKOFF_MS = [500, 1500];

type StructuredGenerationOptions<T> = {
  model: string;
  systemPrompt: string;
  buildUserPrompt: (correctionNote?: string) => string;
  schema: ZodType<T>;
  maxTokens: number;
  temperature?: number;
  logAction: string;
};

export type StructuredGenerationResult<T> = {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
  retryCount: number;
};

export async function generateStructuredWithRetry<T>({
  model,
  systemPrompt,
  buildUserPrompt,
  schema,
  maxTokens,
  temperature,
  logAction,
}: StructuredGenerationOptions<T>): Promise<StructuredGenerationResult<T>> {
  let lastErrorSummary: string | undefined;

  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const userPrompt = buildUserPrompt(lastErrorSummary);

    const { data: rawOutput, usage } = await callStructured<unknown>({
      model,
      systemPrompt,
      userPrompt,
      schema,
      maxTokens,
      ...(temperature !== undefined ? { temperature } : {}),
    });

    const outcome = validateWithSchema(schema, rawOutput);

    if (outcome.success) {
      if (attempt > 0) {
        log.info(
          { action: logAction, attempt, retryCount: attempt },
          "Structured generation succeeded after retry",
        );
      }
      return { data: outcome.data, usage, retryCount: attempt };
    }

    lastErrorSummary = outcome.errorSummary;

    log.warn(
      { action: logAction, attempt, issues: lastErrorSummary },
      "Structured generation failed schema validation",
    );

    if (attempt < MAX_RETRIES) {
      const backoff = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS.at(-1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  log.error(
    { action: logAction, retryCount: MAX_RETRIES, issues: lastErrorSummary },
    "Structured generation failed after exhausting all retries",
  );

  throw new Error(
    `LLM output failed schema validation after ${MAX_RETRIES} retries: ${lastErrorSummary}`,
  );
}
