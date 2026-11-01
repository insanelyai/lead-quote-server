# TEMP: Tenancy checklist

> Working list while we build. Delete this file when everything is ticked. The permanent docs are [progress.md](progress.md), [modules/auth.md](modules/auth.md) and [modules/company.md](modules/company.md).
>
> Last updated 2026-11-01. Type-check clean, 30 of 30 tests pass.

Flow: **sign up (no company) → company onboarding → invite employees**. One email = one company.

How we work: you write the code, I review it. I write tests only for the cases you list.

---

## Done

- [x] Migration 012: `users.company_id` is nullable
- [x] Register takes `email`, `password`, `name` and creates no company
- [x] `POST /company/onboarding` works end to end (checked by hand): one transaction, `201` with a new `a.token` (`ADMIN` + `companyId`), `409 ALREADY_ONBOARDED` on a second call with the extra company rolled back
- [x] `companyId` is in the access token for register, login, refresh and onboarding, and in the `user` of register, login and `GET /auth/session`
- [x] Repository returns `company_id`, services map it to `companyId`

---

## Left, in suggested order

### 1. `requireAuth` reads `companyId`  ✅ written (`requiredAuth.ts`) and tested

- A missing or non-string claim becomes `null` (tokens issued before this change have no claim).
- `requireAuth.test.ts` checks a token with `companyId: null` and one with a UUID. A token with no claim at all is not tested.

### 2. `ONBOARDING_REQUIRED` guard  ✅ written (`onboardingRequired.ts`) and tested (`companyId` null → 403, UUID → 200); not tested: a missing `res.locals.user`

- Returns `403 { status: "failed", code: "ONBOARDING_REQUIRED" }` when `res.locals.user.companyId` is `null`.
- Goes on every company route. **Not** on `POST /company/onboarding`.

### 3. Admin-role check  ✅ written (`requiredAdmin.ts`) and tested (`USER` → 403, `ADMIN` → 200); not tested: a missing `res.locals.user`

- Only an `ADMIN` may invite. Nothing enforces roles yet.

### 3a. Guards: missing `res.locals.user`  ⬜ decided, fix later

- **Today:** `onboardingRequired` and `requiredAdmin` return `401 MISSING_USER_LOCAL` when `res.locals.user` is empty. That only happens when a route uses a guard without `requireAuth` in front of it (a server wiring mistake), so the client gets a 401 for what is really a 500.
- **Plan:** when there is no user, check the user's session, then respond: no valid session → `401`, a valid session (so the fault is ours) → `500`.
- **To settle when we build it:**
  - `res.locals.sessionId` is only set by `verifyCsrf` on non-GET requests, so on a GET route the guard has to read the `sid` cookie itself (as `GET /auth/session` does).
  - The check reads the DB just to pick a status code. Decide whether that is worth it.
- **Tests to add then:** one case per guard for each outcome (no session → 401, valid session → 500).

### 4. Tests  ✅ done (46 tests in 11 files)

- `onboarding.test.ts`: no access token → 401, blank address → 400, success (company + user rows), new token has `ADMIN` and `companyId`, second call → 409 with one company.
- `login.test.ts` and `refresh.test.ts`: the token carries the user's `companyId`.
- `guardChain.test.ts`: `requireAuth` → `onboardingRequired` → `requiredAdmin` as the invite route will use them (no token → 401, no company → 403 `ONBOARDING_REQUIRED`, `USER` → 403 `ADMIN_ACCESS_REQUIRED`, `ADMIN` with a company → 200). This needed no invitation code.
- `resetDb` now clears `companies` too.
- Not covered: `user.companyId` in the register, login and `GET /auth/session` responses.

### 5. Invitations  ⬜

- Table `invitations` exists (migration 010): `company_id`, `invited_by`, `email`, `name`, `role`, `token_hash` (unique), `status`, `expires_at` (default 7 days), unique `(company_id, email)`.
- Statuses `PENDING` / `REJECTED`. An accepted invitation is **deleted**.
- Only the **hash** of the token is stored. Copy-link first, email later.
- Accept = `DELETE ... WHERE token_hash = $1 AND status = 'PENDING' AND expires_at > now() RETURNING ...` in the **same transaction** as creating the user (with `company_id` already set, so they skip onboarding).
- Needs: create link (admin), accept, reject, hourly cleanup of expired rows.
- One email = one company: an admin can't invite an email that already has an account.
- **Decided 2026-11-01 (changed the same day from "always `USER`"):** the inviting admin chooses the role, `ADMIN` or `USER`.
- **Who writes it:** you write the invitation code, I review it.

**Confirmed flow (your spec):**

1. Admin sends `{ email, name, role }`, where `role` is `USER` or `ADMIN`. The server creates an invitation with status `PENDING`, a random token (only its hash is stored), and a link.
2. On accept: `DELETE FROM invitations WHERE token_hash = $1 AND status = 'PENDING' AND expires_at > now() RETURNING ...`, in the same transaction that creates the user.
3. Hourly cleanup of expired rows.
4. One email = one company; an admin can send one invite per email.

**Details to get right when building it:**

- The column is `expires_at`, not `expiry`.
- Validate `role` in the request schema with `z.enum(["USER", "ADMIN"])`. Anything else must be a `400`; if it reaches Postgres, the `user_roles` enum rejects it with a `500`.
- Any `ADMIN` can now make another `ADMIN`, and nothing demotes anyone. There is no "owner" concept. Accepted for now.
- **Decided:** `AuthRepository.createUser` gets the role override. It hardcodes `role = 'USER'` today. It also has no `company_id` in its insert, and accept needs the invitation's `company_id`, so it needs an optional `companyId` too. Defaults stay the same (`USER`, no company), so `register` keeps working.
- `RETURNING` needs `company_id, email, name, role`, not only `company_id`. Creating the user needs all four.
- The link carries the **raw** random token; the DB stores only its hash (same pattern as the refresh token). A link that carried the hash would let anyone with DB read access accept.
- No mail library or sender is installed, and there is no app-URL setting (only `CORS_ORIGIN`). Earlier decision was copy-link first, email later.
- `UNIQUE(company_id, email)` only stops the same company inviting twice. Also needed:
  - On create, reject an email that already has a user account (`409`).
  - Two companies can invite the same email. The second accept fails on the unique user email: map it to `409` and let the invitation expire.
  - An expired row stays until the hourly cleanup, so re-inviting hits the unique constraint for up to an hour. Replace an expired row for the same `(company_id, email)` inside the create transaction.
  - A `REJECTED` row blocks re-inviting until it expires. Decide if that is what we want.
- Accept is unauthenticated: the invitee has no account. It needs the anonymous CSRF session from `GET /auth/csrf`, the token and a password.
- The hourly cleanup belongs next to the existing session cleanup in `src/server.ts` (`setInterval` every hour, `unref()`, cleared on shutdown).
- The create route is where the guards get mounted (`requireAuth`, `onboardingRequired`, `requiredAdmin`) and where 3a is built.

**Your brainstorm (2026-11-01):** repos `add_invitation()`, `accept_invitation()`, `renew_invitation()`; service `invite()`; controller `/company/invite`. Placement: inside the company module (your call).

**Not in the brainstorm yet:**

- Schemas: invite body `{ email, name, role }`, accept body `{ token, password }`.
- Errors: a pending invitation already exists (`409`), the email already has an account (reuse `EmailTakenError`), the invitation is invalid or expired (accept).
- Repo: `deleteExpired` for the cleanup. Reuse `AuthRepository.findUserByEmail`, `createSession`, `createUser`.
- Service: `accept()` (one transaction: delete invitation, create session, create user with the invitation's `company_id`, `role` and `name`, delete the temp session, issue tokens like `register`).
- Controller/route for accept (anonymous, sets auth cookies), and the rate limit for it.
- Lowercase the email on invite, like `register` does. Otherwise the "email already has an account" check and `UNIQUE(company_id, email)` miss case variants.
- `company_id` and `invited_by` come from `res.locals.user`, never from the body.
- Link base: reuse `env.corsOrigin` or add an `APP_URL` setting.
- `renew_invitation()`: run it first (`UPDATE ... WHERE company_id = $1 AND email = $2 AND expires_at < now() RETURNING ...`). If it returns a row, the invite was renewed. If not, `add_invitation()` inserts, and a `23505` there means a live invite exists (`409`). Alternative: one `INSERT ... ON CONFLICT (company_id, email) DO UPDATE ... WHERE invitations.expires_at < now()` statement.

**Still to decide:**

- Email now, or return the link in the response and add email later? (Suggested: link first.)
- After accepting, log the invitee in like register does, or send them to login? (Suggested: log in.)
- Is reject in scope? It is not in your spec, but the `REJECTED` status exists.

### 6. After that

- **Leads and quotes are ON HOLD** (decided 2026-11-01). Don't start them until told.
- Rate-limit and transaction-rollback tests; check the 11th failed login returns `429` by hand.
- Frontend `apiFetch` and the UI.

---

## Small cleanups (no rush)

- Middleware function names mix `requireAuth`, `requiredAdmin` and `onboardingRequired`. Pick one style.
- Missing `res.locals.user` in the guards: see 3a above.
- Define error codes once as constants (`as const`) and use them by name, so a typo like `ALREADT_ONBOARDED` becomes a compile error instead of a wrong string the frontend never matches.
- Consider a stricter `tsc` (`noUnusedLocals`) and a spell-checker for the typo-prone strings.
- Onboarding returns a flat `{ id, role, companyId }`. Register, login and session return `{ user: { id, email, role, companyId } }`. Pick one shape.
- `CompanyAlreadyExist` (on `23505`) never fires, because `companies` has no unique constraint.
- `IncompleteCompanyDetails` is not mapped in the company controller. Zod blocks those inputs first.
- `createNewCompany` has two insert branches. One insert with `phone ?? null` is enough.
- Migration 012's file name says "not-null" but it drops the NOT NULL. It is applied, so leave it.
