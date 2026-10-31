# Company: Progress

> Last updated 2026-11-01 · Legend: ✅ done · 🔨 in progress · ⬜ pending
>
> Part of [the application progress](../progress.md). Token and session details are in [auth.md](auth.md).

## At a glance

| Area | Status | Note |
|---|---|---|
| Onboarding | 🔨 | `POST /company/onboarding` works end to end. No automated tests yet |
| Invitations | ⬜ | The `invitations` table exists (migration 010). No code |
| Guards | ⬜ | `ONBOARDING_REQUIRED` and an admin-role check do not exist |

---

## Up next

- [ ] **Onboarding tests**: the cases are yours to list. `resetDb` must also clear `companies` (`TRUNCATE users, session, companies CASCADE`)
- [ ] **`requireAuth` reads `companyId`** and an `ONBOARDING_REQUIRED` guard (see [auth.md](auth.md))
- [ ] **Admin-role check** for routes only an `ADMIN` may use (inviting)
- [ ] **Invitations**: admin creates a link, invitee sets a password and joins that company

---

## Open questions

1. **Can an admin invite as `ADMIN`,** or only as `USER`? The `role` column defaults to `USER`.

---

## Good to know

<details>
<summary>Endpoints</summary>

Needs a valid `a.token` and the `X-CSRF-Token` header.

| Endpoint | Success | Errors |
|---|---|---|
| `POST /company/onboarding` | `201` `{ id, role, companyId }`, sets a new `a.token` with `ADMIN` and `companyId` | `400 BAD_REQUEST`, `401` (no or bad access token), `409 ALREADY_ONBOARDED` |

Body: `name`, `email`, `address` (all required), `phone` (optional). The company, the user's `company_id` and `ADMIN` role are written in one transaction. The user update only matches rows where `company_id IS NULL`, so a second call returns `409` and the new company is rolled back.

</details>

<details>
<summary>Gotchas</summary>

- The response is flat (`{ id, role, companyId }`), while register, login and session return `{ user: { ... } }`.
- `CompanyAlreadyExist` (on `23505`) never fires, because `companies` has no unique constraint.
- `IncompleteCompanyDetails` is not mapped in the controller. Zod blocks those inputs first, so it only shows up as a `500` if the schema changes.

</details>

---

<details>
<summary>Done</summary>

- ✅ Onboarding in one transaction, checked by hand: `201`, new token, `409` on a second call with no extra company, and the new `companyId` survives refresh and login
- ✅ Access-token-only cookie setter (`setAccessCookie`)

</details>
