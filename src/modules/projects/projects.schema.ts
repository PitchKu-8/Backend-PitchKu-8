// src/modules/projects/projects.schema.ts
import { z } from "zod";

export const TemplateTypeSchema = z.enum([
  "company_profile",
  "penawaran_produk",
  "proposal_kerjasama",
  "laporan_ringkas",
]);

export type TemplateType = z.infer<typeof TemplateTypeSchema>;

export const ProjectStatusSchema = z.enum(["draft", "completed"]);
export type ProjectStatus = z.infer<typeof ProjectStatusSchema>;

/**
 * Business context fields collected in wizard step 2 (FR-02.2).
 * Kept loose (z.record) for now since the exact fields differ per
 * template (e.g. penawaran_produk asks for price/MOQ, laporan_ringkas
 * asks for period) — the ai-engine module will validate template-specific
 * shape when it consumes this at outline-generation time.
 */
export const BusinessContextSchema = z
  .object({
    businessName: z.string().min(1).max(150),
    shortDescription: z.string().min(1).max(500),
    rawMaterialText: z.string().min(50).max(2000),
  })
  .catchall(z.unknown());

export type BusinessContext = z.infer<typeof BusinessContextSchema>;

/**
 * Request body for POST /projects (FR-02.1, FR-02.2).
 */
export const CreateProjectRequestSchema = z.object({
  title: z.string().min(1).max(150),
  templateType: TemplateTypeSchema,
  businessContext: BusinessContextSchema,
});

export type CreateProjectRequest = z.infer<typeof CreateProjectRequestSchema>;

/**
 * Query params for GET /projects (FR-06.1).
 */
export const ListProjectsQuerySchema = z.object({
  status: ProjectStatusSchema.optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export type ListProjectsQuery = z.infer<typeof ListProjectsQuerySchema>;

/**
 * Shape of a project row as returned to the client.
 * Mirrors public.projects (FRD 5.2), camelCased.
 */
export const ProjectResponseSchema = z.object({
  id: z.string().uuid(),
  title: z.string(),
  templateType: TemplateTypeSchema,
  status: ProjectStatusSchema,
  createdAt: z.string(),
  updatedAt: z.string(),
});

export type ProjectResponse = z.infer<typeof ProjectResponseSchema>;
