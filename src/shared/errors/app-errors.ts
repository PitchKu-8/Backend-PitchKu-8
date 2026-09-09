// src/shared/errors/app-errors.ts
import type { ErrorCode } from "@shared/schemas/common.schema";

/**
 * Base class for all application domain errors.
 * error-handler.ts (middleware) recognizes this instance to
 * map to the appropriate HTTP status code (see docs/API-CONTRACT.md
 * section 5 — Consistent Status Code Summary).
 *
 * DO NOT throw a generic Error in any service/repository —
 * always use one of the subclasses below, so the error-handler
 * can distinguish failure types without guessing from the message content.
 */
export abstract class AppError extends Error {
  abstract readonly httpStatus: number;
  abstract readonly code: ErrorCode;

  constructor(
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
    this.name = this.constructor.name;
    Error.captureStackTrace(this, this.constructor);
  }
}

// =========================================
// AUTH_*
// =========================================

export class UnauthorizedError extends AppError {
  readonly httpStatus = 401;
  readonly code: ErrorCode = "AUTH_UNAUTHORIZED";
}

export class ForbiddenError extends AppError {
  readonly httpStatus = 403;
  readonly code: ErrorCode = "AUTH_FORBIDDEN";
}

// =========================================
// VALIDATION_*
// =========================================

export class ValidationError extends AppError {
  readonly httpStatus = 400;
  readonly code: ErrorCode = "VALIDATION_INVALID_INPUT";
}

export class FileTooLargeError extends AppError {
  readonly httpStatus = 400;
  readonly code: ErrorCode = "VALIDATION_FILE_TOO_LARGE";
}

export class InvalidFileTypeError extends AppError {
  readonly httpStatus = 400;
  readonly code: ErrorCode = "VALIDATION_FILE_TYPE_INVALID";
}

export class InvalidHexColorError extends AppError {
  readonly httpStatus = 400;
  readonly code: ErrorCode = "VALIDATION_HEX_INVALID";
}

export class CharLimitExceededError extends AppError {
  readonly httpStatus = 400;
  readonly code: ErrorCode = "VALIDATION_CHAR_LIMIT_EXCEEDED";
}

export class SlideCountOutOfRangeError extends AppError {
  readonly httpStatus = 400;
  readonly code: ErrorCode = "VALIDATION_SLIDE_COUNT_OUT_OF_RANGE";
}

// =========================================
// AI_*
// =========================================

export class OutlineGenerationFailedError extends AppError {
  readonly httpStatus = 422;
  readonly code: ErrorCode = "AI_OUTLINE_GENERATION_FAILED";
}

export class ContentGenerationFailedError extends AppError {
  readonly httpStatus = 422;
  readonly code: ErrorCode = "AI_CONTENT_GENERATION_FAILED";
}

export class LLMProviderTimeoutError extends AppError {
  readonly httpStatus = 504;
  readonly code: ErrorCode = "AI_PROVIDER_TIMEOUT";
}

export class LLMRateLimitedError extends AppError {
  readonly httpStatus = 429;
  readonly code: ErrorCode = "AI_RATE_LIMITED";
}

// =========================================
// EXPORT_*
// =========================================

export class ExportRenderFailedError extends AppError {
  readonly httpStatus = 500;
  readonly code: ErrorCode = "EXPORT_RENDER_FAILED";
}

// =========================================
// RESOURCE_*
// =========================================

export class NotFoundError extends AppError {
  readonly httpStatus = 404;
  readonly code: ErrorCode = "RESOURCE_NOT_FOUND";
}

export class StateConflictError extends AppError {
  readonly httpStatus = 409;
  readonly code: ErrorCode = "RESOURCE_STATE_CONFLICT";
}
