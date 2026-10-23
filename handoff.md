# Handoff

Session handoff for the backend migration described in `docs/backend-plan.md`. Read that plan first.

## Working conventions

- Opus orchestrates; Sonnet subagents do the implementation. Subagents never commit; the orchestrator reviews, runs checks, commits and pushes.
- British English, no em dashes anywhere (`npm run check:i18n` fails on them), no code comments beyond the surrounding style.
- Read `node_modules/next/dist/docs/` before Next-specific code (Next 16.4: `proxy.ts` not `middleware.ts`, different caching APIs).
- `next dev` rewrites `AGENTS.md`; restore it with `git checkout AGENTS.md` before committing.
- Push only to the development branch (`ccr-c7c55779-2hzk84`). Push to `main` only when the user asks. Small fixes already on main were cherry-picked via a worktree from `origin/main`.
- Never ask the user to paste secrets into chat. Secrets go in the environment settings and are picked up by a new session.

## Branch state

- `main`: dependency updates, canteen floor plan redraw, menu names, map accessibility fix, thick-border fix. Still uses Sanity.
- `ccr-c7c55779-2hzk84`: everything on main plus phases 1 and 2 (16 commits ahead). Not merged.
  - Phase 1: Neon + Drizzle (`lib/db`), organisations, staff roles, append-only audit log, Better Auth sign-in with email codes and mandatory passkey or TOTP for staff (`lib/auth`), staff invites, first-admin bootstrap, `/admin` console shell, storage (`lib/storage`) and email (`lib/email`) interfaces.
  - Phase 2: Postgres content schema (`lib/db/schema/content`), seeds (`lib/db/seed`), rich text as ProseMirror JSON (`lib/rich-text`, `components/domain/rich-text`), read layer (`lib/content`) used by every page, lost and found reports written to Postgres, PGlite for local and CI (`DATABASE_URL=pglite:memory`), Sanity fully removed.
  - Checks at last commit: `npm run check` green, 576 unit tests, build, e2e, and the full a11y suite (971 passed, 0 failed) against `next start` with PGlite.

## Running checks locally

```
npm run check
npm test
DATABASE_URL=pglite:memory npm run build
DATABASE_URL=pglite:memory npx next start -p 3300 &
PLAYWRIGHT_BASE_URL=http://localhost:3300 PW_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome \
  npx playwright test --config=tests/playwright.config.ts tests/a11y --reporter=line
```

Use `next start`, not `next dev`, for Playwright: the dev server times out under the a11y suite. Never run `playwright install`.

## Next steps, in order

1. **Migrate and seed Neon.** The user added `DATABASE_URL` to the environment for this session.
   - Confirm it is set and is the unpooled connection (host must not contain `-pooler`) without printing it.
   - `npm run db:migrate`, then `npm run db:seed`.
   - Verify counts: 18 canteen stalls, organisations `tusu` and `tusc`, handbook FAQs and pages, places.
2. **Storage: support Blob without a read-write token.** The Vercel project has `BLOB_STORE_ID` (OIDC auth) but no `BLOB_READ_WRITE_TOKEN`. `@vercel/blob` 2.8 resolves OIDC plus `BLOB_STORE_ID` itself when no `token` is passed (see `resolveBlobAuth` in `node_modules/@vercel/blob/dist/chunk-*.js`).
   - Change `lib/storage/index.ts` `getStorage()` to accept either `BLOB_READ_WRITE_TOKEN` or `BLOB_STORE_ID`.
   - Change `VercelBlobStorage` to take `{ token?: string; storeId: string }`, pass `token` only when present, and build `publicUrl` from the store id (strip the `store_` prefix, lower-case): `https://<id>.public.blob.vercel-storage.com/<key>`.
   - Update `tests/unit/storage/storage.test.ts`, the comment in `lib/content/images.ts`, `.env.example` and the README table.
3. **Ask the user to merge to main** once step 1 is done (the live site must not start before its tables exist). Merge with a merge commit; Vercel then deploys.
4. **First admin**: `npm run auth:bootstrap -- <email> tusu` (or `tusc`) needs `DATABASE_URL` and `BETTER_AUTH_URL`. It prints a one-time invite link and refuses once any admin exists. Second-factor reset does not exist yet, so the admin must save backup codes.
5. **Phase 3** (content editing in `/admin`) per the plan, once the user asks.

## Outstanding items for the user

- Resend: account, verified sending domain (SPF, DKIM, DMARC), `RESEND_API_KEY` and `EMAIL_FROM` in Vercel. Skipped so far.
- `BETTER_AUTH_SECRET` is set for Production only; add a separate Preview value.
- Check `AUTH_ALLOWED_EMAIL_DOMAINS` in Vercel is exactly `dome.tu.ac.th,tu.ac.th` (confirmed domains; also the code default).
- Check Neon preview branching is on, so previews do not share the production database.
- After the merge: remove the eight `SANITY_*` env vars and the Sanity integration in Vercel, the unused `CANTEEN_DEMO` preview var, and Neon Auth (`NEON_AUTH_BASE_URL`, `VITE_NEON_AUTH_URL`), which is not used.
- Delete the stray `tmp-skip` branch on GitHub (the proxy refuses branch deletion from the session).
- Thai review of the email templates (`lib/email/templates.ts`) and of menu names flagged as unverified (stall 3 vegetarian dishes, most of stalls 5 and 17, the stall 12 "(ป้ายภาพ)" placeholder, possible duplicate smoothies at stall 5).

## Known gaps before launch

- No QR code on authenticator set-up (needs the `qrcode` package; ask first).
- No "manage my security" page and no admin reset of a lost second factor.
- Migrations do not run on deploy; offer to run `db:migrate` in the Vercel production build.
- GOV.UK places field error messages above the input; the site's components put them below. Changing it touches every form; the user has not decided.
- `npm audit`: 4 moderate, all in the `drizzle-kit` dev chain; the only fix is a major downgrade.
- No seed content for events, news, policies or alerts; those pages show empty states until phase 3.
