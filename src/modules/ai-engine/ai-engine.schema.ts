// src/modules/ai-engine/ai-engine.schema.ts
import { OutlineSchema } from "@shared/schemas/deck.schema";
import { z } from "zod";

/**
 * Request body for PATCH /projects/:id/outline (FR-02.3, wizard step 5).
 * The user edits titles/order/count after Stage 1 generation — this is
 * pure CRUD, no LLM call involved, so it reuses the same OutlineSchema
 * shape from shared/schemas rather than a separate definition.
 */
export const ConfirmOutlineRequestSchema = z.object({
  outline: OutlineSchema,
});

export type ConfirmOutlineRequest = z.infer<typeof ConfirmOutlineRequestSchema>;
