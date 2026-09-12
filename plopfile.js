// plopfile.js
//
// Module scaffolding generator. All 7 FRD modules (auth, brand-kit,
// projects, ai-engine, image-service, export-engine, generation-logs)
// were already hand-written, so this generator was NOT used during the
// sprint — it exists for consistency if a module is ever added post-MVP,
// so the file naming pattern documented in docs/CONVENTIONS.md section 1
// is followed automatically instead of copy-pasted and risking drift.
//
// Usage: npx plop module
// Prompts for a kebab-case module name and generates the 6 standard
// files under src/modules/<name>/. Delete whichever generated file you
// don't end up needing — e.g. a module with no direct database access
// can drop *.repository.ts (see the documented exceptions for auth,
// ai-engine, and export-engine in docs/CONVENTIONS.md).
//
// Templates are inline strings rather than separate .hbs files, since a
// generator used this rarely doesn't justify the extra file-per-template
// indirection.

function pascalCase(name) {
  return name
    .split('-')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join('');
}

/** @param {import('plop').NodePlopAPI} plop */
module.exports = function (plop) {
  plop.setHelper('pascalCase', pascalCase);

  plop.setGenerator('module', {
    description: 'Scaffold a new feature module under src/modules/',
    prompts: [
      {
        type: 'input',
        name: 'name',
        message: 'Module name (kebab-case, e.g. "generation-logs"):',
        validate: (input) =>
          /^[a-z][a-z0-9-]*$/.test(input) || 'Use lowercase kebab-case (e.g. "my-module")',
      },
    ],
    actions: [
      {
        type: 'add',
        path: 'src/modules/{{name}}/{{name}}.controller.ts',
        template: `// src/modules/{{name}}/{{name}}.controller.ts
import type { Request, Response } from 'express';

import { UnauthorizedError } from '@shared/errors/app-errors';
import type { ApiSuccess } from '@shared/schemas/common.schema';

import * as {{camelCase name}}Service from './{{name}}.service';

function requireUserId(req: Request): string {
  if (!req.userId) {
    throw new UnauthorizedError('User is not authenticated');
  }
  return req.userId;
}

// TODO: replace with real handlers. Example:
// export async function listHandler(req: Request, res: Response): Promise<void> {
//   const userId = requireUserId(req);
//   const items = await {{camelCase name}}Service.list(userId);
//   const response: ApiSuccess<typeof items> = { success: true, data: items };
//   res.status(200).json(response);
// }
`,
      },
      {
        type: 'add',
        path: 'src/modules/{{name}}/{{name}}.service.ts',
        template: `// src/modules/{{name}}/{{name}}.service.ts
import { createModuleLogger } from '@shared/lib/logger';

import * as {{camelCase name}}Repository from './{{name}}.repository';

const log = createModuleLogger('{{name}}');

// TODO: implement business logic, delegating data access to
// {{name}}.repository.ts (never import supabaseAdmin directly here).
`,
      },
      {
        type: 'add',
        path: 'src/modules/{{name}}/{{name}}.repository.ts',
        template: `// src/modules/{{name}}/{{name}}.repository.ts
import { supabaseAdmin } from '@shared/lib/supabase-client';

// TODO: implement data access. Remember to convert snake_case DB rows
// to camelCase response shapes explicitly (see docs/CONVENTIONS.md
// section 5) — never let raw column names leak past this file.
`,
      },
      {
        type: 'add',
        path: 'src/modules/{{name}}/{{name}}.schema.ts',
        template: `// src/modules/{{name}}/{{name}}.schema.ts
import { z } from 'zod';

// TODO: define request/response Zod schemas for this module.
export const Placeholder{{pascalCase name}}Schema = z.object({});
export type Placeholder{{pascalCase name}} = z.infer<typeof Placeholder{{pascalCase name}}Schema>;
`,
      },
      {
        type: 'add',
        path: 'src/modules/{{name}}/{{name}}.types.ts',
        template: `// src/modules/{{name}}/{{name}}.types.ts

// TODO: local TS types that don't belong in {{name}}.schema.ts
// (e.g. internal shapes not validated at runtime).
export {};
`,
      },
      {
        type: 'add',
        path: 'src/modules/{{name}}/index.ts',
        template: `// src/modules/{{name}}/index.ts
// TODO: export only the public contract of this module — controllers,
// request schemas, and response types. Never export *.repository.ts
// or *.service.ts internals directly (see docs/CONVENTIONS.md section 2).
`,
      },
    ],
  });
};