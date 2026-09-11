// src/modules/generation-logs/generation-logs.types.ts
export type GenerationStage = "outline" | "content";
export type GenerationStatus = "success" | "retry" | "failed";

export type LogGenerationInput = {
  projectId: string | null;
  stage: GenerationStage;
  modelName: string;
  promptTokens: number;
  completionTokens: number;
  durationMs: number;
  status: GenerationStatus;
  errorMessage?: string;
};
