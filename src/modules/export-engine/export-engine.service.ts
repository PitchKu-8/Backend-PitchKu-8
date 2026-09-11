// src/modules/export-engine/export-engine.service.ts
import type { DeckVersionPayload } from "@modules/ai-engine";
import { getActiveBrandKit } from "@modules/brand-kit";
import { findProjectById, getLatestDeckVersion } from "@modules/projects";
import { NotFoundError, StateConflictError } from "@shared/errors/app-errors";
import { createModuleLogger } from "@shared/lib/logger";
import {
  PitchKuDeckPayloadSchema,
  type PitchKuDeckPayload,
} from "@shared/schemas/deck.schema";

import { generatePdfBuffer } from "./export-engine.pdf";
import { generatePptxBuffer } from "./export-engine.pptx";
import { uploadExportFile } from "./export-engine.storage";
import type { ExportFormat, ExportResult } from "./export-engine.types";

const log = createModuleLogger("export-engine");

function sanitizeForFilename(text: string): string {
  return text
    .trim()
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Builds the output filename per FR-05.3:
 * [Nama_Usaha]_[Jenis_Template]_[YYYYMMDD].[pptx/pdf]
 */
function buildFileName(
  businessName: string,
  templateType: string,
  format: ExportFormat,
): string {
  const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  return `${sanitizeForFilename(businessName)}_${templateType}_${date}.${format}`;
}

async function assembleDeckPayload(
  userId: string,
  projectId: string,
): Promise<{ payload: PitchKuDeckPayload; businessName: string }> {
  const project = await findProjectById(userId, projectId);
  if (!project) {
    throw new NotFoundError(`Project ${projectId} not found`);
  }

  const latestVersion = await getLatestDeckVersion(projectId);
  if (!latestVersion) {
    throw new StateConflictError(`Project ${projectId} has no deck data`);
  }

  const versionPayload =
    latestVersion.slidesJson as unknown as DeckVersionPayload;

  if (!versionPayload.slides || versionPayload.slides.length === 0) {
    throw new StateConflictError(
      `Project ${projectId} has no generated slide content — call POST /content first`,
    );
  }

  const brandKit = await getActiveBrandKit(userId);
  if (!brandKit || !brandKit.logoUrl) {
    throw new StateConflictError(
      "Brand kit with a logo must be set up before exporting",
    );
  }

  const payload = PitchKuDeckPayloadSchema.parse({
    deckId: projectId,
    template: project.templateType,
    brandKit: {
      logoUrl: brandKit.logoUrl,
      primaryColor: brandKit.primaryColor,
      accentColor: brandKit.accentColor,
      fontFamily: brandKit.fontFamily,
    },
    slides: versionPayload.slides,
  });

  return { payload, businessName: versionPayload.businessContext.businessName };
}

/**
 * Generates and uploads a PPTX or PDF export for a project's latest
 * deck content, returning a download URL and the filename following
 * FR-05.3's naming convention.
 */
export async function exportDeck(
  userId: string,
  projectId: string,
  format: ExportFormat,
): Promise<ExportResult> {
  const { payload, businessName } = await assembleDeckPayload(
    userId,
    projectId,
  );

  const buffer =
    format === "pptx"
      ? await generatePptxBuffer(payload)
      : await generatePdfBuffer(payload);

  const fileName = buildFileName(businessName, payload.template, format);
  const contentType =
    format === "pptx"
      ? "application/vnd.openxmlformats-officedocument.presentationml.presentation"
      : "application/pdf";

  const downloadUrl = await uploadExportFile(
    userId,
    fileName,
    buffer,
    contentType,
  );

  log.info(
    { action: "exportDeck", projectId, format, fileName },
    "Export generated",
  );

  return { downloadUrl, fileName };
}
