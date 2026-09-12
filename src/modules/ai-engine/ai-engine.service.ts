// src/modules/ai-engine/ai-engine.service.ts
import { env } from "@config/env";
import { getActiveBrandKit } from "@modules/brand-kit";
import { logGeneration } from "@modules/generation-logs";
import { searchImage } from "@modules/image-service";
import {
  appendDeckVersion,
  findProjectById,
  getLatestDeckVersion,
  updateProjectStatus,
} from "@modules/projects";
import { NotFoundError, StateConflictError } from "@shared/errors/app-errors";
import { createModuleLogger } from "@shared/lib/logger";
import {
  OutlineSchema,
  PitchKuDeckPayloadSchema,
  SlideSchema,
  type Outline,
  type PitchKuDeckPayload,
} from "@shared/schemas/deck.schema";
import { z } from "zod";

import {
  buildContentSystemPrompt,
  buildContentUserPrompt,
  buildOutlineSystemPrompt,
  buildOutlineUserPrompt,
} from "./ai-engine.prompt";
import { generateStructuredWithRetry } from "./ai-engine.retry";
import type { DeckVersionPayload } from "./ai-engine.types";

const log = createModuleLogger("ai-engine");

function requireLlmConfig(): { outlineModel: string; contentModel: string } {
  if (!env.LLM_MODEL_OUTLINE || !env.LLM_MODEL_CONTENT) {
    throw new Error(
      "LLM_MODEL_OUTLINE and LLM_MODEL_CONTENT must be configured",
    );
  }
  return {
    outlineModel: env.LLM_MODEL_OUTLINE,
    contentModel: env.LLM_MODEL_CONTENT,
  };
}

const OutlineGenerationOutputSchema = z.object({
  outline: OutlineSchema,
});

const ContentGenerationOutputSchema = z.object({
  slides: z.array(SlideSchema).min(5).max(12),
});

/**
 * Stage 1: generates the slide outline (titles + objectives only).
 * Reads the businessContext saved at project creation time, calls the
 * LLM with schema-validated retry (FR-03.4), and appends a new
 * deck_versions row containing the generated outline. Every attempt's
 * outcome (success/retry/failed) is recorded to generation_logs
 * (FR-06.2) regardless of whether it ultimately succeeds.
 */
export async function generateOutline(
  userId: string,
  projectId: string,
): Promise<Outline> {
  const { outlineModel } = requireLlmConfig();

  const project = await findProjectById(userId, projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`);
  }

  const latestVersion = await getLatestDeckVersion(projectId);
  if (!latestVersion) {
    throw new StateConflictError(
      `Project ${projectId} has no stored business context`,
    );
  }

  const versionPayload =
    latestVersion.slidesJson as unknown as DeckVersionPayload;

  const startedAt = Date.now();

  let result: Awaited<
    ReturnType<typeof generateStructuredWithRetry<{ outline: Outline }>>
  >;
  try {
    result = await generateStructuredWithRetry({
      model: outlineModel,
      systemPrompt: buildOutlineSystemPrompt(),
      buildUserPrompt: (correctionNote) => {
        const base = buildOutlineUserPrompt(
          project.templateType,
          versionPayload.businessContext,
        );
        return correctionNote
          ? `${base}\n\nYour previous attempt had these issues, please fix them:\n${correctionNote}`
          : base;
      },
      schema: OutlineGenerationOutputSchema,
      maxTokens: 2000,
      logAction: "generateOutline",
    });
  } catch (error) {
    await logGeneration({
      projectId,
      stage: "outline",
      modelName: outlineModel,
      promptTokens: 0,
      completionTokens: 0,
      durationMs: Date.now() - startedAt,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  await logGeneration({
    projectId,
    stage: "outline",
    modelName: outlineModel,
    promptTokens: result.usage.inputTokens,
    completionTokens: result.usage.outputTokens,
    durationMs: Date.now() - startedAt,
    status: result.retryCount > 0 ? "retry" : "success",
  });

  await appendDeckVersion(projectId, {
    businessContext: versionPayload.businessContext,
    outline: result.data.outline,
  } satisfies DeckVersionPayload);

  log.info(
    {
      action: "generateOutline",
      projectId,
      retryCount: result.retryCount,
      usage: result.usage,
    },
    "Outline generated",
  );

  return result.data.outline;
}

/**
 * Wizard step 5 (FR-02.3): the user edits the outline after Stage 1.
 * Pure CRUD — no LLM call, no generation_logs entry (nothing to log).
 * Appends a new deck_versions row with the user-edited outline,
 * preserving businessContext.
 */
export async function confirmOutline(
  userId: string,
  projectId: string,
  outline: Outline,
): Promise<Outline> {
  const project = await findProjectById(userId, projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`);
  }

  const latestVersion = await getLatestDeckVersion(projectId);
  if (!latestVersion) {
    throw new StateConflictError(
      `Project ${projectId} has no stored business context`,
    );
  }

  const versionPayload =
    latestVersion.slidesJson as unknown as DeckVersionPayload;

  await appendDeckVersion(projectId, {
    businessContext: versionPayload.businessContext,
    outline,
  } satisfies DeckVersionPayload);

  return outline;
}

/**
 * Stage 2: generates full slide content from the confirmed outline.
 * The LLM only produces the "slides" array — deckId, template, and
 * brandKit are assembled locally and the combined payload is validated
 * once more against PitchKuDeckPayloadSchema before being persisted,
 * so a malformed assembly step can never slip through as a "valid deck".
 * Every LLM attempt is recorded to generation_logs (FR-06.2).
 */
export async function generateContent(
  userId: string,
  projectId: string,
): Promise<PitchKuDeckPayload> {
  const { contentModel } = requireLlmConfig();

  const project = await findProjectById(userId, projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`);
  }

  const latestVersion = await getLatestDeckVersion(projectId);
  if (!latestVersion) {
    throw new StateConflictError(
      `Project ${projectId} has no stored business context`,
    );
  }

  const versionPayload =
    latestVersion.slidesJson as unknown as DeckVersionPayload;

  if (!versionPayload.outline) {
    throw new StateConflictError(
      `Project ${projectId} has no confirmed outline — call POST /outline first`,
    );
  }

  const brandKit = await getActiveBrandKit(userId);
  if (!brandKit || !brandKit.logoUrl) {
    throw new StateConflictError(
      "Brand kit with a logo must be set up before generating slide content",
    );
  }

  const confirmedOutline = versionPayload.outline;
  const startedAt = Date.now();

  let result: Awaited<
    ReturnType<
      typeof generateStructuredWithRetry<{
        slides: PitchKuDeckPayload["slides"];
      }>
    >
  >;
  try {
    result = await generateStructuredWithRetry({
      model: contentModel,
      systemPrompt: buildContentSystemPrompt(),
      buildUserPrompt: (correctionNote) => {
        const base = buildContentUserPrompt(
          project.templateType,
          versionPayload.businessContext,
          confirmedOutline,
        );
        return correctionNote
          ? `${base}\n\nYour previous attempt had these issues, please fix them:\n${correctionNote}`
          : base;
      },
      schema: ContentGenerationOutputSchema,
      maxTokens: 8000,
      logAction: "generateContent",
    });
  } catch (error) {
    await logGeneration({
      projectId,
      stage: "content",
      modelName: contentModel,
      promptTokens: 0,
      completionTokens: 0,
      durationMs: Date.now() - startedAt,
      status: "failed",
      errorMessage: error instanceof Error ? error.message : "Unknown error",
    });
    throw error;
  }

  await logGeneration({
    projectId,
    stage: "content",
    modelName: contentModel,
    promptTokens: result.usage.inputTokens,
    completionTokens: result.usage.outputTokens,
    durationMs: Date.now() - startedAt,
    status: result.retryCount > 0 ? "retry" : "success",
  });

  const assembledPayload: PitchKuDeckPayload = {
    deckId: projectId,
    template: project.templateType,
    brandKit: {
      logoUrl: brandKit.logoUrl,
      primaryColor: brandKit.primaryColor,
      accentColor: brandKit.accentColor,
      fontFamily: brandKit.fontFamily,
    },
    slides: result.data.slides,
  };

  // Defense-in-depth: re-validate the fully assembled payload, not just
  // the LLM-produced slides array, before it's ever persisted.
  const validated = PitchKuDeckPayloadSchema.parse(assembledPayload);

  // FR-03.3: resolve each slide's imageQuery into an actual stock photo
  // URL. searchImage() never throws, so a failed lookup for one slide
  // never blocks the others.
  const slidesWithImages = await Promise.all(
    validated.slides.map(async (slide) => {
      if (!slide.imageQuery) {
        return slide;
      }
      const image = await searchImage(slide.imageQuery);
      return { ...slide, imageUrl: image.url };
    }),
  );

  const finalPayload: PitchKuDeckPayload = {
    ...validated,
    slides: slidesWithImages,
  };

  await appendDeckVersion(projectId, {
    businessContext: versionPayload.businessContext,
    outline: versionPayload.outline,
    slides: finalPayload.slides,
  } satisfies DeckVersionPayload);

  await updateProjectStatus(projectId, "completed");

  log.info(
    {
      action: "generateContent",
      projectId,
      retryCount: result.retryCount,
      usage: result.usage,
    },
    "Content generated",
  );

  return finalPayload;
}
