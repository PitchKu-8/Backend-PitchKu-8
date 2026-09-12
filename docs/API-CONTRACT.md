# PitchKu — API Contract

**Version:** 1.1
**Base URL:** `http://localhost:3000/v1`
**Environment:** Development

> This document defines the API contract between the PitchKu backend and frontend. Version 1.1 reflects the current implementation and supersedes the previous v1.0 draft.

---

## 0. Response Envelope

All API responses follow a consistent response envelope.

### Success

```json
{
  "success": true,
  "data": {},
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

The `meta` property is returned only by list or paginated endpoints.

### Error

```json
{
  "success": false,
  "error": {
    "code": "STRING_CODE",
    "message": "...",
    "details": {}
  }
}
```

### Error Codes

Error codes are defined in:

```text
src/shared/schemas/common.schema.ts
```

| Prefix         | Code                                  | HTTP Status |
| -------------- | ------------------------------------- | ----------: |
| `AUTH_*`       | `AUTH_UNAUTHORIZED`                   |         401 |
| `AUTH_*`       | `AUTH_FORBIDDEN`                      |         403 |
| `VALIDATION_*` | `VALIDATION_INVALID_INPUT`            |         400 |
| `VALIDATION_*` | `VALIDATION_FILE_TOO_LARGE`           |         400 |
| `VALIDATION_*` | `VALIDATION_FILE_TYPE_INVALID`        |         400 |
| `VALIDATION_*` | `VALIDATION_HEX_INVALID`              |         400 |
| `VALIDATION_*` | `VALIDATION_CHAR_LIMIT_EXCEEDED`      |         400 |
| `VALIDATION_*` | `VALIDATION_SLIDE_COUNT_OUT_OF_RANGE` |         400 |
| `AI_*`         | `AI_OUTLINE_GENERATION_FAILED`        |         422 |
| `AI_*`         | `AI_CONTENT_GENERATION_FAILED`        |         422 |
| `AI_*`         | `AI_PROVIDER_TIMEOUT`                 |         504 |
| `AI_*`         | `AI_RATE_LIMITED`                     |         429 |
| `EXPORT_*`     | `EXPORT_RENDER_FAILED`                |         500 |
| `RESOURCE_*`   | `RESOURCE_NOT_FOUND`                  |         404 |
| `RESOURCE_*`   | `RESOURCE_STATE_CONFLICT`             |         409 |
| `INTERNAL_*`   | `INTERNAL_SERVER_ERROR`               |         500 |

---

# 1. Authentication

Base path:

```text
/v1/auth/*
```

All endpoints require:

```http
Authorization: Bearer <access_token>
```

except:

* `POST /auth/signup`
* `POST /auth/login`

---

## 1.1 `POST /auth/signup`

**Authentication:** Public

Creates a new user through the backend authentication proxy.

### Request

```json
{
  "email": "user@example.com",
  "password": "min6karakter"
}
```

### Response — `201 Created`

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600,
    "userId": "uuid",
    "email": "..."
  }
}
```

The endpoint is a thin proxy to Supabase Auth. The client does not directly handle the Supabase anon key.

If email confirmation is still enabled in the Supabase project, the endpoint returns the corresponding authentication response.

---

## 1.2 `POST /auth/login`

**Authentication:** Public

Authenticates an existing user.

### Request

```json
{
  "email": "user@example.com",
  "password": "min6karakter"
}
```

### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "accessToken": "...",
    "refreshToken": "...",
    "expiresIn": 3600,
    "userId": "uuid",
    "email": "..."
  }
}
```

The request and response structure is identical to `/auth/signup`.

---

## 1.3 `POST /auth/sync-profile`

**Authentication:** Required

Synchronizes the authenticated user's application profile.

### Request

```json
{
  "fullName": "Budi Santoso",
  "companyName": "Kopi Nusantara"
}
```

### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "fullName": "...",
    "companyName": "...",
    "createdAt": "..."
  }
}
```

The operation is an idempotent upsert to `profiles`.

It is called once after the user's first signup/login.

---

# 2. Brand Kit

Base path:

```text
/v1/brand-kits/*
```

---

## 2.1 `POST /brand-kits/logo-upload`

**Authentication:** Required

Uploads a brand logo.

### Request

```http
Content-Type: multipart/form-data
```

Required field:

```text
file
```

Supported formats:

* PNG
* JPG
* SVG

Maximum file size:

```text
2 MB
```

File validation is performed at both the controller and service layers:

* `multer`
* `assertValidLogoFile`

The service-level validation also includes fallback type detection from the file extension when the client provides a generic `Content-Type`.

### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "logoUrl": "https://.../brand-assets/<userId>/logo-<timestamp>.png"
  }
}
```

---

## 2.2 `POST /brand-kits`

**Authentication:** Required

Creates or updates the user's active brand kit.

### Request

```json
{
  "logoUrl": "https://...",
  "primaryColor": "#0F4C81",
  "accentColor": "#F2A007",
  "fontFamily": "Inter"
}
```

The operation is an upsert.

The database enforces one active brand kit per user through the unique constraint on:

```text
brand_kits.user_id
```

### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "logoUrl": "...",
    "primaryColor": "...",
    "accentColor": "...",
    "fontFamily": "...",
    "updatedAt": "..."
  }
}
```

---

## 2.3 `GET /brand-kits/active`

**Authentication:** Required

Returns the authenticated user's active brand kit.

If the user has not configured a brand kit:

```json
{
  "success": true,
  "data": null
}
```

A missing brand kit is represented by `data: null`, not an error response.

---

# 3. Projects

Base path:

```text
/v1/projects/*
```

---

## 3.1 `POST /projects`

**Authentication:** Required

Creates a new presentation project.

### Request

```json
{
  "title": "Kopi Nusantara - Company Profile",
  "templateType": "company_profile",
  "businessContext": {
    "businessName": "...",
    "shortDescription": "...",
    "rawMaterialText": "min 50 - max 2000 karakter",
    "...": "field tambahan spesifik template diterima bebas (catchall)"
  }
}
```

`businessContext` is stored as the initial `deck_versions` snapshot (version 1), rather than as a column on `projects`.

The response uses `ProjectResponse` and does not include `businessContext`.

### Response

```text
201 Created
```

---

## 3.2 `GET /projects`

**Authentication:** Required

Returns the user's projects with pagination.

### Query Parameters

```text
status=draft
page=1
limit=10
```

Example:

```http
GET /projects?status=draft&page=1&limit=10
```

The response includes `meta.total`.

### Response

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 42
  }
}
```

---

## 3.3 `GET /projects/:id`

**Authentication:** Required

Returns a project belonging to the authenticated user.

If the project does not exist or does not belong to the user:

```text
404 RESOURCE_NOT_FOUND
```

Ownership is additionally checked at the application layer as defense-in-depth on top of RLS.

---

## 3.4 `DELETE /projects/:id`

**Authentication:** Required

Deletes the specified project.

### Response

```text
204 No Content
```

No response body is returned.

---

## 3.5 `POST /projects/:id/duplicate`

**Authentication:** Required

Creates a new draft project by duplicating the specified project.

The latest `deck_versions` record is copied to the new project.

### Response

```text
201 Created
```

---

# 4. AI Engine

The AI generation flow is divided into two stages:

```text
Stage 1
POST /projects/:id/outline
        │
        ▼
Outline
        │
        ▼
User confirmation/editing
        │
        ▼
Stage 2
POST /projects/:id/content
```

---

## 4.1 `POST /projects/:id/outline`

**Authentication:** Required

Generates the project outline using the configured LLM provider.

### Request

No request body is required.

### Response — `200 OK`

```json
{
  "success": true,
  "data": [
    {
      "slideNumber": 1,
      "title": "...",
      "objective": "..."
    }
  ]
}
```

### Generation Behavior

The current implementation uses:

```text
Claude Fable 5.1
via Elice ML API
```

If the generated output fails Zod validation, the backend retries up to two times.

Retry prompts include specific correction information derived from the validation failure.

### Failure

If the output remains invalid after the retry limit:

```text
422 AI_OUTLINE_GENERATION_FAILED
```

---

## 4.2 `PATCH /projects/:id/outline`

**Authentication:** Required

Updates the project outline.

### Request

```json
{
  "outline": [
    {
      "slideNumber": 1,
      "title": "...",
      "objective": "..."
    }
  ]
}
```

This endpoint performs CRUD only and does not invoke the LLM.

The updated outline is stored as a new `deck_versions` record.

---

## 4.3 `POST /projects/:id/content`

**Authentication:** Required

Generates the complete presentation content.

This is Stage 2 of the AI generation pipeline.

### Preconditions

The project must have:

* a confirmed outline
* a brand kit
* a brand kit with a configured logo

If one of the required conditions is not satisfied:

```text
409 RESOURCE_STATE_CONFLICT
```

### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "deckId": "uuid",
    "template": "company_profile",
    "brandKit": {
      "logoUrl": "...",
      "primaryColor": "...",
      "accentColor": "...",
      "fontFamily": "..."
    },
    "slides": [
      /* discriminated union — field structure depends on `layout` */
    ]
  }
}
```

The exact structure of `slides` is defined by the discriminated union in:

```text
deck.schema.ts
```

During content generation, the backend automatically invokes the `image-service` to populate `imageUrl` for each slide.

After successful generation:

```text
projects.status = completed
```

---

# 5. Export

Base path:

```text
/v1/projects/:id/export/*
```

Both export endpoints require generated slide content.

---

## 5.1 `POST /projects/:id/export/pptx`

**Authentication:** Required

Generates a PPTX presentation.

The project must already have generated slides.

If the required content is not available:

```text
409 RESOURCE_STATE_CONFLICT
```

### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://.../exports/<userId>/<fileName>",
    "fileName": "Nama_Usaha_template_YYYYMMDD.pptx"
  }
}
```

The generated PPTX is natively editable:

* text is represented as text objects
* images are embedded as base64 data URIs

---

## 5.2 `POST /projects/:id/export/pdf`

**Authentication:** Required

Generates a PDF presentation.

The project must already have generated slides.

If the required content is not available:

```text
409 RESOURCE_STATE_CONFLICT
```

### Response — `200 OK`

```json
{
  "success": true,
  "data": {
    "downloadUrl": "https://.../exports/<userId>/<fileName>",
    "fileName": "Nama_Usaha_template_YYYYMMDD.pdf"
  }
}
```

The PDF is generated using a headless browser through Puppeteer. The renderer uses HTML generated by the backend.

---

# 6. Internal Services Without Public Endpoints

The following services are intentionally not exposed as separate API endpoints in the current MVP.

## 6.1 Image Service

The `image-service` does not expose a dedicated image-search endpoint.

The following draft endpoint is not part of the current API:

```text
POST /brand-kits/.../image-search
```

Image search is handled automatically during Stage 2:

```text
POST /projects/:id/content
        │
        ▼
   generateContent
        │
        ▼
   image-service
```

The frontend does not need to perform image search as a separate step.

---

## 6.2 Generation Logs

Generation cost and token information is stored in:

```text
generation_logs
```

Logging is performed automatically during AI generation.

There is currently no public endpoint for retrieving generation logs.

A dashboard endpoint for reading these records is not included in the current API and may be addressed in future development.

---

# 7. Implementation Notes for API Consumers

## 7.1 Backend Path Aliases

Internal path aliases such as:

```text
@modules/*
```

are implementation details of the backend and are not relevant to API consumers.

---

## 7.2 Naming Convention

The database uses `snake_case`.

The API uses `camelCase`.

The conversion occurs at the service/repository boundary and must not appear in API responses.

Example:

```text
Database
user_id
primary_color
created_at

API
userId
primaryColor
createdAt
```

---

## 7.3 LLM Structured Output

The current LLM provider:

```text
Claude Fable 5.1 via Elice ML API
```

does not support `response_format` / structured-output enforcement through its API.

The backend therefore handles output structure through Zod validation and retry logic.

The API consumer does not need to implement this behavior.

Because validation failures may trigger internal retries, `/outline` and `/content` can take longer than the initial LLM request alone would suggest.