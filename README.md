# PitchKu — Backend API

**AI-powered presentation generator backend for Indonesian SMEs (UMKM).**
Structured LLM orchestration, schema-validated deck generation, and native editable PPTX/PDF export.

---

## Overview

PitchKu is a platform that simplifies business presentation creation for Indonesian
small business owners and solopreneurs. This repository contains the **backend
service** — the API, AI orchestration engine, and export pipeline that power the
product.

The service coordinates a two-stage LLM pipeline (outline generation, followed by
structured slide content generation), enforcing strict JSON schema validation at
every step to guarantee predictable, overflow-free output. It handles
multi-tenant authentication and data isolation via Supabase, brand identity
locking (logo, color palette, typography), stock image sourcing with automatic
provider fallback, and native — not rasterized — PPTX/PDF export, ensuring every
generated deck remains fully editable in Microsoft PowerPoint and Google Slides.

Correctness and cost-efficiency are treated as first-class design constraints, not
afterthoughts: every LLM call is schema-enforced, retried deterministically on
validation failure, and logged with full token/cost telemetry.

---

## Tech Stack

| Layer           | Technology                                                                        |
| --------------- | --------------------------------------------------------------------------------- |
| Runtime         | Node.js, TypeScript (strict mode)                                                 |
| Framework       | Express                                                                           |
| Dev Runtime     | tsx (fast TS execution, no manual build step in development)                      |
| Validation      | Zod (single source of truth for API contracts and LLM structured outputs)         |
| Database & Auth | Supabase (PostgreSQL, Row Level Security, Storage, Auth)                          |
| AI Provider     | LLM API with native structured output enforcement                                 |
| Export Engine   | pptxgenjs (native PPTX), Puppeteer (PDF)                                          |
| Image Sourcing  | Unsplash API (primary), Pexels API (fallback)                                     |
| Logging         | Pino                                                                              |
| Testing         | Vitest, Supertest                                                                 |
| Linting         | ESLint 9 (flat config) + `eslint-plugin-boundaries` for enforced module isolation |

---

## Architecture

This service follows a **modular monolith** pattern: a single deployable unit,
internally organized into clearly bounded feature modules. Each module owns its
controller, service, repository, and type definitions, and exposes only a public
contract through a barrel `index.ts` file — internal implementation details are
never imported directly by other modules.

Dependency direction is enforced automatically via `eslint-plugin-boundaries`:
feature modules may depend on shared utilities and config, but never reach into
another module's internals, and shared code never depends back on a feature
module. This keeps the codebase easy to navigate today and straightforward to
extract into standalone services later, should scale ever require it — without
premature distributed-system complexity.

```
src/
├── modules/
│   ├── auth/              → Supabase Auth sync, JWT middleware
│   ├── brand-kit/         → Brand identity CRUD, logo upload, HEX validation
│   ├── projects/          → Project CRUD, outline confirmation, versioning
│   ├── ai-engine/         → Two-stage LLM orchestration, schema validation, retry
│   ├── image-service/     → Stock photo sourcing with provider fallback
│   ├── export-engine/     → Native PPTX/PDF generation, layout mapping
│   └── generation-logs/   → Token usage & cost tracking
├── shared/
│   ├── schemas/           → Zod schemas — single source of truth across the app
│   ├── lib/               → LLM client, Supabase client, retry utils, logger
│   ├── middleware/        → Error handler, request validation
│   └── errors/            → Domain-specific error classes
├── config/                → Environment parsing, constants, layout mapping table
├── app.ts                 → Express app setup, route registration
└── server.ts              → Entry point
```

Full API contract (endpoints, request/response shapes, error codes) is documented
in [`docs/API-CONTRACT.md`](./docs/API-CONTRACT.md). Coding conventions and error
handling patterns are documented in [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md).

---

## Getting Started

### Prerequisites

- Node.js `v20.x` or later
- npm `v10.x` or later
- A Supabase project (or the Supabase CLI for local development)
- API keys: LLM provider, Unsplash, Pexels

### Installation

```bash
git clone https://github.com/<your-org>/pitchku-backend.git
cd pitchku-backend
npm install
```

### Environment Configuration

Copy the example environment file and fill in your own credentials:

```bash
cp .env.example .env
```

Required variables are documented inline in `.env.example`, covering Supabase
credentials, LLM provider configuration, and stock image API keys.

### Database Setup

Apply the schema and Row Level Security policies via the Supabase CLI:

```bash
npx supabase start
npx supabase db reset
```

### Running the Service

```bash
npm run dev
```

Starts the server with `tsx watch`, auto-restarting on file changes — no manual
compile step required during development.

### Building for Production

```bash
npm run build
npm start
```

`tsc-alias` resolves path aliases (`@modules/*`, `@shared/*`, `@config/*`) in the
compiled output, so the build runs correctly under plain Node.js without
requiring alias resolution at runtime.

---

## Available Scripts

| Command              | Description                                 |
| -------------------- | ------------------------------------------- |
| `npm run dev`        | Start development server with hot reload    |
| `npm run build`      | Compile TypeScript and resolve path aliases |
| `npm start`          | Run the compiled production build           |
| `npm run lint`       | Run ESLint across the codebase              |
| `npm run format`     | Format the codebase with Prettier           |
| `npm test`           | Run the test suite once                     |
| `npm run test:watch` | Run the test suite in watch mode            |

---

## Code Quality & Contribution Standards

This repository enforces consistency through tooling rather than convention alone:

- **TypeScript strict mode** — including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`, given how frequently the deck schema relies on
  optional fields.
- **ESLint boundary rules** — module dependency direction is checked automatically;
  a pull request that violates module isolation will fail CI, not just review.
- **Conventional Commits** — commit messages are validated via commitlint.
- **Pre-commit hooks** — Husky + lint-staged run linting and formatting on staged
  files before every commit.
- **CI pipeline** — every pull request runs lint → type-check → test → build.

See [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md) for naming patterns, error
handling conventions, and logging standards expected across all modules.

---

## Known Issues

- `npm audit` reports a high-severity advisory in `image-size`, a transitive
  dependency of `pptxgenjs`, related to DoS vulnerabilities in ICNS/JXL/HEIF
  parsing. This application never processes those file formats (uploads are
  restricted to PNG/JPG/SVG per brand kit requirements), so the risk is not
  applicable to this codebase's attack surface. Resolving it requires a major
  downgrade of `pptxgenjs`, which is not currently justified.

---

## License

Proprietary — developed as part of a capstone sprint project. Not licensed for
external use or distribution at this stage.
