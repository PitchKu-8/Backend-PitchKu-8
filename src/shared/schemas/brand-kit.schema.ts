import { z } from "zod";

// HEX color regex — exactly the same as the database constraint (FRD 5.2)
const hexColorRegex = /^#([A-Fa-f0-9]{6})$/;

/**
 * Brand Kit Schema — used across multiple modules (brand-kit CRUD, deck payload, export-engine).
 * This is the ONLY definition of the brand kit shape across the entire application.
 */
export const BrandKitSchema = z.object({
  logoUrl: z.string().url({ message: "logoUrl must be a valid URL" }),
  primaryColor: z
    .string()
    .regex(hexColorRegex, {
      message: "primaryColor must be in HEX format, example: #0F4C81",
    }),
  accentColor: z
    .string()
    .regex(hexColorRegex, {
      message: "accentColor must be in HEX format, example: #F2A007",
    }),
  fontFamily: z.string().default("Inter"),
});

export type BrandKit = z.infer<typeof BrandKitSchema>;
