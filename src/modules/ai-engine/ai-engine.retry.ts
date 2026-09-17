// src/modules/ai-engine/ai-engine.retry.ts

import { LLMProviderTimeoutError, LLMRateLimitedError } from '@shared/errors/app-errors';
import { callStructured } from '@shared/lib/llm-client';
import { createModuleLogger } from '@shared/lib/logger';
import type { ZodType } from 'zod';

import { validateWithSchema } from './ai-engine.validator';

const log = createModuleLogger('ai-engine');
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

const PARSE_FAILURE_CORRECTION_NOTE =
  '- Your previous response was not valid, complete JSON (it may have been cut off before finishing). Respond with ONLY a single, complete, valid JSON object. Keep the content concise enough to finish within the token limit — do not truncate mid-field.';

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

    let rawOutput: unknown;
    let usage: { inputTokens: number; outputTokens: number };
    try {
      const result = await callStructured<unknown>({
        model,
        systemPrompt,
        userPrompt,
        schema,
        maxTokens,
        ...(temperature !== undefined ? { temperature } : {}),
      });
      rawOutput = result.data;
      usage = result.usage;
    } catch (error) {
      // Error provider yang tidak akan membaik dengan retry — lempar langsung,
      // jangan buang kuota retry untuk ini.
      if (error instanceof LLMRateLimitedError || error instanceof LLMProviderTimeoutError) {
        throw error;
      }

      // Kemungkinan besar JSON rusak/terpotong (SyntaxError dari JSON.parse)
      // atau kasus lain dari callStructured — perlakukan seperti kegagalan
      // validasi: catat, lalu coba lagi dengan instruksi koreksi.
      const message = error instanceof Error ? error.message : String(error);
      lastErrorSummary = PARSE_FAILURE_CORRECTION_NOTE + `\n  (detail: ${message})`;
      log.warn(
        { action: logAction, attempt, error: message },
        'LLM output failed to parse, will retry',
      );

      if (attempt < MAX_RETRIES) {
        const backoff = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS.at(-1);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }
      throw new Error(`LLM output failed to parse after ${MAX_RETRIES} retries: ${message}`);
    }

    const outcome = validateWithSchema(schema, rawOutput);
    if (outcome.success) {
      if (attempt > 0)
        log.info({ action: logAction, attempt, retryCount: attempt }, 'Succeeded after retry');
      return { data: outcome.data, usage, retryCount: attempt };
    }

    lastErrorSummary = outcome.errorSummary;
    log.warn({ action: logAction, attempt, issues: lastErrorSummary }, 'Schema validation failed');

    if (attempt < MAX_RETRIES) {
      const backoff = RETRY_BACKOFF_MS[attempt] ?? RETRY_BACKOFF_MS.at(-1);
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }

  log.error(
    { action: logAction, retryCount: MAX_RETRIES, issues: lastErrorSummary },
    'Failed after exhausting retries',
  );
  throw new Error(
    `LLM output failed schema validation after ${MAX_RETRIES} retries: ${lastErrorSummary}`,
  );
}
