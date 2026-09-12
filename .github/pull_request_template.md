## Summary

<!-- What does this PR change, and why? Link the related issue if any. -->

## Checklist

- [ ] `npx tsc --noEmit` passes locally
- [ ] `npm run lint` passes locally (no new errors; pre-existing warnings noted if any)
- [ ] Ran manually against a real request (Postman or equivalent) — not just type-checked
- [ ] If this PR adds/changes a module's public contract, `index.ts` was updated accordingly
- [ ] If this PR touches `src/shared/*`, it does not introduce a dependency from `shared` back into `modules` (see `eslint-plugin-boundaries` rules in `eslint.config.js`)
- [ ] If this PR adds a new environment variable, `.env.example` was updated
- [ ] If this PR changes the database schema, a new migration file was added under `supabase/migrations/` (never edit an already-applied migration)
- [ ] Commit messages follow Conventional Commits (`feat:`, `fix:`, `chore:`, etc.)

## Notes for Reviewers

<!-- Anything a reviewer should pay special attention to — trade-offs made,
     known limitations, or follow-up work intentionally deferred. -->