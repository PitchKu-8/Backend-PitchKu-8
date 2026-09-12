// src/app.ts
import { env } from '@config/env';
import {
  generateOutlineHandler,
  confirmOutlineHandler,
  generateContentHandler,
  ConfirmOutlineRequestSchema,
} from '@modules/ai-engine';
import {
  authMiddleware,
  syncProfileHandler,
  loginHandler,
  signupHandler,
  logoutHandler,
  SyncProfileRequestSchema,
  LoginRequestSchema,
  SignupRequestSchema,
} from '@modules/auth';
import {
  logoUploadMiddleware,
  uploadLogoHandler,
  upsertBrandKitHandler,
  getActiveBrandKitHandler,
  UpsertBrandKitRequestSchema,
} from '@modules/brand-kit';
import { exportPptxHandler, exportPdfHandler } from '@modules/export-engine';
import {
  createProjectHandler,
  getProjectHandler,
  listProjectsHandler,
  deleteProjectHandler,
  duplicateProjectHandler,
  CreateProjectRequestSchema,
  ListProjectsQuerySchema,
} from '@modules/projects';
import { errorHandler } from '@shared/middleware/error-handler';
import { validateRequest } from '@shared/middleware/request-validator';
import cors from 'cors';
import express, { type Express } from 'express';

/**
 * Express application factory. Kept separate from server.ts so the app
 * instance can be imported directly in tests (via Supertest) without
 * needing to bind to an actual port.
 */
export function createApp(): Express {
  const app = express();
  const allowedOrigins = env.CORS_ALLOWED_ORIGINS.split(',').map((origin) => origin.trim());

  app.use(
    cors({
      origin: allowedOrigins,
      credentials: true,
    }),
  );

  app.use(express.json());

  // Health check — useful for deployment platforms (Railway/Fly.io) to
  // verify the service is up before routing traffic to it.
  app.get('/health', (_req, res) => {
    res.status(200).json({ success: true, data: { status: 'ok' } });
  });

  // ========================================
  // signup/login/logout routes
  // ========================================
  app.post('/v1/auth/signup', validateRequest(SignupRequestSchema), signupHandler);
  app.post('/v1/auth/login', validateRequest(LoginRequestSchema), loginHandler);
  app.post('/v1/auth/logout', authMiddleware, logoutHandler);

  // ========================================
  // brand-kit routes
  // ========================================
  app.post('/v1/brand-kits/logo-upload', authMiddleware, logoUploadMiddleware, uploadLogoHandler);

  app.post(
    '/v1/brand-kits',
    authMiddleware,
    validateRequest(UpsertBrandKitRequestSchema),
    upsertBrandKitHandler,
  );

  app.get('/v1/brand-kits/active', authMiddleware, getActiveBrandKitHandler);

  // =========================================
  // Project routes
  // =========================================
  app.post(
    '/v1/projects',
    authMiddleware,
    validateRequest(CreateProjectRequestSchema),
    createProjectHandler,
  );

  app.get(
    '/v1/projects',
    authMiddleware,
    validateRequest(ListProjectsQuerySchema, 'query'),
    listProjectsHandler,
  );

  app.get('/v1/projects/:id', authMiddleware, getProjectHandler);
  app.delete('/v1/projects/:id', authMiddleware, deleteProjectHandler);
  app.post('/v1/projects/:id/duplicate', authMiddleware, duplicateProjectHandler);

  // =========================================
  // AI routes
  // =========================================
  app.post('/v1/projects/:id/outline', authMiddleware, generateOutlineHandler);
  app.patch(
    '/v1/projects/:id/outline',
    authMiddleware,
    validateRequest(ConfirmOutlineRequestSchema),
    confirmOutlineHandler,
  );
  app.post('/v1/projects/:id/content', authMiddleware, generateContentHandler);

  // =========================================
  // Export routes
  // =========================================
  app.post('/v1/projects/:id/export/pptx', authMiddleware, exportPptxHandler);
  app.post('/v1/projects/:id/export/pdf', authMiddleware, exportPdfHandler);

  // =========================================
  // Auth routes
  // =========================================
  app.post(
    '/v1/auth/sync-profile',
    authMiddleware,
    validateRequest(SyncProfileRequestSchema),
    syncProfileHandler,
  );

  // Error handler MUST be registered last — Express identifies
  // error-handling middleware by its 4-parameter signature, and only
  // middleware registered after a route can catch errors thrown from it.
  app.use(errorHandler);

  return app;
}
