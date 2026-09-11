// src/modules/ai-engine/ai-engine.prompt.ts
import type { BusinessContext, TemplateType } from "@modules/projects";

const TEMPLATE_LABELS: Record<TemplateType, string> = {
  company_profile: "Company Profile",
  penawaran_produk: "Penawaran Produk",
  proposal_kerjasama: "Proposal Kerja Sama",
  laporan_ringkas: "Laporan Ringkas",
};

/**
 * System prompt for Stage 1 (outline generation). Deliberately asks only
 * for titles and objectives — NOT full slide content — to keep this
 * call cheap, since the user is expected to revise the outline before
 * committing to Stage 2 (see docs/API-CONTRACT.md, and the cost-saving
 * rationale in the original architecture plan).
 */
export function buildOutlineSystemPrompt(): string {
  return `You are an expert presentation consultant for Indonesian small and medium businesses (UMKM).
Your task is to produce a slide-by-slide OUTLINE ONLY — a title and a one-sentence objective per slide.
Do NOT write full slide content, bullet points, or detailed copy at this stage.

Rules:
- Produce between 5 and 12 slides.
- Each title must be concise (under 60 characters) and business-appropriate.
- Each objective should explain, in one sentence, what that slide is meant to accomplish for the reader.
- Write in Bahasa Indonesia, matching the tone of a professional Indonesian business pitch.

Respond with ONLY a single JSON object, no markdown code fences, no explanation text, matching exactly this shape:
{
  "outline": [
    { "slideNumber": 1, "title": "...", "objective": "..." }
  ]
}`;
}

export function buildOutlineUserPrompt(
  templateType: TemplateType,
  businessContext: BusinessContext,
): string {
  return `Template: ${TEMPLATE_LABELS[templateType]}

Business context:
${JSON.stringify(businessContext, null, 2)}

Generate the slide outline for this business, following the rules in the system prompt.`;
}

/**
 * System prompt for Stage 2 (full content generation). Consumes the
 * user-confirmed outline from Stage 1 as context, and must assign one
 * of the 6 allowed layouts to each slide (FR-03.1), respecting the
 * character limits enforced by the deck schema itself (FR-03.2).
 */
export function buildContentSystemPrompt(): string {
  return `You are an expert presentation consultant for Indonesian small and medium businesses (UMKM).
You will be given a confirmed slide outline (titles + objectives) and the business's brand kit.
Your task is to generate the FULL structured content for every slide.

For each slide, choose exactly one layout from: title_slide, title_bullets, two_column, metrics_grid, card_grid, contact_closing.
Guidelines for choosing a layout:
- title_slide: for the opening/cover slide.
- title_bullets or two_column: for explaining concepts, background, or comparisons.
- metrics_grid: for 3-4 key numbers or facts.
- card_grid: for a list of products, variants, or team members.
- contact_closing: for the final slide with contact details and a call to action.

Strict rules (violating ANY of these will cause the response to be rejected):
- title: max 60 characters.
- subtitle: max 120 characters.
- bullets: max 5 items, each max 90 characters.
- cards: NEVER more than 4 cards in a single slide, regardless of layout (metrics_grid or card_grid). If you have more than 4 items to show, pick only the 4 most important ones — do not add a 5th card under any circumstance.
- card header: max 30 characters, card description: max 80 characters.
- For every slide, include a short English search keyword in "imageQuery" describing a relevant stock photo (e.g. "packaged food snack container").
- Write all visible content in Bahasa Indonesia.
- Never exceed the character or count limits above, even if it means omitting information or writing a shorter sentence.

Respond with ONLY a single JSON object, no markdown code fences, no explanation text, matching exactly this shape:
{
  "slides": [
    {
      "slideNumber": 1,
      "layout": "title_slide",
      "title": "...",
      "subtitle": "...",
      "imageQuery": "..."
    }
  ]
}
Each slide's fields depend on its layout — only include fields relevant to the chosen layout (e.g. "bullets" for title_bullets/two_column, "cards" for metrics_grid/card_grid, max 4 items).`;
}

export function buildContentUserPrompt(
  templateType: TemplateType,
  businessContext: BusinessContext,
  outline: { slideNumber: number; title: string; objective: string }[],
): string {
  return `Template: ${TEMPLATE_LABELS[templateType]}

Business context:
${JSON.stringify(businessContext, null, 2)}

Confirmed outline:
${JSON.stringify(outline, null, 2)}

Generate the full slide content now, following the rules in the system prompt.`;
}
