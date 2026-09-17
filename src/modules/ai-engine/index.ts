// src/modules/ai-engine/index.ts
export {
  generateOutlineHandler,
  confirmOutlineHandler,
  generateContentHandler,
  saveSlidesHandler,
} from './ai-engine.controller';
export { ConfirmOutlineRequestSchema, SaveSlidesRequestSchema } from './ai-engine.schema';
export type { ConfirmOutlineRequest, SaveSlidesRequest } from './ai-engine.schema';
export type { DeckVersionPayload } from './ai-engine.types';
