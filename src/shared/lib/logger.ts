// src/shared/lib/logger.ts
import { env } from "@config/env";
import pino, { type LoggerOptions } from "pino";

const baseOptions: LoggerOptions = {
  level: env.NODE_ENV === "production" ? "info" : "debug",
  base: {
    env: env.NODE_ENV,
  },
};

/**
 * Pretty-print only in development — leave raw JSON in production
 * so it can be directly ingested by log aggregator tools (Railway/Fly.io logs, etc.).
 * The 'transport' key is intentionally only added (rather than set to undefined) during
 * development, because exactOptionalPropertyTypes rejects optional properties
 * that are explicitly set to undefined.
 */
const loggerOptions: LoggerOptions =
  env.NODE_ENV === "development"
    ? {
        ...baseOptions,
        transport: {
          target: "pino-pretty",
          options: {
            colorize: true,
            translateTime: "HH:MM:ss",
            ignore: "pid,hostname",
          },
        },
      }
    : baseOptions;

/**
 * Single Pino instance for the entire application.
 * Standardized log format (see docs/CONVENTIONS.md): every log
 * MUST include 'module' and 'action' in the context object, so it is
 * easy to correlate with records in the generation_logs table (FR-06.2)
 * during debugging.
 */
export const logger = pino(loggerOptions);

/**
 * Helper to create a child logger that automatically includes 'module'
 * in every log line — so other modules don't need to manually write
 * logger.info({ module: 'ai-engine', action: '...' }, 'message') repeatedly.
 *
 * Usage in other modules:
 *   const log = createModuleLogger('ai-engine');
 *   log.info({ action: 'generateOutline', projectId }, 'Outline successfully generated');
 */
export function createModuleLogger(moduleName: string) {
  return logger.child({ module: moduleName });
}
