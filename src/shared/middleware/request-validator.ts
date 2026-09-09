// src/shared/middleware/request-validator.ts
import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";

type ValidationTarget = "body" | "query" | "params";

/**
 * Generic middleware factory for validating a request against a Zod schema.
 * Throws ZodError on failure — caught centrally by errorHandler, so no
 * controller needs to handle validation errors manually.
 *
 * Usage:
 *   router.post('/brand-kits', validateRequest(createBrandKitSchema), controller.create);
 *
 * The parsed (and type-coerced) result REPLACES the original req[target],
 * so downstream handlers always receive data that matches the schema's
 * inferred type exactly (e.g. numbers coerced from query string).
 */
export function validateRequest(
  schema: ZodType,
  target: ValidationTarget = "body",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed = schema.parse(req[target]);

    req[target] = parsed;

    next();
  };
}
