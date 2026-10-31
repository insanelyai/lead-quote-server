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

### 1. `requireAuth` reads `companyId`  ⬜
- `src/middlewares/accessToken.ts` sets `res.locals.user = { id, role }` only.
- Read `companyId` from the payload into `res.locals.user.companyId`. `null` is valid. Accept a missing claim as `null` (tokens issued before this change have no claim).
- Add a payload shape check for it, like the ones for `id` and `role`.

### 2. `ONBOARDING_REQUIRED` guard  ⬜
- Returns `403 { status: "failed", code: "ONBOARDING_REQUIRED" }` when `res.locals.user.companyId` is `null`.
- Goes on every company route. **Not** on `POST /company/onboarding`.

### 3. Admin-role check  ⬜
- Only an `ADMIN` may invite. Nothing enforces roles yet.

### 4. Tests  ⬜ (you list the cases)
- Onboarding: success, no access token, blank address, second call is `409` with no extra company, new token carries `ADMIN` and `companyId`.
- `companyId` survives login and refresh. Nothing covers this today, because every test user has no company.
- `requireAuth` with `companyId`, and the two guards.
- `resetDb` in `src/tests/helpers.ts` must also clear companies: `TRUNCATE users, session, companies CASCADE`.

### 5. Invitations  ⬜
- Table `invitations` exists (migration 010): `company_id`, `invited_by`, `email`, `name`, `role`, `token_hash` (unique), `status`, `expires_at` (default 7 days), unique `(company_id, email)`.
- Statuses `PENDING` / `REJECTED`. An accepted invitation is **deleted**.
- Only the **hash** of the token is stored. Copy-link first, email later.
- Accept = `DELETE ... WHERE token_hash = $1 AND status = 'PENDING' AND expires_at > now() RETURNING ...` in the **same transaction** as creating the user (with `company_id` already set, so they skip onboarding).
- Needs: create link (admin), accept, reject, hourly cleanup of expired rows.
- One email = one company: an admin can't invite an email that already has an account.
- **Open question:** can an admin invite as `ADMIN`, or only `USER`? (`role` defaults to `USER`.)

### 6. After that
- Leads endpoints scoped by `res.locals.user.companyId`, then quotes.
- Rate-limit and transaction-rollback tests; check the 11th failed login returns `429` by hand.
- Frontend `apiFetch` and the UI.

---

## Small cleanups (no rush)

- Onboarding returns a flat `{ id, role, companyId }`. Register, login and session return `{ user: { id, email, role, companyId } }`. Pick one shape.
- `CompanyAlreadyExist` (on `23505`) never fires, because `companies` has no unique constraint.
- `IncompleteCompanyDetails` is not mapped in the company controller. Zod blocks those inputs first.
- `createNewCompany` has two insert branches. One insert with `phone ?? null` is enough.
- Migration 012's file name says "not-null" but it drops the NOT NULL. It is applied, so leave it.
