# Auth: Progress

> Last updated 2026-11-01 · Legend: ✅ done · 🔨 in progress · ⬜ pending
>
> Part of [the application progress](../progress.md). Architecture, testing setup and app-wide production items live there.

## At a glance

| Area | Status | Note |
|---|---|---|
| CSRF protection | ✅ | Synchronizer token + `verifyCsrf` middleware |
| Register | ✅ | Transactional, 409 on duplicate email |
| Login | ✅ | Generic 401, old session replaced |
| Logout | ✅ | Deletes the session, issues a fresh anonymous one |
| Refresh | ✅ | Atomic rotation, session expiry stays fixed |
| Session bootstrap | ✅ | `GET /auth/session` restores CSRF token + user after a page reload |
| Access-token middleware | ✅ | `requireAuth` is written and tested, **not mounted on any route yet** |
| Automated tests | ✅ | 46 tests in 11 files (auth, onboarding and the guards). Rate limits and rollback are not covered |
| Frontend wrapper | ⬜ | Not started |

---

## Up next

- [x] **Migration 012**: drop `NOT NULL` from `users.company_id` (it is `NULL` until onboarding). Applied to dev and test
- [x] **Register without a company**: takes email, password and name; `company_id` stays `NULL`. All 30 tests pass
- [x] **Company onboarding** (`POST /company/onboarding`, tracked in [company.md](company.md)): works end to end, checked by hand. No automated tests yet
- [ ] **Invitations**: an admin creates a link, the invitee sets a password and joins that company
- [x] **`companyId` in the access token** (`null` before onboarding): register, login, refresh and onboarding all set it. Register, login and `GET /auth/session` return `companyId` in `user`
- [x] **`requireAuth` reads `companyId`** into `res.locals.user.companyId`, plus a guard that returns `403 ONBOARDING_REQUIRED` on company routes. Tested
- [x] **Tests for the token's `companyId`** on login and refresh
- [ ] **Mount `requireAuth`** on the first protected route
- [ ] **Check rate limits by hand**: tests skip the limiters. The 11th failed login in 15 min must return `429`.
- [ ] **Frontend `apiFetch`**: recover from the error codes in the table below
- [ ] **Tests for rate limits and transaction rollback**

---

## Open questions

1. **Multiple devices?** Today a new login signs out the old one. Supporting several needs a `user_id` column on `session`.
**Decided**
- The session lifetime is fixed at 7 days. Refresh rotates the tokens but never extends the session (covered by a test).
- **Tenancy:** sign up → company onboarding → invite employees. `users.company_id` is `NULL` until onboarding, which makes the user the company's `ADMIN`; invitees join with it already set. One email = one company. Details in [the application progress](../progress.md#open-questions).

---

## Trade-offs we accepted

| Decision | Cost | Why |
|---|---|---|
| No email verification | Register reveals which emails exist (`409`) | Out of scope for now |
| One session per user | New login signs out other devices | Matches current schema |
| One email = one company | A person can't belong to two companies with one email, and an admin can't invite an email that already has an account | Simplest model; memberships can be added later |
| Opaque refresh token, not a JWT | DB lookup on every refresh | Simpler, revocable, no signing secret |
| Stateless access token | A stolen access JWT works up to 15 min after logout | No DB hit on every request |
| No refresh-token reuse detection | A replayed old token only gets a `401` | Killing the session on reuse would also sign out users refreshing from two tabs at once |
| Refresh `401` does not clear cookies | A stale `r.token` stays until it expires or the next login | Clearing could wipe the new cookie set by a parallel refresh |
| Any bad session returns the same `401 SESSION_INVALID` | Client can't tell expired from missing | One recovery path: `GET /auth/csrf` |
| `GET /auth/session` returns the CSRF token | Safe only while CORS allows just `CORS_ORIGIN` | Needed to survive page reloads |
| Access token only in an httpOnly cookie | Needs CSRF protection (we have it) | Not readable by JS |
| Fixed-window rate limit, in-memory | Burst at window edges; resets on restart | Fine for one instance |
| Password max 72 chars | Longer passwords rejected | bcrypt ignores everything past 72 bytes |

---

## Good to know

<details>
<summary>Endpoints</summary>

Every `POST` needs the `X-CSRF-Token` header.

| Endpoint | Success | Errors |
|---|---|---|
| `GET /auth/csrf` | `201` `{ csrf_token }`, sets an anonymous `sid`. Limit 30 / 15 min | `429` |
| `GET /auth/session` | `200` `{ csrf_token, user }`; `user` is `null` when anonymous | `401 SESSION_INVALID` |
| `POST /auth/register` | Body `email`, `password`, `name`. `201` `{ user, csrf_token }`, sets all cookies. Limit 10 / 15 min | `400 BAD_REQUEST`, `409 EMAIL_TAKEN` |
| `POST /auth/login` | `200` `{ user, csrf_token }`, sets all cookies. Limit 10 failures / 15 min | `400 BAD_REQUEST`, `401 INVALID_CREDENTIALS` |
| `POST /auth/logout` | `200` `{ csrf_token }` (new anonymous), clears `a.token` and `r.token` | CSRF `403`s |
| `POST /auth/refresh` | `204`, new `a.token` and `r.token`; CSRF token and expiry unchanged | `401 INVALID_REFRESH_TOKEN` |

An expired session on a `POST` returns `403 CSRF_EXPIRED`, not `401`, because `verifyCsrf` runs first.

</details>

<details>
<summary>Error codes and what the client does</summary>

| Code | Status | Client does |
|---|---|---|
| `CSRF_EXPIRED` | 403 | Refetch a token (`GET /auth/session`, then `/auth/csrf`) and retry once |
| `CSRF_MISSING` / `CSRF_INVALID` | 403 | Client bug, don't retry |
| `SESSION_INVALID` | 401 | `GET /auth/csrf` to start a new anonymous session |
| `ACCESS_TOKEN_EXPIRED` | 401 | `POST /auth/refresh`, then retry once |
| `ACCESS_TOKEN_MISSING` / `ACCESS_TOKEN_INVALID` | 401 | Go to login |
| `INVALID_REFRESH_TOKEN` | 401 | Go to login |
| `INVALID_CREDENTIALS` | 401 | Show the error on the form |

</details>

<details>
<summary>Tokens and cookies</summary>

| Cookie | Holds | Lifetime | In the DB |
|---|---|---|---|
| `sid` | Signed JWT with the session id | 30 min anonymous, 7 days after login | The `session` row |
| `a.token` | Access JWT (`id`, `role`) | 15 min | Nothing |
| `r.token` | Opaque random string, path `/auth/refresh` | 7 days | SHA-256 hash only |

</details>

<details>
<summary>Tests</summary>

Files in `src/tests/`: `csrf`, `register`, `login`, `logout`, `refresh`, `session` and `requireAuth`. `requireAuth` is tested on a tiny Express app inside its test file, because no real route uses it yet.

</details>

<details>
<summary>Gotchas</summary>

- `SESSION_TTL_MS` in `.env` must be a plain number (`604800000`). dotenv does not evaluate `7 * 24 * ...`.
- `BCRYPT_COST` is optional (default 12). It must be an integer of at least 4, and at least 10 when `NODE_ENV=production`.
- `register` and `login` accept any valid session, not only an anonymous one.
- `session.access_token` column is unused.

</details>

---

## Before production

App-wide items (HTTPS, secrets, `NODE_ENV`, log redaction, ...) are in [the application checklist](../progress.md#before-production).

- [ ] Tests for rate limits and transaction rollback
- [ ] Index on `session.expiry` (`users.session_id` is already indexed)

---

<details>
<summary>Done</summary>

- ✅ CSRF: session table, `verifyCsrf`, error codes, rate-limited `/auth/csrf`
- ✅ Hourly expired-session cleanup
- ✅ Register: session → user → delete temp session, all in one transaction
- ✅ Login: password checked before any token is created, dummy-hash compare, generic `401`
- ✅ Logout: session deleted and replaced by an anonymous one, token cookies cleared
- ✅ Refresh: atomic rotation in a single `UPDATE`, session expiry stays fixed
- ✅ `GET /auth/session` for page reloads
- ✅ `requireAuth`: verifies `a.token`, validates the payload shape, sets `res.locals.user`
- ✅ Migration 009: nullable `users.session_id`, FK `ON DELETE SET NULL`, index
- ✅ Configurable `BCRYPT_COST` with startup guards
- ✅ Fixed `withTransaction` missing `await` (would have broken rollback)
- ✅ Per-route rate limiters for register and login
- ✅ 46 tests across csrf, register, login, logout, refresh, session, requireAuth, onboarding and the guards

</details>
