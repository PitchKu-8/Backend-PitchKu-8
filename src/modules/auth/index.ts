// src/modules/auth/index.ts
export { authMiddleware } from './auth.middleware';
export { syncProfileHandler, loginHandler, signupHandler } from './auth.controller';
export { SyncProfileRequestSchema, LoginRequestSchema, SignupRequestSchema } from './auth.schema';
export type {
  ProfileResponse,
  SyncProfileRequest,
  LoginRequest,
  SignupRequest,
  AuthSessionResponse,
} from './auth.schema';
export type {} from './auth.types';
export { logoutHandler } from './auth.controller';
