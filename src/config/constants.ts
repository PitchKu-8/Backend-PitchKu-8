// Add to existing config/constants.ts

/**
 * LLM pricing per model, in USD per 1M tokens (per Elice ML API
 * documentation for Claude Fable 5.1). Used by generation-logs to
 * compute estimated_cost_usd (NFR-K01). Add new models here as needed
 * — if a model isn't listed, cost defaults to 0 rather than throwing,
 * since cost tracking must never block the generation flow itself.
 */
export const LLM_PRICING_PER_MILLION_TOKENS: Record<
  string,
  { input: number; output: number }
> = {
  "claude-fable-5-1": { input: 10, output: 50 },
};
