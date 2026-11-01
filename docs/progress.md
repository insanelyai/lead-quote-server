# Lead Quote Management: Progress

> Last updated 2026-11-01 · Legend: ✅ done · 🔨 in progress · ⬜ pending · ⏸ on hold
>
> This page covers the whole application. Each module keeps its own details in [`modules/`](modules/).

## At a glance

| Module | Status | Note |
|---|---|---|
| Auth | ✅ | Complete and tested. Details: [modules/auth.md](modules/auth.md) |
| Leads | ⏸ | **On hold** (decided 2026-11-01). Tables exist, no endpoints |
| Quotes | ⏸ | **On hold** with leads. Tables exist, no endpoints |
| Companies | 🔨 | Onboarding works, no tests yet. Invitations not started. Details: [modules/company.md](modules/company.md) |
| Frontend | ⬜ | Not started |
| Deployment | ⬜ | See *Before production* below |

---

## Up next

- [x] **Tenancy migration** (migrations 010, 011): `users.company_id`, `users.name` and the `invitations` table, applied to dev and test
- [ ] **Finish tenancy**: invitations, and the missing-user behaviour of the guards. Done and tested: migration 012, register without a company, onboarding, `companyId` in the token, `requireAuth` reading it, the `ONBOARDING_REQUIRED` and admin guards. See [modules/company.md](modules/company.md) and [modules/auth.md](modules/auth.md)
- ⏸ **Leads endpoints** (on hold, don't start until told): create, list, get, update, scoped by `res.locals.user.companyId`, with tests
- [ ] **Choose the frontend framework** (open question 1)

---

## Open questions

1. **Frontend:** which framework and fetch layer? The auth module needs a retry wrapper (see [modules/auth.md](modules/auth.md)).

**Decided**
- **Tenancy flow:** sign up (a user with no company) → company onboarding → invite employees. `users.company_id` is `NULL` until onboarding, which creates the company and makes the user its `ADMIN`. Invitees join with `company_id` already set. **One email = one company** (`users.company_id`).
- **Company scoping:** the company always comes from the access token (`res.locals.user.companyId`), never from the request body and never from a direct read of `users`. That keeps a later move to memberships (one email, many companies) a small change.

---

## Good to know

<details>
<summary>Architecture</summary>

`route → controller → service → repository → DB`

- Controller: HTTP only (validation, cookies, status codes)
- Service: business logic and transactions (`withTransaction`)
- Repository: SQL only; turns `23505` into a domain error such as `EmailTakenError`

</details>

<details>
<summary>Testing</summary>

- `pnpm test` runs Vitest + Supertest against the `leadquote_test` database.
- `.env.test` (git-ignored) has its own DB name and secrets, `BCRYPT_COST=4` and `LOG_LEVEL=silent`.
- After adding a migration, run `pnpm migrate:test up` as well as `pnpm migrate up`.
- `src/tests/setup.ts` aborts the run if `DB_NAME` doesn't end in `_test`.
- Test files run one at a time, because they share one database that `beforeEach` truncates.
- Rate limiters are skipped when `NODE_ENV=test`.
- Shared helpers are in `src/tests/helpers.ts` (`resetDb`, `newClient`, `cookiesOf`).

</details>

<details>
<summary>Gotchas</summary>

- Required env vars: `DB_USER`, `DB_HOST`, `DB_NAME`, `CSRF_SECRET`, `ACCESS_SECRET`. The server won't start without them. `.env.example` lists all of them.
- `pnpm migrate up` reads `DATABASE_URL` (or `PG*` variables). `.env` has neither, so set one or the command fails.
- `tsconfig` includes `src/tests`, so `pnpm build` emits the tests into `dist/`.

</details>

<details>
<summary>Endpoint checklist</summary>

Seven questions to answer for every endpoint: [endpoint-checklist.md](endpoint-checklist.md).

</details>

---

## Before production

Auth-specific items are in [modules/auth.md](modules/auth.md).

**Blockers**
- [ ] Redact cookies and `X-CSRF-Token` from `pino-http` logs
- [ ] `trust proxy`, real `CORS_ORIGIN`, frontend on the same site as the API
- [ ] HTTPS: cookies use `secure: true` in production, so without it logins look successful but the cookies never stick
- [ ] `NODE_ENV=production`, never `test` (the rate limiters skip themselves in test mode)
- [ ] Production-only `CSRF_SECRET` and `ACCESS_SECRET`, generated fresh with `openssl rand -hex 32`, never copied from dev or `.env.test`
- [ ] DB: SSL, pool size and timeouts, `pool.on("error")`

**Should do**
- [ ] Exclude `src/tests` from the production build (`tsc` emits it into `dist/` today)
- [ ] The deploy pipeline provides `DATABASE_URL` (or `PG*`) for `pnpm migrate up`
- [ ] Shared rate-limit store (Redis) if running more than one instance
- [ ] `unhandledRejection` / `uncaughtException` handlers
- [ ] `/health` checks the DB
- [ ] Explicit `express.json` size limit
- [ ] `pnpm audit`

---

<details>
<summary>Done</summary>

- ✅ DB pool config (`host`, `db_port`) and startup env validation
- ✅ Graceful shutdown closes the DB pool
- ✅ Route / controller / service / repository layering, `withTransaction` helper
- ✅ Test database, safety guard and Vitest + Supertest setup
- ✅ `.env.example` lists every variable
- ✅ Auth module (see [modules/auth.md](modules/auth.md))

</details>
