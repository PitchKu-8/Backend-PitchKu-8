// src/modules/export-engine/export-engine.layout-map.ts
import type { BrandKit } from "@shared/schemas/brand-kit.schema";
import type { Slide } from "@shared/schemas/deck.schema";
import PptxGenJS from "pptxgenjs";

type PptxSlide = PptxGenJS.Slide;

function stripHash(hex: string): string {
  return hex.replace("#", "");
}

/**
 * Adds the brand logo at a given position. Silently skipped if the
 * logo could not be fetched (see fetchAsDataUri in export-engine.pptx.ts)
 * — a missing logo must never fail the whole export.
 */
function addLogo(
  pptxSlide: PptxSlide,
  logoDataUri: string | null,
  opts: { x: number; y: number; w: number; h: number },
): void {
  if (!logoDataUri) return;
  pptxSlide.addImage({ data: logoDataUri, ...opts });
}

function addSlideImage(
  pptxSlide: PptxSlide,
  imageDataUri: string | null,
  opts: { x: number; y: number; w: number; h: number },
): void {
  if (!imageDataUri) return;
  pptxSlide.addImage({ data: imageDataUri, ...opts });
}

/**
 * Layout mapping (FRD section 7). One function per layout, translating
 * the canonical slide schema into pptxgenjs shapes/text. Positions are
 * in inches against the 10 x 5.63 in (LAYOUT_16x9) canvas.
 */

function renderTitleSlide(
  pptxSlide: PptxSlide,
  data: Extract<Slide, { layout: "title_slide" }>,
  brandKit: BrandKit,
  logoDataUri: string | null,
): void {
  addLogo(pptxSlide, logoDataUri, { x: 4.5, y: 0.4, w: 1, h: 1 });

  pptxSlide.addText(data.title, {
    x: 0.5,
    y: 2.2,
    w: 9,
    h: 1,
    fontSize: 32,
    bold: true,
    align: "center",
    color: stripHash(brandKit.primaryColor),
    fontFace: brandKit.fontFamily,
  });

  if (data.subtitle) {
    pptxSlide.addText(data.subtitle, {
      x: 1,
      y: 3.3,
      w: 8,
      h: 0.7,
      fontSize: 16,
      align: "center",
      color: stripHash(brandKit.accentColor),
      fontFace: brandKit.fontFamily,
    });
  }
}

function renderTitleBullets(
  pptxSlide: PptxSlide,
  data: Extract<Slide, { layout: "title_bullets" }>,
  brandKit: BrandKit,
  logoDataUri: string | null,
  imageDataUri: string | null,
): void {
  addLogo(pptxSlide, logoDataUri, { x: 9, y: 0.2, w: 0.6, h: 0.6 });

  pptxSlide.addText(data.title, {
    x: 0.5,
    y: 0.4,
    w: 5.5,
    h: 0.8,
    fontSize: 24,
    bold: true,
    color: stripHash(brandKit.primaryColor),
    fontFace: brandKit.fontFamily,
  });

  pptxSlide.addText(
    data.bullets.map((bullet) => ({
      text: bullet,
      options: { bullet: true, breakLine: true },
    })),
    {
      x: 0.5,
      y: 1.3,
      w: 5.5,
      h: 3.8,
      fontSize: 14,
      color: "333333",
      fontFace: brandKit.fontFamily,
      valign: "top",
    },
  );

  addSlideImage(pptxSlide, imageDataUri, { x: 6.3, y: 1.2, w: 3.2, h: 3.2 });
}

function renderTwoColumn(
  pptxSlide: PptxSlide,
  data: Extract<Slide, { layout: "two_column" }>,
  brandKit: BrandKit,
  logoDataUri: string | null,
): void {
  addLogo(pptxSlide, logoDataUri, { x: 9, y: 0.2, w: 0.6, h: 0.6 });

  pptxSlide.addText(data.title, {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.8,
    fontSize: 24,
    bold: true,
    align: "center",
    color: stripHash(brandKit.primaryColor),
    fontFace: brandKit.fontFamily,
  });

  const midpoint = Math.ceil(data.bullets.length / 2);
  const leftItems = data.bullets.slice(0, midpoint);
  const rightItems = data.bullets.slice(midpoint);

  pptxSlide.addText(
    leftItems.map((bullet) => ({
      text: bullet,
      options: { bullet: true, breakLine: true },
    })),
    {
      x: 0.5,
      y: 1.4,
      w: 4.3,
      h: 3.6,
      fontSize: 14,
      color: "333333",
      fontFace: brandKit.fontFamily,
    },
  );

  pptxSlide.addText(
    rightItems.map((bullet) => ({
      text: bullet,
      options: { bullet: true, breakLine: true },
    })),
    {
      x: 5.2,
      y: 1.4,
      w: 4.3,
      h: 3.6,
      fontSize: 14,
      color: "333333",
      fontFace: brandKit.fontFamily,
    },
  );
}

function renderMetricsGrid(
  pptxSlide: PptxSlide,
  data: Extract<Slide, { layout: "metrics_grid" }>,
  brandKit: BrandKit,
  logoDataUri: string | null,
): void {
  addLogo(pptxSlide, logoDataUri, { x: 9, y: 0.2, w: 0.6, h: 0.6 });

  pptxSlide.addText(data.title, {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.8,
    fontSize: 24,
    bold: true,
    align: "center",
    color: stripHash(brandKit.primaryColor),
    fontFace: brandKit.fontFamily,
  });

  const columnWidth = 9 / data.cards.length;
  data.cards.forEach((card, index) => {
    const x = 0.5 + index * columnWidth;
    pptxSlide.addText(card.header, {
      x,
      y: 2,
      w: columnWidth - 0.2,
      h: 1,
      fontSize: 22,
      bold: true,
      align: "center",
      color: stripHash(brandKit.accentColor),
      fontFace: brandKit.fontFamily,
    });
    pptxSlide.addText(card.description, {
      x,
      y: 3,
      w: columnWidth - 0.2,
      h: 1.5,
      fontSize: 12,
      align: "center",
      color: "555555",
      fontFace: brandKit.fontFamily,
    });
  });
}

function renderCardGrid(
  pptxSlide: PptxSlide,
  data: Extract<Slide, { layout: "card_grid" }>,
  brandKit: BrandKit,
  logoDataUri: string | null,
): void {
  addLogo(pptxSlide, logoDataUri, { x: 9, y: 0.2, w: 0.6, h: 0.6 });

  pptxSlide.addText(data.title, {
    x: 0.5,
    y: 0.4,
    w: 9,
    h: 0.8,
    fontSize: 24,
    bold: true,
    align: "center",
    color: stripHash(brandKit.primaryColor),
    fontFace: brandKit.fontFamily,
  });

  const columnWidth = 9 / data.cards.length;
  data.cards.forEach((card, index) => {
    const x = 0.5 + index * (columnWidth + 0.05);

    // Card background + border rendered as an empty text box with
    // fill/line, avoiding pptxgenjs's ShapeType enum entirely — its
    // export location (default export vs named vs instance property)
    // is inconsistent across the package's own type definitions.
    pptxSlide.addText("", {
      x,
      y: 1.6,
      w: columnWidth - 0.1,
      h: 3.4,
      fill: { color: "FFFFFF" },
      line: { color: stripHash(brandKit.accentColor), width: 1.5 },
    });

    pptxSlide.addText(card.header, {
      x,
      y: 1.8,
      w: columnWidth - 0.1,
      h: 0.8,
      fontSize: 14,
      bold: true,
      align: "center",
      color: stripHash(brandKit.primaryColor),
      fontFace: brandKit.fontFamily,
    });

    pptxSlide.addText(card.description, {
      x,
      y: 2.7,
      w: columnWidth - 0.1,
      h: 2,
      fontSize: 11,
      align: "center",
      color: "555555",
      fontFace: brandKit.fontFamily,
    });
  });
}

function renderContactClosing(
  pptxSlide: PptxSlide,
  data: Extract<Slide, { layout: "contact_closing" }>,
  brandKit: BrandKit,
  logoDataUri: string | null,
): void {
  addLogo(pptxSlide, logoDataUri, { x: 4.5, y: 1, w: 1, h: 1 });

  pptxSlide.addText(data.title, {
    x: 0.5,
    y: 2.4,
    w: 9,
    h: 0.8,
    fontSize: 26,
    bold: true,
    align: "center",
    color: stripHash(brandKit.primaryColor),
    fontFace: brandKit.fontFamily,
  });

  if (data.subtitle) {
    pptxSlide.addText(data.subtitle, {
      x: 1,
      y: 3.3,
      w: 8,
      h: 0.7,
      fontSize: 14,
      align: "center",
      color: stripHash(brandKit.accentColor),
      fontFace: brandKit.fontFamily,
    });
  }
}

/**
 * Dispatches to the correct layout renderer based on the slide's
 * discriminant. TypeScript narrows `data` to the matching variant in
 * each branch via the discriminated union defined in deck.schema.ts.
 */
export function renderSlide(
  pptxSlide: PptxSlide,
  data: Slide,
  brandKit: BrandKit,
  logoDataUri: string | null,
  imageDataUri: string | null,
): void {
  switch (data.layout) {
    case "title_slide":
      renderTitleSlide(pptxSlide, data, brandKit, logoDataUri);
      return;
    case "title_bullets":
      renderTitleBullets(pptxSlide, data, brandKit, logoDataUri, imageDataUri);
      return;
    case "two_column":
      renderTwoColumn(pptxSlide, data, brandKit, logoDataUri);
      return;
    case "metrics_grid":
      renderMetricsGrid(pptxSlide, data, brandKit, logoDataUri);
      return;
    case "card_grid":
      renderCardGrid(pptxSlide, data, brandKit, logoDataUri);
      return;
    case "contact_closing":
      renderContactClosing(pptxSlide, data, brandKit, logoDataUri);
      return;
  }
}
