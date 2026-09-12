# PitchKu Backend — Coding Conventions

This document summarizes the patterns that are actually used across all 7 modules, rather than aspirations from the beginning of the sprint that were never followed. When adding a new module, use this document as the primary reference before making assumptions based on existing code.

---

## 1. File Structure per Module

Each folder under `src/modules/<name>` follows the `<module-name>.<role>.ts` pattern:

```text
<module-name>/
  <module-name>.controller.ts   → HTTP handler, receives Request/Response, no business logic
  <module-name>.service.ts      → business logic and orchestration
  <module-name>.repository.ts   → THE ONLY file allowed to import supabaseAdmin (see exceptions below)
  <module-name>.schema.ts       → Zod request/response schemas specific to the module
  <module-name>.types.ts        → local TypeScript types that do not fit in schema.ts
  index.ts                      → barrel export — THE ONLY public entry point of the module
```

### Intentional Exceptions

* **`auth` module** does not have a `*.repository.ts`. Its operation consists of a single simple upsert, so `auth.service.ts` accesses `supabaseAdmin` directly. Do not use this pattern for modules with more than one type of query.
* **`ai-engine`** and **`export-engine`** contain additional files outside the five standard roles (`*.prompt.ts`, `*.validator.ts`, `*.retry.ts`, `*.layout-map.ts`, `*.pptx.ts`, `*.pdf.ts`, `*.storage.ts`). These are valid when they represent a separate concern that does not fit into the standard categories. Do not add files merely "for consistency" when there is no actual concern to separate.

---

## 2. Barrel Exports & Boundaries

Other modules **must only** import through the module's barrel export:

```typescript
import ... from '@modules/module-name';
```

Never import directly from an internal module file:

```typescript
import ... from '@modules/module-name/module-name.service';
```

This is automatically enforced by `eslint-plugin-boundaries` (`eslint.config.js`) at the `modules`, `shared`, and `config` levels.

However, it is not granular enough to prevent `service.ts` from directly accessing `supabase-client.ts`. This is a manual convention checked during code review, not by the linter.

### Existing Cross-Module Dependencies

```typescript
// ai-engine → brand-kit
import { getActiveBrandKit } from '@modules/brand-kit';

// ai-engine → projects
import { findProjectById, appendDeckVersion, ... } from '@modules/projects';

// export-engine → ai-engine
import type { DeckVersionPayload } from '@modules/ai-engine';
```

---

## 3. Error Handling

**Never** use:

```typescript
throw new Error('generic message');
```

in a service or repository when a suitable `AppError` subclass already exists in `shared/errors/app-errors.ts`.

If no suitable `AppError` subclass exists, let the original error—for example, an error from the Supabase client—propagate as-is.

`error-handler.ts` will catch it as:

```text
500 INTERNAL_SERVER_ERROR
```

without exposing internal details to the client, while the full error is still logged on the server.

`error-handler.ts` handles three cases in order:

1. `AppError` → the error code is taken from the instance.
2. `ZodError` → automatically becomes `400 VALIDATION_INVALID_INPUT`.
3. Any unrecognized error → fallback to `500`.

### Standard Controller Guard Clause

Use the following pattern at the beginning of every handler that requires authentication:

```typescript
function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new UnauthorizedError('User is not authenticated');
  }

  return req.userId;
}
```

This is called even though `authMiddleware` should already guarantee that `req.userId` exists. It provides inexpensive defense-in-depth in case the middleware order in `app.ts` is incorrectly configured in the future.

---

## 4. Logging

Each module has a single logger instance at the top of the file:

```typescript
const log = createModuleLogger('module-name');
```

Log calls **must** include `action` and, when relevant, `userId` or `projectId`.

Examples:

```typescript
log.info(
  { action: 'generateOutline', projectId, retryCount, usage },
  'Outline generated',
);

log.warn(
  { action: 'uploadLogo', userId },
  '...',
);

log.error(
  { action: 'errorHandler', path, err },
  'Unhandled error',
);
```

This is not merely a formatting preference. The consistent structure makes it possible to correlate logs with `generation_logs` in the database during debugging.

---

## 5. `snake_case` ↔ `camelCase` Conversion

The database (PostgreSQL/FRD 5.2) always uses `snake_case`.

The API contract and TypeScript always use `camelCase`.

The conversion **must** happen explicitly at the `repository.ts` layer, typically through a private `toXxxResponse()` helper. Database naming must never leak into the controller.

Example pattern:

```typescript
function toBrandKitResponse(row: {
  logo_url: string | null;
  primary_color: string;
  // ...
}): BrandKitResponse {
  return {
    logoUrl: row.logo_url,
    primaryColor: row.primary_color,
    // ...
  };
}
```

---

## 6. Validation

* Request body, query, and params are validated through the `validateRequest(schema, target)` middleware at the route level (`app.ts`), rather than manually inside controllers.
* Character and count limits—such as a maximum title length of 60 and a maximum of 5 bullets—are defined **once** as constants in `deck.schema.ts` (`titleField`, `slideNumberField`, etc.) and reused across all 6 layout schemas. Do not manually repeat these limits elsewhere.
* LLM output is **never trusted as-is**. It must always pass through `validateWithSchema()` (`ai-engine.validator.ts`) before being used, because the provider being used (Claude Fable 5.1 through Elice) does not support API-side schema enforcement. See `llm-client.ts` for the related implementation note.

---

## 7. Resilience: "Do Not Fail Completely"

The following three areas are intentionally designed to never `throw`, because their partial failures must not cause the entire flow to fail:

### `image-service.searchImage()`

Always returns an `ImageSearchResult` using the following fallback chain:

```text
Unsplash → Pexels → placeholder
```

It never throws an exception.

### `generation-logs.logGeneration()`

Handles its own errors using an internal `try/catch` and `log.error`.

It is called fire-and-forget from `ai-engine.service.ts`.

### `export-engine` — `fetchAsDataUri`

If fetching an image fails, the function returns `null` rather than throwing.

A logo or image that fails to fetch is simply skipped during rendering instead of causing the entire export to fail.

When adding a new feature with similar characteristics—best-effort and not part of the critical path—follow this pattern. Do not allow a single failed external dependency to bring down the entire request.

---

## 8. TypeScript Strict Mode — Known Pitfalls

### `exactOptionalPropertyTypes: true`

This option does not allow explicitly assigning `undefined` to an optional property.

Incorrect:

```typescript
const opts = {
  temperature: value ?? undefined,
};
```

Correct:

```typescript
const opts = {
  ...(value !== undefined ? { temperature: value } : {}),
};
```

### `noUncheckedIndexedAccess: true`

With this option, array or object indexing can result in a type containing `| undefined`.

Use optional chaining when the value has not been guaranteed to exist:

```typescript
arr[0]?.field
```

Do not assume that an indexed value always exists.

---

## 9. Commit Messages

The project uses Conventional Commits, enforced by Husky and `commitlint` through the `commit-msg` hook.

Format:

```text
<type>(<optional-scope>): <short subject>
```

Valid types:

```text
feat
fix
chore
docs
refactor
test
ci
build
```

The commit body may contain multiple paragraphs and should explain **why** the change was made, not only **what** changed.

See the commit history of the `ai-engine` and `export-engine` modules for examples of commits that document technical trade-offs, including why `response_format` is not used.

---

## 10. Testing — Current Status

There are currently no automated tests written.

The following directories are still empty:

```text
tests/unit
tests/integration
```

All verification throughout the sprint has been performed manually through Postman against the actual development environment, rather than mocks.

This is a conscious trade-off made to achieve complete feature coverage within 14 days, not an oversight.

See `tests/README.md`, if available, or the final section of the project roadmap for future plans.