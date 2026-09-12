# PitchKu — Backend API

AI presentation generator backend built for Indonesian SMEs (UMKM). Two-stage
LLM orchestration, schema-validated deck generation, and native PPTX/PDF export.

---

## What this is

PitchKu turns a short business description into a ready-to-download slide deck.
This repo is the backend: the API, the LLM orchestration layer, image sourcing,
and the export pipeline. There's no frontend here — this service is consumed by
a separate web client over a plain REST API (see `docs/API-CONTRACT.md`).

The core flow is two LLM calls, not one. First, an outline (titles + one-line
objectives per slide) that the user can review and edit. Then, once confirmed,
a second call fills in the actual slide content — bullets, cards, metrics,
whatever the layout calls for — using the confirmed outline and the business's
brand kit as context. Splitting it this way keeps the expensive part (full
content generation) from running until the user has actually approved the
structure, and it's cheaper to regenerate a rejected outline than a rejected
full deck.

Every LLM response is validated against a Zod schema before it's trusted, and
if it doesn't match — wrong field, string too long, one card too many — the
model gets a second and third shot with the specific validation error fed back
into the prompt. This turned out to matter more than expected: see the "LLM
provider" note below.

## Stack

| Layer | What's used |
|---|---|
| Runtime | Node.js 20, TypeScript (strict) |
| Framework | Express 5 |
| Dev server | tsx watch (no build step during development) |
| Validation | Zod — one schema definition, reused for API contracts, DB round-trips, and LLM output validation |
| Database / Auth / Storage | Supabase (Postgres + RLS, Storage buckets, Auth) |
| LLM | Claude Fable 5.1, served through Elice ML API's OpenAI-compatible endpoint (`openai` SDK, custom `baseURL`) |
| PPTX export | pptxgenjs |
| PDF export | Puppeteer (headless print of hand-built HTML) |
| Stock images | Unsplash (primary), Pexels (fallback) |
| Logging | Pino |
| Lint/format | ESLint 9 flat config + `eslint-plugin-boundaries`, Prettier |

### A note on the LLM provider

This isn't calling Anthropic's API directly. It goes through Elice ML API,
which fronts Claude Fable 5.1 behind an OpenAI-compatible `/chat/completions`
endpoint. That sounded like it would support OpenAI's structured-output
(`response_format: json_schema`) out of the box — it doesn't. Behind the
scenes the gateway implements `response_format` by forcing a tool call, and
this model rejects forced tool choice outright (`400: tool_choice type "tool"
and "any" are not supported for this model`). Confirmed this is specific to
the `response_format` parameter itself, not a schema or payload issue, by
sending the exact same request with and without it.

Practical result: `llm-client.ts` sends plain chat completions with no
`response_format` at all. The system prompt spells out the exact JSON shape in
plain English, the response gets stripped of markdown fences defensively (the
model doesn't always listen), parsed, and validated against the real Zod
schema. If validation fails, `ai-engine.retry.ts` sends it back with the
specific error and tries again — up to two retries. This was already the plan
for handling occasional malformed output; it just ended up being the *only*
line of defense instead of a backup for provider-side enforcement. Worth
knowing before you go looking for `response_format` anywhere in this codebase.

## Architecture

Modular monolith — one deployable process, but internally split into
self-contained feature modules. Each module owns its controller, service,
repository, and schema, and the only thing another module is allowed to import
is its `index.ts` barrel. `eslint-plugin-boundaries` enforces this at lint
time, so a module reaching into another module's internals fails CI, not just
review.

```
src/
├── modules/
│   ├── auth/              — Supabase Auth proxy (login/signup so clients
│   │                         never hold the Supabase anon key), JWT
│   │                         middleware, profile sync
│   ├── brand-kit/          — logo upload to Storage, HEX-validated palette
│   ├── projects/           — project CRUD, deck_versions snapshotting
│   ├── ai-engine/          — outline + content generation, prompt building,
│   │                         schema validation, retry orchestration
│   ├── image-service/      — Unsplash → Pexels → placeholder, in-memory cache
│   ├── export-engine/      — PPTX layout mapping, PDF via Puppeteer
│   └── generation-logs/    — token usage + estimated cost per LLM call
├── shared/
│   ├── schemas/            — deck.schema.ts is the canonical slide contract
│   │                         (discriminated union on `layout`, one schema
│   │                         per slide type — not one big schema with a pile
│   │                         of optional fields)
│   ├── lib/                — LLM client, Supabase client, logger
│   ├── middleware/          — error handler, generic Zod request validator
│   └── errors/              — typed error hierarchy (AppError subclasses),
│                              each carrying its own HTTP status + error code
├── config/
├── app.ts
└── server.ts
```

Two modules bend the standard `controller/service/repository/schema` shape on
purpose:

- **`auth`** has no repository — it's one upsert, so a whole repository file
  for that would just be indirection.
- **`ai-engine`** and **`export-engine`** each have extra files
  (`*.prompt.ts`, `*.retry.ts`, `*.validator.ts` / `*.layout-map.ts`,
  `*.pptx.ts`, `*.pdf.ts`) because those are genuinely separate concerns —
  prompt wording changes far more often than orchestration logic, so keeping
  them apart means tuning prompts doesn't risk the retry logic around them.

Full endpoint list, request/response shapes, and error codes:
[`docs/API-CONTRACT.md`](./docs/API-CONTRACT.md). Naming conventions, error
handling patterns, and a couple of TypeScript strict-mode gotchas worth
knowing before you touch `shared/`: [`docs/CONVENTIONS.md`](./docs/CONVENTIONS.md).

## Getting started

### You'll need

- Node.js 20+, npm 10+
- A Supabase project — cloud, not the local Docker stack (see note below)
- An Elice ML API key for Claude Fable 5.1
- Unsplash and Pexels API keys (both free tier)

### Setup

```bash
git clone https://github.com/<your-org>/pitchku-backend.git
cd pitchku-backend
npm install
cp .env.example .env
```

Fill in `.env` — Supabase URL/keys, `LLM_API_KEY` + `LLM_BASE_URL` (your Elice
endpoint, ending in `/v1`), and the image provider keys.

### Database

```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db push
```

This applies both the schema migration and the RLS policies (they're separate
migration files, applied in order). Local Docker-based Supabase (`supabase
start`) works too if you want it, but wasn't used here — the Windows Docker
Desktop setup for the local stack's analytics/storage containers turned out to
be more friction than it was worth for a solo backend dev; developing directly
against a cloud project was faster.

You'll also need two Storage buckets, created manually in the dashboard (not
part of the SQL migrations): `brand-assets` and `exports`, both public.

### Run it

```bash
npm run dev
```

`tsx watch` restarts on file changes. Hit `GET /health` to confirm it's up.

### Build for production

```bash
npm run build
npm start
```

`tsc-alias` rewrites the `@modules/*` / `@shared/*` / `@config/*` path aliases
in the compiled output — without it, the aliases resolve fine under `tsx` but
break under plain `node dist/server.js`.

## Scripts

| Command | Does what |
|---|---|
| `npm run dev` | dev server, hot reload |
| `npm run build` | compile + resolve path aliases |
| `npm start` | run the compiled build |
| `npm run lint` | ESLint |
| `npm run format` | Prettier |
| `npm test` | Vitest |

## Where things stand

Every endpoint in the API contract has been exercised manually end-to-end —
signup through login through project creation through outline generation
through content generation through image sourcing through PPTX/PDF export —
against a real Supabase project and the real LLM provider, not mocks. What
hasn't happened yet is automated test coverage: `tests/unit` and
`tests/integration` are set up (Vitest + Supertest are installed and
configured) but empty. That's a known gap, not an oversight — see
`docs/CONVENTIONS.md` section 10 for the reasoning and what a first pass at
coverage should probably prioritize.

## Known issues

- `npm audit` flags `image-size` (a transitive dependency of `pptxgenjs`) for
  a DoS vulnerability in ICNS/JXL/HEIF parsing. Nothing in this codebase
  touches those formats — logo uploads are restricted to PNG/JPG/SVG — so the
  fix (a major `pptxgenjs` downgrade) isn't worth the trade.
- `pptxgenjs`'s `ShapeType` enum has an inconsistent export path across its
  own type definitions (default export vs. instance property vs. named
  export all failed at different points). The card-grid layout renders its
  card background as an empty text box with `fill`/`line` instead of
  `addShape`, which sidesteps the whole thing and looks identical.

## License

Proprietary, built as a capstone project. Not licensed for reuse or
redistribution.