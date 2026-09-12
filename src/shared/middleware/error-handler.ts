// src/shared/middleware/error-handler.ts

import { AppError } from "@shared/errors/app-errors";
import { createModuleLogger } from "@shared/lib/logger";
import type { ErrorResponse } from "@shared/schemas/common.schema";
import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";

const log = createModuleLogger("error-handler");

/**
 * Centralized error handler — the ONLY place that converts errors
 * (of any type) into the standardized envelope response { success: false, error: {...} }
 * in accordance with the API contract. Other modules do not need to (and must not)
 * build manual error responses individually.
 *
 * Must be registered LAST in app.ts, after all other routes,
 * following Express rules: error-handling middleware is recognized by its number
 * of parameters (4 parameters, with 'err' in the first position).
 */
export function errorHandler(
  err: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  // Case 1: Our own application domain errors (AppError and its subclasses)
  if (err instanceof AppError) {
    log.warn(
      {
        action: "errorHandler",
        code: err.code,
        path: req.path,
        userId: req.userId,
      },
      err.message,
    );

    const response: ErrorResponse = {
      success: false,
      error: {
        code: err.code,
        message: err.message,
        details: err.details,
      },
    };

    res.status(err.httpStatus).json(response);
    return;
  }

  // Case 2: Zod throws validation errors that weren't caught manually
  // (e.g., from request-validator.ts) — mapped to the same standardized shape.
  if (err instanceof ZodError) {
    log.warn(
      { action: "errorHandler", path: req.path, issues: err.issues },
      "Zod validation failed",
    );

    const response: ErrorResponse = {
      success: false,
      error: {
        code: "VALIDATION_INVALID_INPUT",
        message: "Invalid input",
        details: err.flatten(),
      },
    };

    res.status(400).json(response);
    return;
  }

  // Case 3: Unexpected errors (bugs, failing dependencies, etc.) — never
  // leak internal details (stack trace, original message) to the client, but
  // log them fully on the server for debugging.
  log.error({ action: "errorHandler", path: req.path, err }, "Unhandled error");

  const response: ErrorResponse = {
    success: false,
    error: {
      code: "INTERNAL_SERVER_ERROR",
      message: "An internal server error occurred",
    },
  };

  res.status(500).json(response);
}
