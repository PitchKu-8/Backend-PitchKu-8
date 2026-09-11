// src/modules/export-engine/export-engine.pptx.ts
import { createModuleLogger } from "@shared/lib/logger";
import type { PitchKuDeckPayload } from "@shared/schemas/deck.schema";
import PptxGenJS from "pptxgenjs";

import { renderSlide } from "./export-engine.layout-map";

const log = createModuleLogger("export-engine");

/**
 * Fetches a remote image and encodes it as a base64 data URI.
 * pptxgenjs's own remote-fetch behavior for `path` is inconsistent
 * across environments, so images are pre-fetched here and passed as
 * `data` instead — more reliable regardless of pptxgenjs version.
 * Returns null (never throws) on failure — a broken image host must
 * never fail the whole export.
 */
async function fetchAsDataUri(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`status ${response.status}`);
    }
    const contentType = response.headers.get("content-type") ?? "image/jpeg";
    const buffer = Buffer.from(await response.arrayBuffer());
    return `data:${contentType};base64,${buffer.toString("base64")}`;
  } catch (error) {
    log.warn(
      { action: "fetchAsDataUri", url, error },
      "Failed to fetch image for PPTX embedding",
    );
    return null;
  }
}

/**
 * Generates a native, editable PPTX file (FR-05.1) — never a rasterized
 * image pasted into a slide. Text is native pptxgenjs text objects,
 * following the layout mapping table (FRD section 7).
 */
export async function generatePptxBuffer(
  deck: PitchKuDeckPayload,
): Promise<Buffer> {
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_16x9";

  const logoDataUri = await fetchAsDataUri(deck.brandKit.logoUrl);

  // Fetch every slide's image in parallel — same resilience philosophy
  // as image-service.searchImage: a slow/broken host never blocks the rest.
  const slideImages = await Promise.all(
    deck.slides.map((slide) =>
      slide.imageUrl ? fetchAsDataUri(slide.imageUrl) : Promise.resolve(null),
    ),
  );

  deck.slides.forEach((slideData, index) => {
    const pptxSlide = pptx.addSlide();
    renderSlide(
      pptxSlide,
      slideData,
      deck.brandKit,
      logoDataUri,
      slideImages[index] ?? null,
    );
  });

  const buffer = (await pptx.write({ outputType: "nodebuffer" })) as Buffer;
  return buffer;
}
