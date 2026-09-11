// src/shared/lib/llm-client.ts

import { env } from "@config/env";
import {
  LLMProviderTimeoutError,
  LLMRateLimitedError,
} from "@shared/errors/app-errors";
import { createModuleLogger } from "@shared/lib/logger";
import OpenAI from "openai";
import { type ZodType } from "zod";

const log = createModuleLogger("llm-client");

let client: OpenAI | null = null;

function getClient(): OpenAI {
  if (!env.LLM_API_KEY || !env.LLM_BASE_URL) {
    throw new Error("LLM_API_KEY and LLM_BASE_URL must be configured");
  }
  if (!client) {
    client = new OpenAI({ apiKey: env.LLM_API_KEY, baseURL: env.LLM_BASE_URL });
  }
  return client;
}

type CallStructuredOptions<T> = {
  model: string;
  systemPrompt: string;
  userPrompt: string;
  schema: ZodType<T>;
  maxTokens: number;
  temperature?: number;
};

type CallStructuredResult<T> = {
  data: T;
  usage: { inputTokens: number; outputTokens: number };
};

/**
 * Strips a leading/trailing markdown code fence (```json ... ``` or
 * ``` ... ```) if present. Needed because this call intentionally omits
 * response_format (see below), so the model is not constrained to emit
 * raw JSON and may wrap it in a fence despite prompt instructions not to.
 */
function stripMarkdownFence(text: string): string {
  const trimmed = text.trim();
  const fenced = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  const captured = fenced?.[1];
  return captured ? captured.trim() : trimmed;
}

/**
 * Calls the LLM and asks it to return raw JSON via prompt instructions
 * only — NO response_format parameter is sent.
 *
 * IMPORTANT: this gateway (Claude Fable 5.1 via Elice) implements any
 * response_format value (json_object AND json_schema alike) by forcing
 * tool_choice behind the scenes, and this model rejects forced
 * tool_choice entirely (confirmed via direct testing — a bare
 * chat.completions.create call with no response_format succeeds, while
 * the same call with any response_format fails with the same
 * "tool_choice ... not supported" 400 error). So response_format cannot
 * be used at all for this model/gateway combination.
 *
 * As a result, schema conformance is handled ENTIRELY outside the
 * provider call: the system prompt describes the exact JSON shape
 * expected (see ai-engine.prompt.ts), this function strips markdown
 * fences defensively, and ai-engine.validator.ts + ai-engine.retry.ts
 * validate the result and issue corrective retries on failure (FR-03.4).
 *
 * Throws on failure — schema validation failures are NOT retried here.
 */
export async function callStructured<T>({
  model,
  systemPrompt,
  userPrompt,
  schema,
  maxTokens,
  temperature = 0.4,
}: CallStructuredOptions<T>): Promise<CallStructuredResult<T>> {
  const openai = getClient();

  let response: OpenAI.Chat.Completions.ChatCompletion;
  try {
    response = await openai.chat.completions.create({
      model,
      max_completion_tokens: maxTokens,
      temperature,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    });
  } catch (error) {
    if (error instanceof OpenAI.RateLimitError) {
      throw new LLMRateLimitedError("LLM provider rate limit exceeded");
    }
    if (error instanceof OpenAI.APIConnectionTimeoutError) {
      throw new LLMProviderTimeoutError("LLM provider request timed out");
    }
    throw error;
  }

  const content = response.choices[0]?.message.content;

  if (!content) {
    log.error(
      { action: "callStructured", model },
      "LLM did not return content",
    );
    throw new Error(
      "LLM response did not include the expected structured output",
    );
  }

  const cleaned = stripMarkdownFence(content);
  const parsedJson: unknown = JSON.parse(cleaned);
  const data = schema.parse(parsedJson);

  return {
    data,
    usage: {
      inputTokens: response.usage?.prompt_tokens ?? 0,
      outputTokens: response.usage?.completion_tokens ?? 0,
    },
  };
}
