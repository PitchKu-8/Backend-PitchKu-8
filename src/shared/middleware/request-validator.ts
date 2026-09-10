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
 * The parsed (and type-coerced) result REPLACES the original req[target].
 *
 * NOTE: Express 5 made req.query a getter-only property (no setter), so a
 * plain `req.query = parsed` assignment throws a TypeError at runtime.
 * Object.defineProperty is used instead to override it safely, for all
 * three targets, to keep this middleware consistent regardless of which
 * Express version's property descriptors change in the future.
 */
export function validateRequest(
  schema: ZodType,
  target: ValidationTarget = "body",
) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const parsed: unknown = schema.parse(req[target]);

    Object.defineProperty(req, target, {
      value: parsed,
      writable: true,
      configurable: true,
    });

    next();
  };
}
