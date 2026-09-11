// src/modules/export-engine/export-engine.pdf.ts
import { createModuleLogger } from "@shared/lib/logger";
import type { PitchKuDeckPayload, Slide } from "@shared/schemas/deck.schema";
import puppeteer from "puppeteer";

const log = createModuleLogger("export-engine");

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * Builds a single slide's HTML. Deliberately simpler than the pptxgenjs
 * layout mapping — this is a print-to-PDF render (FR-05.2), which the
 * FRD does not require to match the web editor 1:1 the way the PPTX
 * layout mapping table (FRD section 7) does.
 */
function renderSlideHtml(
  slide: Slide,
  brandKit: PitchKuDeckPayload["brandKit"],
): string {
  const primary = brandKit.primaryColor;
  const accent = brandKit.accentColor;
  const imageBlock = slide.imageUrl
    ? `<img src="${slide.imageUrl}" class="slide-image" />`
    : "";

  switch (slide.layout) {
    case "title_slide":
    case "contact_closing":
      return `
        <div class="slide slide-title">
          <img src="${brandKit.logoUrl}" class="logo-center" />
          <h1 style="color:${primary}">${escapeHtml(slide.title)}</h1>
          ${slide.subtitle ? `<p class="subtitle" style="color:${accent}">${escapeHtml(slide.subtitle)}</p>` : ""}
        </div>`;

    case "title_bullets":
      return `
        <div class="slide slide-split">
          <div class="col-left">
            <h2 style="color:${primary}">${escapeHtml(slide.title)}</h2>
            <ul>${slide.bullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
          </div>
          <div class="col-right">${imageBlock}</div>
        </div>`;

    case "two_column": {
      const mid = Math.ceil(slide.bullets.length / 2);
      const left = slide.bullets.slice(0, mid);
      const right = slide.bullets.slice(mid);
      return `
        <div class="slide">
          <h2 style="color:${primary}; text-align:center">${escapeHtml(slide.title)}</h2>
          <div class="two-col">
            <ul>${left.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
            <ul>${right.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}</ul>
          </div>
        </div>`;
    }

    case "metrics_grid":
      return `
        <div class="slide">
          <h2 style="color:${primary}; text-align:center">${escapeHtml(slide.title)}</h2>
          <div class="metrics-grid">
            ${slide.cards
              .map(
                (card) => `
              <div class="metric">
                <div class="metric-value" style="color:${accent}">${escapeHtml(card.header)}</div>
                <div class="metric-label">${escapeHtml(card.description)}</div>
              </div>`,
              )
              .join("")}
          </div>
        </div>`;

    case "card_grid":
      return `
        <div class="slide">
          <h2 style="color:${primary}; text-align:center">${escapeHtml(slide.title)}</h2>
          <div class="card-grid">
            ${slide.cards
              .map(
                (card) => `
              <div class="card" style="border-color:${accent}">
                <div class="card-header" style="color:${primary}">${escapeHtml(card.header)}</div>
                <div class="card-desc">${escapeHtml(card.description)}</div>
              </div>`,
              )
              .join("")}
          </div>
        </div>`;
  }
}

function renderDeckHtml(deck: PitchKuDeckPayload): string {
  const slidesHtml = deck.slides
    .map((slide) => renderSlideHtml(slide, deck.brandKit))
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  @page { size: 1280px 720px; margin: 0; }
  * { box-sizing: border-box; font-family: '${deck.brandKit.fontFamily}', sans-serif; }
  body { margin: 0; }
  .slide {
    width: 1280px;
    height: 720px;
    padding: 60px;
    page-break-after: always;
    position: relative;
    display: flex;
    flex-direction: column;
    justify-content: center;
  }
  .slide-title { align-items: center; text-align: center; }
  .logo-center { max-width: 120px; max-height: 120px; margin-bottom: 24px; }
  h1 { font-size: 48px; margin: 0 0 16px; }
  h2 { font-size: 36px; margin: 0 0 24px; }
  .subtitle { font-size: 22px; }
  ul { font-size: 20px; line-height: 1.6; padding-left: 24px; }
  .slide-split { flex-direction: row; align-items: center; gap: 40px; }
  .col-left { flex: 1.4; }
  .col-right { flex: 1; }
  .slide-image { width: 100%; border-radius: 8px; object-fit: cover; }
  .two-col { display: flex; gap: 60px; }
  .two-col ul { flex: 1; }
  .metrics-grid { display: flex; justify-content: space-around; }
  .metric { text-align: center; flex: 1; }
  .metric-value { font-size: 32px; font-weight: bold; margin-bottom: 8px; }
  .metric-label { font-size: 16px; color: #555; }
  .card-grid { display: flex; gap: 20px; }
  .card { flex: 1; border: 2px solid; border-radius: 8px; padding: 20px; }
  .card-header { font-size: 20px; font-weight: bold; margin-bottom: 12px; }
  .card-desc { font-size: 15px; color: #555; }
</style>
</head>
<body>${slidesHtml}</body>
</html>`;
}

/**
 * Renders the deck to PDF via headless browser print (FR-05.2). Unlike
 * the PPTX export, remote image URLs are used directly as <img src> —
 * Puppeteer is a real browser and fetches them itself.
 */
export async function generatePdfBuffer(
  deck: PitchKuDeckPayload,
): Promise<Buffer> {
  const html = renderDeckHtml(deck);

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuffer = await page.pdf({
      width: "1280px",
      height: "720px",
      printBackground: true,
    });
    return Buffer.from(pdfBuffer);
  } catch (error) {
    log.error({ action: "generatePdfBuffer", error }, "Failed to render PDF");
    throw error;
  } finally {
    await browser.close();
  }
}
