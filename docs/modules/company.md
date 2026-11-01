# Company: Progress

> Last updated 2026-11-01 · Legend: ✅ done · 🔨 in progress · ⬜ pending · ⏸ on hold
>
> Part of [the application progress](../progress.md). Token and session details are in [auth.md](auth.md).

## At a glance

| Area | Status | Note |
|---|---|---|
| Onboarding | ✅ | `POST /company/onboarding`, 5 tests |
| Invitations | ⬜ | The `invitations` table exists (migration 010). No code |
| Guards | ✅ | `onboardingRequired` and `requiredAdmin`, tested alone and as a chain with `requireAuth`. Not mounted on a route yet. A missing `res.locals.user` is decided but not built |

---

## Up next

- [ ] **Invitations**: admin creates a link, invitee sets a password and joins that company. The guards get mounted here, in the order `requireAuth`, `onboardingRequired`, `requiredAdmin`
- [ ] **Guards: missing `res.locals.user`**: check the user's session, then answer `401` (no session) or `500` (valid session). Build it with the invite route

---

## Open questions

1. **Invitations:** email now or link first? Log the invitee in after accepting? Is reject in scope? (Role is decided: `USER` or `ADMIN`, chosen by the inviting admin.) Details in the temporary checklist.

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
