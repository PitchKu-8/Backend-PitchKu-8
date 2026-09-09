// src/modules/auth/auth.types.ts

/**
 * Module augmentation — adds the 'userId' property to the Express Request type.
 * Once this file is imported anywhere (usually imported via app.ts),
 * the entire codebase automatically knows req.userId is available after passing authMiddleware,
 * eliminating the need for manual type assertions in any controller.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      userId?: string;
    }
  }
}

export {};
