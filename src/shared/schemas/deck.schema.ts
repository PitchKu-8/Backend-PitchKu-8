import { z } from "zod";

import { BrandKitSchema } from "./brand-kit.schema";

// =========================================
// Level 1: Small repeating elements
// =========================================

/**
 * Single card item — used in the 'card_grid' layout.
 * FRD 5.1: header max 30 characters, description (card_text) max 80 characters.
 */
const CardSchema = z.object({
  header: z.string().max(30, "card header must be at most 30 characters"),
  description: z
    .string()
    .max(80, "card description must be at most 80 characters"),
});

// =========================================
// Level 2: Fields reused across layouts
// =========================================

const slideNumberField = z.number().int().positive();
const titleField = z.string().max(60, "title must be at most 60 characters");
const subtitleField = z
  .string()
  .max(120, "subtitle must be at most 120 characters");
const imageUrlField = z.string().url().optional();
const imageQueryField = z.string().optional();

// =========================================
// Level 3: Six slide schemas, one per layout (FR-03.1)
// =========================================

const TitleSlideSchema = z.object({
  slideNumber: slideNumberField,
  layout: z.literal("title_slide"),
  title: titleField,
  subtitle: subtitleField.optional(),
  imageUrl: imageUrlField,
  imageQuery: imageQueryField,
});

const TitleBulletsSchema = z.object({
  slideNumber: slideNumberField,
  layout: z.literal("title_bullets"),
  title: titleField,
  bullets: z
    .array(z.string().max(90, "each bullet must be at most 90 characters"))
    .max(5, "maximum 5 bullets per slide"),
  imageUrl: imageUrlField,
  imageQuery: imageQueryField,
});

const TwoColumnSchema = z.object({
  slideNumber: slideNumberField,
  layout: z.literal("two_column"),
  title: titleField,
  bullets: z
    .array(z.string().max(90, "each bullet must be at most 90 characters"))
    .max(5, "maximum 5 bullets per slide"),
  imageUrl: imageUrlField,
  imageQuery: imageQueryField,
});

const MetricsGridSchema = z.object({
  slideNumber: slideNumberField,
  layout: z.literal("metrics_grid"),
  title: titleField,
  cards: z
    .array(CardSchema)
    .min(3, "metrics_grid minimal 3 metrik")
    .max(4, "metrics_grid maksimal 4 metrik"),
  imageUrl: imageUrlField,
  imageQuery: imageQueryField,
});

const CardGridSchema = z.object({
  slideNumber: slideNumberField,
  layout: z.literal("card_grid"),
  title: titleField,
  cards: z.array(CardSchema).max(4, "maksimal 4 card per slide"),
  imageUrl: imageUrlField,
  imageQuery: imageQueryField,
});

const ContactClosingSchema = z.object({
  slideNumber: slideNumberField,
  layout: z.literal("contact_closing"),
  title: titleField,
  subtitle: subtitleField.optional(),
  imageUrl: imageUrlField,
  imageQuery: imageQueryField,
});

// =========================================
// Level 4: Union — combined based on the 'layout' discriminator
// =========================================

export const SlideSchema = z.discriminatedUnion("layout", [
  TitleSlideSchema,
  TitleBulletsSchema,
  TwoColumnSchema,
  MetricsGridSchema,
  CardGridSchema,
  ContactClosingSchema,
]);

export type Slide = z.infer<typeof SlideSchema>;
export type SlideLayout = Slide["layout"];

// =========================================
// Level 5: Complete deck payload (FRD 5.1 — PitchKuDeckPayload)
// =========================================

export const PitchKuDeckPayloadSchema = z.object({
  deckId: z.string().uuid(),
  template: z.enum([
    "company_profile",
    "penawaran_produk",
    "proposal_kerjasama",
    "laporan_ringkas",
  ]),
  brandKit: BrandKitSchema,
  slides: z
    .array(SlideSchema)
    .min(5, "minimum 5 slides per deck")
    .max(12, "maximum 12 slides per deck"),
});

export type PitchKuDeckPayload = z.infer<typeof PitchKuDeckPayloadSchema>;

// =========================================
// Level 6: Supporting schemas for endpoint-specific requirements
// =========================================

/**
 * Used in POST /projects/:id/outline (Stage 1 LLM Call) —
 * title + objective only, WITHOUT full content. Deliberately separated
 * from the SlideSchema above because their shapes differ entirely (FR-02.3).
 */
export const OutlineItemSchema = z.object({
  slideNumber: slideNumberField,
  title: titleField,
  objective: z.string().max(150, "objective must be at most 150 characters"),
});

export const OutlineSchema = z
  .array(OutlineItemSchema)
  .min(5, "minimum 5 slides in outline")
  .max(12, "maximum 12 slides in outline");

export type OutlineItem = z.infer<typeof OutlineItemSchema>;
export type Outline = z.infer<typeof OutlineSchema>;

/**
 * Used in PATCH /deck/slides/:slideNumber — partial update.
 * Defined per layout schema first (rather than directly on the union),
 * because z.discriminatedUnion does not have a built-in safe .partial() method.
 * The service layer is responsible for selecting the appropriate partial schema
 * based on the layout of the slide currently being edited.
 */
export const SlidePartialSchemas = {
  title_slide: TitleSlideSchema.partial(),
  title_bullets: TitleBulletsSchema.partial(),
  two_column: TwoColumnSchema.partial(),
  metrics_grid: MetricsGridSchema.partial(),
  card_grid: CardGridSchema.partial(),
  contact_closing: ContactClosingSchema.partial(),
} as const;
