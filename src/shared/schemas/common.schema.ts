// src/shared/schemas/common.schema.ts
import { z } from "zod";

/**
 * Success response envelope — used by all endpoints.
 * Generic with respect to data type, so each module can reuse
 * this shape with its respective payload.
 */
export const SuccessResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    success: z.literal(true),
    data: dataSchema,
    meta: z
      .object({
        page: z.number().int().positive().optional(),
        limit: z.number().int().positive().optional(),
        total: z.number().int().nonnegative().optional(),
      })
      .optional(),
  });

/**
 * Error codes grouped by prefix (see docs/API-CONTRACT.md section 0)
 * so that the frontend can switch-case without parsing free-form strings.
 */
export const ErrorCodeSchema = z.enum([
  // AUTH_*
  "AUTH_UNAUTHORIZED",
  "AUTH_FORBIDDEN",
  // VALIDATION_*
  "VALIDATION_INVALID_INPUT",
  "VALIDATION_FILE_TOO_LARGE",
  "VALIDATION_FILE_TYPE_INVALID",
  "VALIDATION_HEX_INVALID",
  "VALIDATION_CHAR_LIMIT_EXCEEDED",
  "VALIDATION_SLIDE_COUNT_OUT_OF_RANGE",
  // AI_*
  "AI_OUTLINE_GENERATION_FAILED",
  "AI_CONTENT_GENERATION_FAILED",
  "AI_PROVIDER_TIMEOUT",
  "AI_RATE_LIMITED",
  // EXPORT_*
  "EXPORT_RENDER_FAILED",
  // RESOURCE_*
  "RESOURCE_NOT_FOUND",
  "RESOURCE_STATE_CONFLICT",
  // INTERNAL_*
  "INTERNAL_SERVER_ERROR",
]);

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;

/**
 * Failure response envelope — fixed shape regardless of the error type.
 * 'details' is intentionally z.unknown(), because each error code has
 * a different detail structure (see examples in docs/API-CONTRACT.md).
 */
export const ErrorResponseSchema = z.object({
  success: z.literal(false),
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;

/**
 * Helper type for annotating return types in services/controllers —
 * not for runtime validation (hence not a Zod schema),
 * but purely to help TypeScript infer the API response shape consistently.
 */
export type ApiSuccess<T> = {
  success: true;
  data: T;
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
  };
};

export type ApiError = ErrorResponse;

export type ApiResponse<T> = ApiSuccess<T> | ApiError;
