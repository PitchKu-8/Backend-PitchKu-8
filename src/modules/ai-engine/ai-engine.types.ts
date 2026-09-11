// src/modules/ai-engine/ai-engine.types.ts
import type { BusinessContext } from "@modules/projects";
import type { Outline, PitchKuDeckPayload } from "@shared/schemas/deck.schema";

export type DeckVersionPayload = {
  businessContext: BusinessContext;
  outline?: Outline;
  slides?: PitchKuDeckPayload["slides"];
};
